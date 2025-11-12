from fastapi import FastAPI, File, UploadFile
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
from config import (
    ES_HOST,
    EMBEDDING_MODEL,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
docs=[]
user_id=''

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

    # Ensure the index exists before searching
    print(es_client.indices.exists(index=index_name))
    if not es_client.indices.exists(index=index_name):
        print(f"Index '{index_name}' does not exist. Creating it...")
       
        ElasticsearchStore(
            es_connection=es_client,
            index_name=index_name,
            embedding=embedder,
        )   
    else:
        print(f"Index '{index_name}' already exists.")

    print(f"Fetching existing document names from `{index_name}`...")
    existing_docs = set()

    try:
        query = {
            "_source": ["metadata.doc_name"],
            "query": {"match_all": {}}
        }

        resp = es_client.search(index=index_name, body=query, size=10000)
        for hit in resp["hits"]["hits"]:
            metadata = hit["_source"].get("metadata", {})
            doc_name = metadata.get("doc_name")
            if doc_name:
                existing_docs.add(doc_name)

        print(f"Found {len(existing_docs)} existing documents in `{index_name}`")

    except Exception as e:
        print(f"Warning: Could not fetch existing documents: {e}")
        existing_docs = set()

    # Filter for new docs
    new_docs = [d for d in docs if d["filename"] not in existing_docs]
    if not new_docs:
        print("No new documents to ingest. Skipping embedding.")
        return

    print(f"Found {len(new_docs)} new documents to embed and ingest")

    vectorstore = ElasticsearchStore(
        es_connection=es_client,
        index_name=index_name,
        embedding=embedder,
    )

    all_chunks, all_metadata = [], []

    for item in tqdm(new_docs, desc="Embedding new code"):
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

# @app.post("/summarize")
# async def upload_file(
#     file: UploadFile = File(...),
#     repo_name: str = Form(...),
#     branch_name: str = Form(...),
#     github_token: str = Form(...),
#     wca_api_key: str = Form(...),
#     watsonx_api_key: str = Form(...),
#     space_id: str = Form(...),
# ):


@app.post("/upload-files")
async def upload_files(files: List[UploadFile] = File(...), ):

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
    ingest_code_to_es(docs)
    return docs
