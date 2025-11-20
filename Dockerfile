FROM docker.io/s390x/ubuntu:noble

####################################
# Setup
####################################

# Dependencies for all packages
ENV APT_DEPENDENCIES "tar libffi-dev libssl-dev libopenblas-dev libblas-dev libjpeg-dev libpng-dev zlib1g-dev vim tk-dev cmake software-properties-common curl git make gnupg2 g++ openjdk-17-jdk netbase dpkg-dev flex unzip openssh-server libssl-dev libc6-dev ca-certificates wget dirmngr autoconf apt-transport-https uuid-dev libexpat1-dev gnupg zlib1g-dev pkg-config gcc gfortran npm  libopenblas-dev libxml2-dev libxslt1-dev"

# Disable prompt for tzdata package, install required dependences, create dev user and group, create keyserver helper script
RUN export DEBIAN_FRONTEND=noninteractive \
    && export DEBCONF_NONINTERACTIVE_SEEN=true \
    && echo 'tzdata tzdata/Areas select Etc' | debconf-set-selections \
    && echo 'tzdata tzdata/Zones/Etc select UTC' | debconf-set-selections \
    && apt-get update && apt-get install -y --no-install-recommends ${APT_DEPENDENCIES}
RUN groupadd --gid 1001 dev \
    && groupadd --gid 109 docker \
    && useradd --uid 1001 --gid dev --shell /usr/bin/bash --create-home dev \
    && usermod --gid docker dev \
    && printf '#!/bin/bash\n for key in $1; do for server in $2; do if gpg --batch --no-tty --keyserver "${server}" --recv-keys "${key}"; then break; fi; done; done;' > /usr/bin/addkeys \
    && chmod a+x /usr/bin/addkeys

RUN apt install -y python3-pip python3-venv python3-dev

####################################

ENV GRPC_PYTHON_BUILD_SYSTEM_OPENSSL=1
ENV GRPC_PYTHON_BUILD_SYSTEM_ZLIB=1

# Update and install llvm-15 and dependencies
RUN apt update && \
    apt install -y llvm-15 llvm-15-dev && \
    ln -s /usr/bin/llvm-config-15 /usr/bin/llvm-config

# Set the LLVM_CONFIG environment variable
ENV LLVM_CONFIG=/usr/bin/llvm-config-15

# List of keyservers to search for keys from
ENV SERVERS  "ha.pool.sks-keyservers.net"  "hkp://p80.pool.sks-keyservers.net:80"  "pgp.mit.edu"
RUN curl -fsSL https://download.docker.com/linux/ubuntu/gpg > Docker.key
RUN apt-key --keyring /etc/apt/trusted.gpg.d/Docker.gpg add Docker.key
RUN rm Docker.key
RUN apt-key fingerprint 0EBFCD88
RUN add-apt-repository \
    "deb [arch=s390x] https://download.docker.com/linux/ubuntu \
    $(lsb_release -cs) \
   stable"
RUN apt-cache madison docker-ce
RUN apt-get --assume-yes install docker-ce="5:26.0.0-1~ubuntu.24.04~noble"

####################################
# Cleanup and run
####################################

SHELL ["/usr/bin/bash", "-c"]
RUN python3 -m venv /home/dev/devenv
ENV VIRTUAL_ENV /home/dev/devenv
ENV PATH  $VIRTUAL_ENV/bin:$PATH
RUN /home/dev/devenv/bin/pip install --no-binary=:all: grpcio

# Installing pdf related packages
RUN /home/dev/devenv/bin/pip install pdfminer
ENV PDFIUM_PLATFORM=sourcebuild
RUN /home/dev/devenv/bin/pip install pdfminer.six
RUN /home/dev/devenv/bin/pip install --only-binary=PyMuPDF pypdf pymupdf4llm[parsers-pypdf]
RUN /home/dev/devenv/bin/pip install pdfplumber --no-binary :all: --no-deps
RUN /home/dev/devenv/bin/pip install "numba<0.62" "llvmlite<0.45,>=0.44.0"

# --- Build & Install Apache Arrow from source ---
RUN git clone https://github.com/apache/arrow.git && \
    cd arrow/cpp && \
    mkdir release && cd release && \
    cmake .. \
      -DARROW_COMPUTE=ON \
      -DARROW_PARQUET=ON \
      -DARROW_PYTHON=ON \
      -DARROW_BUILD_STATIC=OFF \
      -DARROW_BUILD_SHARED=ON \
      -DCMAKE_BUILD_TYPE=Release && \
    make -j"$(nproc)" && \
    make install && \
    cd ../../python && \
    /home/dev/devenv/bin/pip install -e .

COPY requirements.txt .
RUN /home/dev/devenv/bin/pip install -r requirements.txt

# Clone PyTorch and build it inside the virtual environment
RUN git clone --recursive https://github.com/pytorch/pytorch.git /home/dev/pytorch && \
    /home/dev/devenv/bin/pip install --upgrade pip && \
    /home/dev/devenv/bin/pip install -r /home/dev/pytorch/requirements.txt && \
    cd /home/dev/pytorch && \
    /home/dev/devenv/bin/python3 setup.py install

# Set home directory
WORKDIR /home/dev/Spyre_Document_Summarizer

# Copy required directories
COPY backend ./backend
COPY sample_docs ./sample_docs

# Run bash
CMD ["/bin/bash"]
