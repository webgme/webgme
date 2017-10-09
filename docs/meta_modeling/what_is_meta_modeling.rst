What is Meta-modeling?
======================
Alright, so you have created your first webgme project and probably want to make a bit more interesting than just containing
the **FCO** and **ROOT** nodes...

In a typical modeling environment (including the Design Studio you will have built up at the end of this tutorial)
there will be an syntax or schema for how models are being built up. In many tools this syntax is implied and enforced in the code itself, but
webgme, and meta-modeling tools in general, work differently. The rules for how models can be composed (structural semantics) is captured in a model itself - the meta-model.
The following definition of meta-modeling is borrowed from Wikipedia[1]_.

.. code-block:: bash

    A metamodel or surrogate model is a model of a model, and metamodeling is the process of generating such metamodels.

So a meta-model is a model that governs how other models can be composed. Without an example, this can sound a bit fuzzy..

.. [1] This tutorial uses the hyphenated version of meta-model and not metamodel.