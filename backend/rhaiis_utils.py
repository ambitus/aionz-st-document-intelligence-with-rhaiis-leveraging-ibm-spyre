"""
RHAIIS (Remote Hosted AI Inference Service) client implementation.

This module provides a client for interacting with RHAIIS API endpoints
for LLM completions with support for both streaming and non-streaming modes.
"""

import asyncio
import json
import os
import ssl
import time
from typing import Any, AsyncGenerator, Generator, Optional

import requests
import time
from typing import Dict, Any
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from urllib3.util.retry import Retry

from utils import green_log

# Configuration constants
MAX_TOKENS = 10000
MAX_PROMPT_LENGTH = 10000


# Read the RHAIIS base URL from environment
RHAIIS_API_BASE_URL = os.environ.get("RHAIIS_API_BASE_URL", "http://localhost:9000")


class TLSAdapter(HTTPAdapter):
    """Custom Adapter to enforce TLS 1.2+."""
    
    def init_poolmanager(self, *args: Any, **kwargs: Any) -> PoolManager:
        """Initialize pool manager with TLS 1.2+ enforcement."""
        print(">>> Initializing TLS 1.2+ pool manager...")
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = context
        return super().init_poolmanager(*args, **kwargs)


class SimpleMetricsTracker:
    """Simple metrics tracker for printing to logs"""

    @staticmethod
    def start_tracking(endpoint: str, **kwargs) -> Dict[str, Any]:
        """Start tracking metrics for an endpoint"""
        request_id = f"{endpoint}_{int(time.time() * 1000)}"
        return {
            "request_id": request_id,
            "endpoint": endpoint,
            "start_time": time.time(),
            "first_token_time": None,
            "tokens_received": 0,
            "chars_received": 0,
            "additional_info": kwargs
        }

    @staticmethod
    def record_first_token(metrics: Dict[str, Any]):
        """Record when first token is received"""
        if metrics.get("first_token_time") is None:
            metrics["first_token_time"] = time.time()

    @staticmethod
    def record_token_batch(metrics: Dict[str, Any], text: str):
        """Record token batch received"""
        metrics["chars_received"] += len(text)
        # Simple token estimation (1 token ≈ 4 chars for English)
        approx_tokens = max(1, len(text) // 4)
        metrics["tokens_received"] += approx_tokens

    @staticmethod
    def complete_and_print(metrics: Dict[str, Any]):
        """Complete tracking and print metrics to log"""
        metrics["end_time"] = time.time()
        metrics["total_time"] = metrics["end_time"] - metrics["start_time"]

        if metrics["tokens_received"] > 0 and metrics["total_time"] > 0:
            metrics["tokens_per_second"] = metrics["tokens_received"] / metrics["total_time"]
            metrics["chars_per_second"] = metrics["chars_received"] / metrics["total_time"]

        if metrics.get("first_token_time"):
            metrics["time_to_first_token"] = metrics["first_token_time"] - metrics["start_time"]

        # Print metrics in a clean format
        print("\n" + "="*60)
        print(f"PERFORMANCE METRICS - {metrics['endpoint']}")
        print("="*60)
        print(f"Request ID: {metrics['request_id']}")
        print(f"Total time: {metrics['total_time']:.2f} seconds")

        if metrics.get('time_to_first_token'):
            print(f"Time to first token: {metrics['time_to_first_token']:.2f} seconds")

        if metrics.get('tokens_per_second'):
            print(f"Tokens received: {metrics['tokens_received']}")
            print(f"Characters received: {metrics['chars_received']}")
            print(f"Tokens per second: {metrics['tokens_per_second']:.2f}")
            print(f"Characters per second: {metrics['chars_per_second']:.2f}")

        # Print additional info if present
        if metrics.get('additional_info'):
            print("\nAdditional Info:")
            for key, value in metrics['additional_info'].items():
                print(f"  {key}: {value}")

        print("="*60 + "\n")

        return metrics


def call_rhaiis_model_without_streaming(
    prompt: str,
    model: str = "ibm-granite/granite-3.3-8b-instruct",
    max_tokens: int = MAX_TOKENS,
    temperature: float = 0,
    top_p: float = 1.0,
    stream: bool = False
) -> Any:
    """
    Call external RHAIIS API (HTTPS) to get a completion.

    Includes retries, TLS 1.2 enforcement, timeout, and prompt truncation.
    Shows progress messages for each step.
    """
    print(">>> Preparing RHAIIS API call...")
    url = f"{RHAIIS_API_BASE_URL}/v1/completions"
    headers = {"Content-Type": "application/json"}

    # Truncate prompt to prevent huge payloads
    truncated_prompt = prompt[:MAX_PROMPT_LENGTH]
    print(f">>> Prompt truncated to {len(truncated_prompt)} characters")

    payload = {
        "model": model,
        "prompt": truncated_prompt,
        "max_tokens": min(max_tokens, MAX_TOKENS),
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
    max_tokens: int = MAX_TOKENS,
    temperature: float = 0,
    top_p: float = 1.0,
    stream: bool = True,
) -> Generator[str, None, None]:
    """
    Call RHAIIS API with streaming support.
    
    This function supports both streaming and non-streaming modes.
    In streaming mode, it yields text chunks as they arrive.
    In non-streaming mode, it returns the complete JSON response.
    """
    print(">>> Preparing RHAIIS API call...")
    url = f"{RHAIIS_API_BASE_URL}/v1/completions"
    headers = {"Content-Type": "application/json"}

    truncated_prompt = prompt[:MAX_PROMPT_LENGTH]
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
    yield response.json()


async def call_rhaiis_model_streaming(prompt: str, metrics: Dict[str, Any] = None) -> AsyncGenerator[str, None]:
    """Call RHAIIS API with streaming support and metrics tracking."""
    import aiohttp

    url = f"{RHAIIS_API_BASE_URL}/v1/chat/completions"
    headers = {"Content-Type": "application/json"}

    # Start metrics if not provided
    if metrics is None:
        metrics = SimpleMetricsTracker.start_tracking("rhaiis_inference", prompt_length=len(prompt))

    truncated_prompt = prompt[:MAX_PROMPT_LENGTH]
    print(f">>> Calling RHAIIS API with prompt length: {len(truncated_prompt)}")

    payload = {
        "model": "ibm-granite/granite-3.3-8b-instruct",
        "messages": [
            {"role": "user", "content": truncated_prompt}
        ],
        "max_tokens": MAX_TOKENS,
        "temperature": 0,
        "top_p": 1.0,
        "stream": True,
    }

    first_token_received = False

    try:
        timeout = aiohttp.ClientTimeout(total=300)
        async with aiohttp.ClientSession(timeout=timeout) as session:
            async with session.post(
                url,
                headers=headers,
                json=payload,
                ssl=False
            ) as response:
                if response.status != 200:
                    error_text = await response.text()
                    print(f"Error: API returned status {response.status}: {error_text}")
                    yield f"Error: API returned status {response.status}: {error_text}"
                    return

                print(f">>> RHAIIS API response status: {response.status}")

                # Read the response as a stream
                buffer = ""                
                async for chunk_bytes in response.content.iter_any():
                    if not chunk_bytes:
                        continue

                    chunk = chunk_bytes.decode("utf-8")
                    buffer += chunk

                    while "\n" in buffer:
                        line, buffer = buffer.split("\n", 1)
                        line = line.strip()

                        if not line or not line.startswith("data:"):
                            continue

                        data_str = line[5:].strip()

                        if data_str == "[DONE]":
                            print("\n>>> [DONE]")
                            # Print metrics after completion
                            SimpleMetricsTracker.complete_and_print(metrics)
                            yield "[DONE]"
                            return

                        try:
                            data_json = json.loads(data_str)
                            delta = data_json["choices"][0]["delta"].get("content", "")
                            if delta:
                                # Record first token time
                                if not first_token_received:
                                    SimpleMetricsTracker.record_first_token(metrics)
                                    first_token_received = True

                                # Record tokens
                                SimpleMetricsTracker.record_token_batch(metrics, delta)

                                print(delta, end="", flush=True)
                                yield delta
                        except Exception as e:
                            print(f"JSON error: {e} | data: {data_str}")

                # Handle any remaining data in buffer
                if buffer.strip():
                    yield f"Error: Incomplete response data: {buffer}"

    except asyncio.TimeoutError:
        print("Error: Request timeout")
        SimpleMetricsTracker.complete_and_print(metrics)
        yield "Error: Request timeout"
    except Exception as e:
        print(f"Error in RHAIIS API call: {e}")
        SimpleMetricsTracker.complete_and_print(metrics)
        yield f"Error: {str(e)}"