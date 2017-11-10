Model Interpreters/Transformations
============================


Plugins
---------------------
`Plugins <https://github.com/webgme/webgme/wiki/GME-Plugins>`_ are custom extension points to a webgme-deployment that are intended to be used for e.g. querying, interpreting
and building models. The framework and API are designed to enable both server- and browser-side execution of the same
code. At the point where a plugin is executed it will have access to the context it was invoked and various webgme APIs,
e.g. :code:`Core`, :code:`Project`, :code:`BlobClient` etc.

Plugins are the typical starting point when adding interpretation to models and in this tutorial we will focus on how to
create and write plugins.

Add-ons
----------------------
Add-ons are extensions that run on the server and are triggered by changes made in the model. Registered add-ons are started
when there is user-activity in a certain branch of a project and are kept running as long as (configurable) changes are being made.
Add-ons have access to the same APIs as plugins (except the project API).

Webhooks
---------------------
Webhooks are similar to add-ons but more loosely coupled. They can be triggered by different events on the webgme storage
and the implementation requires a server accepting the post-requests sent out at the events. For more detailed
documentation see the `webgme-wiki pages <https://github.com/webgme/webgme/wiki/GME-WebHooks>`_.


iCore
----------------------
`iCore <https://www.npmjs.com/package/webgme-icore>`_ is a visualizer for webgme that enables editing and
execution of code using the same APIs as a plugin directly in the webgme GUI.
This is a good way to get familiar with the different APIs without the need to host your own deployment.
For larger projects/deployments and more advanced interpreters it's not recommended to rely on the iCore and it should be
treated as an educational feature.

To get a quick start to this tutorial it is possible to complete the majority of the steps by creating the meta-model and using the iCore
for implementing the code generator on `webgme.org <https://webgme.org>`_. Since the iCore does not have access to the server, it is however
not possible to execute any simulation tool with this approach.