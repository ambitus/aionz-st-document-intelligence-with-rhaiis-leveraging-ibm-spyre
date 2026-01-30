"""
Document ingestion and management module.

This module provides functionality for ingesting documents into MongoDB and OpenSearch,
handling user-specific collections, and managing document lifecycle.
"""

import asyncio
import logging
from concurrent.futures import ThreadPoolExecutor
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
import base64
from io import BytesIO
import os

from bson import ObjectId
from pymongo import MongoClient
from rouge_score import rouge_scorer
from tqdm import tqdm
from PIL import Image

from config import EMBEDDING_MODEL, MONGO_DB_HOST
from opensearch_utils import (
    ingest_code_to_os,
    get_os_connection,
    create_os_vectorstore,
    ImageRAG
)

# Configure logging
logger = logging.getLogger(__name__)

# Create thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=4)

# Initialize ROUGE scorer
ROUGE_SCORER = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)


def mongo_db_connection() -> MongoClient:
    """
    Establish connection to MongoDB.
    
    Returns:
        MongoClient: MongoDB client instance
    """
    try:
        client = MongoClient(MONGO_DB_HOST)
        # Create a database/get the existing db
        db = client["document_store"]
        logger.debug("MongoDB connection established")
        return db
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


def convert_mongo_doc(doc: Dict) -> Dict:
    """
    Convert MongoDB document by converting ObjectId to string.
    
    Args:
        doc: MongoDB document
        
    Returns:
        Document with string _id
    """
    if "_id" in doc and isinstance(doc["_id"], ObjectId):
        doc["_id"] = str(doc["_id"])
    return doc


def check_user_exist(user_id: str) -> List[Dict]:
    """
    Check if a user exists and retrieve their documents.
    
    Args:
        user_id: User identifier
        
    Returns:
        List of user documents
    """
    logger.debug(f"Checking existence for user: {user_id}")
    
    collection_name = f"user_{user_id}"
    mongo_db = mongo_db_connection()
    mongo_exists = collection_name in mongo_db.list_collection_names()
    
    all_doc_summary = []
    if mongo_exists:
        collection = mongo_db[collection_name]
        docs = list(collection.find({}))
        all_doc_summary = [convert_mongo_doc(doc) for doc in docs]
        logger.info(f"Found {len(all_doc_summary)} documents for user {user_id}")
    
    return all_doc_summary


def get_or_create_user_collection(mongo_db: MongoClient, user_id: str) -> Any:
    """
    Ensure the user collection exists in BOTH MongoDB and OpenSearch.
    
    Scenarios handled:
      1. If exists in MongoDB but missing in OpenSearch → auto-create OS index.
      2. If exists in OpenSearch but missing in MongoDB → create MongoDB collection.
      3. If neither exists → create both.
      4. If both exists → return existing collection.
    
    Args:
        mongo_db: MongoDB client instance
        user_id: User identifier
        
    Returns:
        MongoDB collection for the user
    """
    collection_name = user_id.lower()
    os_index_name = user_id.lower()
    
    # Check MongoDB
    mongo_exists = collection_name in mongo_db.list_collection_names()
    
    # Check OpenSearch
    os_client = get_os_connection()
    os_exists = os_client.indices.exists(index=os_index_name)
    
    logger.debug(f"Collection: {collection_name}, OS exists: {os_exists}")
    
    # Case 1: neither exist
    if not mongo_exists and not os_exists:
        logger.info(f"Creating NEW MongoDB collection + OpenSearch index for '{user_id}'")
        mongo_collection = mongo_db[collection_name]
        create_os_vectorstore(index_name=os_index_name, drop_old=False)
        return mongo_collection
    
    # Case 2: Mongo exists but OS missing
    if mongo_exists and not os_exists:
        logger.warning(
            f"Mongo collection exists for '{user_id}' but OpenSearch index is missing."
        )
        logger.info("Creating missing OpenSearch index...")
        create_os_vectorstore(index_name=os_index_name, drop_old=False)
        return mongo_db[collection_name]
    
    # Case 3: OS exists but Mongo missing
    if not mongo_exists and os_exists:
        logger.warning(
            f"OpenSearch index exists for '{user_id}' BUT MongoDB collection does not!"
        )
        logger.info("Creating MongoDB collection to align state...")
        mongo_collection = mongo_db[collection_name]
        return mongo_collection
    
    # Case 4: both exist → normal path
    logger.info(f"User '{user_id}' exists in both Mongo and OpenSearch.")
    return mongo_db[collection_name]


async def ingest_documents_with_summaries_in_background(
    docs_with_summaries: List[Dict], 
    user_id: str
) -> Optional[Any]:
    """
    Background task to ingest documents with their summaries.
    
    Args:
        docs_with_summaries: List of documents with summaries
        user_id: User identifier
        
    Returns:
        Result of ingestion process
    """
    try:
        logger.info(f"Starting background ingestion for user {user_id}")
        logger.debug(f"Received {len(docs_with_summaries) if docs_with_summaries else 0} documents")
        
        if not docs_with_summaries:
            logger.warning("No documents to process")
            return None
            
        # Validate document structure
        if docs_with_summaries and isinstance(docs_with_summaries[0], dict):
            logger.debug(f"First document structure: {list(docs_with_summaries[0].keys())}")
        else:
            logger.error(f"Unexpected document structure: {type(docs_with_summaries[0])}")
            return None
        
        # Run in thread pool to avoid blocking the event loop
        result = await asyncio.get_event_loop().run_in_executor(
            executor,
            lambda: ingest_documents_to_mongodb_and_opensearch(docs_with_summaries, user_id)
        )
        
        logger.info(f"Background ingestion completed for user {user_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error in background ingestion setup: {e}")
        import traceback
        traceback.print_exc()
        raise


def ingest_documents_to_mongodb_and_opensearch(
    docs_with_summaries: List[Dict], 
    user_id: str
) -> None:
    """
    Ingest documents with pre-computed summaries to MongoDB and OpenSearch.
    
    Args:
        docs_with_summaries: List of documents with summaries
        user_id: User identifier
    """
    try:
        logger.info(f"Starting MongoDB/OpenSearch ingestion for {len(docs_with_summaries)} documents")
        
        # Connect to MongoDB
        mongo_db = mongo_db_connection()
        
        # Create user-specific collection
        collection_name = f"user_{user_id}".lower()
        collection = get_or_create_user_collection(mongo_db, collection_name)
        
        # Process documents with progress bar
        for i, doc_data in enumerate(tqdm(docs_with_summaries, desc="Ingesting documents")):
            # Validate document data
            if not isinstance(doc_data, dict):
                logger.error(f"Document {i} is not a dict: {type(doc_data)}")
                continue
                
            doc_name = doc_data.get("filename", f"unknown_{i}")
            doc_content = doc_data.get("content", "")
            doc_summary = doc_data.get("summary_clean", doc_data.get("summary", ""))
            
            if not doc_content:
                logger.warning(f"Skipping document {doc_name}: No content")
                continue
                
            logger.debug(f"Processing document {i+1}/{len(docs_with_summaries)}: {doc_name}")
            
            # Check for existing document
            existing = collection.find_one({"doc_name": doc_name})
            if existing:
                logger.info(f"Skipping duplicate document '{doc_name}' for user '{user_id}'")
                continue
            
            # Calculate ROUGE scores
            try:
                if doc_summary:
                    scores = ROUGE_SCORER.score(doc_content, doc_summary)
                    logger.debug(f"Scores for {doc_name}: {scores}")
                else:
                    scores = {"rouge1": 0, "rouge2": 0, "rougeL": 0}
                    logger.debug(f"No summary available for {doc_name}, using default scores")
            except Exception as e:
                logger.error(f"Error calculating scores for {doc_name}: {e}")
                scores = {"rouge1": 0, "rouge2": 0, "rougeL": 0}
            
            # Create document entry
            document = {
                "doc_name": doc_name,
                "doc_content": doc_content,
                "doc_summary": doc_summary,
                "uploaded_at": datetime.now().isoformat(),
                "Rouge_Score": scores,
                "is_image": doc_data.get("is_image", False)
            }
            
            # Insert into MongoDB
            try:
                result = collection.insert_one(document)
                logger.debug(f"Added document '{doc_name}' to MongoDB with ID: {result.inserted_id}")
            except Exception as e:
                logger.error(f"Error inserting into MongoDB: {e}")
                continue
            
            # Ingest to OpenSearch (only for non-image documents)
            if not doc_data.get("is_image", False):
                try:
                    os_doc = [{
                        "filename": doc_name,
                        "text": doc_content
                    }]
                    
                    logger.debug(f"Preparing to ingest to OpenSearch: {doc_name} (content length: {len(doc_content)})")
                    ingest_code_to_os(os_doc, EMBEDDING_MODEL, collection_name)
                    logger.debug(f"Ingested '{doc_name}' to OpenSearch")
                except Exception as e:
                    logger.error(f"Error ingesting to OpenSearch: {e}")
                    # Continue even if OpenSearch fails
                    continue
        
        logger.info(f"Completed ingestion of {len(docs_with_summaries)} documents for user {user_id}")
        
    except Exception as e:
        logger.error(f"Critical error in ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise


async def ingest_images_to_mongodb_and_opensearch(
    images_data: List[Dict], 
    user_id: str
) -> Optional[Any]:
    """
    Background task to ingest images to MongoDB and OpenSearch ImageRAG index.
    
    Args:
        images_data: List of image data dictionaries
        user_id: User identifier
        
    Returns:
        Result of ingestion process
    """
    try:
        logger.info(f"Starting background image ingestion for user {user_id}")
        logger.debug(f"Received {len(images_data) if images_data else 0} images")
        
        if not images_data:
            logger.warning("No images to process")
            return None
        
        # Run in thread pool to avoid blocking the event loop
        result = await asyncio.get_event_loop().run_in_executor(
            executor,
            lambda: _ingest_images_sync(images_data, user_id)
        )
        
        logger.info(f"Background image ingestion completed for user {user_id}")
        return result
        
    except Exception as e:
        logger.error(f"Error in background image ingestion setup: {e}")
        import traceback
        traceback.print_exc()
        raise


def _ingest_images_sync(images_data: List[Dict], user_id: str) -> Dict[str, Any]:
    """
    Synchronous function to ingest images to MongoDB and OpenSearch.
    """
    try:
        logger.info(f"Starting MongoDB/OpenSearch image ingestion for {len(images_data)} images")
        
        # Connect to MongoDB
        mongo_db = mongo_db_connection()
        
        # Create user-specific collection
        collection_name = f"user_{user_id}".lower()
        document_index_name = collection_name  # This is the regular document index
        collection = get_or_create_user_collection(mongo_db, collection_name)
        
        # Initialize ImageRAG
        image_rag = ImageRAG()
        image_index_name = f"user_{user_id}_images".lower()
        
        # Create image-specific index if it doesn't exist
        image_rag.create_image_index(image_index_name, drop_existing=False)
        
        results = {
            "successful": 0,
            "failed": 0,
            "errors": []
        }
        
        # Process images with progress bar
        for i, img_data in enumerate(tqdm(images_data, desc="Ingesting images")):
            filename = img_data.get("filename", f"unknown_image_{i}")
            image_data = img_data.get("image_data", {})
            caption = img_data.get("caption")  # Get pre-generated caption
            
            try:
                # First, save image temporarily to process with ImageRAG
                temp_image_path = f"/tmp/{filename}"
                
                # Decode base64 and save to temp file
                base64_content = image_data.get("base64_content", "")
                if base64_content:
                    image_bytes = base64.b64decode(base64_content)
                    with open(temp_image_path, "wb") as f:
                        f.write(image_bytes)
                    
                    # If we don't have a caption from streaming, generate one
                    if not caption:
                        caption = image_rag.generate_image_caption(temp_image_path)
                    
                    # Extract embedding
                    embedding = image_rag.extract_image_embedding(temp_image_path)
                    
                    # Prepare image document for image index
                    image = Image.open(temp_image_path)
                    image_doc = {
                        "image_vector": embedding.tolist(),
                        "image_path": temp_image_path,
                        "filename": filename,
                        "caption": caption,
                        "metadata": {
                            "width": image.width,
                            "height": image.height,
                            "format": image.format,
                            "size_bytes": os.path.getsize(temp_image_path),
                        },
                        "timestamp": datetime.now().isoformat(),
                        "user_id": user_id
                    }
                    
                    # Index in OpenSearch image index
                    doc_id = f"{user_id}_{filename}"
                    es_client = get_os_connection()
                    response = es_client.index(
                        index=image_index_name,
                        body=image_doc,
                        id=doc_id,
                        refresh=True
                    )
                    
                    # Also index the caption in the regular document index
                    try:
                        # Create a document-like entry for the image
                        doc_entry = [{
                            "filename": filename,
                            "text": f"Image description: {caption}"
                        }]
                        
                        from opensearch_utils import ingest_code_to_os
                        ingest_code_to_os(
                            docs=doc_entry,
                            model_name=EMBEDDING_MODEL,
                            index_name=document_index_name
                        )
                    except Exception as e:
                        logger.warning(f"Failed to index image description in document index: {e}")
                    
                    # Create MongoDB document for the image
                    document = {
                        "doc_name": filename,
                        "doc_content": caption,
                        "doc_summary": caption,
                        "uploaded_at": datetime.now().isoformat(),
                        "Rouge_Score": {"rouge1": 0, "rouge2": 0, "rougeL": 0},
                        "is_image": True,
                        "image_metadata": {
                            "width": image_data.get("width", 0),
                            "height": image_data.get("height", 0),
                            "format": image_data.get("format", "unknown"),
                            "content_type": image_data.get("content_type", "image/unknown"),
                            "size_bytes": image_data.get("size_bytes", 0)
                        },
                        "caption": caption
                    }
                    
                    # Check for existing document
                    existing = collection.find_one({"doc_name": filename})
                    if existing:
                        logger.info(f"Skipping duplicate image '{filename}' for user '{user_id}'")
                    else:
                        # Insert into MongoDB
                        result = collection.insert_one(document)
                        logger.debug(f"Added image '{filename}' to MongoDB with ID: {result.inserted_id}")
                        results["successful"] += 1
                    
                    # Clean up temp file
                    try:
                        os.remove(temp_image_path)
                    except:
                        pass
                    
                else:
                    error_msg = f"No image content for '{filename}'"
                    logger.error(error_msg)
                    results["failed"] += 1
                    results["errors"].append({
                        "filename": filename,
                        "error": error_msg
                    })
                    
            except Exception as e:
                error_msg = f"Error processing image '{filename}': {str(e)}"
                logger.error(error_msg)
                results["failed"] += 1
                results["errors"].append({
                    "filename": filename,
                    "error": error_msg
                })
        
        logger.info(f"Completed image ingestion: {results['successful']} successful, {results['failed']} failed")
        return results
        
    except Exception as e:
        logger.error(f"Critical error in image ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise


async def delete_from_mongodb(user_id: str, filename: str) -> bool:
    """
    Delete a single document from MongoDB.
    
    Args:
        user_id: User identifier
        filename: Name of the file to delete
        
    Returns:
        bool: True if deletion was successful, False otherwise
    """
    try:
        def sync_delete():
            """Synchronous delete operation to run in thread pool."""
            db = mongo_db_connection()
            collection_name = f"user_{user_id}".lower()
            
            if collection_name not in db.list_collection_names():
                logger.warning(f"Collection '{collection_name}' does not exist")
                return type('obj', (object,), {'deleted_count': 0})()
            
            collection = db[collection_name]
            result = collection.delete_one({"doc_name": filename})
            return result
        
        # Execute in thread pool
        result = await asyncio.get_event_loop().run_in_executor(executor, sync_delete)
        
        if result.deleted_count > 0:
            logger.info(f"Deleted '{filename}' from MongoDB")
            return True
        else:
            logger.warning(f"Document '{filename}' not found in MongoDB")
            return False
            
    except Exception as e:
        logger.error(f"Error deleting from MongoDB: {e}")
        raise


# Export public API - added new image ingestion function
__all__ = [
    "mongo_db_connection",
    "convert_mongo_doc",
    "check_user_exist",
    "get_or_create_user_collection",
    "ingest_documents_with_summaries_in_background",
    "ingest_documents_to_mongodb_and_opensearch",
    "ingest_images_to_mongodb_and_opensearch",  # NEW
    "delete_from_mongodb",
]