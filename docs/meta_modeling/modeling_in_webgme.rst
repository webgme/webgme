Modeling in Webgme
======================
OK, so in webgme you can make a (meta-)model that describes how models can be composed. That's all sounds pretty neat, but
in order for that to work in practise some more concepts are needed.

* How do nodes (model elements) relate to each other in general, what are the restrictions?

Before going into the details of the data-model let's first have a look at the default GUI of webgme...

.. raw:: html

    <div style="position: relative; height: 0; overflow: hidden; max-width: 100%; height: auto; text-align: center;">
        <iframe width="560" height="315" src="https://www.youtube.com/embed/SddGyiYtJ34" frameborder="0" allowfullscreen></iframe>
    </div>

|

Data-model
------------------
Leaving the adaptive UI on the side, it is completely possible to construct models using webgme's APIs that do not adhere
to any specific meta-model. Below are the built-in concepts of the webgme data-model listed. Note that they are tightly coupled
with concepts of the meta-models.

**FCO**
    “first class object”, “object”, “thing” every node is derived from this (except the **ROOT**)
Inheritance
    Single tree rooted at the **FCO**. Every node has a base, except the **FCO** and **ROOT**. Inheritance is a strong
    relationship: If the base is removed so are all derived nodes. Webgme uses `prototypal inheritance <https://en.wikipedia.org/wiki/Prototype-based_programming>`_.
Containment
    Single tree rooted at **ROOT**. Every node has a parent except the **ROOT**. Inheritance is a strong relationship:
    If the parent is removed so are all children nodes.
Pointer
    A one-to-one named association. The equivalent in UML is `Directed Association <https://en.wikipedia.org/wiki/Association_(object-oriented_programming)>`_.
Set
    A one-to-many named association. Similar to pointers but the owner can associate with more than one target. Also similar to containment by it is not a strong relationship.
    The equivalent in UML is `Aggregation <https://en.wikipedia.org/wiki/Object_composition#Aggregation>`_. In webgme sets can store data about their members.
Attribute/Registry
    Textual or numerical information stored at the nodes. Attributes adhere to the meta-model, whereas registries can hold any type
    data without meta-violations.


Restrictions Beyond the Meta-model
--------------
The data-model itself does set some restrictions on models in addition to the meta-model - these are mainly stemming from
how prototypal inheritance is implemented in webgme. Consider a meta-type :code:`A` that can contain instances of meta-type :code:`A`.

.. figure:: a_container.png
    :align: center
    :scale: 100 %

    Nodes of meta-type :code:`A` can contain other nodes of meta-type :code:`A`.

Consider two instances of :code:`A`, :code:`a` and :code:`a'`. (Yes in webgme creating instances is not restricted to meta-types,
and it's perfectly fine to create a new instance from any node.)

.. figure:: instance_of_instance.png
    :align: center
    :scale: 100 %

    :code:`a'` is an instance of :code:`a`, which in turn is an instance of :code:`A`.

One immediate restriction (that should not be very surprising) is that node :code:`a` cannot contain itself - a node can only
exist in once place in the containment hierarchy.

In this scenario it is not possible to move :code:`a'` into :code:`a`, nor the other way around even though either case would
not a violate the meta-rules.

Nodes cannot contain any of its instances
    Prototypal inheritance in webgme also includes structural inheritance - an instance inherits the nodes contained by its base.
    If :code:`a'` were contained in :code:`a` it would mean that :code:`a'` would inherit an instance of itself as a child. This
    child would in turn inherit yet another instance of itself as a child, and so on until the people in the white lab enters...
Nodes cannot contain any of its bases
    This is due to how nodes are loaded in webgme. If you remember from the introduction, all nodes do not have to be loaded
    in webgme - instead subtrees are loaded on demand. Before a node is loaded all its parents and bases are loaded. In the case
    where :code:`a'` were to contain :code:`a` this look-up would result in a loop. To load :code:`a` its parent :code:`a'` would
    have to be loaded first and to load :code:`a'`, its base :code:`a` would have to be loaded..

In general the graph formed by the intersection of the nodes and union of the edges from the containment- and intersection-tree
must form a tree (a graph with no loops). Luckily the webgme UI and the API ensures that this won't happen.