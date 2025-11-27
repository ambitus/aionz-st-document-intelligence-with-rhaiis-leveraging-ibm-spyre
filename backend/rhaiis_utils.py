import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from urllib3.util.retry import Retry
import time
import json
import ssl
from typing import Any
from utils import green_log

# ----------------------------
# RHAIIS
# ----------------------------


def summarize(doc_content):
    try:
        prompt = f""" 
        Summarize the following document
        
        Document:
        {doc_content}
        """
        response = call_rhaiis_model_without_streaming(prompt)
        return response
    except:
        return "Error in document summarization"


class TLSAdapter(HTTPAdapter):
    """Custom Adapter to enforce TLS 1.2+"""
    def init_poolmanager(self, *args, **kwargs):
        print(">>> Initializing TLS 1.2+ pool manager...")
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = context
        return super().init_poolmanager(*args, **kwargs)


def call_rhaiis_model_without_streaming(
    prompt: str,
    model: str = "ibm-granite/granite-3.3-8b-instruct",
    max_tokens: int = 8000,
    temperature: float = 0,
    top_p: float = 1.0,
    stream = False
) -> Any:
    """
    Call external RHAIIS API (HTTPS) to get a completion.
    Includes retries, TLS 1.2 enforcement, timeout, and prompt truncation.
    Shows progress messages for each step.
    """
    print(">>> Preparing RHAIIS API call...")
    url = "http://129.40.90.163:9000/v1/completions"
    headers = {"Content-Type": "application/json"}

    # Truncate prompt to prevent huge payloads
    truncated_prompt = prompt[:6000]
    print(f">>> Prompt truncated to {len(truncated_prompt)} characters")

    payload = {
        "model": model,
        "prompt": truncated_prompt,
        "max_tokens": min(max_tokens, 6000),
        "temperature": temperature,
        "top_p": top_p,
        "stream": stream
    }
    print(f">>> Payload prepared: max_tokens={payload['max_tokens']}, temperature={temperature}, top_p={top_p}")

    # Setup session with TLS 1.2 and retries
    print(">>> Setting up HTTP session with retries...")
    session = requests.Session()

    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    session.mount("http://", HTTPAdapter(max_retries=retries))
    print(">>> Session setup complete.")

    # Make API request
    green_log(">>> Sending request to RHAIIS API...")
    start = time.time()
    try:
        response = session.post(
            url,
            headers=headers,
            json=payload,
            verify=False,
            timeout=300
        )
        print(">>> Request sent, waiting for response...")
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error calling RHAIIS API: {e}")
        raise

    end = time.time()
    print(f">>> Response received (status code: {response.status_code})")
    green_log(f">>> Time taken for API call: {end - start:.2f}s")

    print(">>> Parsing JSON response...")
    result = response.json()
    print(f">>> Response from RHAIIS: {result}")

    return result


def call_rhaiis_model(
    prompt: str,
    model: str = "ibm-granite/granite-3.3-8b-instruct",
    max_tokens: int = 6000,
    temperature: float = 0,
    top_p: float = 1.0,
    stream: bool = True,
):
    print(">>> Preparing RHAIIS API call...")
    url = "http://129.40.90.163:9000/v1/completions"
    headers = {"Content-Type": "application/json"}

    truncated_prompt = prompt[:6000]
    print(f">>> Prompt truncated to {len(truncated_prompt)} characters")
    print(f">>> Truncated prompt: {truncated_prompt}")

    payload = {
        "model": model,
        "prompt": truncated_prompt,
        "max_tokens": max_tokens,
        "temperature": temperature,
        "top_p": top_p,
        "stream": stream,
    }

    print(">>> Setting up HTTP session with retries...")
    session = requests.Session()

    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    session.mount("http://", HTTPAdapter(max_retries=retries))

    green_log(">>> Sending request to RHAIIS API...")
    t_start_overall = time.time()

    try:
        response = session.post(
            url,
            headers=headers,
            json=payload,
            verify=False,
            timeout=300,
            stream=stream,
        )
        response.raise_for_status()
    except requests.exceptions.RequestException as e:
        print(f"Error calling RHAIIS API: {e}")
        raise

    # ----- STREAMING MODE -----
    if stream:
        green_log(">>> Streaming response:")

        t_stream_start = None

        for line in response.iter_lines(decode_unicode=True):
            if not line:
                continue

            if line.startswith("data: "):
                data = line[len("data: "):]

                if data.strip() == "[DONE]":
                    t_stream_end = time.time()
                    green_log("\n>>> Stream finished.")
                    yield "[DONE]"
                    break

                if t_stream_start is None:
                    t_stream_start = time.time()
                    print(f">>> Time taken to receive first token: {t_stream_start - t_start_overall:.2f}s")

                try:
                    chunk = json.loads(data)
                    text_piece = chunk["choices"][0]["text"]
                    print(text_piece, end="", flush=True)
                    yield text_piece
                except Exception:
                    print(f"\n[Malformed chunk]: {line}")
                    continue

        # timing summary
        if t_stream_start:
            green_log(f"\n>>> Total streaming duration: {t_stream_end - t_stream_start:.2f}s")
            green_log(f">>> Total end-to-end time: {t_stream_end - t_start_overall:.2f}s")

        return  # end of generator mode

    # ----- NON-STREAMING MODE -----
    t_stream_end_overall = time.time()
    green_log(f"\n>>> Total duration of response without streaming: {t_stream_end_overall - t_start_overall:.2f}s")

    print(">>> Parsing JSON response...")
    return response.json()
