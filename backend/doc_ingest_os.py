from fastapi import FastAPI, File, UploadFile, Form
from fastapi.middleware.cors import CORSMiddleware
from PyPDF2 import PdfReader
from docx import Document
import io
from datetime import datetime
from tqdm import tqdm
from typing import List
from pymongo import MongoClient
from transformers import AutoModelForCausalLM, AutoTokenizer, set_seed
import torch
from opensearchpy import OpenSearch
from langchain.vectorstores import OpenSearchVectorSearch
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
import json
import os
import requests
from requests.adapters import HTTPAdapter
from urllib3.poolmanager import PoolManager
from urllib3.util.retry import Retry
import time
import ssl
from typing import Any

from config import (
    OS_HOST,
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

def get_os_connection():
    """Create and return an OpenSearch client."""
    return OpenSearch(
        hosts=[OS_HOST],
        verify_certs=False,
        ssl_show_warn=False
    )


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

def ingest_code_to_os(docs, model_name=EMBEDDING_MODEL, index_name="shreyaganeshe46@gmail.com"):
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
    es_client = get_os_connection()

    vectorstore = OpenSearchVectorSearch(
        index_name=index_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        vector_field="embedding",
        space_type="cosinesimil",
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


def summarize(doc_content):
    try:
        prompt = f""" 
        Summarize the following document
        
        Document:
        {doc_content}
        """
        response = call_rhaiis_model(prompt)
        return response
    except:
        return "Error in document summarization"


def get_retriever_os(collection_name: str, model_name: str = EMBEDDING_MODEL, es_client=None):
    vectorstore = create_os_vectorstore(
        collection_name,
        model_name=model_name,
        drop_old=False,
        es_client=es_client
    )

    print(f"Using retriever on index `{collection_name}` with field `embedding`")

    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={
            "k": 10,
            "param": {"ef": 100}
        }
    )

# ----------------------------
# BUILD PROMPT FOR LLM
# ----------------------------

def build_prompt(question: str, chunks):
    context = "\n\n---\n\n".join(doc.page_content for doc in chunks)

    prompt = f"""
You are a helpful assistant.

Context:
{context}

Question:
{question}

Answer:
"""
    return prompt.strip()


# ----------------------------
# RHAIIS
# ----------------------------

class TLSAdapter(HTTPAdapter):
    """Custom Adapter to enforce TLS 1.2+"""
    def init_poolmanager(self, *args, **kwargs):
        print(">>> Initializing TLS 1.2+ pool manager...")
        context = ssl.create_default_context()
        context.minimum_version = ssl.TLSVersion.TLSv1_2
        kwargs['ssl_context'] = context
        return super().init_poolmanager(*args, **kwargs)


def call_rhaiis_model(
    prompt: str,
    model: str = "ibm-granite/granite-3.3-8b-instruct",
    max_tokens: int = 8000,
    temperature: float = 0,
    top_p: float = 1.0
) -> Any:
    """
    Call external RHAIIS API (HTTPS) to get a completion.
    Includes retries, TLS 1.2 enforcement, timeout, and prompt truncation.
    Shows progress messages for each step.
    """
    print(">>> Preparing RHAIIS API call...")
    url = "http://129.40.90.163:9000/v1/completions"
    headers = {"Content-Type": "application/json"}

    # Truncate prompt to prevent huge payloads
    truncated_prompt = prompt[:6000]
    print(f">>> Prompt truncated to {len(truncated_prompt)} characters")

    payload = {
        "model": model,
        "prompt": truncated_prompt,
        "max_tokens": min(max_tokens, 6000),
        "temperature": temperature,
        "top_p": top_p
    }
    print(f">>> Payload prepared: max_tokens={payload['max_tokens']}, temperature={temperature}, top_p={top_p}")

    # Setup session with TLS 1.2 and retries
    print(">>> Setting up HTTP session with TLS 1.2 and retries...")
    session = requests.Session()
    session.mount("https://", TLSAdapter())

    retries = Retry(
        total=5,
        backoff_factor=1,
        status_forcelist=[500, 502, 503, 504]
    )
    session.mount("https://", HTTPAdapter(max_retries=retries))
    print(">>> Session setup complete.")

    # Make API request
    print(">>> Sending request to RHAIIS API...")
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
    print(f">>> Time taken for API call: {end - start:.2f}s")

    print(">>> Parsing JSON response...")
    result = response.json()
    print(">>> RHAIIS API call complete.")
    return result

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


