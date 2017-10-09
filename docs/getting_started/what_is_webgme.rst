What is WebGME?
===============
WebGME is a web-based, collaborative meta-modeling environment. WebGME is a client-server based application, where both the client (browser)
and server-side (`NodeJS <https://nodejs.org>`_) use JavaScript. The clients carry quite a lot of the work-load and the role of the server
is mainly to store and retrieve the raw model-data and propagate events between collaborating clients.

Clients do not load the entire model, instead they register and listens to events from territories within the model hierarchy.
The major portion of the communication with the server is retrieving raw model-data. Therefore the storage model has been optimized to
reuse as much of that data as possible; both over revisions (structural sharing of immutable data) and within the models (prototypal inheritance).
In addition, when two versions of the data exist, the communication is done via small patches (diffs).

This model allows for immediate small commits, which in turn minimizes the risk for accidental branching. Every change made using the GUI will
create a new commit in the GIT-like storage.

The Storage Model
------------------
TODO: Projects, Raw model-data, commits, branches, tags.

TODO: Forking, merge.


Extensible
--------------
WebGME is made to be customized. Even though the generic GUI adapts itself based on the meta-model (the model describing the models),
the visualization can be augmented and/or replaced on multiple levels; From small decorators displaying certain characteristics for
nodes on the canvas, to completely swapping out the GUI and only use the `WebGME Client API <https://github.com/webgme/webgme-engine>`_
as a library inside any front-end framework.

In addition to visualization webgme provides a framework for user-defined plugins - javascript code running either inside
the browser or on the server (or both). These scripts (typically invoked by the end-users) are triggered on specific commits and
contexts of the models and can work along side the users without any need for locking etc.

Other points of extensions are sdd-ons, webhooks, REST-routers, etc. TODO: Links