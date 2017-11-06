Creating a Meta-model
======================
At this point you should have a basic understanding of the concepts of meta-modeling in webgme. Before starting to build
a meta-model for our electrical circuit domain, you need to know the basics behind the webgme GUI...

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/SddGyiYtJ34" frameborder="0" allowfullscreen></iframe>
    </div>


Which concepts do we need?
--------------------------
The first thing to layout when constructing a meta-model is what type of concepts do we need? Which these are does not only
depend on the domain, but also the analysis tools being targeted. Since our target is **Modelica** and more specifically the
Basic Components in the Analog Electrical library as part of the **Modelica Standard Library**, we should take that into consideration.

.. figure:: electrical_analog_modelica.png
    :align: center
    :scale: 80 %

        Electrical Analog components in Modelica


This library contains a range of electrical components with a various number of pins. Looking at one of the examples we
see that the pins are connected via electrical connections.

.. figure:: cauer_low_pass_modelica.png
    :align: center
    :scale: 80 %

    A Cauer Low Pass Analog Circuit in Modelica


With or without Modelica a very natural breakdown of this domain is include the concepts of a :code:`Component`, :code:`Pin`, and :code:`Connection`.
Additionally, since our goal is to build electrical circuits, we also need the concept of a :code:`Circuit`.
Later we will add sub-types of components corresponding to components such as ``Resistor``, ``Ground``, ``Capacitor``, ``Inductor``, etc.

The video below shows how you can add these initial concepts as meta-nodes starting from your empty project.

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/LbwlUVcgvBk" frameborder="0" allowfullscreen></iframe>
    </div>

|

Containment
----------------
Now let's model where these concepts can be added in the containment-hierarchy.

A ``Circuit`` should be able to contain ``Component``s wired together by ``Connection``s. The way connections
are constructed in webgme requires us to add a containment rule for the ``Connection`` w.r.t. the ``Circuit``.
Next section illustrates how we can make the ``Connection`` in to an actual connection (an edge on the drawing canvas).

Inside the ``Component`` the ``Pin``s determine where the ``Connection``s connect the ``Component``s together.

The video below shows how to add these containment rules to our meta-model using the Meta Editor.

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/LbwlUVcgvBk" frameborder="0" allowfullscreen></iframe>
    </div>

|

Sub-types of Components
--------------------
So far our meta-model only contains a generic ``Component`` for representing electrical components, but we need a way to represent
specific electrical components such as ``Resistor``, ``Ground``, etc. There are multiple ways we can achieve this by extending the
meta-model. Since our domain is relatively small we will take the approach of adding a meta-type for each type of electrical component
and add the related Modelica parameters as attributes.

An alternatively approach would be to create the different types of electrical components outside of the meta and treat
the Modelica parameters as separate child nodes of the components. This approach allows for creation of new types
without modifying the meta-model itself, but also makes the modeling a bit more cumbersome using the default visualization.
(Visualizing and modifying the parameters of a component could no longer be done from a single node.)

For the sake of simplicity we will take the first approach and limit out domain to the five components (we will also leave out
the heat portion of the components). Note that the associated Modelica parameters can be extracted from the **Modelica Standard
Library** using a Modelica tool, such as `OpenModelica <https://openmodelica.org/>`_. For each component we need to indicate
its unique path or identifier within the **MSL**, this will be captured by the read-only attribute ModelicaURI.

`Resistor`
    Attributes
        * `ModelicaURI` - `Modelica.Electrical.Analog.Basic.Resistor`
        * `R` - The resistance of the connector in Ohm. A float greater or equal to `0` with a default value of `1`.
    Ports
        Two ``Pin``s `p` and `n`.

`Ground`
    Modelica requires each electrical system (`Circuit` in our case) to contain a ground component in order to make the system solvable.
    Attributes
        * `ModelicaURI` - `Modelica.Electrical.Analog.Basic.Resistor`
    Ports
        One ``Pin`` named `p`.

Connections and Ports
--------------------
TODO: