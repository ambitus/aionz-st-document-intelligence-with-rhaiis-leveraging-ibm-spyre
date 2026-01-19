"""
End-to-end pipeline test for document ingestion → embedding → retrieval.
"""

from ingest import ingest_from_folder
from opensearch_utils import ingest_documents, get_retriever
from config import INDEX_NAME

def main():
    # Ingest PDFs/texts from local folder
    docs = ingest_from_folder("./sample_docs")
    print(f"Found {len(docs)} documents for ingestion.")

    # Embed and store in OpenSearch
    ingest_documents(docs, index_name=INDEX_NAME, drop_old=True)

    # Query with a natural language question
    retriever = get_retriever(INDEX_NAME)
    query = "Summarize the main points about climate change mitigation."
    results = retriever.get_relevant_documents(query)

    print("\n Top retrieved chunks:\n")
    for i, doc in enumerate(results, 1):
        print(f"--- Result #{i} ---")
        print(f"Source: {doc.metadata.get('source')}")
        print(doc.page_content[:500])
        print("\n")

if __name__ == "__main__":
    main()
