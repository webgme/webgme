Creating the Interpreter
=========================
So far we have constructed a meta-model for our electrical-circuit domain. It enabled us to create models that resembles
circuits. Up to this point though there is no actual meaning to the circuits. As humans we can infer certain properties from
these circuits, but the models themselves don't impose any interpretation. The meta-model infers the structural semantics,
but no behavioural semantics.

There are many potential interpretations of circuits,

Generating a plugin
-----------------------

.. code-block:: bash

    webgme new plugin myPlugin