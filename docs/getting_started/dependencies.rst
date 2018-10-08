Dependencies
===============
One of the advantages of being a web-based modeling environment is that end-users don't need be concerned with
installing any dependencies on their machine. All they need is a web browser! We aim to support all the major modern browsers.
However we recommend using Chrome for a couple of reasons:

1. Manual testing is mostly done using chrome
2. Performance profiling is done against the `V8 JavaScript Engine <https://en.wikipedia.org/wiki/V8_(JavaScript_engine)>`_

As a developer of a webgme app you will however be required to host your own webgme server and for that you will need
to install some dependencies in addition to having access to a browser.

* `Node.js <https://nodejs.org/>`_ (version >= 6, CI tests are currently performed on versions 6.x, 8.x and LTS is recommended).
* `MongoDB <https://www.mongodb.com/>`_ (version >= 3.0).
* `Git <https://git-scm.com>`_ (must be available in PATH).
* `Python <https://www.python.org/>`_ (This is only needed if you intend to write plugins in python - both v2.7.x and v3.x are supported).

Installing Node.js
---------------
When you have followed the instructions below make sure that the command below works and prints v8.12.0 or similar.

.. code-block:: bash

    node --version

Windows
  Go `to nodejs.org <https://nodejs.org/>`_ and make sure to download and install the LTS! At the time of writing this that would be version v8.12.0.
  Alternatively install `nvm (node version manager) <https://github.com/coreybutler/nvm-windows>`_ which enables you to have multiple version of node installed.

Linux based operating systems (and macOS)
  On linux based systems it is recommended to install node using nvm (node version manager). It allows you to have multiple versions installed.
  The instructions below are borrowed from `d2s' gist <https://gist.github.com/d2s/372b5943bce17b964a79>`_.

1. Open new Terminal window.
2. Run `nvm <https://github.com/creationix/nvm>`_ installer with either curl or wget.

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

  nvm install v8.12.0


Installing MongoDB
------------------
Webgme stores the models, project metadata and user info inside a mongo database. The
`Community edition <https://docs.mongodb.com/manual/administration/install-community/>`_ works fine.

After you've followed the instructions and successfully installed mongodb. Either Launch a daemon (mongod) with the default options or pass the dbpath flag to store files at another location.

Windows

.. code-block:: bash

    mongod --dbpath C:\webgmeData

Linux based/MacOS

.. code-block:: bash

    mongod --dbpath ~/webgmeData

Git
--------
For this tutorial you will need to have git installed. On linux/macOS this is typically already installed. Check by typing:

.. code-block:: bash

    git --version

If not installed following the instruction at `git's webpage <https://git-scm.com/downloads>`_.


Python
-----------
This is only needed if you intend on writing plugins using the python API available via `webgme-bindings <https://pypi.org/project/webgme-bindings/>`_.

Using webgme-bindings works with both v2.7.x and v3.x, however we recommend to install the latest
python 3 version as it already comes packaged with `pip <https://pip.pypa.io/en/stable/>`_ which will be needed in order to install `webgme-bindings <https://pypi.org/project/webgme-bindings/>`_.

Note that here we do not require any Virtual Environment setup for any anaconda. If you're familiar with any of those and
would like to use such approach - it should work perfectly fine as long as the correct `python` is available in $PATH when you
execute your plugin.


Windows and MacOS
    For Windows and MacOS simply download and install the appropriate `latest release at python.org <https://www.python.org/downloads/release/python-370/>`_.
Linux
    For linux `these instructions can be used <https://docs.python-guide.org/starting/install3/linux/>`_. Note that
    the :code:`python` and :code:`pip` executables will be available as :code:`python3` and :code:`pip3`, so for any
    command referring to :code:`python` and :code:`pip` replace these accordingly.
    (In this case you need to update the generated plugin code as well, more about that later...)


When you've installed python and pip, make sure both of these commands prints out a version number.

.. code-block:: bash

    python --version


.. code-block:: bash

    pip --version
