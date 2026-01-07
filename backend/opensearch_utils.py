"""
OpenSearch-based text/document embedding and retrieval utilities.

This module provides functionality for:
- Creating and managing OpenSearch vector stores
- Ingesting and retrieving documents with embeddings
- Performing semantic search with smart fallback strategies
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union

from langchain.embeddings import HuggingFaceEmbeddings
from langchain.schema import Document
from langchain.vectorstores import OpenSearchVectorSearch
from opensearchpy import OpenSearch
from tqdm import tqdm

from config import OS_HOST, EMBEDDING_MODEL
from utils import chunk_code

# Configure logging
logger = logging.getLogger(__name__)


def get_os_connection() -> OpenSearch:
    """
    Create and return an OpenSearch client connection.
    
    Returns:
        OpenSearch: Configured OpenSearch client
    """
    try:
        client = OpenSearch(
            hosts=[OS_HOST],
            verify_certs=False,
            ssl_show_warn=False,
            timeout=30,
            max_retries=3,
            retry_on_timeout=True
        )
        
        # Test connection
        client.info()
        logger.debug("OpenSearch connection established successfully")
        return client
        
    except Exception as e:
        logger.error(f"Failed to connect to OpenSearch at {OS_HOST}: {e}")
        raise


def create_os_vectorstore(
    index_name: str,
    model_name: str = EMBEDDING_MODEL,
    drop_old: bool = False,
    es_client: Optional[OpenSearch] = None
) -> OpenSearchVectorSearch:
    """
    Create or connect to an OpenSearch vector store.
    
    Args:
        index_name: Name of the OpenSearch index
        model_name: HuggingFace model name for embeddings
        drop_old: Whether to delete existing index if it exists
        es_client: Optional existing OpenSearch client
        
    Returns:
        OpenSearchVectorSearch: Configured vector store instance
    """
    if es_client is None:
        es_client = get_os_connection()
    
    # Check if index exists and handle drop_old option
    index_exists = es_client.indices.exists(index=index_name)
    
    if drop_old and index_exists:
        es_client.indices.delete(index=index_name)
        logger.info(f"Dropped old index '{index_name}'")
        index_exists = False
    
    # Initialize embedding model
    embedder = HuggingFaceEmbeddings(model_name=model_name)
    
    # Create vector store
    vectorstore = OpenSearchVectorSearch(
        index_name=index_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        opensearch_connection=es_client,
        vector_field="embedding",
        space_type="cosinesimil",
        text_field="text",
        metadata_field="metadata"
    )
    
    logger.info(f"Vector store created/connected for index '{index_name}'")
    return vectorstore


def get_retriever_os(
    collection_name: str,
    model_name: str = EMBEDDING_MODEL,
    es_client: Optional[OpenSearch] = None,
    k: int = 5,
    score_threshold: Optional[float] = None
) -> Any:
    """
    Create a retriever for similarity search on OpenSearch vector store.
    
    Args:
        collection_name: Name of the collection/index
        model_name: HuggingFace model name for embeddings
        es_client: Optional existing OpenSearch client
        k: Number of results to return
        score_threshold: Minimum similarity score threshold
        
    Returns:
        Retriever: Configured retriever instance
    """
    vectorstore = create_os_vectorstore(
        collection_name,
        model_name=model_name,
        drop_old=False,
        es_client=es_client
    )
    
    logger.info(f"Created retriever on index '{collection_name}' with embedding field")
    
    # Configure search parameters
    search_kwargs = {
        "k": k,
        "param": {"ef": 50}  # EF parameter for HNSW algorithm
    }
    
    if score_threshold is not None:
        search_kwargs["score_threshold"] = score_threshold
    
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs=search_kwargs
    )


def ingest_code_to_os(
    docs: List[Dict[str, str]],
    model_name: str = EMBEDDING_MODEL,
    index_name: str = "default_index"
) -> None:
    """
    Incrementally embed and ingest code snippets into OpenSearch.
    
    Args:
        docs: List of dictionaries with keys:
            - "filename": str, file name or unique document identifier
            - "text": str, raw source code content
        model_name: Hugging Face model for embedding
        index_name: OpenSearch index name
    """
    if not docs:
        logger.warning("No documents provided for ingestion")
        return
    
    logger.info(f"Starting ingestion of {len(docs)} documents into index '{index_name}'")
    
    # Initialize embedding model
    embedder = HuggingFaceEmbeddings(model_name=model_name)
    
    # Create vector store
    vectorstore = OpenSearchVectorSearch(
        index_name=index_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        vector_field="embedding",
        space_type="cosinesimil",
    )
    
    all_chunks = []
    all_metadata = []
    
    # Process documents
    for item in tqdm(docs, desc="Processing documents"):
        doc_name = item.get("filename", "unknown")
        doc_content = item.get("text", "")
        
        if not doc_content:
            logger.warning(f"Empty content for document '{doc_name}', skipping")
            continue
        
        # Chunk the content
        chunks = chunk_code(doc_content)
        
        # Create metadata for each chunk
        for chunk in chunks:
            all_chunks.append(chunk)
            all_metadata.append({
                "doc_name": doc_name,
                "doc_content": doc_content,
                "timestamp": datetime.now().isoformat(),
                "chunk_index": len(all_chunks) - 1,
                "total_chunks": len(chunks)
            })
        
        logger.debug(f"Document '{doc_name}' split into {len(chunks)} chunks")
    
    # Ingest all chunks
    if all_chunks:
        try:
            vectorstore.add_texts(texts=all_chunks, metadatas=all_metadata)
            logger.info(f"Ingested {len(all_chunks)} chunks into index '{index_name}'")
        except Exception as e:
            logger.error(f"Failed to ingest chunks: {e}")
            raise
    else:
        logger.warning("No chunks generated for ingestion")


async def delete_from_opensearch(user_id: str, filename: str) -> bool:
    """
    Delete a document from OpenSearch.
    
    Args:
        user_id: User identifier
        filename: Name of the file to delete
        
    Returns:
        bool: True if deleted, False if not found
    """
    try:
        client = get_os_connection()
        
        # Index name based on user_id (matching existing pattern)
        index_name = f"user_{user_id}".lower()
        
        # First, check if the index exists
        if not client.indices.exists(index=index_name):
            logger.warning(f"Index '{index_name}' does not exist in OpenSearch")
            return False
        
        # Search for the document by filename
        search_query = {
            "query": {
                "term": {
                    "metadata.doc_name.keyword": filename
                }
            },
            "_source": False  # We only need the document IDs
        }
        
        # Search for matching documents
        search_response = client.search(
            index=index_name,
            body=search_query,
            size=100  # Limit results to avoid huge responses
        )
        
        deleted_count = 0
        total_hits = search_response['hits']['total']['value']
        
        if total_hits == 0:
            logger.info(f"Document '{filename}' not found in OpenSearch index '{index_name}'")
            return False
        
        # Delete each matching document
        for hit in search_response['hits']['hits']:
            doc_id = hit['_id']
            try:
                delete_response = client.delete(
                    index=index_name,
                    id=doc_id,
                    refresh=True  # Make deletion immediately visible
                )
                
                if delete_response['result'] == 'deleted':
                    deleted_count += 1
                    logger.debug(f"Deleted chunk (ID: {doc_id}) for document '{filename}'")
                    
            except Exception as e:
                logger.error(f"Error deleting chunk {doc_id}: {e}")
        
        logger.info(
            f"Deleted {deleted_count}/{total_hits} chunks for document "
            f"'{filename}' from OpenSearch index '{index_name}'"
        )
        
        return deleted_count > 0
            
    except Exception as e:
        logger.error(f"Error deleting from OpenSearch: {e}")
        raise


def retrieve_with_smart_fallback(
    query: str,
    collection_name: str,
    document_names: Optional[List[str]] = None,
    k: int = 5,
    score_threshold: Optional[float] = None
) -> List[Document]:
    """
    Smart retrieval that checks if documents exist before falling back.
    
    This function performs semantic search with a fallback mechanism:
    1. If specific documents are requested, it checks if they exist
    2. If none exist, it falls back to searching all documents
    3. If some exist, it only searches within those documents
    
    Args:
        query: Search query string
        collection_name: OpenSearch index/collection name
        document_names: Optional list of specific document names to search
        k: Number of results to return
        score_threshold: Minimum similarity score threshold
        
    Returns:
        List[Document]: Retrieved documents sorted by relevance
    """
    logger.info(f"Smart retrieval for query: '{query[:50]}...' in collection '{collection_name}'")
    
    # Get OpenSearch client
    os_client = get_os_connection()
    
    # Check if collection/index exists
    if not os_client.indices.exists(index=collection_name):
        logger.error(f"Collection '{collection_name}' does not exist")
        return []
    
    # Filter existing documents if specific ones are requested
    existing_docs = []
    if document_names and len(document_names) > 0:
        logger.debug(f"Checking existence of {len(document_names)} specified documents")
        
        for doc_name in document_names:
            try:
                # Search for any chunks from this document
                search_body = {
                    "query": {
                        "bool": {
                            "must": [
                                {"term": {"metadata.doc_name.keyword": doc_name}}
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
                    logger.warning(f"Document '{doc_name}' not found in collection")
                    
            except Exception as e:
                logger.error(f"Error checking document '{doc_name}': {e}")
        
        # If none of the specified documents exist, use all documents
        if len(existing_docs) == 0:
            logger.warning(
                "None of the specified documents exist, "
                "retrieving from all documents in collection"
            )
            document_names = None
        else:
            # Use only the documents that exist
            if len(existing_docs) != len(document_names):
                logger.info(f"Filtered to {len(existing_docs)} existing documents")
            document_names = existing_docs
    
    # Initialize vector store and retriever
    embedder = HuggingFaceEmbeddings(model_name=EMBEDDING_MODEL)
    
    vectorstore = OpenSearchVectorSearch(
        index_name=collection_name,
        embedding_function=embedder,
        opensearch_url=OS_HOST,
        opensearch_connection=os_client,
        vector_field="embedding",
        space_type="cosinesimil",
    )
    
    # Configure retriever with optional document filter
    search_kwargs = {"k": k}
    
    if score_threshold is not None:
        search_kwargs["score_threshold"] = score_threshold
    
    if document_names and len(document_names) > 0:
        # Create filter for specific documents
        filter_query = {
            "bool": {
                "should": [
                    {"term": {"metadata.doc_name.keyword": doc_name}} 
                    for doc_name in document_names
                ],
                "minimum_should_match": 1
            }
        }
        search_kwargs["filter"] = filter_query
        logger.debug(f"Searching within documents: {document_names}")
    else:
        logger.debug("Searching across all documents in collection")
    
    # Create retriever and perform search
    retriever = vectorstore.as_retriever(search_kwargs=search_kwargs)
    
    try:
        results = retriever.get_relevant_documents(query)[:k]
        logger.info(f"Retrieved {len(results)} documents for query")

        return remove_duplicate_chunks(results)[:k]
    except Exception as e:
        logger.error(f"Error during retrieval: {e}")
        return []


def remove_duplicate_chunks(documents: List[Document]) -> List[Document]:
    """
    Remove duplicate Document objects based on normalized text content.

    This function filters a list of Document objects to return only those
    with unique content. Documents are considered duplicates if their
    page content, after normalization (stripping whitespace and converting
    to lowercase), produces identical hash values.

    Args:
        documents: A list of Document objects to deduplicate. Each Document
            must have a `page_content` attribute containing the text content.

    Returns:
        A list containing only unique Document objects, preserving the
        original order of first occurrence. The returned list maintains
        the same element type as the input.
    """
    seen = set()
    unique_docs = []

    for doc in documents:
        # Use hash or normalized content for comparison
        content_hash = hash(doc.page_content.strip().lower())

        if content_hash not in seen:
            seen.add(content_hash)
            unique_docs.append(doc)

    return unique_docs


# Export public API
__all__ = [
    "get_os_connection",
    "create_os_vectorstore",
    "get_retriever_os",
    "ingest_code_to_os",
    "delete_from_opensearch",
    "retrieve_with_smart_fallback",
]