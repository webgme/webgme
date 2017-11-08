Generic Visualization
======================
Webgme comes packages with a range of different visualization components. These are meta-agnostic and can be applied to
any meta-models. Based on the current meta-model the visualizers adapt to themselves and displays only what is possible
to do within the meta-model. For instance the property-editor does not the user set a value for an attribute that does not
have a definition in the meta-model. Another example is the part-browser, it only display the valid children of the active
node.

Visualizers
---------------

Decorators
---------------


Customizing SVGs
--------------
Without creating a decorator the webgme gui provides support for dynamic SVGs where data from the models can be accessed
and displayed...

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/l5m4CF4w8fE?rel=0" frameborder="0" allowfullscreen></iframe>
    </div>
