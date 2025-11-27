from datetime import datetime
from tqdm import tqdm
from pymongo import MongoClient
from opensearch_utils import ingest_code_to_os, get_os_connection, create_os_vectorstore
from rhaiis_utils import summarize
from config import (
    EMBEDDING_MODEL,
    MONGO_DB_HOST
)


def mongo_db_connection():
    client = MongoClient(MONGO_DB_HOST)
    #create a database/get the existing db
    db = client["document_store"]
    return db


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

    collection_name = f"user_{user_id}"
    os_index_name = collection_name  # same naming convention

    # -------- Mongo check --------
    mongo_exists = collection_name in mongo_db.list_collection_names()

    # -------- OpenSearch check --------
    os_client = get_os_connection()
    os_exists = os_client.indices.exists(index=os_index_name)

    # -------- Handle scenarios --------

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

        return mongo_db[collection_name]

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
            doc_summarised.append(item)
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
        print(f"Document '{doc_name}' stored in collection '{collection_name}'")
        ingest_code_to_os(docs, EMBEDDING_MODEL,collection_name)
        doc_summary = summarize(doc_content)
        collection.update_one(
            {"doc_name": doc_name},      # filter → find the record
            {"$set": {                   # update → overwrite only certain fields
                "doc_content": doc_content,
                "uploaded_at": datetime.now().isoformat()
            }}
        )
        print(f"Added summary for document '{doc_name}'")
        doc_summarised.append({"filename": doc_name, "doc_content": doc_content, "doc_summary":doc_summary})
    return doc_summarised