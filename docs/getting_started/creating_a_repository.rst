The App Repository
=====================
All of the code, configurations, images etc. for the web-app will be contained in a single repository. In order for webgme
to pick up the correct configurations and locate the code there is an imposed structure on our repository. Fortunately,
webgme-cli will automatically set this up for you.


Creating a Repository
-------------------
Pick location on your file-system where you want your repository to be located (a new folder will be created).

.. code-block:: bash
    webgme init NAME

Navigate into the newly created directory and you will see the content...

.. code-block:: bash
    cd NAME

.gitignore
  Contains a list of patterns of files that will not be checked into the repository if using git as version control system.

app.js
  This is the javascript file that starts the webgme server. Note that it requires a mongo database server to be available at the specified mongo-uri from the gmeConfig. If you need to make some actions before start up - this is the place to put that code.

package.json
  The `package.json https://docs.npmjs.com/files/package.json` contain information for npm. It's main purpose is to store the dependencies of a module (this repo can be seen as a module and used by others). Notice that
  webgme is a peerDependency. The reason for this is that webgme-cli provides ways to share and reuse components between webgme repositories and in order to avoid multiple
  installations of webgme (when the versions do not match exactly) webgme is by default set as a peerDependency. If you're not intending ot share this repo you can move over the
  declaration under dependencies instead.

README.md
  It's always good to give a highlevel introduction about a repository together with some steps of how to run the app. This is the place to put it.

webgme-setup.json
  This is where webgme-cli stores meta-data about generated components of this repository. It should not be manually edited.

Installing the node_modules
-------------------
Before launching the server you need to install all dependencies. From the root of the repository do:

.. code-block:: bash
    npm install

In case you didn't move webgme to dependencies and it's still a peerDependency you need to explicitly install it...

.. code-block:: bash
    npm install webgme

To check if the installation succeeded do, it should print a tree like structure and include webgme at the root scope.

.. code-block:: bash
    npm list



