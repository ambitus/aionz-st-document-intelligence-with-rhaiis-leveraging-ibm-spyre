import os

OS_HOST = "http://opensearch:9200"
EMBEDDING_MODEL = "sentence-transformers/all-MiniLM-L6-v2"
CHUNK_SIZE = 800
CHUNK_OVERLAP = 100
ES_HOST = os.getenv("ES_HOST", "http://localhost:9200")
MONGO_DB_HOST = "mongodb://localhost:27017/"