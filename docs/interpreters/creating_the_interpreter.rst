Creating the Code Generator
=========================
So far we have constructed a meta-model for our electrical-circuit domain. It enabled us to create models that resembles
circuits. Up to this point though there is no actual meaning to the circuits. As humans we can infer certain properties from
these circuits, but the models themselves don't impose any particular interpretation. The meta-model infers the structural semantics,
but no behavioural semantics.

There are many potential interpretations and interpreters of our circuit models. In this tutorial we will focus on generating
Modelica code that can be used to simulate the dynamic behavior of the circuit in question.

How to Implement the Interpreter?
-----------------------
In webgme the typical extension point for writing interpreters are plugins. The plugin framework and API are designed to
enable both server- and browser-side execution of the same code. At the point where a plugin is executed it will have
access to the context it was invoked and through various webgme APIs; :code:`Core`, :code:`Project`, :code:`BlobClient` etc.

In this tutorial we will create two plugins;

* *ModelicaCodeGenerator* - traverse model and extract the data needed to generate a Modelica model corresponding to the
 circuit being interpreted. This plugin will also generate the Modelica code.
* *SimulateModelica* - this plugin will invoke the *ModelicaCodeGenerator* to retrieve the Modelica code and implement
the logic needed to invoke a Modelica tool (OpenModelica in this case) at the generated output. This plugin will also be
responsible for communicating back the simulation result to the end-user.

There a couple of reasons why this is a favourable division. To generate the Modelica code there is no restrictions on
where the plugin is executed. The server does not have to have any 3rd party dependencies installed (alternatively connected
workers with these installed) and the plugin can even run in the browser. For some deployments restricting the set of features
to only generate the Modelica code might be favorable. When it comes to writing tests it is typically easier to divide
functionality into separate implementations.

We will start with the *ModelicaCodeGenerator* here and continue with the *SimulateModelica* in the analysis tool section...

Generating a Plugin Template
-----------------------
To get a quick start we use the webgme-cli tool in order to create a new plugin. Navigate to the root of the repository
created in earlier sections and invoke the command below.

.. code-block:: bash

    webgme new plugin ModelicaCodeGenerator

This should generate a range of new files..

:code:`src/plugins/ModelicaCodeGenerator/metadata.json`
    This json-structure contains information about the plugin and is used by the GUI and plugin-framework. Details
    about what goes in here is explained in the `wikipages <https://github.com/webgme/webgme/wiki/GME-Plugins#metadatajson>`_.

:code:`src/plugins/ModelicaCodeGenerator/ModelicaCodeGenerator.js`
    This is the code of the plugin itself. The very first lines shows the dependencies needed for this code
    to run and is using `requirejs <http://requirejs.org/>`_ hence the syntax
    :code:`define(['path'], function (Module){ ... return ModelicaCodeGenerator;});`. The last return statement is the
    module that this file defines when required by another module (the plugin framework must be able to load our plugin).

:code:`test/plugins/ModelicaCodeGenerator/ModelicaCodeGenerator.spec.js`
    This is the outline of a `mocha <https://mochajs.org/>`_ test suite for the plugin and shows how to build up a test
    context and invoke a plugin from a unit-test.

You might also have noted that the :code:`config/config.webgme.js` was modified. In order for the webgme plugin framework
to find our plugin the path to it is added to the configuration file. Note that both :code:`config.default.js` and
:code:`config.test.js` load and reuse the added configuration parameters from this file.


Registering the plugin for the project
----------------------
TODO

Implementing the code generation
--------------------------
TODO

Storing the generated file
-----------------------------
TODO