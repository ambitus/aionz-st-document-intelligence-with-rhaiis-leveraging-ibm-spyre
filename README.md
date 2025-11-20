# spyre_enhanced_document_summarizer

This repository contains code for summarizing documents using Spyre with granite models.

## Prerequisites

- Python 3.8 or higher
- Podman
- podman-compose
- `pip` package manage
- node
- npm


## Installation as a container

### 1. On s390x Architecture

```bash
podman-compose up --build -d
```

### 2. [Optional] Adjust Podman VM resources (CPU, Memory, Disk)

```bash
# Stop the Podman machine
podman machine stop podman-machine-default

# Update resources (example: 4 CPUs, 8 GB RAM, 100 GB disk)
podman machine set --cpus 4 --memory 8192 --disk-size 100 podman-machine-default

# Restart the machine with the new configuration
podman machine start podman-machine-default
```

## Installation as a Native application

### 1. UI Setup 

#### clone the repository and run below command where you clone the repo.
```bash
 cd spyre_enhanced_document_summarizer/frontend
 npm install
 npm start
```

## Debug

Run the Kibana container to debug any issues related to ElasticSearch DB indeces
```bash
podman run -d \
  --name kibana \
  -p 5601:5601 \
  -e "ELASTICSEARCH_HOSTS=http://host.containers.internal:9200" \
  docker.elastic.co/kibana/kibana:8.13.0
```