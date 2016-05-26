# This dockerfile is intended to build a docker image on a clean copy of the webgme repository.
#
# Use the following steps to build and start-up your dockerized webgme:
# (assuming that you have docker properly installed on your machine)
# 1. go to the directory where this file exists
# 2. docker build -t webgme .
# 3. docker run -d -p 8888:8888 --name=webgme webgme
#
# The result of your last command will be the hash id of your container. After successful startup,
# you should be able to connect to your dockerized webgme on the 8888 port of your docker daemon machine
# (the default ip address of the daemon is 192.168.99.100).
#
# Useful commands
# checking the status of your docker containers:    docker ps -a
# restart your docker container:                    docker restart webgme
# stop your container:                              docker stop webgme
# removing your container:                          docker rm webgme
# removing your image:                              docker rmi webgme



FROM ubuntu:14.04.3
MAINTAINER Tamas Kecskes <tamas.kecskes@vanderbilt.edu>

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# install necessary packages
RUN apt-get -qq update --fix-missing
RUN apt-get install -y -q curl
RUN sudo apt-get install -y -q build-essential libssl-dev mongodb-server git

ENV NVM_DIR /usr/local/nvm
ENV NODE_VERSION 4.4.4

# NVM
RUN curl https://raw.githubusercontent.com/creationix/nvm/v0.31.1/install.sh | bash \
    && source $NVM_DIR/nvm.sh \
    && nvm install $NODE_VERSION \
    && nvm alias default $NODE_VERSION \
    && nvm use default

ENV NODE_PATH $NVM_DIR/v$NODE_VERSION/lib/node_modules
ENV PATH      $NVM_DIR/versions/node/v$NODE_VERSION/bin:$PATH

RUN mkdir /usr/app

RUN echo smallfiles = true >> /etc/mongodb.conf

WORKDIR /usr/app

# copy app source
ADD . /usr/app/

# Install app dependencies
RUN npm install --unsafe-perm

# create startup script
# TODO find a way to execute with different configuraitons
RUN echo '/etc/init.d/mongodb start' >> /root/run.sh &&\
    echo 'npm start' >> /root/run.sh


EXPOSE 8888

CMD ["bash", "-xe", "/root/run.sh"]