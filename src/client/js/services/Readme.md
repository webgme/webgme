# Services #

## Scenarios ##

1. Project created on server
2. Project deleted on server
3. Branch created on server for project X
4. Branch deleted on server for project X
5. Project selected on client (projectId = project X)
6. Project closed on client (projectId = null)
7. No active project is selected on client (projectId = null)
8. Branch selected on client (active branch = branch Y)
9. Branch selection is changed on client to null (active branch = null)
10. Active branch on client is deleted (active branch = null)
11. Read-only commit is loaded
12. Notification about read-only status change
13. Create new branch from current commit and switch to it
14. Remote connection is lost (enter read-only mode?, try to auto-reconnect)


## Design ##

### `DataStoreService` ###

Manages `Client` instances by its connection id called `databaseId`.

Functions: `connectToDatabase`, `getDatabaseConnection`, `watchConnection`

### `ProjectService` ###

Having an active database connection using `DataStoreService`, this service provides listing of projects `getProjects`, selecting a project `selectProject`, watching projects (e.g. project list changed on server side) `watchProjects`, and `initialize`, `destroy` events on project open/close/delete.

### `BranchService` ###

Having an active database connection using `DataStoreService`, this service provides listing of branches `getBranches`, selecting a branch `selectBranch`, watching branches (e.g. branch list changed on server side) `watchBranches`, and `initialize`, `destroy` events on branch open/close/delete/selected/updated.

### `NodeService` ###

Having an active database connection using `DataStoreService`, this service provides access to the graph nodes (if there is an open project and a selected branch). The `initialize` and `destroy` events used to notify if the nodes are available or not.
The `NodeService` can load (`loadNode`), create (`createNode`), and destroy (`destroyNode`) nodes. Nodes are wrapped in `NodeObj`s that expose metods such as `getAttribute` and `setAttribute`, `getId`, `getGuid` etc. Using the `NodeObj`s users can also attach watchers via `onUpdate`, `unUnload` and `onNewChildLoaded`.

### Use cases and expected behavior ###

`DataStoreService` connection is not initialized: Usage of any services `Project`, `Branch`, `Node` are hard errors, except registering for events like `initialize` and `destroy`


## Services and event notification mechanism ##

`Project`, `Branch`, and `Node` services provide an `on` function, which is used to register event handlers for `initialize` and `destroy` events.

- On `initialize` event all previously provided data has to be ignored/cleaned up and new data is provided.
- On `destory` event all previously provided data has to be ignored/removed/cleaned up.

