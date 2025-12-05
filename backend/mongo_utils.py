from datetime import datetime
from tqdm import tqdm
from pymongo import MongoClient
from opensearch_utils import ingest_code_to_os, get_os_connection, create_os_vectorstore
from rag import summarize
from config import (
    EMBEDDING_MODEL,
    MONGO_DB_HOST
)
from bson import ObjectId
from rouge_score import rouge_scorer
from concurrent.futures import ThreadPoolExecutor
import asyncio
from datetime import datetime

# Create thread pool for CPU-bound operations
executor = ThreadPoolExecutor(max_workers=4)


scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)


def mongo_db_connection():
    client = MongoClient(MONGO_DB_HOST)
    #create a database/get the existing db
    db = client["document_store"]
    return db


def convert_mongo_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc


def check_user_exist(user_id: str):
    """
    Check if a user exists
    """

    print("Inside user exist function")
    collection_name = f"user_{user_id}"
    mongo_db = mongo_db_connection()
    mongo_exists = collection_name in mongo_db.list_collection_names()
    all_doc_summary = []
    if mongo_exists:
        collection = mongo_db[collection_name]
        docs = list(collection.find({}))
        all_doc_summary = [convert_mongo_doc(doc) for doc in docs]
        return all_doc_summary


def get_or_create_user_collection(mongo_db, user_id: str):
    """
    Ensure the user collection exists in BOTH:
      1. MongoDB
      2. OpenSearch index

    Rules:
      - If exists in MongoDB but missing in OS → auto-create OS index.
      - If exists in OS but missing in Mongo → warn (or delete OS index, your choice).
      - If neither exists → create both.
    """

    collection_name = user_id
    os_index_name = user_id  # same naming convention

    # -------- Mongo check --------
    mongo_exists = collection_name in mongo_db.list_collection_names()

    # -------- OpenSearch check --------
    os_client = get_os_connection()
    os_exists = os_client.indices.exists(index=os_index_name)

    # -------- Handle scenarios --------

    print(collection_name, os_exists)
    # Case 1: neither exist
    if not mongo_exists and not os_exists:
        print(f"[INFO] Creating NEW MongoDB collection + OpenSearch index for '{user_id}'")
        mongo_collection = mongo_db[collection_name]

        # Create OS index using your existing helper
        create_os_vectorstore(index_name=os_index_name, drop_old=False)

        return mongo_collection

    # Case 2: Mongo exists but OS missing
    if mongo_exists and not os_exists:
        print(f"[WARN] Mongo collection exists for '{user_id}' but OpenSearch index is missing.")
        print("[ACTION] Creating missing OpenSearch index…")

        create_os_vectorstore(index_name=os_index_name, drop_old=False)
        return mongo_db[collection_name]

    # Case 3: OS exists but Mongo missing
    if not mongo_exists and os_exists:
        print(f"[WARN] OpenSearch index exists for '{user_id}' BUT MongoDB collection does not!")
        print("[ACTION] Creating MongoDB collection to align state…")
        
        mongo_collection = mongo_db[collection_name]
        return mongo_collection

    # Case 4: both exist → normal path
    print(f"[OK] User '{user_id}' exists in both Mongo and OpenSearch.")
    return mongo_db[collection_name]


def ingest_document_in_mongodb(docs,user_id):
    mongo_db = mongo_db_connection()

    # Creating user specific collections
    collection_name = f"user_{user_id}"
    collection = get_or_create_user_collection(mongo_db, collection_name)

    doc_summarised=[]
    for item in tqdm(docs, desc=f"Processing user {user_id}"):
        doc_name = item["filename"]
        doc_content = item["text"]
        existing = collection.find_one({"doc_name":doc_name})
        if existing:
            print(f"Skipping duplicate document '{doc_name}' for user '{user_id}'")
            doc_summarised.append(convert_mongo_doc(existing))
            continue

        # create the document entry
        document = {
            "doc_name": doc_name,
            "doc_content": doc_content,
            "uploaded_at": datetime.now().isoformat(),
        }
        document.pop("_id", None)
        # insert document into a particular user collection
        collection.insert_one(document)
        ingest_code_to_os(docs, EMBEDDING_MODEL, collection_name)
        doc_summary = summarize(doc_content)
        doc_summary_text = doc_summary["choices"][0]["text"].split("Summarize the following document:", 1)[1].strip()
        
        scores = scorer.score(doc_content, doc_summary_text)
        print(scores)
        collection.update_one(
            {"doc_name": doc_name},      # filter → find the record
            {"$set": {                   # update → overwrite only certain fields
                "doc_summary": doc_summary,
                "uploaded_at": datetime.now().isoformat(),
                "Rouge Score": scores
            }}
        )

        print(type(doc_summary))
        print(f"Added summary for document '{doc_name}'")
        doc_summarised.append({"filename": doc_name, "doc_content": doc_content, "doc_summary":doc_summary})
    return doc_summarised


async def ingest_documents_with_summaries_in_background(
    docs_with_summaries: list, 
    user_id: str
):
    """Background task to ingest documents with their summaries - FIXED VERSION"""
    try:
        # Debug: Check what we're receiving
        print(f"Starting background ingestion for user {user_id}")
        print(f"Received {len(docs_with_summaries) if docs_with_summaries else 0} documents")
        
        if not docs_with_summaries:
            print("No documents to process")
            return
            
        # Check structure of first document
        if docs_with_summaries and isinstance(docs_with_summaries[0], dict):
            print(f"First document structure: {list(docs_with_summaries[0].keys())}")
        else:
            print(f"Unexpected document structure: {type(docs_with_summaries[0])}")
            return
        
        # Run in thread pool to avoid blocking the event loop
        result = await asyncio.get_event_loop().run_in_executor(
            executor,
            lambda: ingest_documents_to_mongodb_and_opensearch(docs_with_summaries, user_id)
        )
        
        print(f"Background ingestion completed for user {user_id}")
        return result
        
    except Exception as e:
        print(f"Error in background ingestion setup: {e}")
        import traceback
        traceback.print_exc()


def ingest_documents_to_mongodb_and_opensearch(docs_with_summaries: list, user_id: str):
    """Ingest documents with pre-computed summaries to MongoDB and OpenSearch - FIXED"""
    try:
        print(f"Starting MongoDB/OpenSearch ingestion for {len(docs_with_summaries)} documents")
        
        # Connect to MongoDB
        mongo_db = mongo_db_connection()
        
        # Creating user specific collections
        collection_name = f"user_{user_id}"
        collection = get_or_create_user_collection(mongo_db, collection_name)
        
        for i, doc_data in enumerate(docs_with_summaries):
            # Ensure doc_data is a dictionary
            if not isinstance(doc_data, dict):
                print(f"Document {i} is not a dict: {type(doc_data)}")
                continue
                
            doc_name = doc_data.get("filename", f"unknown_{i}")
            doc_content = doc_data.get("content", "")
            doc_summary = doc_data.get("summary_clean", doc_data.get("summary", ""))
            
            if not doc_content:
                print(f"Skipping document {doc_name}: No content")
                continue
                
            print(f"Processing document {i+1}/{len(docs_with_summaries)}: {doc_name}")
            
            # Check for existing document
            existing = collection.find_one({"doc_name": doc_name})
            if existing:
                print(f"Skipping duplicate document '{doc_name}' for user '{user_id}'")
                continue
            
            try:
                # Calculate scores if scorer is available
                if 'scorer' in globals() and doc_summary:
                    scores = scorer.score(doc_content, doc_summary)
                    print(f"Scores for {doc_name}: {scores}")
                else:
                    scores = {"rouge1": 0, "rouge2": 0, "rougeL": 0}
                    print(f"No scorer available for {doc_name}, using default scores")
            except Exception as e:
                print(f"Error calculating scores for {doc_name}: {e}")
                scores = {"rouge1": 0, "rouge2": 0, "rougeL": 0}
            
            # Create the document entry with summary
            document = {
                "doc_name": doc_name,
                "doc_content": doc_content,
                "doc_summary": doc_summary,
                "uploaded_at": datetime.now().isoformat(),
                "Rouge_Score": scores
            }
            
            # Insert document into MongoDB
            try:
                result = collection.insert_one(document)
                print(f"Added document '{doc_name}' to MongoDB with ID: {result.inserted_id}")
            except Exception as e:
                print(f"Error inserting into MongoDB: {e}")
                continue
            
            # Ingest to OpenSearch - FIXED: Pass proper format
            try:
                # Prepare data in the format expected by ingest_code_to_os
                # It expects a list of dicts with "filename" and "text" keys
                os_doc = [{
                    "filename": doc_name,
                    "text": doc_content
                }]
                
                # Make sure EMBEDDING_MODEL is defined
                embedding_model = globals().get('EMBEDDING_MODEL', 'all-MiniLM-L6-v2')
                
                print(f"Preparing to ingest to OpenSearch: {doc_name} (content length: {len(doc_content)})")
                
                # Call ingest_code_to_os with the correct format
                ingest_code_to_os(os_doc, embedding_model, collection_name)
                
                print(f"Ingested '{doc_name}' to OpenSearch")
            except Exception as e:
                print(f"Error ingesting to OpenSearch: {e}")
                import traceback
                traceback.print_exc()
                # Continue even if OpenSearch fails
        
        print(f"Completed ingestion of {len(docs_with_summaries)} documents for user {user_id}")
        
    except Exception as e:
        print(f"Critical error in ingestion: {e}")
        import traceback
        traceback.print_exc()
        raise


async def delete_from_mongodb(user_id: str, filename: str) -> bool:
    """
    Delete a single document from MongoDB
    """
    try:
        def sync_delete():
            db = mongo_db_connection()
            collection_name = f"user_{user_id}"
            collection = db[collection_name]
            result = collection.delete_one({"doc_name": filename})
            return result
        
        import asyncio
        from concurrent.futures import ThreadPoolExecutor
        
        executor = ThreadPoolExecutor(max_workers=5)
        result = await asyncio.get_event_loop().run_in_executor(executor, sync_delete)
        
        if result.deleted_count > 0:
            print(f"Deleted '{filename}' from MongoDB")
            return True
        else:
            print(f"Document '{filename}' not found in MongoDB")
            return False
            
    except Exception as e:
        print(f"Error deleting from MongoDB: {e}")
        raise
