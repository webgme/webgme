/*globals define, _, requirejs, WebGMEGlobal*/

define(['common/LogManager',
        'js/Utils/GMEConcepts',
        'js/NodePropertyNames',
        'js/Constants'], function (logManager,
                                                                       GMEConcepts,
                                                                       nodePropertyNames,
                                                                       CONSTANTS) {

    "use strict";

    var NODE_PROGRESS_CLASS = 'node-progress',
        GME_MODEL_CLASS = "gme-model",
        GME_ATOM_CLASS = "gme-atom",
        GME_ROOT_ICON = "gme-root",
        PROJECT_ROOT_ID = CONSTANTS.PROJECT_ROOT_ID,
        DEFAULT_VISUALIZER = 'ModelEditor',
        STATE_LOADING = 0,
        STATE_LOADED = 1,
        FCO_ID;

    var InheritanceBrowserControl = function (client, treeBrowser) {
        var self = this;

        this._client = client;
        this._treeBrowser = treeBrowser;
        this._treeBrowser._enableNodeRename = false;
        this._logger = logManager.create("InheritanceBrowserControl");

        setTimeout(function () {
            self._initialize();
        }, 250);
    };

    InheritanceBrowserControl.prototype.destroy = function () {
    };

    InheritanceBrowserControl.prototype.reLaunch = function () {
        this._logger.debug('reLaunch from client...');

        //forget the old territory
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = undefined;
        }

        this._treeBrowser.deleteNode(this._nodes[FCO_ID].treeNode);

        this._initialize();
    };

    InheritanceBrowserControl.prototype._initialize = function () {
        var self = this;

        FCO_ID = GMEConcepts.getFCOId();

        this._selfPatterns = {};
        this._nodes = {};

        if (FCO_ID) {
            var loadingRootTreeNode;

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });

            //add "root" with its children to territory
            //create a new loading node for it in the tree
            loadingRootTreeNode = this._treeBrowser.createNode(null, {   "id": FCO_ID,
                "name": "Initializing tree...",
                "hasChildren" : false,
                "class" :  NODE_PROGRESS_CLASS });

            //store the node's info in the local hashmap
            this._nodes[FCO_ID] = {   "treeNode": loadingRootTreeNode,
                "inheritance" : [],
                "state" : STATE_LOADING };

            //add the root to the query
            this._selfPatterns[FCO_ID] = { "children": 0};
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        } else {
            setTimeout(function () {
                self._initialize();
            }, 500);
        }

        this._treeBrowser.onNodeOpen = function (nodeId) {
            self._onNodeOpen(nodeId);
        };

        this._treeBrowser.onNodeClose = function (nodeId) {
            self._onNodeClose(nodeId);
        };

        this._treeBrowser.onNodeDoubleClicked = function (nodeId) {
            self._onNodeDoubleClicked(nodeId);
        };

        this._treeBrowser.onCreatingContextMenu = function (nodeId, contextMenuOptions) {
            contextMenuOptions.rename = false;
            contextMenuOptions.delete = false;
        };
    };

    //called from the TreeBrowserWidget when a node is expanded by its expand icon
    InheritanceBrowserControl.prototype._onNodeOpen = function (nodeId) {
        //first create dummy elements under the parent representing the children being loaded
        var parent = this._client.getNode(nodeId),
            parentNode,
            inheritedIDs,
            i,
            currentChildId,
            childNode,
            childTreeNode;

        if (parent) {

            //get the DOM node representing the parent in the tree
            parentNode = this._nodes[nodeId].treeNode;

            //get the children IDs of the parent
            inheritedIDs = parent.getCollectionPaths(CONSTANTS.POINTER_BASE);

            this._treeBrowser.enableUpdate(false);

            for (i = 0; i < inheritedIDs.length; i += 1) {
                currentChildId = inheritedIDs[i];

                childNode = this._client.getNode(currentChildId);

                //local variable for the created treenode of the child node (loading or full)
                childTreeNode = null;

                //check if the node could be retreived from the client
                if (childNode) {
                    //the node was present on the client side, render ist full data
                    childTreeNode = this._treeBrowser.createNode(parentNode, {   "id": currentChildId,
                        "name": childNode.getAttribute("name"),
                        "hasChildren" : (childNode.getCollectionPaths(CONSTANTS.POINTER_BASE)).length > 0,
                        "class" :   this._getNodeClass(childNode) });

                    //store the node's info in the local hashmap
                    this._nodes[currentChildId] = {    "treeNode": childTreeNode,
                        "inheritance" : childNode.getCollectionPaths(CONSTANTS.POINTER_BASE),
                        "state" : STATE_LOADED };
                } else {
                    //the node is not present on the client side, render a loading node instead
                    //create a new node for it in the tree
                    childTreeNode = this._treeBrowser.createNode(parentNode, {   "id": currentChildId,
                        "name": "Loading...",
                        "hasChildren" : false,
                        "class" :  NODE_PROGRESS_CLASS });

                    //store the node's info in the local hashmap
                    this._nodes[currentChildId] = {    "treeNode": childTreeNode,
                        "inheritance" : [],
                        "state" : STATE_LOADING };

                    this._selfPatterns[currentChildId] = { 'children': 0 };
                }
            }

            this._treeBrowser.enableUpdate(true);
        }

        //need to expand the territory
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    //called from the TreeBrowserWidget when a node has been closed by its collapse icon
    InheritanceBrowserControl.prototype._onNodeClose = function (nodeId) {
        var removeFromTerritory = [],
            deleteNodeAndChildrenFromLocalHash,
            self = this;

        //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened this._nodes's info
        deleteNodeAndChildrenFromLocalHash = function (childNodeId, deleteSelf) {
            var xx;

            //if the given node is in this hashmap itself, go forward with its children's ID recursively
            if (self._nodes[childNodeId]) {
                for (xx = 0; xx < self._nodes[childNodeId].inheritance.length; xx += 1) {
                    deleteNodeAndChildrenFromLocalHash(self._nodes[childNodeId].inheritance[xx], true);
                }

                //finally delete the nodeId itself (if needed)
                if (deleteSelf === true) {
                    delete self._nodes[childNodeId];

                    //and collect the nodeId from territory removal
                    removeFromTerritory.push(childNodeId);
                    delete self._selfPatterns[childNodeId];
                }
            }
        };

        //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
        deleteNodeAndChildrenFromLocalHash(nodeId, false);

        //if there is anything to remove from the territory, do it
        if (removeFromTerritory.length > 0) {
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    InheritanceBrowserControl.prototype._onNodeDoubleClicked = function (nodeId) {
        this._logger.debug("_onNodeDoubleClicked with nodeId: " + nodeId);
        var settings = {};
        var parentId;
        var nodeObj = this._client.getNode(nodeId);
        if (nodeObj) {
            parentId = nodeObj.getParentId();
        }
        if (parentId || parentId === CONSTANTS.PROJECT_ROOT_ID) {
            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = parentId;
            settings[CONSTANTS.STATE_ACTIVE_SELECTION] = [nodeId];
        } else {
            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
        }

        settings[CONSTANTS.STATE_ACTIVE_ASPECT] = CONSTANTS.ASPECT_ALL;
        settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = DEFAULT_VISUALIZER;
        WebGMEGlobal.State.set(settings);
    };

    InheritanceBrowserControl.prototype._getNodeClass = function (/*nodeObj*/) {
        return GME_ATOM_CLASS;
    };

    InheritanceBrowserControl.prototype._eventCallback = function (events) {
        var i,
            len = events.length;

        for (i = 0; i < len; i += 1) {
            switch (events[i].etype) {
                case "load":
                    this._refresh("insert", events[i].eid);
                    break;
                case "update":
                    this._refresh("update", events[i].eid);
                    break;
                case "unload":
                    this._refresh("unload", events[i].eid);
                    break;
            }
        }
    };

    InheritanceBrowserControl.prototype._refresh = function (eventType, objectId) {
        var nodeDescriptor = null,
            currentChildId = null,
            j = 0,
            removeFromTerritory,
            updatedObject,
            objType,
            oldInheritance,
            currentInheritance,
            inheritanceDeleted,
            deleteNodeAndChildrenFromLocalHash,
            inheritanceAdded,
            childNode,
            childTreeNode,
            client = this._client,
            self = this;

        this._logger.debug("Refresh event '" + eventType + "', with objectId: '" + objectId + "'");

        //HANDLE INSERT
        //object got inserted into the territory
        if (eventType === "insert") {
            //check if this control shows any interest for this object
            if (this._nodes[objectId]) {

                //if the object is in "loading" state according to the local hashmap
                //update the "loading" node accordingly
                if (this._nodes[objectId].state === STATE_LOADING) {
                    //set eventType to "update" and let it go and be handled by "update" event
                    eventType = "update";
                }
            }
        }
        //ENDOF : HANDLE INSERT

        //HANDLE UPDATE
        //object got updated in the territory
        if (eventType === "update" || eventType === "unload") {
            //handle deleted children
            removeFromTerritory = [];
            //check if this control shows any interest for this object
            if (this._nodes[objectId]) {
                this._logger.debug("Update object with id: " + objectId);
                //get the node from the client
                updatedObject = client.getNode(objectId);

                if (updatedObject) {

                    //check what state the object is in according to the local hashmap
                    if (this._nodes[objectId].state === STATE_LOADING) {
                        //if the object is in "loading" state, meaning we were waiting for it
                        //render it's real data

                        //specify the icon for the treenode
                        objType = this._getNodeClass(updatedObject);

                        //create the node's descriptor for the tree-browser widget
                        nodeDescriptor = {  "name" :  updatedObject.getAttribute("name"),
                            "hasChildren" : (updatedObject.getCollectionPaths(CONSTANTS.POINTER_BASE)).length > 0,
                            "class" : objType };

                        //update the node's representation in the tree
                        this._treeBrowser.updateNode(this._nodes[objectId].treeNode, nodeDescriptor);

                        //update the object's children list in the local hashmap
                        this._nodes[objectId].inheritance = updatedObject.getCollectionPaths(CONSTANTS.POINTER_BASE);

                        //finally update the object's state showing loaded
                        this._nodes[objectId].state = STATE_LOADED;
                    } else {
                        //object is already loaded here, let's see what changed in it

                        //specify the icon for the treenode
                        objType = this._getNodeClass(updatedObject);

                        //create the node's descriptor for the treebrowser widget
                        nodeDescriptor = {
                            "name" : updatedObject.getAttribute("name"),
                            "hasChildren" : (updatedObject.getCollectionPaths(CONSTANTS.POINTER_BASE)).length > 0,
                            "class" : objType
                        };

                        //update the node's representation in the tree
                        this._treeBrowser.updateNode(this._nodes[objectId].treeNode, nodeDescriptor);

                        oldInheritance = this._nodes[objectId].inheritance;
                        currentInheritance = updatedObject.getCollectionPaths(CONSTANTS.POINTER_BASE);

                        //the concrete child deletion is important only if the node is open in the tree
                        if (this._treeBrowser.isExpanded(this._nodes[objectId].treeNode)) {
                            //figure out what are the deleted children's IDs
                            inheritanceDeleted = _.difference(oldInheritance, currentInheritance);

                            //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened this._nodes's info
                            deleteNodeAndChildrenFromLocalHash = function (childNodeId) {
                                var xx;
                                //if the given node is in this hashmap itself, go forward with its children's ID recursively
                                if (self._nodes[childNodeId]) {
                                    for (xx = 0; xx < self._nodes[childNodeId].inheritance.length; xx += 1) {
                                        deleteNodeAndChildrenFromLocalHash(self._nodes[childNodeId].inheritance[xx]);
                                    }

                                    //finally delete the nodeId itself (if needed)
                                    delete self._nodes[childNodeId];

                                    //and collect the nodeId from territory removal
                                    removeFromTerritory.push(childNodeId);
                                    delete self._selfPatterns[childNodeId];
                                }
                            };

                            for (j = 0; j < inheritanceDeleted.length; j += 1) {

                                currentChildId = inheritanceDeleted[j];

                                if (this._nodes[currentChildId]) {

                                    //get all the children that have been removed with this node deletion
                                    //and remove them from this.this._nodes

                                    //call the node deletion in the tree-browser widget
                                    this._treeBrowser.deleteNode(this._nodes[currentChildId].treeNode);

                                    //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
                                    deleteNodeAndChildrenFromLocalHash(currentChildId);
                                }
                            }
                        }

                        //the concrete child addition is important only if the node is open in the tree
                        if (this._treeBrowser.isExpanded(this._nodes[objectId].treeNode)) {
                            //figure out what are the new children's IDs
                            inheritanceAdded = _.difference(currentInheritance, oldInheritance);

                            //handle added children
                            for (j = 0; j < inheritanceAdded.length; j += 1) {
                                currentChildId = inheritanceAdded[j];

                                childNode = client.getNode(currentChildId);

                                //local variable for the created treenode of the child node (loading or full)
                                childTreeNode = null;

                                //check if the node could be retreived from the project
                                if (childNode) {
                                    //the node was present on the client side, render ist full data
                                    childTreeNode = this._treeBrowser.createNode(this._nodes[objectId].treeNode, {  "id": currentChildId,
                                        "name": childNode.getAttribute("name"),
                                        "hasChildren": (childNode.getCollectionPaths(CONSTANTS.POINTER_BASE)).length > 0,
                                        "class" :  this._getNodeClass(childNode) });

                                    //store the node's info in the local hashmap
                                    this._nodes[currentChildId] = {   "treeNode": childTreeNode,
                                        "inheritance" : childNode.getCollectionPaths(CONSTANTS.POINTER_BASE),
                                        "state" : STATE_LOADED };
                                } else {
                                    //the node is not present on the client side, render a loading node instead
                                    //create a new node for it in the tree
                                    childTreeNode = this._treeBrowser.createNode(this._nodes[objectId].treeNode, {  "id": currentChildId,
                                        "name": "Loading...",
                                        "hasChildren" : false,
                                        "class" :  NODE_PROGRESS_CLASS  });

                                    //store the node's info in the local hashmap
                                    this._nodes[currentChildId] = { "treeNode": childTreeNode,
                                        "inheritance" : [],
                                        "state" : STATE_LOADING };
                                }
                            }
                        }

                        this._nodes[objectId].inheritance = updatedObject.getCollectionPaths(CONSTANTS.POINTER_BASE);

                        //finally update the object's state showing loaded
                        this._nodes[objectId].state = STATE_LOADED;

                        //if there is anythign to remove from the territory, do so
                        if (removeFromTerritory.length > 0) {
                            client.updateTerritory(this._territoryId, this._selfPatterns);
                        }
                    }
                }
            }
        }
        //ENDOF : HANDLE UPDATE
    };

    return InheritanceBrowserControl;
});
