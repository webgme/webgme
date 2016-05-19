FROM ubuntu:14.04.3
MAINTAINER Tamas Kecskes <tamas.kecskes@vanderbilt.edu>

# Replace shell with bash so we can source files
RUN rm /bin/sh && ln -s /bin/bash /bin/sh

# install necessary packages
RUN apt-get -qq update --fix-missing
RUN apt-get install -y -q curl
RUN sudo apt-get install -y -q build-essential libssl-dev mongodb-server

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
# TODO we should take .dockerignore into use
COPY seeds /usr/app/seeds/
COPY src /usr/app/src/
COPY config /usr/app/config/
COPY utils /usr/app/utils/
COPY teststorage /usr/app/teststorage/
COPY package.json /usr/app
COPY webgme.js /usr/app
COPY .bowerrc /usr/app
COPY jsdoc_conf.json /usr/app
COPY jsdocdefs.js /usr/app
COPY README.md /usr/app

# Install app dependencies
RUN npm install --unsafe-perm

# create startup script
# TODO find a way to execute with different configuraitons
RUN echo '/etc/init.d/mongodb start' >> /root/run.sh &&\
    echo 'npm start' >> /root/run.sh


EXPOSE 8888

CMD ["bash", "-xe", "/root/run.sh"]

# useful commands
# docker build -t webgme .
# docker kill webgme; docker rm webgme
# docker run -p 8888:8888 --name=webgme webgme
# docker logs -f webgme
# docker ps
# docker exec webgme mongorestore