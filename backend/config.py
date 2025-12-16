"""
Configuration settings for the application.
"""

import os
from typing import Optional

# OpenSearch Configuration
OS_HOST: str = os.getenv("OS_HOST", "http://opensearch:9200")

# Embedding Model Configuration
EMBEDDING_MODEL: str = os.getenv("EMBEDDING_MODEL", "sentence-transformers/all-MiniLM-L6-v2")

# Text Processing Configuration
CHUNK_SIZE: int = int(os.getenv("CHUNK_SIZE", "25"))
CHUNK_OVERLAP: int = int(os.getenv("CHUNK_OVERLAP", "5"))

# MongoDB Configuration
MONGO_DB_HOST: str = os.getenv("MONGO_DB_HOST", "mongodb://mongodb:27017/")
