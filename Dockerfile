FROM ubuntu:14.04
MAINTAINER Zsolt Lattmann <zsolt.lattmann@gmail.com>


# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# Set debconf to run non-interactively
RUN echo 'debconf debconf/frontend select Noninteractive' | debconf-set-selections

RUN apt-key adv --keyserver keyserver.ubuntu.com --recv-keys B9316A7BC7917B12 #44A334DA # 87374F5D
# Install base dependencies
RUN apt-get -qq update && apt-get install -y -q --no-install-recommends \
        apt-transport-https \
        build-essential \
        ca-certificates \
        curl \
        git \
        libssl-dev \
        python \
        rsync \
        software-properties-common \
        wget \
        mongodb-server \
        moreutils \
        unzip \
    && rm -rf /var/lib/apt/lists/*

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 0.10.38

# Install nvm with node and npm
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.25.0/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/v$NODE_VERSION/bin:$PATH



RUN echo smallfiles = true >> /etc/mongodb.conf

RUN mkdir -p /project
ADD package.json /project/package.json

# mount the current project workspace under /project inside the container
ADD . /project

VOLUME ["/project"]
WORKDIR /project

RUN npm install

RUN echo '#!/bin/bash -ex' >> /root/run.sh &&\
  echo '/etc/init.d/mongodb start' >> /root/run.sh &&\
  echo 'npm install' >> /root/run.sh &&\
  echo 'npm start' >> /root/run.sh

EXPOSE 8888

CMD ["bash", "-xe", "/root/run.sh"]

# docker build -t webgme .
# docker kill webgme; docker rm webgme
# docker run --rm --name webgme -e 'NODE_VERSION=0.10' -t webgme
# docker run -d -p 0.0.0.0:8888:8888 --name webgme -t webgme
# docker logs -f webgme
# docker ps
# docker exec webgme mongorestore

