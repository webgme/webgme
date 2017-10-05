Terminology
======================

Project
  Version (and access) controlled model repository containing (model)data-blobs, commits, branches and tags.

Commit
  Immutable object with a reference to a single state of a project and the ancestor commit(s) [of that state].

Branch
  Mutable label referencing a single commit. [Changes to branches are broadcasted to clients.]

Tag
  Similar to a branch, but it does not change. [It can be deleted and recreated but not updated.]
Node
  Atomic modeling element in the project tree.

Containment/Composition
  Single rooted tree among the nodes related as parent/children. Strong relationship.

Inheritance
  Single rooted tree among the nodes related as base/instance. Strong relationship that infers prototypal/prototypical inheritance.

Project Tree
  Combination of the containment and inheritance tree. [Where the nodes exist.]

FCO and ROOT node
  The FCO is the root of the inheritance tree and the ROOT is the root of the containment tree.

Meta-rules
  Definitions that governs the properties of, and relationships between the nodes.

Meta-node
  Node that is part of the MetaAspectSet (owned by the ROOT) and typically contains meta-rules.

Meta-type
  A node’s first parent in the inheritance tree that is a meta-node is the meta-type of that node.

Relid
  Unique identifier of a child within a parent.

Path
  Unique position of a node in the containment hierarchy. [The '/'-concatenation of the parents’ and its relids.]

GUID
  Immutable unique identifier of a node.

Library and namespace
  A project embedded within another project. Each library defines a unique namespace.

Core API
  API for querying and manipulating nodes that forms a state of a project.

Client API
  API on top of the Core API that also handles the evolution of a project.

Plugin
  Scripts invoked on a specific state of a project. [Typically use the Core API to interpret or transform models.]

Visualizer
  UI-component that visualizes the state and evolution of the project tree. [Typically uses the Client API to track the changes]

Decorator
  UI-component subordinate a visualizer that visualizes/decorates a single node. [The Model Editor and Part Browser defines their own APIs for controlling their decorators.]
