Dependencies
===============
One of the advantages of being a web-based modeling environment is that end-user do not need be concerned with
installing any dependencies on their machine. All they need is a web browser! We aim to support all the major modern browsers.
However we recommend using Chrome for a couple of reasons:

1. Manual testing is mostly done using chrome
2. Performance profiling is done against the `V8 JavaScript Engine <https://en.wikipedia.org/wiki/V8_(JavaScript_engine)>`_

As a developer of a webgme app you will however be required to host your own webgme server and for that you will need
to install some dependencies in addition to having access to a browser.

* `Node.js <https://nodejs.org/>`_ (version >= 4, CI tests are performed on versions 4.x, 6.x and LTS is recommended).
* `MongoDB <https://www.mongodb.com/>`_ (version >= 2.6).
* `Git <https://git-scm.com>`_ (must be available in PATH).
* (Optional) `Redis <https://redis.io/>`_ Note that this is only needed if you intend on running `multiple webgme nodes <https://github.com/webgme/webgme/wiki/Multiple-Nodes>`_.

Installing Node.js
---------------
When you have followed the instructions below make sure that the command below works and prints v6.11.4 or similar.

.. code-block:: bash

    node --version

Windows
  Simply click on the link above and make sure to install the LTS! At the time of writing this that would be version v6.11.4.
  Alternatively install nvm (node version manager) which enables you to have multiple version of node installed.

Linux based operating systems (and macOS)
  On linux based systems it is recommended to install node using nvm (node version manager). It allows you to have multiple versions installed.
  The instructions below are borrowed from `d2s' gist <https://gist.github.com/d2s/372b5943bce17b964a79>`_.

1. Open new Terminal window.
2. Run `nvm <https://github.com/creationix/nvm>` installer with either curl or wget.

.. code-block:: bash

    curl -o- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

or

.. code-block:: bash

    wget -qO- https://raw.githubusercontent.com/creationix/nvm/v0.33.5/install.sh | bash

3. If everything went well, open new Terminal window/tab.
4. List what versions of Node are currently installed (probably none).

.. code-block:: bash

    nvm ls

5. Install latest `Node.js <https://nodejs.org/en>`_ LTS release.

.. code-block:: bash

  nvm install v6.11.4


Installing MongoDB
------------------
Webgme stores the models, project metadata and user info inside a mongo database. The
`Community edition https://docs.mongodb.com/manual/administration/install-community/`_ works fine.

After you've followed the instructions and successfully installed mongodb. Either Launch a daemon (mongod) with the default options or pass the dbpath flag to store files at another location.

.. code-block:: bash

    mongod --dbpath C:\webgmeData


.. code-block:: bash

    mongod --dbpath ~/webgmeData

Git
--------
For this tutorial you will need to have git installed. On linux this is typically already installed. Check by typing:

.. code-block:: bash

    git --version

If not installed following the instruction at `git's webpage <https://git-scm.com/downloads>`_.


Redis
-----------
This is optional and we won't be needing it for the tutorial.