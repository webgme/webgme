Deployment
======================
Once your application has reach a certain level of complexity and stability you probably want to host a
centralized deployment where multiple users can connect and work together. In the end it is up to you how
you solve it. This section contains common approaches and things to keep in mind when deploying webgme.

Systemd/Init-system
---------------------
Detailed instructions on how to run webgme as a `systemd service <https://en.wikipedia.org/wiki/Systemd>`_ can be found
`here <https://github.com/webgme/webgme/wiki/Systemd>`_.

Docker
-------------------
Another approach is to create a `docker <https://www.docker.com/>`_ image of the webgme-app and run the webgme-app inside
a container. Details information on how to create a webgme docker image and configure it to persist appropriate files
outside of the container is documented `here <https://github.com/webgme/webgme/wiki/Dockerized-WebGME>`_.

The docker image for the webgme-app hosted at `webgme.org <https://editor.webgme.org>`_ is published and publicly
available at `hub.docker.com <https://hub.docker.com/r/webgme/webgme-org/>`_.