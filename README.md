# AI on Spyre Accelerator for IBM Z & IBM LinuxONE Document Summarizer Solution Template

This repository contains code for summarizing documents using Spyre with Red Hat AI Inference Server.
This is an [AI on IBM Z solution template](https://ambitus.github.io/aionz-solution-templates/) for document summarization using Spyre. This solution template provides an example on how to deploy RHAIIS in an IBM Z environment, while making use of Spyre, Granite models, and more.

# ![Spyre enhanced Document Summarizer](./imgs/SpyreDocumentSummarizer.png)

## Prerequisites

- Podman
- podman-compose
- RHAIIS


## Getting Started

View or download the [official AI Solution Template PDF](https://github.com/ambitus/aionz-st-document-intelligence-with-rhaiis-leveraging-ibm-spyre/blob/main/Document_Intelligence_RHAIIS_solution_template.docx) to get started

## Installation as a container

### 1. Set Environment Variables

```bash
# Set the host IP for cross-container communication
export HOST_IP=$(hostname -I | awk '{print $1}')
```

### 2. Build and Start Containers

```bash
# Build images and start containers in detached mode
podman-compose up --build -d
```

### 3. Access the Application

Open your web browser and navigate to:

Local access:
```bash
http://localhost:3002
```

Network access (from other devices):
```bash
http://<your-machine-ip>:3002
```

### 4. [Optional] Adjust Podman VM resources (CPU, Memory, Disk)

```bash
# Stop the Podman machine
podman machine stop podman-machine-default

# Update resources (example: 4 CPUs, 8 GB RAM, 100 GB disk)
podman machine set --cpus 4 --memory 8192 --disk-size 100 podman-machine-default

# Restart the machine with the new configuration
podman machine start podman-machine-default
```


## Authors & Contributors
- Development:
    - Tabari Alexander (thalexan@us.ibm.com)
    - Abid Alam (abidalam@ibm.com)
    - Rishika Kedia (rishika.kedia@in.ibm.com)
    - Saurabh Srivastava (saurabh.srivastava4@ibm.com)
    - Vishwas R (Vishwas.R@ibm.com)
    - Ganeshi Shreya (Shreya.Ganeshi@ibm.com)
    - Prasanna Gn (Prasanna.Gn@ibm.com)
    - Dilip B (Dilip.Bhagavan@ibm.com)
    - Jasmeet Bhatia (jbhatia@ibm.com)