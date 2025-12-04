"""
OpenSearch-based text/document embedding and retrieval utilities.
Supports ingestion of code or PDF documents.
"""

from datetime import datetime
from tqdm import tqdm
from opensearchpy import OpenSearch
from langchain.vectorstores import OpenSearchVectorSearch
from langchain.embeddings import HuggingFaceEmbeddings
from config import OS_HOST, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP
from typing import List
import json


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


def get_retriever_os_with_filter(collection_name: str, document_names: List[str] = None):
    """
    Create a retriever with optional document filtering.
    
    Args:
        collection_name: OpenSearch index/collection name
        document_names: List of document names to filter by (if None, retrieves from all documents)
    """
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    vectorstore = OpenSearchVectorSearch(
        index_name=collection_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        vector_field="embedding",
        space_type="cosinesimil",
    )
    
    # If document_names is provided and not empty, create a filter
    if document_names and len(document_names) > 0:
        # Create filter for document names
        def filter_function(doc):
            metadata = doc.metadata
            return metadata.get("doc_name") in document_names
        
        # Create a self-query retriever or filter retriever
        retriever = vectorstore.as_retriever(
            search_kwargs={
                "k": 10,  # Retrieve more initially, then filter
                "filter": {
                    "bool": {
                        "should": [
                            {"term": {"metadata.doc_name": doc_name}} 
                            for doc_name in document_names
                        ]
                    }
                }
            }
        )
    else:
        # No filter - retrieve from all documents
        retriever = vectorstore.as_retriever(search_kwargs={"k": 5})
    
    return retriever


from typing import List, Optional
from langchain.schema import Document

def retrieve_with_smart_fallback(
    query: str,
    collection_name: str,
    document_names: Optional[List[str]] = None,
    k: int = 5
) -> List[Document]:
    """
    Smart retrieval that checks if documents exist before falling back.
    """
    from opensearchpy import OpenSearch
    
    # First, check if the specified documents exist in the collection
    os_client = OpenSearch(
        hosts=[OS_HOST],
        http_compress=True,
    )
    
    if document_names and len(document_names) > 0:
        # Check which documents actually exist in the index
        existing_docs = []
        for doc_name in document_names:
            try:
                # Search for any chunks from this document
                search_body = {
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"metadata.doc_name": doc_name}}
                            ]
                        }
                    },
                    "size": 1
                }
                
                response = os_client.search(
                    index=collection_name,
                    body=search_body
                )
                
                if response["hits"]["total"]["value"] > 0:
                    existing_docs.append(doc_name)
                else:
                    print(f"Document '{doc_name}' not found in collection")
                    
            except Exception as e:
                print(f"Error checking document '{doc_name}': {e}")
        
        # If none of the specified documents exist, use all documents
        if len(existing_docs) == 0:
            print("None of the specified documents exist, retrieving from all documents")
            document_names = None
        else:
            # Use only the documents that exist
            if len(existing_docs) != len(document_names):
                print(f"Using only existing documents: {existing_docs}")
            document_names = existing_docs
    
    # Now retrieve with the appropriate filter
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    vectorstore = OpenSearchVectorSearch(
        index_name=collection_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        vector_field="embedding",
        space_type="cosinesimil",
    )
    
    if document_names and len(document_names) > 0:
        filter_query = {
            "bool": {
                "should": [
                    {"term": {"metadata.doc_name": doc_name}} 
                    for doc_name in document_names
                ]
            }
        }
        
        retriever = vectorstore.as_retriever(
            search_kwargs={
                "k": k,
                "filter": filter_query
            }
        )
    else:
        retriever = vectorstore.as_retriever(search_kwargs={"k": k})
    
    return retriever.get_relevant_documents(query)[:k]


def create_os_vectorstore(index_name: str, model_name: str = EMBEDDING_MODEL, drop_old: bool = False, es_client=None):
    es_client = get_os_connection()

    if drop_old and es_client.indices.exists(index=index_name):
        es_client.indices.delete(index=index_name)
        print(f"Dropped old index `{index_name}`")

    embedder = HuggingFaceEmbeddings(model_name=model_name)

    return OpenSearchVectorSearch(
        index_name=index_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        vector_field="embedding",
        space_type="cosinesimil",
    )


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
            "k": 5,
            "param": {"ef": 50}
        }
    )
