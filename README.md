# Spyre enhanced Document Summarizer

This repository contains code for summarizing documents using Spyre with Granite models.

## Prerequisites

- Python 3.8 or higher
- Podman
- podman-compose
- `pip` package manage
- node
- npm


## Installation as a container

### 1. Build and run the container

```bash
podman-compose up --build -d
```

### 2. Open the Frontend UI in Your Browser

Visit the following URL to access the application:
```bash
http://localhost:3002
```

### 3. [Optional] Adjust Podman VM resources (CPU, Memory, Disk)

```bash
# Stop the Podman machine
podman machine stop podman-machine-default

# Update resources (example: 4 CPUs, 8 GB RAM, 100 GB disk)
podman machine set --cpus 4 --memory 8192 --disk-size 100 podman-machine-default

# Restart the machine with the new configuration
podman machine start podman-machine-default
```
