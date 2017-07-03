/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

/**
 * @description The Client class represents the Client API which is the way to communicate
 * with your project from your user-defined UI pieces. It allows project selection, project tracking,
 * model interpretation and model manipulation.
 * !!! Documentation of the class is incomplete !!!
 * For a better understanding of what functionality it can provide, you can check the [Core]{@link Core}
 * documentation as much of the functions of this class are aligned with those functions.
 *
 * @class Client
 *
 * @param {GmeConfig} gmeConfig - the main configuration of the WebGME that holds information
 * about the server and other options.
 */

// Node related
/**
 * @description Returns the [GMENode]{@link GMENode} of the given node if it has been loaded.
 * @function getNode
 * @memberOf Client
 * @instance
 *
 * @param {string} path - the path of the node in question.
 *
 * @return {(GMENode|null)} If the node is loaded it will be returned, otherwise null.
 */

// Territory related
/**
 * @description Adds a "user" for receiving events regarding nodes in a specified territory.
 * @function addUI
 * @memberOf Client
 * @instance
 * @example
 * // The eventHandler is invoked whenever there are changes to the nodes
 // matching any of the patterns.
 // There are three cases when it is triggered:
 // 1) updateTerritory was invoked by us.
 // 2) Another client made changes to nodes within the territory.
 // 3) We made changes to any of the nodes (via the setters).
 function eventHandler(events) {
  var i,
      nodeObj;
  for (i = 0; i < events.length; i += 1) {
    if (events[i].etype === 'load') {
      // The node is loaded and we have access to it.
      // It was either just created or this is the initial
      // updateTerritory we invoked.
      nodeObj = client.getNode(events[i].eid);
    } else if (events[i].etype === 'update') {
      // There were changes made to the node (or any of its bases, meta-types and/or reverse relationships).
      // The node is still loaded and we have access to it.
      nodeObj = client.getNode(events[i].eid);
    } else if (events[i].etype === 'unload') {
      // The node was removed from the model (we can no longer access it).
      // We still get the path/id via events[i].eid
    } else {
      // "Technical events" not used.
    }
  }
}

 var userId = client.addUI(null, eventHandler);
 * @param {object} [ui] - Object with additional methods to be invoked.
 * @param {function} [ui.reLaunch] - Triggered when active project/branch is switched.
 * @param {function} eventHandler - Function invoked at changes for, or initial loading of, nodes within the
 * "user's" territory.
 * @param {object[]} eventHandler.events - Array of event data for affected nodes within the territory.
 * @param {string} [guid] - Unique id of user (if not provided one will be generated).
 * @return {string} The id (guid) of the newly added "user".
 */

/**
 * @description Updates the patterns for the territories defined for the "user" at guid.
 * @function updateTerritory
 * @memberOf Client
 * @instance
 * @example
 * // The patterns are defined by using the ids of the nodes and optionally specifying a depth in the containment-
 * hierarchy from that node
    client.updateTerritory('ae1b4f8e-32ea-f26f-93b3-ab9c8daa8a42', {
        '/a/b': {
            children: 0 // Will only add '/a/b' to the territory
        },
        '/a/c': {
            // children can be left out, implies 0
        },
        '/a/d': {
            children: 1 // '/a/d' and all its children are included
        },
        '/a/e': {
            children: 3 // We can go arbitrarily deep down (note in large models too big territories can be slow!)
        }
    });
 * @param {string} guid - The unique id of the added "user".
 * @param {object} patterns - The definition for the new territory.
 */

/**
 * @description Removes the [user]{@link Client.addUI} at guid and no more events will be triggered at its event-handler.
 * @function removeUI
 * @memberOf Client
 * @instance
 * @example
 * var id = client.addUI(null, function (events) {
 *      // Say we only wanted the initial updateTerritory event.
 *      client.removeUI(id);
 *  });
 *
 *  client.updateTerritory(id);
 * @param {string} guid - The unique id of the "user" to remove.
 */
// Plugin related
/**
 * @description Helper method for obtaining the context for a plugin execution. If WebGMEGlobal is defined it is
 * used to get the activeNode and activeSelection (if not specified). The model context, that is project, branch,
 * commitHash is obtained using the state of the client. If there is an activeNode - the namespace will be the namespace
 * of the first base that defines the pluginId at the "validPlugins" registry.
 * @function getCurrentPluginContext
 * @memberOf Client
 * @instance
 * @param {string} pluginId - Id of plugin.
 * @param {string} [activeNodeId=WebGMEGlobal.State.getActiveObject() || ''] - Specific id for active node.
 * @param {string[]} [activeSelectionIds=WebGMEGlobal.State.getActiveSelection() || []] - Specific ids for active-selection.
 * @return {object} The context needed for runBrowserPlugin/runServerPlugin.
 */

/**
 * @description Helper method for filtering out the registered plugins from the available ones.
 * @function filterPlugins
 * @memberOf Client
 * @instance
 * @param {string[]} pluginIds - Typically all available plugins on the server.
 * @param {string} [nodePath=''] - Node to get the validPlugins from.
 * @return {string[]} Filtered plugin ids.
 */

/**
 * @description Execute the specified plugin inside the browser at the provided context.
 * @function runBrowserPlugin
 * @memberOf Client
 * @instance
 * @param {string} pluginId - Id of plugin.
 * @param {object} context
 * @param {object} context.managerConfig - Where the plugin should execute.
 * @param {ProjectInterface} context.managerConfig.project - Project (e.g. client.getProjectObject()).
 * @param {string} [context.managerConfig.activeNode=''] - Path to activeNode.
 * @param {string} [context.managerConfig.activeSelection=[]] - Paths to selected nodes.
 * @param {string} context.managerConfig.commitHash - Commit hash to start the plugin from.
 * @param {string} [context.managerConfig.branchName] - Branch which to save to.
 * @param {string} [context.managerConfig.namespace=''] - Used namespace during execution ('' represents all namespaces).
 * @param {object} [context.pluginConfig=%defaultForPlugin%] - Specific configuration for the plugin.
 * @param {function(err, PluginResult)} callback
 */

/**
 * @description Execute the specified plugin on the server at the provided context. Before invoking a plugin on the server
 * you need to make sure that the given commitHash has been persisted in the database.
 * @function runServerPlugin
 * @memberOf Client
 * @instance
 * @param {string} pluginId - Id of plugin.
 * @param {object} context
 * @param {object} context.managerConfig - Where the plugin should execute.
 * @param {ProjectInterface|string} context.managerConfig.project - Project or id of project.
 * @param {string} [context.managerConfig.activeNode=''] - Path to activeNode.
 * @param {string} [context.managerConfig.activeSelection=[]] - Paths to selected nodes.
 * @param {string} context.managerConfig.commitHash - Commit hash to start the plugin from.
 * @param {string} [context.managerConfig.branchName] - Branch which to save to.
 * @param {string} [context.managerConfig.namespace=''] - Used namespace during execution ('' represents all namespaces).
 * @param {object} [context.pluginConfig=%defaultForPlugin%] - Specific configuration for the plugin.
 * @param {function} callback
 */

// Transactions
/**
 * @description Starts a transaction where all changes to nodes are bundled into a single commit. All commit-messages
 * for each change will be joined and separated by '\n'.
 * @function startTransaction
 * @memberOf Client
 * @instance
 * @example
 * var nodeId = 'someIdToANodeThatIsLoaded';
 client.startTransaction('start of commitMessage');

 // While transaction is open nothing will be committed to the server.
 client.setAttributes(nodeId, 'name', 'newName', 'changes within the transaction');

 client.setRegistry(nodeId, 'position', {x: 100, y:200}, 'some more changes');

 // When we have made all of our changes we make a single commit.
 client.completeTransaction('end of commitMessage', function (err, result) {
  // Here we have the option to get notified when the commit has reached the server
  // and been persisted in the database.

  // The commit hash of the new state of our model.
  console.log(result.hash);

  // If we are working in a branch - this is the status of our commit.
  // 'SYNCED', 'FORKED'.
  console.log(result.status);
});
 * @param {string} [msg='['] - Start of commit-message.
 */

/**
 * @description Completes any open transaction and persists the changes to server.
 * @function completeTransaction
 * @memberOf Client
 * @instance
 * @example
 * var nodeId = 'someIdToANodeThatIsLoaded';
 client.startTransaction('start of commitMessage');

 // While transaction is open nothing will be committed to the server.
 client.setAttributes(nodeId, 'name', 'newName', 'changes within the transaction');

 client.setRegistry(nodeId, 'position', {x: 100, y:200}, 'some more changes');

 // When we have made all of our changes we make a single commit.
 client.completeTransaction('end of commitMessage', function (err, result) {
  // Here we have the option to get notified when the commit has reached the server
  // and been persisted in the database.

  // The commit hash of the new state of our model.
  console.log(result.hash);

  // If we are working in a branch - this is the status of our commit.
  // 'SYNCED', 'FORKED'.
  console.log(result.status);
});
 * @param {string} [msg=']'] - End of commit-message.
 * @param {function} [callback] - Optional callback that's invoked when the commit has reached the server.
 */

/**
 * @description Trigger the client to dispatch a NOTIFICATION (in the generic UI the notification widget listens to these).
 * @function notifyUser
 * @memberOf Client
 * @instance
 * @param {object|string} [notification] - Notification to user (if string given will be set at notification.message)
 * @param {string} notification.message - Message of notification
 * @param {string} [notification.severity='info'] - Notification severity level ('success', 'info', 'warn', 'error')
 */

// Libraries
/**
 * @description Returns an array of all libraries at the current project and commit/branch.
 * @function getLibraryNames
 * @memberOf Client
 * @instance
 * @returns {string[]} - Fully qualified names of libraries (including libraries of libraries)
 */

/**
 * @description Returns the info associated with the library in the current project and commit/branch.
 * @function getLibraryInfo
 * @memberOf Client
 * @instance
 * @param {string} libraryName - Name of library.
 * @returns {object} - Info stored at library.
 */


/**
 * @description Sends a server request to add specified library to the current project and branch.
 * @function addLibrary
 * @memberOf Client
 * @param {string} name - Name of new library (cannot contain dots or exist already)
 * @param {string|object} blobHashOrLibraryInfo - If string given will import library from blob otherwise project at info (will also be added to info at library).
 * @param {string} blobHashOrLibraryInfo.projectId - The projectId of your library.
 * @param {string} [blobHashOrLibraryInfo.branchName] - The branch that your library follows in the origin project.
 * @param {string} [blobHashOrLibraryInfo.commitHash] - The commit-hash of your library.
 * @param {function} callback - Invoked when request completed.
 * @param {null|Error} callback.err - If request failed.
 * @param {module:Storage~CommitResult} callback.result - Result from the commit made.
 * @instance
 */

/**
 * @description Sends a server request to update the specified library at the current project and branch.
 * @function updateLibrary
 * @memberOf Client
 * @param {string} name - Name of library to update.
 * @param {string|object} blobHashOrLibraryInfo - If string given will import library from blob otherwise project at info (will also be added to info at library).
 * @param {string} blobHashOrLibraryInfo.projectId - The projectId of your library.
 * @param {string} [blobHashOrLibraryInfo.branchName] - The branch that your library follows in the origin project.
 * @param {string} [blobHashOrLibraryInfo.commitHash] - The commit-hash of your library.
 * @param {function} callback - Invoked when request completed.
 * @param {null|Error} callback.err - If request failed.
 * @param {module:Storage~CommitResult} callback.result - Result from the commit made.
 * @instance
 */

/**
 * @description Remove the library from the current project and branch.
 * @function removeLibrary
 * @memberOf Client
 * @instance
 * @param {string} libraryName - Name of library to remove.
 */

/**
 * @description Rename the library in the current project and branch.
 * @function renameLibrary
 * @memberOf Client
 * @instance
 * @param {string} oldName - Name of library to rename.
 * @param {string} newName - New name of library.
 */

/**
 [
 __"_eventList",
 "CONSTANTS",
 __"dispatchPluginNotification",

 "isTypeOf",
 "isValidTarget",
 "filterValidTarget",
 "getValidTargetTypes",
 "getOwnValidTargetTypes",
 "getValidTargetItems",
 "getOwnValidTargetItems",
 "getPointerMeta",
 "isValidChild",
 "getValidChildrenTypes",
 "getValidAttributeNames",
 "getOwnValidAttributeNames",
 "getAttributeSchema",
 "getMetaAspectNames",
 "getOwnMetaAspectNames",
 "getMetaAspect",
 "hasOwnMetaRules",
 "getChildrenMeta",
 "getChildrenMetaAttribute",
 "getValidChildrenItems",
 "getOwnValidChildrenTypes",
 "getAspectTerritoryPattern",

 "connectToDatabase",
 "disconnectFromDatabase",
 "selectProject",
 "selectBranch",
 "selectCommit",
 "_selectCommitFilteredEvents",
 "forkCurrentBranch",
 "isConnected",
 "getNetworkStatus",
 "getConnectedStorageVersion",
 "getBranchStatus",
 "getActiveProjectId",
 "getActiveProjectName",
 "getActiveProjectKind",
 "getActiveBranchName",
 "getActiveCommitHash",
 "getActiveRootHash",
 "isProjectReadOnly",
 "isCommitReadOnly",
 "isReadOnly",
 "getProjectAccess",
 "getProjectInfo",
 "getProjectObject",
 "getCoreInstance",
 "getCommitQueue",
 "downloadCommitQueue",
 "downloadError",

 "undo",
 "redo",

 "applyCommitQueue",
 "getProjects",
 "getProjectsAndBranches",
 "getBranches",
 "getTags",
 "getCommits",
 "getHistory",
 "getLatestCommitData",
 "createProject",
 "deleteProject",
 "transferProject",
 "duplicateProject",
 "createBranch",
 "deleteBranch",
 "createTag",
 "deleteTag",
 "squashCommits",
 "watchDatabase",
 "unwatchDatabase",
 "watchProject",
 "unwatchProject",

 "getAllMetaNodes",
 "checkMetaConsistency",

 "_removeAllUIs",

 "importProjectFromFile",
 "updateProjectFromFile",
 "checkMetaRules",
 "checkCustomConstraints",
 "seedProject",
 "setConstraint",
 "delConstraint",
 "autoMerge",
 "resolve",
 "exportProjectToFile",
 "exportSelectionToFile",
 "importSelectionFromFile",

 "dispatchAddOnNotification",

 "emitStateNotification",
 "dispatchConnectedUsersChanged",
 "registerUIStateGetter",
 "gmeConfig",
 "getUserId",
 "uiStateGetter",
 "decoratorManager"
 ]
 */

/**
 * Node setters
 "setAttribute",
 "setAttributes",
 "delAttribute",
 "delAttributes",
 "setRegistry",
 "delRegistry",
 "copyNode",
 "copyNodes",
 "copyMoreNodes",
 "moveNode",
 "moveMoreNodes",
 "deleteNode",
 "deleteNodes",
 "delMoreNodes",
 "createNode",
 "createChild",
 "createChildren",
 "setPointer",
 "makePointer",
 "delPointer",
 "deletePointer",
 "addMember",
 "removeMember",
 "setMemberAttribute",
 "delMemberAttribute",
 "setMemberRegistry",
 "delMemberRegistry",
 "setSetAttribute",
 "delSetAttribute",
 "setSetRegistry",
 "delSetRegistry",
 "createSet",
 "delSet",
 "deleteSet",
 "setBase",
 "delBase",
 "setMeta",
 "setChildrenMeta",
 "setChildrenMetaAttribute",
 "setChildMeta",
 "updateValidChildrenItem",
 "delChildMeta",
 "removeValidChildrenItem",
 "setAttributeMeta",
 "setAttributeSchema",
 "delAttributeMeta",
 "removeAttributeSchema",
 "setPointerMeta",
 "setPointerMetaTarget",
 "updateValidTargetItem",
 "delPointerMetaTarget",
 "removeValidTargetItem",
 "delPointerMeta",
 "deleteMetaPointer",
 "setAspectMetaTarget",
 "setAspectMetaTargets",
 "setMetaAspect",
 "delAspectMetaTarget",
 "delAspectMeta",
 "deleteMetaAspect",
 "addMixin",
 "delMixin",
 "getMeta",
 */