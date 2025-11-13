from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from docx import Document
import io
from datetime import datetime
from tqdm import tqdm
from langchain.vectorstores.elasticsearch import ElasticsearchStore
from langchain.embeddings import HuggingFaceEmbeddings
from elasticsearch import Elasticsearch
from typing import List
from pymongo import MongoClient
from transformers import AutoModelForCausalLM, AutoTokenizer, set_seed
import torch

from config import (
    ES_HOST,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    MONGO_DB_HOST
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

def extract_text_from_pdf(pdf: str) -> str:
    """
    Extracts all text from a PDF using PyPDF2.
    Works on s390x (no C extensions required).
    """
    text = ""
    try:
        reader = PdfReader(pdf)
        for page in reader.pages:
            # Extract text safely; handle missing text gracefully
            text += (page.extract_text() or "") + "\n"
    except Exception as e:
        print(f"Failed to extract text from {pdf}: {e}")
    return text.strip()

def extract_text_from_doc(doc):
    ''' 
    Extract text from a doc using 
    '''
    doc = Document(io.BytesIO(doc))
    text = "\n".join([para.text for para in doc.paragraphs])
    return text

def get_es_connection():
    """
    Establish a connection to the Elasticsearch instance.

    Returns:
        Elasticsearch: Configured Elasticsearch client object.
    """
    return Elasticsearch(hosts=[ES_HOST], verify_certs=False)


def chunk_code(code_text, size=CHUNK_SIZE, overlap=CHUNK_OVERLAP):
    """
    Split source code into overlapping line-based chunks.

    Args:
        code_text (str): Full source code as a single string.
        size (int): Number of lines per chunk.
        overlap (int): Number of overlapping lines between consecutive chunks.

    Returns:
        list[str]: List of code chunks.
    """
    lines = code_text.split("\n")
    chunks = []
    for i in range(0, len(lines), size - overlap):
        chunk = "\n".join(lines[i:i + size])
        if chunk.strip():
            chunks.append(chunk)
    return chunks

def ingest_code_to_es(docs, model_name=EMBEDDING_MODEL, index_name="shreyaganeshe46@gmail.com"):
    """
    Incrementally embed and ingest code snippets into Elasticsearch.

    Args:
        docs (list[dict]): List of dicts with keys:
            - "filename": str, file name or unique doc identifier.
            - "text": str, raw source code content.
        model_name (str): Hugging Face model for embedding.
        index_name (str): Elasticsearch index name.
    """

    # Initialize embedding model and ES client
    embedder = HuggingFaceEmbeddings(model_name=model_name)
    es_client = get_es_connection()

    vectorstore=ElasticsearchStore(
        es_connection=es_client,
        index_name=index_name,
        embedding=embedder,
    )  
    all_chunks, all_metadata = [], []

    for item in tqdm(docs, desc="Embedding new code"):
        doc_name = item["filename"]
        doc_content = item["text"]
        print(type(doc_content))
        chunks = chunk_code(doc_content)

        all_chunks.extend(chunks)
        all_metadata.extend([
            {
                "doc_name": doc_name,
                "doc_content": doc_content,
                "timestamp": datetime.now().isoformat(),
            }
        ] * len(chunks))

    vectorstore.add_texts(texts=all_chunks, metadatas=all_metadata)
    print(f"Ingested {len(all_chunks)} new code chunks into `{index_name}`")

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
        ingest_code_to_es(docs, EMBEDDING_MODEL,collection_name)
        doc_summary = summarize(doc_content)
        # collection.update_one(
        #     {"_id": collection.insert_one(document).inserted_id},
        #     {"$set": {"doc_summary": doc_summary}}
        # )
        print(f"Added summary for document '{doc_name}'")
        doc_summarised.append({"filename": doc_name, "doc_content": doc_content, "doc_summary":doc_summary})
    return doc_summarised

def load_model():
    model_path="ibm-granite/granite-3.3-2b-instruct"
    device="cpu"
    model = AutoModelForCausalLM.from_pretrained(
            model_path,
            device_map=device,
            torch_dtype=torch.bfloat16,
        )
    tokenizer = AutoTokenizer.from_pretrained(
            model_path
    )
    return model, tokenizer

def summarize(doc_content):
    model, tokenizer = load_model()
    try:
        prompt = f""" 
        Summarize the following document
        
        Document:
        {doc_content}
        """
        conv = [{"role": "user", "content":prompt}]
        device="cpu"
        input_ids = tokenizer.apply_chat_template(conv, return_tensors="pt", thinking=True, return_dict=True, add_generation_prompt=True).to(device)

        set_seed(42)   
        output = model.generate(
            **input_ids,
            max_new_tokens=512,
        )

        prediction = tokenizer.decode(output[0, input_ids["input_ids"].shape[1]:], skip_special_tokens=True)
        return prediction
    except:
        return "Error in document summarization"

@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...), user_id:str = Form(...)):
    docs=[]
    for file in files:
        if file.filename.endswith(".pdf"):
            file_content = extract_text_from_pdf(file.file)
        elif file.filename.endswith(".docx"):
            file_bytes = await file.read()
            file_content = extract_text_from_doc(file_bytes)
        elif file.filename.endswith(".txt"):
            file_content = file.file.read()
        else:
            return {"File not in one of the supported formats (pdf, docx, txt). Please upload a valid file"}
        #import pdb;pdb.set_trace()
        docs.append({"filename": file.filename, "text": str(file_content)})
    doc_summarized=ingest_document_in_mongodb(docs,user_id)
    return doc_summarized

