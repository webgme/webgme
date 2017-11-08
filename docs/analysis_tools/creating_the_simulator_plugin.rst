Creating the Simulator Plugin
===========================
This section will show how we can integrate the OpenModelica compiler (OMC) with the webgme.

Calling OMC from Command line
---------------------------
Installing OpenModelica

Calling OMC from Command line

Mos script for simulating

Generating the SimulateModelica plugin
--------------------------------------
Just like when we generated the `ModelicaCodeGenerator` plugin we again use the webgme-cli tool.

.. code-block:: bash

    webgme new plugin SimulateModelica

This plugin will be responsible for the following tasks:

1. Invoking the ModelicaCodeGenerator to retrieve the modelica code
2. Generating a mos script that simulates the circuit from the modelica code
3. Calling OMC to initiate the simulation
4. Reading in the results and storing them in the model
5. Notifying the invoker about the progress



Invoking the ModelicaCodeGenerator
--------------------------------


Calling OMC from SimulateModelica
---------------------------------

