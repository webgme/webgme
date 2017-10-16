Model Interpreters
============================
Lets us query the models and extract data.


Plugins
---------------------
Plugins are custom extension points to a webgme-deployment that are intended to be used for e.g. querying, interpreting
and building models. The framework and API are designed to enable both server- and browser-side execution of the same
code. At the point where a plugin is executed it will have access to the context it was invoked and various webgme APIs,
e.g. :code:`Core`, :code:`Project`, :code:`BlobClient` etc.