Meta-modeling in Webgme
======================
OK, so in webgme you can make a (meta-)model that describes how models can be composed. That's all sounds pretty neat, but
in order for that to work in practise some more concepts are needed. Mainly

1. How do nodes (model elements) relate to each other in general, what are the restrictions?
2. What (meta-)model describes how these (meta-)models of models can be modeled?


Webgme data-model
------------------
Leaving the adaptive UI on the side, it is completely possible to construct models using webgme's APIs that do not adhere
to any specific meta-model. These are the built-in concepts of the webgme data-model. Note that they are tightly coupled
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
    The equivalent in UML is `Aggregation <https://en.wikipedia.org/wiki/Object_composition#Aggregation>`_. In webgme sets can store values about their members.
Attribute/Registry
    Textual or numerical information stored at the nodes. Attributes adhere to the meta-model, whereas registries can hold any type
    data without meta-violations.


The Meta-meta-model
--------------------
You guessed it right, the meta-model for composing meta-models is the meta-meta-model. In webgme it is tightly coupled with
the data-model and the concepts described there have counterparts here.