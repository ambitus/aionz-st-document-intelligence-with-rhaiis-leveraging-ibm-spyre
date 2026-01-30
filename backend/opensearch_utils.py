"""
OpenSearch-based text/document embedding and retrieval utilities.

This module provides functionality for:
- Creating and managing OpenSearch vector stores
- Ingesting and retrieving documents with embeddings
- Performing semantic search with smart fallback strategies
- Image RAG: Image embedding, captioning, and multimodal search
"""

import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Union, Tuple
from PIL import Image
import torch
import numpy as np
import os

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


def ingest_image_description_to_os(
    image_filename: str,
    caption: str,
    index_name: str,
    user_id: str
) -> None:
    """
    Ingest image description/caption into the regular OpenSearch document index.

    This allows image descriptions to be retrieved alongside text documents.

    Args:
        image_filename: Name of the image file
        caption: Generated image caption/description
        index_name: OpenSearch index name (e.g., "user_vishwasr")
        user_id: User identifier
    """
    try:
        logger.info(f"Ingesting image description for '{image_filename}' into index '{index_name}'")

        # Create a document-like entry for the image
        doc = [{
            "filename": image_filename,
            "text": f"Image description: {caption}"
        }]

        # Use the existing ingest_code_to_os function
        ingest_code_to_os(
            docs=doc,
            model_name=EMBEDDING_MODEL,
            index_name=index_name
        )

        logger.info(f"Successfully ingested image description for '{image_filename}'")

    except Exception as e:
        logger.error(f"Failed to ingest image description for '{image_filename}': {e}")
        raise


# ============================================================================
# IMAGE RAG FUNCTIONS
# ============================================================================

class ImageRAG:
    """
    Image Retrieval-Augmented Generation using OpenSearch and CLIP/BLIP models.
    """

    def __init__(
        self,
        clip_model_name: str = "openai/clip-vit-base-patch32",
        caption_model_name: str = "Salesforce/blip-image-captioning-base",
        device: Optional[str] = None
    ):
        """
        Initialize Image RAG with CLIP for embeddings and BLIP for captioning.

        Args:
            clip_model_name: HuggingFace model name for CLIP
            caption_model_name: HuggingFace model name for captioning
            device: Device to run models on ('cuda' or 'cpu')
        """
        import torch
        from transformers import (
            CLIPProcessor, CLIPModel,
            BlipProcessor, BlipForConditionalGeneration
        )

        self.device = device or ("cuda" if torch.cuda.is_available() else "cpu")

        logger.info(f"Loading CLIP model: {clip_model_name}")
        self.clip_model = CLIPModel.from_pretrained(clip_model_name).to(self.device)
        self.clip_processor = CLIPProcessor.from_pretrained(clip_model_name)

        logger.info(f"Loading caption model: {caption_model_name}")
        self.caption_processor = BlipProcessor.from_pretrained(caption_model_name)
        self.caption_model = BlipForConditionalGeneration.from_pretrained(caption_model_name).to(self.device)

        # Get embedding dimension from CLIP model
        self.embedding_dim = self.clip_model.config.projection_dim
        logger.info(f"Image embedding dimension: {self.embedding_dim}")


    def extract_image_embedding(self, image_path: str) -> np.ndarray:
        """
        Extract CLIP embeddings from an image file.

        Args:
            image_path: Path to the image file

        Returns:
            np.ndarray: Image embedding vector
        """
        try:
            image = Image.open(image_path).convert("RGB")
            inputs = self.clip_processor(images=image, return_tensors="pt").to(self.device)

            with torch.no_grad():
                image_features = self.clip_model.get_image_features(**inputs)

            # Normalize the embedding
            embedding = image_features.cpu().numpy().flatten()
            embedding = embedding / np.linalg.norm(embedding)
            return embedding

        except Exception as e:
            logger.error(f"Error extracting embedding from {image_path}: {e}")
            raise


    def extract_text_embedding(self, text: str) -> np.ndarray:
        """
        Extract CLIP embeddings from text.

        Args:
            text: Input text

        Returns:
            np.ndarray: Text embedding vector
        """
        try:
            inputs = self.clip_processor(text=[text], return_tensors="pt", padding=True).to(self.device)

            with torch.no_grad():
                text_features = self.clip_model.get_text_features(**inputs)

            # Normalize the embedding
            embedding = text_features.cpu().numpy().flatten()
            embedding = embedding / np.linalg.norm(embedding)
            return embedding

        except Exception as e:
            logger.error(f"Error extracting text embedding: {e}")
            raise


    def generate_image_caption(self, image_path: str) -> str:
        """
        Generate descriptive caption for an image.

        Args:
            image_path: Path to the image file

        Returns:
            str: Generated caption
        """
        try:
            image = Image.open(image_path).convert("RGB")
            inputs = self.caption_processor(image, return_tensors="pt").to(self.device)

            with torch.no_grad():
                out = self.caption_model.generate(**inputs, max_length=50)

            caption = self.caption_processor.decode(out[0], skip_special_tokens=True)
            return caption

        except Exception as e:
            logger.error(f"Error generating caption for {image_path}: {e}")
            return ""


    def create_image_index(
        self,
        index_name: str,
        drop_existing: bool = False,
        es_client: Optional[OpenSearch] = None
    ) -> bool:
        """
        Create OpenSearch index optimized for image vectors.

        Args:
            index_name: Name of the index to create
            drop_existing: Whether to delete existing index
            es_client: Optional existing OpenSearch client

        Returns:
            bool: True if index was created successfully
        """
        if es_client is None:
            es_client = get_os_connection()

        # Check if index exists
        if es_client.indices.exists(index=index_name):
            if drop_existing:
                logger.info(f"Dropping existing index: {index_name}")
                es_client.indices.delete(index=index_name)
            else:
                logger.info(f"Index '{index_name}' already exists")
                return True

        # Define index mapping with k-NN support for image vectors
        index_body = {
            "settings": {
                "index": {
                    "knn": True,
                    "knn.algo_param.ef_search": 100,
                    "number_of_shards": 2,
                    "number_of_replicas": 1
                }
            },
            "mappings": {
                "properties": {
                    "image_vector": {
                        "type": "knn_vector",
                        "dimension": self.embedding_dim,
                        "method": {
                            "name": "hnsw",
                            "space_type": "cosinesimil",
                            "engine": "nmslib",
                            "parameters": {
                                "ef_construction": 128,
                                "m": 16
                            }
                        }
                    },
                    "image_path": {"type": "keyword"},
                    "filename": {"type": "keyword"},
                    "caption": {"type": "text"},
                    "metadata": {
                        "type": "object",
                        "properties": {
                            "width": {"type": "integer"},
                            "height": {"type": "integer"},
                            "format": {"type": "keyword"},
                            "size_bytes": {"type": "long"}
                        }
                    },
                    "timestamp": {"type": "date"},
                    "user_id": {"type": "keyword"}
                }
            }
        }

        try:
            es_client.indices.create(index=index_name, body=index_body)
            logger.info(f"Created image index '{index_name}' with k-NN support")
            return True
        except Exception as e:
            logger.error(f"Failed to create index '{index_name}': {e}")
            raise


    def get_all_embeddings_for_image(
        self,
        index_name: str,
        image_filename: str,
        user_id: Optional[str] = None,
        es_client: Optional[OpenSearch] = None
    ) -> List[Dict]:
        """
        Get all embeddings/chunks for a specific image by filename.

        Args:
            index_name: OpenSearch index name
            image_filename: Name of the image file
            user_id: Optional user ID filter
            es_client: Optional OpenSearch client

        Returns:
            List[Dict]: All embeddings for the specified image
        """
        if es_client is None:
            es_client = get_os_connection()

        try:
            # Build search query to find ALL documents for this image
            search_body = {
                "size": 100,  # Get up to 100 embeddings for this image
                "query": {
                    "bool": {
                        "must": [
                            {"term": {"filename.keyword": image_filename}}
                        ],
                        "filter": []
                    }
                },
                "_source": ["filename", "caption", "image_path", "metadata", "timestamp"],
                "sort": [{"_score": {"order": "desc"}}]
            }

            # Add user filter if provided
            if user_id:
                search_body["query"]["bool"]["filter"].append(
                    {"term": {"user_id": user_id}}
                )

            # Execute search
            response = es_client.search(
                index=index_name,
                body=search_body
            )

            # Format results
            results = []
            for hit in response["hits"]["hits"]:
                result = {
                    "score": hit["_score"],
                    "doc_id": hit["_id"],
                    **hit["_source"]
                }
                results.append(result)

            logger.info(f"Found {len(results)} embeddings for image '{image_filename}'")
            return results

        except Exception as e:
            logger.error(f"Error getting embeddings for image '{image_filename}': {e}")
            return []


    def search_images(
        self,
        query: str,
        index_name: str,
        k: int = 5,
        filters: Optional[Dict] = None,
        user_id: Optional[str] = None,
        es_client: Optional[OpenSearch] = None
    ) -> List[Dict]:
        """
        Search for images using text query.

        Args:
            query: Text search query
            index_name: OpenSearch index name
            k: Number of results to return
            filters: Optional filters
            user_id: Optional user ID filter
            es_client: Optional OpenSearch client

        Returns:
            List[Dict]: Search results with scores and metadata
        """
        if es_client is None:
            es_client = get_os_connection()

        try:
            # Get text embedding for query
            query_embedding = self.extract_text_embedding(query)
            
            # Build search query
            search_body = {
                "size": k,
                "query": {
                    "bool": {
                        "must": [],
                        "filter": []
                    }
                },
                "_source": ["filename", "caption", "image_path", "metadata", "timestamp"]
            }

            # Add k-NN search
            knn_query = {
                "knn": {
                    "image_vector": {
                        "vector": query_embedding.tolist(),
                        "k": k
                    }
                }
            }

            # Combine with text search for hybrid approach
            search_body["query"]["bool"]["must"].append(knn_query)

            # Add optional text match on caption
            search_body["query"]["bool"]["should"] = [
                {"match": {"caption": {"query": query, "boost": 0.5}}}
            ]

            # Add filters
            if user_id:
                search_body["query"]["bool"]["filter"].append(
                    {"term": {"user_id": user_id}}
                )

            if filters:
                for key, value in filters.items():
                    search_body["query"]["bool"]["filter"].append(
                        {"term": {key: value}}
                    )

            # Execute search
            response = es_client.search(
                index=index_name,
                body=search_body
            )

            # Format results
            results = []
            for hit in response["hits"]["hits"]:
                result = {
                    "score": hit["_score"],
                    "doc_id": hit["_id"],
                    **hit["_source"]
                }
                results.append(result)

            logger.info(f"Image search returned {len(results)} results")
            return results

        except Exception as e:
            logger.error(f"Error in image search: {e}")
            return []


    def delete_image(
        self,
        index_name: str,
        doc_id: Optional[str] = None,
        image_path: Optional[str] = None,
        user_id: Optional[str] = None,
        es_client: Optional[OpenSearch] = None
    ) -> bool:
        """
        Delete an image from OpenSearch.

        Args:
            index_name: OpenSearch index name
            doc_id: Direct document ID to delete
            image_path: Image file path to delete
            user_id: User ID for filtering
            es_client: Optional OpenSearch client

        Returns:
            bool: True if deleted successfully
        """
        if es_client is None:
            es_client = get_os_connection()

        try:
            if doc_id:
                # Delete by direct ID
                response = es_client.delete(
                    index=index_name,
                    id=doc_id,
                    refresh=True
                )
                deleted = response.get("result") == "deleted"

            elif image_path:
                # Build query to find by image path
                query = {
                    "query": {
                        "term": {"image_path.keyword": image_path}
                    }
                }

                if user_id:
                    query["query"] = {
                        "bool": {
                            "must": [
                                {"term": {"image_path.keyword": image_path}},
                                {"term": {"user_id": user_id}}
                            ]
                        }
                    }

                # Search and delete
                search_response = es_client.search(
                    index=index_name,
                    body=query,
                    size=100
                )

                deleted = False
                for hit in search_response["hits"]["hits"]:
                    delete_response = es_client.delete(
                        index=index_name,
                        id=hit["_id"],
                        refresh=True
                    )
                    if delete_response.get("result") == "deleted":
                        deleted = True
                        logger.debug(f"Deleted image document: {hit['_id']}")
            
            else:
                logger.error("Either doc_id or image_path must be provided")
                return False

            if deleted:
                logger.info(f"Deleted image from index '{index_name}'")
            else:
                logger.warning(f"Image not found in index '{index_name}'")

            return deleted

        except Exception as e:
            logger.error(f"Error deleting image: {e}")
            return False


# Export public API - added ImageRAG and answer_question_about_image
__all__ = [
    "get_os_connection",
    "create_os_vectorstore",
    "get_retriever_os",
    "ingest_code_to_os",
    "ingest_image_description_to_os",
    "delete_from_opensearch",
    "retrieve_with_smart_fallback",
    "ImageRAG",
    "answer_question_about_image",
]