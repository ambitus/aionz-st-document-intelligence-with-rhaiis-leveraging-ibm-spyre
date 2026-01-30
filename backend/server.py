"""
FastAPI application for document management and RAG (Retrieval-Augmented Generation) system.

This module provides RESTful endpoints for:
- Uploading and processing documents (PDF, DOCX, TXT, Images)
- Checking user existence and document status
- Deleting documents from storage
- Querying documents with RAG-based question answering (with integrated image support)
- Streaming responses for real-time interaction
"""

import asyncio
import json
import os
import re
import time
import urllib.parse
from typing import AsyncGenerator, Dict, List, Optional, Any
import base64
from io import BytesIO

from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse, StreamingResponse
from langchain.schema import Document
from PIL import Image

from mongo_utils import (
    check_user_exist,
    delete_from_mongodb,
    ingest_documents_with_summaries_in_background,
    ingest_images_to_mongodb_and_opensearch
)
from opensearch_utils import (
    delete_from_opensearch, 
    retrieve_with_smart_fallback,
    get_os_connection,
    ImageRAG
)
from rag import build_rag_prompt, build_summarize_prompt
from rhaiis_utils import call_rhaiis_model_streaming
from utils import extract_text_from_doc, extract_text_from_pdf

# Configure logging
import logging
logger = logging.getLogger(__name__)

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
# IMAGE PROCESSING UTILS
# ----------------------------

def is_image_file(filename: str) -> bool:
    """Check if file is an image based on extension."""
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.tiff', '.webp'}
    return any(filename.lower().endswith(ext) for ext in image_extensions)


def validate_image_file(file: UploadFile) -> bool:
    """Validate that the uploaded file is a valid image."""
    try:
        # Check file extension
        if not is_image_file(file.filename):
            return False
        
        # Try to open and verify the image
        contents = file.file.read()
        file.file.seek(0)  # Reset file pointer
        image = Image.open(BytesIO(contents))
        image.verify()  # Verify it's a valid image
        return True
    except Exception:
        return False


def process_image_file(file: UploadFile) -> Dict:
    """
    Process an image file and return metadata and base64 encoded content.
    """
    try:
        contents = file.file.read()
        file.file.seek(0)  # Reset for potential future reads
        
        # Get image info
        image = Image.open(BytesIO(contents))
        
        # Convert to base64 for storage
        buffered = BytesIO()
        image_format = image.format or 'JPEG'
        image.save(buffered, format=image_format)
        img_str = base64.b64encode(buffered.getvalue()).decode('utf-8')
        
        return {
            "filename": file.filename,
            "content_type": f"image/{image_format.lower()}",
            "width": image.width,
            "height": image.height,
            "format": image_format,
            "size_bytes": len(contents),
            "base64_content": img_str,
            "text": f"Image: {file.filename} - {image.width}x{image.height} {image_format} image"
        }
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error processing image: {str(e)}")


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
    """Process files (documents AND images), stream summarization, then background ingestion."""
    
    user_id = user_id.lower()
    docs = []
    images = []  # Separate list for images
    
    # Start overall metrics tracking
    from rhaiis_utils import SimpleMetricsTracker
    overall_metrics = SimpleMetricsTracker.start_tracking(
        "/upload-files",
        user_id=user_id,
        file_count=len(files),
        file_names=[file.filename for file in files]
    )

    for file in files:
        # Normalize filename for consistent storage
        normalized_filename = sanitize_filename_for_storage(file.filename)
        
        # Check if file is an image
        if is_image_file(normalized_filename):
            # Validate image
            if not validate_image_file(file):
                raise HTTPException(
                    status_code=400, 
                    detail=f"File '{normalized_filename}' is not a valid image"
                )
            
            # Process image
            try:
                image_data = process_image_file(file)
                images.append({
                    "filename": normalized_filename,
                    "image_data": image_data,
                    "user_id": user_id
                })
                # For image summary, we'll generate caption in background
                docs.append({
                    "filename": normalized_filename,
                    "text": f"Image file: {normalized_filename}",
                    "content": f"Image file: {normalized_filename} - To be described by AI",
                    "is_image": True  # Flag to indicate this is an image
                })
            except Exception as e:
                raise HTTPException(
                    status_code=400, 
                    detail=f"Error processing image '{normalized_filename}': {str(e)}"
                )
        
        # Handle documents (existing logic)
        elif normalized_filename.endswith(".pdf"):
            file_content = extract_text_from_pdf(file.file)
            docs.append({
                "filename": normalized_filename,
                "text": str(file_content),
                "content": str(file_content),
                "is_image": False
            })
        elif normalized_filename.endswith(".docx"):
            file_bytes = await file.read()
            file_content = extract_text_from_doc(file_bytes)
            docs.append({
                "filename": normalized_filename,
                "text": str(file_content),
                "content": str(file_content),
                "is_image": False
            })
        elif normalized_filename.endswith(".txt"):
            file_content = file.file.read().decode('utf-8')
            docs.append({
                "filename": normalized_filename,
                "text": str(file_content),
                "content": str(file_content),
                "is_image": False
            })
        else:
            raise HTTPException(
                status_code=400, 
                detail="File not in one of the supported formats (pdf, docx, txt, jpg, png, gif, bmp). Please upload a valid file"
            )
    
    # Update metrics with file type info
    doc_count = len([d for d in docs if not d.get('is_image', False)])
    image_count = len([d for d in docs if d.get('is_image', False)])
    overall_metrics["additional_info"].update({
        "document_count": doc_count,
        "image_count": image_count
    })

    print(f"\nUPLOAD SUMMARY: {doc_count} documents, {image_count} images for user {user_id}")

    # Return streaming response
    return StreamingResponse(
        stream_and_process_files(docs, images, user_id, overall_metrics),
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
    Handles both documents and images.
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
            
            # Delete from OpenSearch - try both document and image indices
            os_deleted = await delete_from_opensearch(user_id, normalized_filename)
            if os_deleted:
                deleted_from_opensearch = True
            
            # If it's an image, also delete from image-specific index
            if is_image_file(normalized_filename):
                try:
                    image_rag = ImageRAG()
                    image_index_name = f"user_{user_id}_images".lower()
                    image_deleted = image_rag.delete_image(
                        index_name=image_index_name,
                        image_path=normalized_filename,
                        user_id=user_id
                    )
                    if image_deleted:
                        logger.info(f"Also deleted image from image index: {normalized_filename}")
                except Exception as e:
                    errors.append(f"Error deleting from image index: {str(e)}")
                
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
    document_names: Optional[str] = Form(None),
    include_images: bool = Form(True),
    search_only_images: bool = Form(False)
) -> StreamingResponse:
    """
    Ask a query using RAG (Retrieval-Augmented Generation).
    Now supports integrated image search alongside documents.
    
    Automatically detects if document_names contains only images and adjusts search strategy.
    """
    from rhaiis_utils import SimpleMetricsTracker

    user_id = user_id.lower()
    collection_name = f"user_{user_id}"

    # Start overall metrics tracking
    overall_metrics = SimpleMetricsTracker.start_tracking(
        "/ask-query",
        user_id=user_id,
        query=query[:100],  # Store first 100 chars
        query_length=len(query)
    )

    # Track timing for different phases
    overall_start_time = time.time()
    retrieval_start_time = time.time()

    # Parse document names if provided
    selected_docs = None
    selected_images = None
    has_images_only = False
    has_documents_only = False
    has_mixed_files = False

    if document_names:
        # Normalize document names
        all_files = [normalize_filename(name.strip()) for name in document_names.split(",") if name.strip()]

        # Separate files into documents and images
        document_list = []
        image_list = []

        for filename in all_files:
            if is_image_file(filename):
                image_list.append(filename)
            else:
                document_list.append(filename)

        # Determine the type of search based on file types
        if image_list and not document_list:
            # Only images were specified
            has_images_only = True
            selected_images = image_list

            # Auto-set search_only_images to True if only images are specified
            if not search_only_images:
                search_only_images = True

        elif document_list and not image_list:
            # Only documents were specified
            has_documents_only = True
            selected_docs = document_list

            # If only documents, we might not need to search images
            if include_images and not search_only_images:
                pass

        elif image_list and document_list:
            # Mixed files (both images and documents)
            has_mixed_files = True
            selected_docs = document_list
            selected_images = image_list

        # Update metrics
        overall_metrics["additional_info"].update({
            "document_count": len(document_list),
            "image_count": len(image_list),
            "search_only_images": search_only_images,
            "include_images": include_images,
            "file_types": {
                "images_only": has_images_only,
                "documents_only": has_documents_only,
                "mixed": has_mixed_files
            }
        })

    # Initialize context variables
    document_context = ""
    image_context = ""
    retrieved_chunks = []
    image_results = []

    try:
        # Search documents (unless searching only images)
        if not search_only_images:
            retrieved_chunks = retrieve_with_smart_fallback(
                query=query,
                collection_name=collection_name,
                document_names=selected_docs,  # Pass document names (not image names)
                k=5  # Increase to get more context
            )

            # Build document context
            if retrieved_chunks:
                document_context = "Relevant document excerpts:\n"
                for i, chunk in enumerate(retrieved_chunks):
                    content = chunk.page_content.strip()
                    source = chunk.metadata.get('doc_name', 'Unknown source')
                    document_context += f"\n--- Excerpt from {source} ---\n{content}\n"

        # Search images (if requested or if we have specific images to search)
        should_search_images = (
            include_images or 
            search_only_images or 
            (selected_images and len(selected_images) > 0)
        )

        if should_search_images:
            try:
                image_rag = ImageRAG()
                image_index_name = f"user_{user_id}_images".lower()

                # Check if image index exists
                es_client = get_os_connection()
                if not es_client.indices.exists(index=image_index_name):
                    logger.warning(f"Image index '{image_index_name}' does not exist")
                    image_results = []
                else:
                    # If specific images were requested by name
                    if selected_images and len(selected_images) > 0:
                        # For each requested image, get ALL its embeddings
                        all_image_results = []
                        for img_name in selected_images:
                            image_embeddings = image_rag.get_all_embeddings_for_image(
                                index_name=image_index_name,
                                image_filename=img_name,
                                user_id=user_id
                            )
                            all_image_results.extend(image_embeddings)

                        image_results = all_image_results

                        # If we have a query, also do semantic search for additional context
                        if query and query.strip() and len(image_results) == 0:
                            # Only do semantic search if we didn't find the specific images
                            semantic_results = image_rag.search_images(
                                query=query,
                                index_name=image_index_name,
                                k=3,
                                user_id=user_id
                            )
                            image_results = semantic_results
                    else:
                        # No specific images requested - do normal semantic search
                        if query and query.strip():
                            image_results = image_rag.search_images(
                                query=query,
                                index_name=image_index_name,
                                k=3 if search_only_images else 1,
                                user_id=user_id
                            )

                # Build image context
                if image_results:
                    # Group results by image filename for better organization
                    images_by_filename = {}
                    for img in image_results:
                        filename = img.get('filename', 'unknown')
                        if filename not in images_by_filename:
                            images_by_filename[filename] = []
                        images_by_filename[filename].append(img)

                    image_context = "\n\nRelevant Images:\n"
                    for filename, img_list in images_by_filename.items():
                        # Get the best caption from all embeddings for this image
                        captions = [img.get('caption', '') for img in img_list if img.get('caption')]
                        best_caption = captions[0] if captions else "No caption available"

                        image_context += f"\nImage: {filename}\n"
                        image_context += f"Description: {best_caption}\n"

                        # If there are multiple embeddings for the same image, note it
                        if len(img_list) > 1:
                            image_context += f"(Found {len(img_list)} different views/embeddings of this image)\n"

                else:
                    image_context = ""

            except Exception as e:
                logger.error(f"Error searching images: {e}")
                # Continue without image context if there's an error
                if search_only_images:
                    raise HTTPException(
                        status_code=500,
                        detail=f"Error searching images: {str(e)}"
                    )

        # Calculate retrieval time
        retrieval_end_time = time.time()
        retrieval_time = retrieval_end_time - retrieval_start_time

        # Print retrieval metrics
        print(f"\nRETRIEVAL METRICS:")
        print(f"  Retrieval time: {retrieval_time:.2f} seconds")
        print(f"  Documents retrieved: {len(retrieved_chunks)}")
        print(f"  Images retrieved: {len(image_results)}")

        # Combine contexts
        full_context = ""
        if document_context:
            full_context += document_context
        if image_context:
            full_context += image_context

        # Handle case where no context is found
        if not full_context:
            if search_only_images:
                full_context = "No relevant images found for your query."
            elif has_images_only:
                full_context = "The specified images were not found or contain no relevant information."
            elif has_documents_only:
                full_context = "No relevant information found in the specified documents."
            else:
                full_context = "No relevant information found in the provided documents or images."

        # Build the prompt
        prompt = build_rag_prompt(query, retrieved_chunks, image_context)

        print(f"  Prompt content: {prompt}")

        # Update metrics with retrieval info
        overall_metrics["additional_info"].update({
            "retrieval_time_seconds": retrieval_time,
            "retrieved_chunks_count": len(retrieved_chunks),
            "retrieved_images_count": len(image_results),
            "total_context_length": len(full_context),
            "prompt_length": len(prompt)
        })

        print(f"  Context length: {len(full_context)} chars")
        print(f"  Prompt length: {len(prompt)} chars")

        # Log for debugging
        context_summary = []
        if retrieved_chunks:
            context_summary.append(f"{len(retrieved_chunks)} document chunks")
        if image_results:
            context_summary.append(f"{len(image_results)} images")

        print(f"\nQUERY ANALYSIS:")
        print(f"  Query: '{query[:50]}...'")
        print(f"  Context sources: {', '.join(context_summary) if context_summary else 'none'}")

        # Return streaming response
        return StreamingResponse(
            stream_rhaiis_response(prompt, overall_metrics),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error in ask_query: {e}")

        # Print error metrics
        print(f"\nERROR METRICS:")
        print(f"  Error time: {time.time() - overall_start_time:.2f} seconds")
        print(f"  Error: {str(e)}")

        raise HTTPException(
            status_code=500,
            detail=f"Error processing query: {str(e)}"
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


async def stream_and_process_files(
    docs: List[Dict[str, Any]], 
    images: List[Dict[str, Any]], 
    user_id: str,
    overall_metrics: Dict[str, Any] = None
) -> AsyncGenerator[str, None]:
    """Stream summaries and collect them for background processing."""
    from rhaiis_utils import SimpleMetricsTracker

    all_summaries = []
    all_images = []  # Store images for background processing

    user_id = user_id.lower()

    # Track summary-specific metrics
    summary_start_time = time.time()
    processed_files = 0
    total_summary_chars = 0

    try:
        # First process documents
        for doc in docs:
            # Skip images in document processing (they're handled separately)
            if doc.get("is_image", False):
                continue

            file_start_time = time.time()
            file_metrics = SimpleMetricsTracker.start_tracking(
                "file_summary",
                filename=doc['filename'],
                file_type="document",
                content_length=len(doc['content'])
            )

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

            prompt = build_summarize_prompt(doc)

            # Call RHAIIS with metrics
            summary_stream = call_rhaiis_model_streaming(prompt, file_metrics)

            # Collect summary chunks
            summary_chunks = []
            file_summary_chars = 0

            # Stream the summary content and collect it
            async for chunk in summary_stream:
                if chunk == "[DONE]":
                    break
                if chunk.startswith("Error:"):
                    yield f"data: {json.dumps({'event': 'error', 'message': chunk})}\n\n"
                    break

                summary_chunks.append(chunk)
                file_summary_chars += len(chunk)
                yield f"data: {json.dumps({'event': 'summary_chunk', 'doc-summary': chunk})}\n\n"

            # Combine summary chunks
            full_summary = ''.join(summary_chunks)
            total_summary_chars += len(full_summary)

            file_end_time = time.time()
            file_processing_time = file_end_time - file_start_time

            print(f"  {doc['filename']}: {len(full_summary)} chars, {file_processing_time:.2f}s")

            # Store summary with document
            doc_with_summary = {
                "filename": doc["filename"],
                "text": doc["text"],
                "content": doc["content"],
                "summary": full_summary,
                "summary_clean": clean_summary_text(full_summary),
                "is_image": False,
                "processing_time_seconds": file_processing_time,
                "summary_length": len(full_summary)
            }
            all_summaries.append(doc_with_summary)

            processed_files += 1

            # Send document end marker
            yield f"data: {json.dumps({'event': 'document_end', 'filename': doc['filename']})}\n\n"

        # Then process images - NOW WITH REAL DESCRIPTIONS
        for img_data in images:
            filename = img_data["filename"]
            image_data = img_data["image_data"]

            file_start_time = time.time()

            # Send image processing start
            yield f"data: {json.dumps({'event': 'image_start', 'filename': filename})}\n\n"

            try:
                # Generate image description immediately (not in background)
                image_rag = ImageRAG()

                # Save image temporarily to generate description
                temp_image_path = f"/tmp/{filename}"
                image_bytes = base64.b64decode(image_data["base64_content"])
                with open(temp_image_path, "wb") as f:
                    f.write(image_bytes)

                # Generate caption
                caption = image_rag.generate_image_caption(temp_image_path)

                # Clean up temp file
                try:
                    os.remove(temp_image_path)
                except:
                    pass

                # Stream the image description as summary chunks
                caption_chunks = [caption[i:i+100] for i in range(0, len(caption), 100)]

                for chunk in caption_chunks:
                    yield f"data: {json.dumps({'event': 'summary_chunk', 'doc-summary': chunk})}\n\n"
                    await asyncio.sleep(0.05)  # Small delay for realistic streaming

                # Store image for background processing
                all_images.append(img_data)

                # Add to summaries list with actual description
                image_summary = {
                    "filename": filename,
                    "text": f"Image: {filename} - {caption}",
                    "content": f"Image file: {filename}\nDescription: {caption}",
                    "summary": caption,
                    "summary_clean": caption,
                    "is_image": True,
                    "image_data": img_data["image_data"],
                    "caption": caption,  # Store caption for later use
                    "processing_time_seconds": time.time() - file_start_time,
                    "summary_length": len(caption)
                }
                all_summaries.append(image_summary)

                total_summary_chars += len(caption)
                processed_files += 1

                print(f"  {filename}: {len(caption)} chars, {time.time() - file_start_time:.2f}s")

                # Send image end marker
                yield f"data: {json.dumps({'event': 'image_end', 'filename': filename})}\n\n"

            except Exception as e:
                logger.error(f"Error generating caption for image '{filename}': {e}")
                # Fallback: stream error message
                error_msg = f"Error processing image: {str(e)[:100]}"
                yield f"data: {json.dumps({'event': 'summary_chunk', 'doc-summary': error_msg})}\n\n"

                # Store with error
                all_images.append(img_data)
                all_summaries.append({
                    "filename": filename,
                    "text": f"Image: {filename} - Processing error",
                    "content": f"Image file: {filename} - Error during processing",
                    "summary": "Image processing failed",
                    "summary_clean": "Image processing failed",
                    "is_image": True,
                    "image_data": img_data["image_data"],
                    "processing_time_seconds": time.time() - file_start_time
                })

                yield f"data: {json.dumps({'event': 'image_end', 'filename': filename})}\n\n"

        # Calculate total summary metrics
        summary_end_time = time.time()
        total_summary_time = summary_end_time - summary_start_time

        # Print overall upload metrics
        print("\n" + "="*60)
        print("UPLOAD PROCESSING COMPLETE - SUMMARY METRICS")
        print("="*60)
        print(f"User ID: {user_id}")
        print(f"Total files processed: {processed_files}")
        print(f"Total processing time: {total_summary_time:.2f} seconds")
        print(f"Average time per file: {total_summary_time/processed_files:.2f} seconds" if processed_files > 0 else "No files processed")
        print(f"Total summary characters: {total_summary_chars}")
        print(f"Documents: {len([d for d in all_summaries if not d.get('is_image', False)])}")
        print(f"Images: {len([d for d in all_summaries if d.get('is_image', False)])}")
        print("="*60 + "\n")

        # Complete overall metrics
        if overall_metrics:
            overall_metrics["additional_info"].update({
                "total_files_processed": processed_files,
                "total_processing_time": total_summary_time,
                "total_summary_characters": total_summary_chars
            })
            SimpleMetricsTracker.complete_and_print(overall_metrics)

        # Send completion marker
        yield f"data: {json.dumps({'event': 'all_complete'})}\n\n"

        # Debug log
        print(f"Sending {len(all_summaries)} files to background processing "
              f"({len([d for d in all_summaries if not d.get('is_image', False)])} documents, "
              f"{len([d for d in all_summaries if d.get('is_image', False)])} images)")

        # Start background ingestion for documents
        if any(not d.get('is_image', False) for d in all_summaries):
            asyncio.create_task(
                ingest_documents_with_summaries_in_background(
                    [d for d in all_summaries if not d.get('is_image', False)], 
                    user_id
                )
            )

        # Start background ingestion for images
        if all_images:
            asyncio.create_task(
                ingest_images_to_mongodb_and_opensearch(all_images, user_id)
            )

        return

    except Exception as e:
        error_msg = json.dumps({"event": "error", "message": str(e)})
        yield f"data: {error_msg}\n\n"
        print(f"Error in streaming: {e}")

        # Complete metrics with error
        if overall_metrics:
            overall_metrics["additional_info"]["error"] = str(e)
            SimpleMetricsTracker.complete_and_print(overall_metrics)


async def generate_image_description(image_data: Dict) -> str:
    """
    Generate a description for an image using ImageRAG.
    
    Args:
        image_data: Dictionary containing image metadata and base64 content
        
    Returns:
        str: Generated image caption/description
    """
    try:
        image_rag = ImageRAG()
        filename = image_data["filename"]

        # Save image temporarily
        temp_image_path = f"/tmp/{filename}"
        image_bytes = base64.b64decode(image_data["base64_content"])
        with open(temp_image_path, "wb") as f:
            f.write(image_bytes)

        # Generate caption
        caption = image_rag.generate_image_caption(temp_image_path)

        # Clean up
        try:
            os.remove(temp_image_path)
        except:
            pass

        return caption

    except Exception as e:
        logger.error(f"Error generating image description: {e}")
        return f"Image: {image_data['filename']} - Error generating description: {str(e)[:100]}"


async def stream_rhaiis_response(prompt: str, overall_metrics: Dict[str, Any]) -> AsyncGenerator[str, None]:
    """Stream RHAIIS response with metrics tracking."""
    from rhaiis_utils import SimpleMetricsTracker

    # Start inference metrics
    inference_metrics = SimpleMetricsTracker.start_tracking(
        "inference",
        prompt_length=len(prompt),
        user_id=overall_metrics.get("additional_info", {}).get("user_id", "unknown")
    )

    try:
        # Call RHAIIS with metrics
        response_stream = call_rhaiis_model_streaming(prompt, inference_metrics)

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

        # After streaming completes, print overall chat metrics
        print(f"\nCHAT COMPLETE - OVERALL METRICS:")
        print(f"  User: {overall_metrics.get('additional_info', {}).get('user_id', 'unknown')}")
        print(f"  Query: '{overall_metrics.get('additional_info', {}).get('query', '')[:50]}...'")
        print(f"  Retrieval time: {overall_metrics.get('additional_info', {}).get('retrieval_time_seconds', 0):.2f}s")

        # Complete overall metrics
        overall_metrics["additional_info"]["inference_complete"] = True
        SimpleMetricsTracker.complete_and_print(overall_metrics)

    except Exception as e:
        error_data = json.dumps({"error": str(e)})
        yield f"data: {error_data}\n\n"

        print(f"Error in streaming: {e}")

        # Complete metrics with error
        inference_metrics["additional_info"]["error"] = str(e)
        SimpleMetricsTracker.complete_and_print(inference_metrics)
        SimpleMetricsTracker.complete_and_print(overall_metrics)


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