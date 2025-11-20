from datetime import datetime
from tqdm import tqdm
from pymongo import MongoClient
from opensearch_utils import ingest_code_to_os
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


def get_or_create_user_collection(mongo_db,user_id: str):
    """Return a user-specific MongoDB collection, creating it if needed."""
    collection_name = f"user_{user_id}"
    if collection_name not in mongo_db.list_collection_names():
        print(f"Creating new collection for user '{user_id}'")
    else:
        print(f"User '{user_id}' already exists")
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