## Add-ons ##
TODO: This needs elaboration..

Add-ons are similar to [Plugins](../plugin/README.md) in that they can use the core-layer to traverse a model.
But whereas plugins are executed on demand (in the browser or on the server), add-ons are constantly running on the
server and listens to updates on the registered project and branch.

### Core Add-ons ###
* Set the flag `config.addOn.enable` to `true` (by default it is `false`).
* Make sure `./src/addon/core` is in `config.addOn.basePaths` (by default it is).
* In an open project, select the root-node and add e.g. `ConstraintAddOn` to `usedAddOns` under `META` in the `Property Editor`.
* For `ConstraintAddOn` add constraints to the meta types in the `META Editor`.



