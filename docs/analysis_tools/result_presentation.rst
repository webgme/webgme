Result Presentation
======================
There are multiple ways results from an analysis can be presented to the user. Here we list some approaches that can
be used when running the analysis from a plugin.

Generate an Artifact from the Plugin
------------------------------------
The most straight-forward way to present to present the results is to return a link to an artifact at the end of the execution.

Store the Result in the Model
------------------------------------
The end result can also be stored back in the model and viewed at any time. In the case of long running analyses the
invoker might no longer have their browser open to retrieve the results. A benefit of storing the result in the model is
that the results will be version controlled and since they can be attached to the correct context - the evolution of the model
and results can be traced.

For the Modelica simulation we will save the time traces from the dynamic simulation at the circuit and provide a download
link to the results.
With this approach a visualizer for presenting the results can be implemented, which would enable users to view the results
embedded in the webgme GUI.

Notifications while Analysis is Running
------------------------------------
The plugin framework in webgme supports sending notifications back to the invoker. These could be simple progress statuses,
but could also contain partial results. The GUI displays messages like these in a console like notification widget, but
the `Client API <https://github.com/webgme/webgme/wiki/GME-Client-API>`_ allows any UI widget to listen to these and
present the results in any manner.
