from datetime import datetime
from tqdm import tqdm
from pymongo import MongoClient
from opensearch_utils import ingest_code_to_os, get_os_connection, create_os_vectorstore
from rhaiis_utils import summarize
from config import (
    EMBEDDING_MODEL,
    MONGO_DB_HOST
)
from bson import ObjectId
from rouge_score import rouge_scorer


scorer = rouge_scorer.RougeScorer(['rouge1', 'rouge2', 'rougeL'], use_stemmer=True)


def mongo_db_connection():
    client = MongoClient(MONGO_DB_HOST)
    #create a database/get the existing db
    db = client["document_store"]
    return db

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


def convert_mongo_doc(doc):
    doc["_id"] = str(doc["_id"])
    return doc

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
