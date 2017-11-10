The App Repository
=====================
All of the code, configurations, images etc. for the web-app will be contained in a single repository. In order for webgme
to pick up the correct configurations and locate the code there is an imposed structure on our repository. Fortunately,
webgme-cli will automatically set this up for you.

Installing webgme-cli
------------------
`webgme-cli <https://github.com/webgme/webgme-cli>`_ is a tool for managing webgme apps.
It provides a command line interface for creating, removing, installing from other webgme apps,
(etc) for various webgme components.

Make sure you have node.js and npm (npm comes with node.js) installed.

.. code-block:: bash

    npm --version

Now install webgme-cli as a global npm module (the flag :code:`-g` ensures this)

.. code-block:: bash

    npm install -g webgme-cli

If the installation was successful the following command should print a version number (the version of webgme-cli).

.. code-block:: bash

    webgme --version


Creating a Repository
-------------------
Pick a location on your file-system where you want your repository to be located (a new folder will be created).

.. code-block:: bash

    webgme init electrical-circuits

Navigate into the newly created directory and you will see the content...

.. code-block:: bash

    cd electrical-circuits

:code:`.gitignore`
  Contains a list of patterns of files that will not be checked into the repository if using git as version control system.

:code:`app.js`
  This is the javascript file that starts the webgme server. Note that it requires a mongo database server to be available at the specified mongo-uri from the gmeConfig. If you need to make some actions before start up - this is the place to put that code.

:code:`package.json`
  The `package.json https://docs.npmjs.com/files/package.json` contain information for npm. It's main purpose is to store the dependencies of a module (this repo can be seen as a module and used by others). Notice that
  webgme is a peerDependency. The reason for this is that webgme-cli provides ways to share and reuse components between webgme repositories and in order to avoid multiple
  installations of webgme (when the versions do not match exactly) webgme is by default set as a peerDependency. If you're not intending ot share this repo you can move over the
  declaration under dependencies instead.

:code:`README.md`
  It's always good to give a highlevel introduction about a repository together with some steps of how to run the app. This is the place to put it.

:code:`webgme-setup.json`
  This is where webgme-cli stores meta-data about generated components of this repository. It should not be manually edited.

Installing the node_modules
-------------------
In order to be able to launch the server you need to install all dependencies. From the root of the repository do:

.. code-block:: bash

    npm install

In case you didn't move webgme to dependencies and it's still a peerDependency you need to explicitly install it...

.. code-block:: bash

    npm install webgme

To check if the installation succeeded the following command should print a tree-like structure and include webgme at the root level.

.. code-block:: bash

    npm list

gmeConfig
-------------------
The configuration files in the ``config`` directory is where you set the configuration for your webgme app. By default
the ``config/config.default.js`` and is the entry point of where you manually can overwrite the parameters. It loads
``config/config.webgme.js`` where webgme-cli adds parameters for the generated components (e.g. plugin). A full list of
all possible parameters and how to switch between configuration files is documented `here https://github.com/webgme/webgme/blob/master/config/README.md`_.

Starting the server
-------------------
Make sure you have mongodb running. Look back at the dependencies section (todo link). As mentioned before the app.js file is
the starting point for the webgme server. To invoke it with node.js simply do:

.. code-block:: bash

    node app.js

There is a short-cut defined in package.json that lets you start the app by typing:

.. code-block:: bash

    npm start

You should see some logging listing the port where webgme is available. By default this is 8888, so open up a browser
and enter :code:`localhost:8888` in the address bar. The webgme GUI should be loaded!

.. figure:: editor.png
    :align: center
    :scale: 100 %

    The WebGME GUI