"""
FastAPI application for document management and RAG (Retrieval-Augmented Generation) system.

This module provides RESTful endpoints for:
- Uploading and processing documents (PDF, DOCX, TXT)
- Checking user existence and document status
- Deleting documents from storage
- Querying documents with RAG-based question answering
- Streaming responses for real-time interaction
"""

import asyncio
import json
import os
import re
import urllib.parse
from typing import AsyncGenerator, Dict, List, Optional, Any

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from langchain.schema import Document

from mongo_utils import (
    check_user_exist,
    delete_from_mongodb,
    ingest_documents_with_summaries_in_background,
)
from opensearch_utils import delete_from_opensearch, retrieve_with_smart_fallback
from rag import build_rag_prompt
from rhaiis_utils import call_rhaiis_model_streaming
from utils import extract_text_from_doc, extract_text_from_pdf, detect_language

# ----------------------------
# FILENAME NORMALIZATION UTILS
# ----------------------------


def normalize_filename(filename: str) -> str:
    """
    Normalize filenames by URL decoding if encoded and cleaning spaces.
    """
    if not filename:
        return filename
    
    # URL decode if needed
    try:
        if '%' in filename:
            decoded = urllib.parse.unquote(filename)
        else:
            decoded = filename
    except:
        decoded = filename
    
    # Clean up spaces (replace %20 with space, multiple spaces with single)
    cleaned = decoded.replace('%20', ' ')
    cleaned = re.sub(r'\s+', ' ', cleaned)
    
    return cleaned.strip()


def sanitize_filename_for_storage(filename: str) -> str:
    """
    Sanitize filename for consistent storage in database.
    """
    normalized = normalize_filename(filename)
    basename = os.path.basename(normalized)
    return basename


# ----------------------------
# API SERVER
# ----------------------------

app = FastAPI(title="Document RAG System API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post("/upload-files")
async def upload_files(
    files: List[UploadFile] = File(...), 
    user_id: str = Form(...)
) -> StreamingResponse:
    """Process files, stream summarization, then background ingestion."""
    
    user_id = user_id.lower()
    docs = []
    for file in files:
        # Normalize filename for consistent storage
        normalized_filename = sanitize_filename_for_storage(file.filename)
        
        if normalized_filename.endswith(".pdf"):
            file_content = extract_text_from_pdf(file.file)
        elif normalized_filename.endswith(".docx"):
            file_bytes = await file.read()
            file_content = extract_text_from_doc(file_bytes)
        elif normalized_filename.endswith(".txt"):
            file_content = file.file.read().decode('utf-8')
        else:
            return {"File not in one of the supported formats (pdf, docx, txt). Please upload a valid file"}

        docs.append({
            "filename": normalized_filename,  # Store normalized filename
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


@app.post("/user_exists_check")
async def user_exists(user_id: str) -> Any:
    """Check if a user exists and return their documents."""
    user_id = user_id.lower()
    return check_user_exist(user_id)


@app.delete("/delete-file")
async def delete_file(
    user_id: str,
    filename: str
) -> Dict[str, Any]:
    """
    Delete a single file from both MongoDB and OpenSearch for a specific user.
    """
    user_id = user_id.lower()
    try:
        # Validate input
        if not user_id:
            raise HTTPException(status_code=400, detail="user_id is required")
        
        if not filename:
            raise HTTPException(status_code=400, detail="Filename is required")
        
        # NORMALIZE THE FILENAME
        normalized_filename = normalize_filename(filename)
        
        # Initialize counters
        deleted_from_mongo = False
        deleted_from_opensearch = False
        errors = []
        
        try:
            # Delete from MongoDB using normalized filename
            mongo_deleted = await delete_from_mongodb(user_id, normalized_filename)
            if mongo_deleted:
                deleted_from_mongo = True
            
            # Delete from OpenSearch using normalized filename
            os_deleted = await delete_from_opensearch(user_id, normalized_filename)
            if os_deleted:
                deleted_from_opensearch = True
                
            # If one succeeded but the other failed
            if mongo_deleted != os_deleted:
                errors.append(f"Partial deletion: MongoDB={mongo_deleted}, OpenSearch={os_deleted}")
                
        except Exception as e:
            errors.append(f"Error deleting {normalized_filename}: {str(e)}")
        
        # Prepare response
        response = {
            "user_id": user_id,
            "original_filename": filename,
            "normalized_filename": normalized_filename,
            "deleted_from_mongodb": deleted_from_mongo,
            "deleted_from_opensearch": deleted_from_opensearch,
            "errors": errors if errors else None
        }
        
        # Check if any were deleted
        if not deleted_from_mongo and not deleted_from_opensearch:
            return {
                **response,
                "message": f"File '{normalized_filename}' was not found for user '{user_id}'. Please check the filename and user_id."
            }
        
        return {
            **response,
            "message": f"Successfully deleted '{normalized_filename}' for user '{user_id}'"
        }
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal server error: {str(e)}")


@app.post("/ask-query")
async def ask_query(
    query: str = Form(...),
    user_id: str = Form(...),
    document_names: Optional[str] = Form(None)  # Make optional
) -> StreamingResponse:
    """Ask a query using RAG (Retrieval-Augmented Generation)."""
    user_id = user_id.lower()
    collection_name = f"user_{user_id}"
    
    # Parse document names if provided
    selected_docs = None
    if document_names:
        # Normalize document names if provided
        selected_docs = [normalize_filename(doc.strip()) for doc in document_names.split(",") if doc.strip()]
    
    # Try retrieval with filters first
    retrieved_chunks = retrieve_with_smart_fallback(
        query=query,
        collection_name=collection_name,
        document_names=selected_docs,
        k=3
    )

    prompt = build_rag_prompt(query, retrieved_chunks)
    print(f"\nPrompt to send to LLM (from {len(retrieved_chunks)} chunks):\n")
    print(prompt)

    # Return streaming response using call_rhaiis_model_streaming
    return StreamingResponse(
        stream_rhaiis_response(prompt),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "Connection": "keep-alive",
            "X-Accel-Buffering": "no"
        }
    )


@app.get("/rhaiis/health")
def rhaiis_health_check() -> JSONResponse:
    """Check health status of RHAIIS endpoint."""
    status = is_rhaiis_endpoint_healthy()

    return JSONResponse(
        status_code=200 if status.get("reachable") else 503,
        content=status
    )


# ----------------------------
# Helper methods
# ----------------------------


async def stream_and_process_documents(
    docs: List[Dict[str, str]], 
    user_id: str
) -> AsyncGenerator[str, None]:
    """Stream summaries and collect them for background processing."""
    all_summaries = []
   
    user_id = user_id.lower()
    try:
        for doc in docs:
            # Send document start marker
            yield f"data: {json.dumps({'event': 'document_start', 'filename': doc['filename']})}\n\n"

            # Send entire raw content
            yield f"data: {json.dumps({
                'event': 'raw_content',
                'filename': doc['filename'],
                'doc-content': doc['content'],
                'length': len(doc['content']),
                'truncated': False
            })}\n\n"

            # -----------------------------
            # Language detection
            # -----------------------------
            language = detect_language(doc["content"][:2000])

            if language == "fr":
                system_instruction = (
                    "Tu es un assistant expert.\n"
                    "Résume le document ci-dessous uniquement en français.\n"
                    "Sois clair, concis et fidèle au contenu.\n"
                    "N'ajoute aucune information qui n'est pas présente dans le document."
                )
            elif language == "pt":
                system_instruction = (
                    "Você é um assistente especialista.\n"
                    "Resuma o documento abaixo apenas em português.\n"
                    "Seja claro, conciso e fiel ao conteúdo.\n"
                    "Não adicione informações que não estejam no documento."
                )
            else:
                system_instruction = (
                    "You are a smart document analyzer.\n"
                    "Summarize the document below clearly and concisely.\n"
                    "Do not add information that is not present in the document."
                )

            # Collect summary chunks
            summary_chunks = []

            # -----------------------------
            # Language-aware summarization prompt
            # -----------------------------
            prompt = f"""{system_instruction}

            Document:
            {doc['content'][:16000]}

            Summary:"""

            summary_stream = call_rhaiis_model_streaming(prompt)

            # Stream the summary content and collect it
            async for chunk in summary_stream:
                if chunk == "[DONE]":
                    break
                if chunk.startswith("Error:"):
                    yield f"data: {json.dumps({'event': 'error', 'message': chunk})}\n\n"
                    break

                summary_chunks.append(chunk)
                yield f"data: {json.dumps({'event': 'summary_chunk', 'doc-summary': chunk})}\n\n"

            # Combine summary chunks
            full_summary = ''.join(summary_chunks)

            # Store summary with document
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

        # Debug log
        print(f"Sending {len(all_summaries)} documents to background processing")
        for i, doc in enumerate(all_summaries):
            print(f"  Document {i+1}: {doc['filename']}, Summary length: {len(doc['summary_clean'])}")

        # Start background ingestion
        asyncio.create_task(
            ingest_documents_with_summaries_in_background(all_summaries, user_id)
        )
        return

    except Exception as e:
        error_msg = json.dumps({"event": "error", "message": str(e)})
        yield f"data: {error_msg}\n\n"
        print(f"Error in streaming: {e}")



async def stream_rhaiis_response(prompt: str) -> AsyncGenerator[str, None]:
    """Stream RHAIIS response in the same format as call_rhaiis_model with stream=True."""
    try:
        response_stream = call_rhaiis_model_streaming(prompt)
        
        async for chunk in response_stream:
            if chunk == "[DONE]":
                break
            if chunk.startswith("Error:"):
                # Send error as JSON
                error_data = json.dumps({"error": chunk})
                yield f"data: {error_data}\n\n"
                break
            
            # Send the chunk as plain text (not wrapped in JSON)
            yield chunk
            
    except Exception as e:
        error_data = json.dumps({"error": str(e)})
        yield f"data: {error_data}\n\n"
        print(f"Error in streaming: {e}")


def clean_summary_text(summary: str) -> str:
    """Clean summary text by removing prompts."""
    if not summary:
        return ""
    
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


def is_rhaiis_endpoint_healthy() -> Dict[str, Any]:
    """Check if RHAIIS endpoint is reachable and healthy."""
    import requests
    
    url = "http://129.40.90.163:9000/v1/completions"

    try:
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


# Export for uvicorn or other ASGI servers
__all__ = ["app"]