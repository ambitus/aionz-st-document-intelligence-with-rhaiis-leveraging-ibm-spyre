"""
OpenSearch-based text/document embedding and retrieval utilities.
Supports ingestion of code or PDF documents.
"""

from datetime import datetime
from tqdm import tqdm
from opensearchpy import OpenSearch
from langchain.vectorstores import OpenSearchVectorSearch
from langchain.embeddings import HuggingFaceEmbeddings
from langchain.text_splitter import RecursiveCharacterTextSplitter
from config import OS_HOST, EMBEDDING_MODEL, CHUNK_SIZE, CHUNK_OVERLAP


# ----------------------------------------------------------------------------
# Connection Utilities
# ----------------------------------------------------------------------------

def get_os_connection():
    """Create and return an OpenSearch client."""
    return OpenSearch(
        hosts=[OS_HOST],
        verify_certs=False,
        ssl_show_warn=False
    )


def create_os_vectorstore(index_name: str, model_name: str = EMBEDDING_MODEL, drop_old: bool = False):
    """Create a LangChain OpenSearchVectorSearch instance."""
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


# ----------------------------------------------------------------------------
# Chunking Utilities
# ----------------------------------------------------------------------------

def chunk_text(text: str, size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP):
    """Split text into overlapping chunks."""
    splitter = RecursiveCharacterTextSplitter(chunk_size=size, chunk_overlap=overlap)
    return splitter.split_text(text)


# ----------------------------------------------------------------------------
# Ingestion
# ----------------------------------------------------------------------------

def ingest_documents(documents, index_name: str, model_name: str = EMBEDDING_MODEL, drop_old: bool = False):
    """
    Ingest a list of documents (PDF or text) into OpenSearch.

    Args:
        documents (list[dict]): [{"path": str, "content": str, "type": "pdf"|"txt"}]
        index_name (str): OpenSearch index name.
        model_name (str): Embedding model.
    """
    vectorstore = create_os_vectorstore(index_name, model_name=model_name, drop_old=drop_old)
    all_chunks, all_metadata = [], []

    for doc in tqdm(documents, desc="Processing documents"):
        path = doc["path"]
        content = doc["content"]
        doc_type = doc.get("type", "text")

        chunks = chunk_text(content)
        metadata = {
            "source": path,
            "type": doc_type,
            "timestamp": datetime.now().isoformat(),
        }
        all_chunks.extend(chunks)
        all_metadata.extend([metadata] * len(chunks))

    print(f"Total chunks to embed: {len(all_chunks)}")

    # Batch ingestion
    BATCH_SIZE = 100
    for i in range(0, len(all_chunks), BATCH_SIZE):
        batch_chunks = all_chunks[i:i + BATCH_SIZE]
        batch_meta = all_metadata[i:i + BATCH_SIZE]
        vectorstore.add_texts(texts=batch_chunks, metadatas=batch_meta)
        print(f"Ingested {i + len(batch_chunks)} / {len(all_chunks)} chunks")

    print(f"Ingestion complete: {len(all_chunks)} chunks added to `{index_name}`")


# ----------------------------------------------------------------------------
# Retrieval
# ----------------------------------------------------------------------------

def get_retriever(index_name: str, model_name: str = EMBEDDING_MODEL):
    """Return a retriever for querying the OpenSearch vector index."""
    vectorstore = create_os_vectorstore(index_name, model_name=model_name, drop_old=False)
    return vectorstore.as_retriever(
        search_type="similarity",
        search_kwargs={"k": 5, "param": {"ef": 100}},
    )
