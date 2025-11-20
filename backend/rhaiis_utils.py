import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from urllib3.util.retry import Retry
import time
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
        response = call_rhaiis_model(prompt)
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


def call_rhaiis_model(
    prompt: str,
    model: str = "ibm-granite/granite-3.3-8b-instruct",
    max_tokens: int = 8000,
    temperature: float = 0,
    top_p: float = 1.0
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
        "top_p": top_p
    }
    print(f">>> Payload prepared: max_tokens={payload['max_tokens']}, temperature={temperature}, top_p={top_p}")

    # Setup session with TLS 1.2 and retries
    print(">>> Setting up HTTP session with TLS 1.2 and retries...")
    session = requests.Session()
    session.mount("https://", TLSAdapter())

    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
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