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
