Creating the Simulator Plugin
===========================
This section will show how we can integrate the OpenModelica compiler (OMC) with the webgme. The example shown here is
of course quite specific to Modelica, still the main takeaway is the pattern which can be reused for many
analysis tools in general.

Calling OMC from cmd/shell
---------------------------
Download and install the open-source Modelica modeling and simulation environment
`OpenModelica <https://openmodelica.org/>`_. After the installation make sure the following command is working from an
arbitrary directory.

Windows
    ``> %OPENMODELICAHOME%\bin\omc.exe --help``

Linux/Mac
    ``$ omc --help``

OpenModelica supports scripting of model-editing and simulation via `mos scripts <https://build.openmodelica.org/Documentation/OpenModelica.Scripting.html>`_.
From the ``--help`` output we see that these can be invoked by the command:

.. code-block:: bash

    omc Script.mos           will run the commands from Script.mos.

The following mos code will load and simulate a circuit model and store the results in ``aCircuit_res.csv`` (details about
the functions used is documented `here <https://build.openmodelica.org/Documentation/OpenModelica.Scripting.html>`_.)

.. code-block:: Java

    // Load Modelica Standard Library (MSL).
    loadModel(Modelica); getErrorString();
    // Load the generated circuit model.
    loadFile("aCircuit.mo"); getErrorString();
    // Simulate the model and generate the output as an csv file.
    simulate(aCircuit, startTime=0.0, stopTime=1.0, outputFormat= "csv"); getErrorString();

Save the code snippet above in ``simulate.mos`` and place the generated ``aCircuit.mo`` file in the same directory.
Providing you used the same name for your circuit confirm that the following command works and indeed generates the
result file.

Windows
    ``> %OPENMODELICAHOME%\bin\omc.exe simulate.mos``

Linux/Mac
    ``$ omc simulate.mos``

Alright so we have a programmatic way of simulating our circuits. Now let's implement this code in a plugin!

Generating the SimulateModelica Plugin
--------------------------------------
Just like when we generated the `ModelicaCodeGenerator` plugin we again use the webgme-cli tool.

.. code-block:: bash

    webgme new plugin SimulateModelica

This plugin will be responsible for the following tasks:

1. Invoking the ModelicaCodeGenerator to retrieve the modelica code
2. Generating a mos script that simulates the circuit from the modelica code
3. Calling OMC to execute the simulation
4. Reading in the results and storing them in the model

Since this plugin will execute commands on the server we need to enable execution of server side plugins in the
`gmeConfig <https://github.com/webgme/webgme/tree/master/config#plugin>`_.

In the plugin's ``metadata.json`` we will disable browser execution of the specific plugin, add a configuration parameter and register that `ModelicaCodeGenerator` is a dependency of the plugin.
Additionally we register that the plugin requires write access to the project, that way users without write access won't
be able to execute the plugin. For detailed info about the ``metadata.json`` documentation is
`available here <https://github.com/webgme/webgme/wiki/GME-Plugins#metadatajson>`_.

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/ZEbxRAKi5Z0?rel=0" frameborder="0" allowfullscreen></iframe>
    </div>

|

Invoking the ModelicaCodeGenerator
----------------------------
Plugin can be invoked from other plugins and the invoker will receive the results generated from the invoked plugin.
The video below shows how to do this.

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/TnP5oxjgyUU?rel=0" frameborder="0" allowfullscreen></iframe>
    </div>

|

Simulating the Model
-------------------------
At this point we have access to the model-content and a way to invoke OpenModelica from command line. We will create a
unique directory on the server where the ``.mo`` and ``.mos`` files will be written out. After that we will execute the
command using `nodejs's child_process module <https://nodejs.org/dist/latest-v8.x/docs/api/child_process.html>`_. (From
the same link documentation about the other built-in modules of nodejs can be found.)

The first video shows how to generate the files and the second one shows how to simulate and store the result in the model.

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/q9AS35VhAYg?rel=0" frameborder="0" allowfullscreen></iframe>
    </div>

|

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/Ol8YqcNnSNs?rel=0" frameborder="0" allowfullscreen></iframe>
    </div>

|

Notes for Developers
-------------------
When developing plugins it is typically faster to execute the plugin directly from command line and much easier to debug
server side code than running and restarting the server. The webgme bin script for running plugins is available
and documented at ``npm run plugin`` (the script itself is located at ``./node_modules/webgme-engine/src/bin/run_plugin.js``.

This tutorial has not touched on how to write tests for the plugins. Webgme provides a range of helper methods to build
up the model context for a plugin, see the generated test files for some examples.