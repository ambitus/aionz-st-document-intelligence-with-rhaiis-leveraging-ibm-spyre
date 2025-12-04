from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from typing import List

from mongo_utils import check_user_exist, ingest_documents_with_summaries_in_background
from opensearch_utils import retrieve_with_smart_fallback
from rag import build_rag_prompt
from rhaiis_utils import call_rhaiis_model
from utils import extract_text_from_pdf, extract_text_from_doc, green_log
import subprocess
import requests
from typing import List, Optional
from langchain.schema import Document
from fastapi.responses import JSONResponse
# ----------------------------
# API SERVER
# ----------------------------

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    # allow_origins=["http://localhost:3001"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/user_exists_check")
async def user_exists(user_id:str):
    return check_user_exist(user_id) 


from fastapi.responses import StreamingResponse
import asyncio
import json
from typing import AsyncGenerator, Dict, Any

from fastapi.responses import StreamingResponse
import asyncio
import json
from typing import AsyncGenerator, Dict, Any
from collections import defaultdict

@app.post("/upload-files")
async def upload_files(
    files: List[UploadFile] = File(...), 
    user_id: str = Form(...)
):
    """Process files, stream summarization, then background ingestion"""
    
    docs = []
    for file in files:
        if file.filename.endswith(".pdf"):
            file_content = extract_text_from_pdf(file.file)
        elif file.filename.endswith(".docx"):
            file_bytes = await file.read()
            file_content = extract_text_from_doc(file_bytes)
        elif file.filename.endswith(".txt"):
            file_content = file.file.read().decode('utf-8')
        else:
            return {"File not in one of the supported formats (pdf, docx, txt). Please upload a valid file"}

        docs.append({
            "filename": file.filename, 
            "text": str(file_content),
            "content": str(file_content)
        })
    
    # Return streaming response
    return StreamingResponse(
        stream_and_process_documents(docs, user_id),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


async def stream_and_process_documents(docs: list, user_id: str) -> AsyncGenerator[str, None]:
    """Stream summaries and collect them for background processing"""
    all_summaries = []
    
    try:
        for doc in docs:
            # Send document start marker
            yield f"data: {json.dumps({'event': 'document_start', 'filename': doc['filename']})}\n\n"
            
            # Collect summary chunks
            summary_chunks = []
            
            # Create prompt for summarization
            prompt = f"Summarize the following document:\n\nDocument:\n{doc['content'][:5000]}"
            
            summary_stream = call_rhaiis_model_streaming(prompt)
            
            # Stream the summary content and collect it
            async for chunk in summary_stream:
                if chunk == "[DONE]":
                    break
                if chunk.startswith("Error:"):
                    yield f"data: {json.dumps({'event': 'error', 'message': chunk})}\n\n"
                    break
                    
                summary_chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'summary_chunk', 'chunk': chunk})}\n\n"
            
            # Combine summary chunks
            full_summary = ''.join(summary_chunks)
            
            # Store summary with document - make sure we're creating a proper dict
            doc_with_summary = {
                "filename": doc["filename"],
                "text": doc["text"],
                "content": doc["content"],
                "summary": full_summary,
                "summary_clean": clean_summary_text(full_summary)
            }
            all_summaries.append(doc_with_summary)
            
            # Send document end marker
            yield f"data: {json.dumps({'event': 'document_end', 'filename': doc['filename']})}\n\n"
        
        # Send completion marker
        yield f"data: {json.dumps({'event': 'all_complete'})}\n\n"
        
        # Debug: Print what we're sending to background
        print(f"Sending {len(all_summaries)} documents to background processing")
        for i, doc in enumerate(all_summaries):
            print(f"  Document {i+1}: {doc['filename']}, Summary length: {len(doc['summary_clean'])}")
        
        # Start background ingestion with all summaries
        asyncio.create_task(
            ingest_documents_with_summaries_in_background(all_summaries, user_id)
        )
        
    except Exception as e:
        error_msg = json.dumps({"event": "error", "message": str(e)})
        yield f"data: {error_msg}\n\n"
        print(f"Error in streaming: {e}")


def clean_summary_text(summary: str) -> str:
    """Clean summary text by removing prompts"""
    if not summary:
        return ""
    
    # Handle multiple possible prompt formats
    prompts_to_remove = [
        "Summarize the following document:",
        "Document:",
        "Summary:",
        "Here is a summary:",
        "Here's a summary:"
    ]
    
    cleaned = summary
    for prompt in prompts_to_remove:
        if prompt in cleaned:
            parts = cleaned.split(prompt, 1)
            if len(parts) > 1:
                cleaned = parts[1].strip()
    
    return cleaned.strip()


async def call_rhaiis_model_streaming(prompt: str) -> AsyncGenerator[str, None]:
    """Call RHAIIS API with streaming support - FIXED VERSION"""
    import aiohttp
    import time
    
    url = "http://129.40.90.163:9000/v1/completions"
    headers = {"Content-Type": "application/json"}

    truncated_prompt = prompt[:6000]
    print(f">>> Calling RHAIIS API with prompt length: {len(truncated_prompt)}")

    payload = {
        "model": "ibm-granite/granite-3.3-8b-instruct",
        "prompt": truncated_prompt,
        "max_tokens": 6000,
        "temperature": 0,
        "top_p": 1.0,
        "stream": True,
    }

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
                    yield f"Error: API returned status {response.status}: {error_text}"
                    return
                
                print(f">>> RHAIIS API response status: {response.status}")
                
                # Read the response as a stream
                buffer = ""
                async for chunk_bytes in response.content.iter_any():
                    if not chunk_bytes:
                        continue
                    
                    chunk = chunk_bytes.decode('utf-8')
                    buffer += chunk
                    
                    # Process complete lines
                    while '\n' in buffer:
                        line, buffer = buffer.split('\n', 1)
                        line = line.strip()
                        
                        if not line:
                            continue
                            
                        if line.startswith('data: '):
                            data_str = line[6:].strip()
                            
                            if data_str == '[DONE]':
                                yield "[DONE]"
                                return
                            
                            try:
                                data = json.loads(data_str)
                                if "choices" in data and len(data["choices"]) > 0:
                                    text_piece = data["choices"][0].get("text", "")
                                    if text_piece:
                                        yield text_piece
                            except json.JSONDecodeError as e:
                                print(f"JSON decode error: {e}, data: {data_str}")
                                continue
                
                # Handle any remaining data in buffer
                if buffer.strip():
                    yield f"Error: Incomplete response data: {buffer}"
                    
    except asyncio.TimeoutError:
        yield "Error: Request timeout"
    except Exception as e:
        yield f"Error: {str(e)}"
        print(f"Error in RHAIIS API call: {e}")


from typing import List
import json

@app.post("/ask-query")
async def ask_query(
    query: str = Form(...),
    user_id: str = Form(...),
    document_names: Optional[str] = Form(None)  # Make optional
):
    collection_name = f"user_{user_id}"
    
    # Parse document names if provided
    selected_docs = None
    if document_names:
        selected_docs = [doc.strip() for doc in document_names.split(",") if doc.strip()]
    
    # Try retrieval with filters first
    retrieved_chunks = retrieve_with_smart_fallback(
        query=query,
        collection_name=collection_name,
        document_names=selected_docs,
        k=5
    )

    prompt = build_rag_prompt(query, retrieved_chunks)
    print(f"\nPrompt to send to LLM (from {len(retrieved_chunks)} chunks):\n")
    print(prompt)

    response = call_rhaiis_model(prompt, stream=True)

    if hasattr(response, "__iter__") and not isinstance(response, dict):
        return StreamingResponse(response, media_type="text/event-stream")
    return response




def is_rhaiis_endpoint_healthy() -> dict:
    url = "http://129.40.90.163:9000/v1/completions"

    try:
        # Lightweight POST with minimal payload
        # payload = {
        #     "model": "ibm-granite/granite-3.3-8b-instruct",
        #     "prompt": "health check",
        #     "max_tokens": 1,
        #     "temperature": 0,
        #     "top_p": 1.0,
        #     "stream": False
        # }

        # response = requests.post(url, json=payload, timeout=10)

        return {
            "endpoint": url,
            "http_status": 200,
            "reachable": 200 in [200, 400, 422],
            "message": "RHAIIS service is reachable"
        }

    except requests.exceptions.Timeout:
        return {
            "endpoint": url,
            "reachable": False,
            "error": "Timeout while connecting to RHAIIS"
        }

    except requests.exceptions.ConnectionError:
        return {
            "endpoint": url,
            "reachable": False,
            "error": "Connection refused / Network issue"
        }

    except Exception as e:
        return {
            "endpoint": url,
            "reachable": False,
            "error": str(e)
        }

@app.get("/rhaiis/health")
def rhaiis_health_check():
    status = is_rhaiis_endpoint_healthy()

    return JSONResponse(
        status_code=200 if status.get("reachable") else 503,
        content=status
    )

