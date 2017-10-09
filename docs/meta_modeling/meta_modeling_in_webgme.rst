Meta-modeling in Webgme
======================
OK, so in webgme you can make a (meta-)model that describes how models can be composed. That's all sounds pretty neat, but
in order for that to work in practise some more concepts are needed. Mainly

1. How do model elements relate to each other in general, what are the restrictions?
2. What (meta-)model describes how these (meta-)models of models can be modeled?


Webgme data-model
------------------
Leaving the adaptive UI on the side, it is completely possible to construct models using webgme's APIs that do not adhere
to any specific meta-model. These are the build in concepts of the webgme data-model:

* FCO (“first class object”, “object”, “thing”)
* Inheritance and Containment
* Composition
  * single tree rooted at ROOT
* Prototypal/Prototypical inheritance
  * single tree rooted at FCO (First Class Object)
* Pointer: one-to-one named association
  * /Default concrete (visual) syntax makes a model with a pointer pair, called src and dst, visualized as connection/
  * Base pointer
* Set: one-to-many named association
  * pointer list
  * META (stored in the root), Aspects, CrossCuts, Mixin
* Attribute/Registry
  * Textual or numerical information stored at nodes


The Meta-meta-model
--------------------
You guessed it right, the meta-model for composing meta-models is the meta-meta-model. In webgme it is tightly coupled with
the data-model and the concepts described there have counterparts here.