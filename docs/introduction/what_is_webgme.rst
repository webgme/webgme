What is WebGME?
===============
WebGME is a web-based, collaborative meta-modeling environment with a centralized version controlled model storage.
WebGME is a client-server based application, where both the client (browser) and server-side (`NodeJS <https://nodejs.org>`_)
use JavaScript. The clients carry quite a lot of the work-load and the role of the server
is mainly to store and retrieve the raw model-data and propagate events between collaborating clients.

The model storage of webgme is influenced by git. All model objects and commits are immutable and all states in the
evolution of a project are identified (and retrievable) via unique commit-hashes. Branches are light-weight mutable
labels referencing one of these commits.

Clients do not load the entire model, instead they register and listens to events at territories (subtrees) within the model hierarchy.
The major portion of the communication with the server is retrieving raw model-data. Therefore the storage model has been optimized to
reuse as much of that data as possible; both over revisions (structural sharing of immutable data) and within the models (prototypal inheritance).
In addition, when two versions of the data exist, the communication of changes is done using small patch objects (diffs).

This model allows for immediate small commits, which in turn minimizes the risk for accidental branching. Every change made using the GUI will
create a new commit in the GIT-like storage. In the event of concurrent changes it's guaranteed that only one client will update
the model state (branch hash). In such cases the other client has the option to attempt to merge in its changes.

Extensible
--------------
WebGME is made to be customized. Even though the generic GUI adapts itself based on the meta-model (the model describing the models),
the visualization can be augmented and/or replaced on multiple levels; From small decorators displaying certain characteristics for
nodes on the canvas, to completely swapping out the GUI and only use the `Client API of webgme-engine <https://github.com/webgme/webgme-engine>`_
as a library inside any front-end framework.

In addition to visualization webgme provides a framework for user-defined plugins - javascript code running either inside
the browser or on the server (or both). These scripts (typically invoked by the end-users) are triggered on specific commits and
contexts of the models and can work along side the users without any need for locking etc.

WebGME-cli
----------------
To ease the process of creating new components webgme provides a tool, `webgme-cli <https://github.com/webgme/webgme-cli>`_, that
generates boilerplate code and automatically updates the configuration so webgme can find and apply these.

In addition to this it also allows users to easily share and import components between repositories, on `webgme.org a list of published extension components <https://webgme.org/?tab=extensions>`_ is updated every 15 min.

WebGME-cli will be used throughout the tutorial, however you don't need to install it right away. As you move forward detailed instructions will be provided.