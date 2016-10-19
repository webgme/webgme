/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */


define(['js/logger',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    'js/Constants',
    './ObjectBrowserControlBase',
], function (Logger,
             GMEConcepts,
             nodePropertyNames,
             CONSTANTS,
             ObjectBrowserControlBase) {
    'use strict';

    var NODE_PROGRESS_CLASS = 'node-progress',
        GME_ATOM_CLASS = 'gme-atom',
        GME_META_NODE_ICON = 'gme-meta-atom',
        DEFAULT_VISUALIZER = 'ModelEditor',
        STATE_LOADING = 0,
        STATE_LOADED = 1;

    var InheritanceBrowserControl = function (client, treeBrowser) {
        var self = this;

        self._logger = Logger.create('gme:Panels:ObjectBrowser:InheritanceBrowserControl',
            WebGMEGlobal.gmeConfig.client.log);

        ObjectBrowserControlBase.call(self, client, treeBrowser, self._logger);

        self._fcoId = this._getRootId();
        self._treeBrowser._enableNodeRename = false;

        setTimeout(function () {
            self._initialize();
        }, 250);
    };

    // Prototypical inheritance
    InheritanceBrowserControl.prototype = Object.create(ObjectBrowserControlBase.prototype);
    InheritanceBrowserControl.prototype.constructor = InheritanceBrowserControl;

    InheritanceBrowserControl.prototype.destroy = function () {
        this._logger.debug('destroyed');

        //forget the old territory
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = undefined;
        }

        this._treeBrowser.deleteNode(this._nodes[this._fcoId].treeNode);
    };

    InheritanceBrowserControl.prototype.reLaunch = function () {
        this._logger.debug('reLaunch from client...');

        //forget the old territory
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._territoryId = undefined;
        }

        this._treeBrowser.deleteNode(this._nodes[this._fcoId].treeNode);

        this._initialize();
    };

    InheritanceBrowserControl.prototype._initialize = function () {
        var self = this;

        this._fcoId = this._getRootId();

        this._selfPatterns = {};
        this._nodes = {};

        if (this._fcoId) {
            var loadingRootTreeNode;

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });

            //add "root" with its children to territory
            //create a new loading node for it in the tree
            loadingRootTreeNode = this._treeBrowser.createNode(null, {
                id: this._fcoId,
                name: 'Initializing tree...',
                hasChildren: false,
                class: NODE_PROGRESS_CLASS
            });

            //store the node's info in the local hashmap
            this._nodes[this._fcoId] = {
                treeNode: loadingRootTreeNode,
                inheritance: [],
                state: STATE_LOADING
            };

            //add the root to the query
            this._selfPatterns[this._fcoId] = {children: 0};
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
    };

    InheritanceBrowserControl.prototype._getRootId = function () {
        return GMEConcepts.getFCOId();
    };

    //called from the TreeBrowserWidget when a node is expanded by its expand icon
    InheritanceBrowserControl.prototype._onNodeOpen = function (nodeId) {
        //first create dummy elements under the parent representing the children being loaded
        var parent = this._client.getNode(nodeId),
            childrenDescriptors = [],
            metaTypeInfo,
            newNodes,
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
            inheritedIDs = parent.getInstancePaths();

            this._treeBrowser.enableUpdate(false);

            for (i = 0; i < inheritedIDs.length; i += 1) {
                currentChildId = inheritedIDs[i];

                childNode = this._client.getNode(currentChildId);

                //local variable for the created treenode of the child node (loading or full)
                childTreeNode = null;

                //check if the node could be retreived from the client
                if (childNode) {
                    metaTypeInfo = this.getMetaInfo(childNode);
                    //the node was present on the client side, render ist full data
                    childrenDescriptors.push({
                        id: currentChildId,
                        name: childNode.getFullyQualifiedName(),
                        hasChildren: (childNode.getInstancePaths()).length > 0,
                        class: this._getNodeClass(childNode, metaTypeInfo.isMetaNode),
                        icon: this.getIcon(childNode),
                        // Data used locally here.
                        STATE: STATE_LOADED,
                        INHERITANCE: childNode.getInstancePaths(),
                    });
                } else {
                    //the node is not present on the client side, render a loading node instead
                    childrenDescriptors.push({
                        id: currentChildId,
                        name: 'Loading...',
                        hasChildren: false,
                        class: NODE_PROGRESS_CLASS,
                        // Data used locally here.
                        STATE: STATE_LOADING,
                        INHERITANCE: []
                    });

                    this._selfPatterns[currentChildId] = {children: 0};
                }
            }

            newNodes = this._treeBrowser.createNodes(parentNode, childrenDescriptors);
            for (i = 0; i < childrenDescriptors.length; i += 1) {
                this._nodes[childrenDescriptors[i].id] = {
                    treeNode: newNodes[i],
                    inheritance: childrenDescriptors[i].INHERITANCE,
                    state: childrenDescriptors[i].STATE
                };
            }

            this._treeBrowser.updateNode(parentNode, {icon: this.getIcon(parent, true)});
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

        //call the cleanup recursively and mark this node (being closed)
        // as non removable (from local hashmap neither from territory)
        deleteNodeAndChildrenFromLocalHash(nodeId, false);
        this._treeBrowser.updateNode(this._nodes[nodeId].treeNode, {icon: this.getIcon(nodeId)});

        //if there is anything to remove from the territory, do it
        if (removeFromTerritory.length > 0) {
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    InheritanceBrowserControl.prototype._onNodeDoubleClicked = function (nodeId) {
        this._logger.debug('_onNodeDoubleClicked with nodeId: ' + nodeId);
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

        settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = DEFAULT_VISUALIZER;
        WebGMEGlobal.State.set(settings);
    };

    InheritanceBrowserControl.prototype._getNodeClass = function (nodeObj, isMetaType) {
        return isMetaType ? GME_META_NODE_ICON : GME_ATOM_CLASS;
    };

    InheritanceBrowserControl.prototype._eventCallback = function (events) {
        var i,
            len = events.length;

        for (i = 0; i < len; i += 1) {
            if (events[i].etype === 'load') {
                this._refresh('insert', events[i].eid);
            } else if (events[i].etype === 'update') {
                this._refresh('update', events[i].eid);
            } else if (events[i].etype === 'unload') {
                this._refresh('unload', events[i].eid);
            } else {
                this._logger.debug('unknown event type \'' + events[i].etype + '\' ignored');
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
            metaTypeInfo,
            client = this._client,
            self = this,
            xx;

        this._logger.debug('Refresh event \'' + eventType + '\', with objectId: \'' + objectId + '\'');

        //HANDLE INSERT
        //object got inserted into the territory
        if (eventType === 'insert') {
            //check if this control shows any interest for this object
            if (this._nodes[objectId]) {

                //if the object is in "loading" state according to the local hashmap
                //update the "loading" node accordingly
                if (this._nodes[objectId].state === STATE_LOADING) {
                    //set eventType to "update" and let it go and be handled by "update" event
                    eventType = 'update';
                }
            }
        }
        //ENDOF : HANDLE INSERT

        //HANDLE UPDATE
        //object got updated in the territory
        if (eventType === 'update' || eventType === 'unload') {
            //handle deleted children
            removeFromTerritory = [];
            //check if this control shows any interest for this object
            if (this._nodes[objectId]) {
                this._logger.debug('Update object with id: ' + objectId);
                //get the node from the client
                updatedObject = client.getNode(objectId);

                if (updatedObject) {

                    //check what state the object is in according to the local hashmap
                    if (this._nodes[objectId].state === STATE_LOADING) {
                        //if the object is in "loading" state, meaning we were waiting for it
                        //render it's real data

                        //specify the icon for the treenode
                        metaTypeInfo = this.getMetaInfo(updatedObject);
                        objType = this._getNodeClass(updatedObject, metaTypeInfo.isMetaNode);

                        //create the node's descriptor for the tree-browser widget
                        nodeDescriptor = {
                            name: updatedObject.getFullyQualifiedName(),
                            hasChildren: (updatedObject.getInstancePaths()).length > 0,
                            class: objType,
                            icon: self.getIcon(updatedObject)
                        };

                        //update the node's representation in the tree
                        this._treeBrowser.updateNode(this._nodes[objectId].treeNode, nodeDescriptor);

                        //update the object's children list in the local hashmap
                        this._nodes[objectId].inheritance = updatedObject.getInstancePaths();

                        //finally update the object's state showing loaded
                        this._nodes[objectId].state = STATE_LOADED;
                    } else {
                        //object is already loaded here, let's see what changed in it

                        //specify the icon for the treenode
                        metaTypeInfo = this.getMetaInfo(updatedObject);
                        objType = this._getNodeClass(updatedObject, metaTypeInfo);

                        //create the node's descriptor for the treebrowser widget
                        nodeDescriptor = {
                            name: updatedObject.getFullyQualifiedName(),
                            hasChildren: (updatedObject.getInstancePaths()).length > 0,
                            class: objType,
                            icon: self.getIcon(updatedObject)
                        };

                        oldInheritance = this._nodes[objectId].inheritance;
                        currentInheritance = updatedObject.getInstancePaths();

                        //the concrete child deletion is important only if the node is open in the tree
                        if (this._treeBrowser.isExpanded(this._nodes[objectId].treeNode)) {
                            nodeDescriptor.icon = self.getIcon(updatedObject, true);
                            //figure out what are the deleted children's IDs
                            inheritanceDeleted = _.difference(oldInheritance, currentInheritance);

                            //removes all the (nested)childrendIDs from the local hashmap
                            // accounting the currently opened this._nodes's info
                            deleteNodeAndChildrenFromLocalHash = function (childNodeId) {
                                //if the given node is in this hashmap itself,
                                // go forward with its children's ID recursively
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

                                    //call the cleanup recursively and mark this node (being closed)
                                    // as non removable (from local hashmap neither from territory)
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
                                metaTypeInfo = this.getMetaInfo(updatedObject);
                                objType = this._getNodeClass(updatedObject, metaTypeInfo);
                                //local variable for the created treenode of the child node (loading or full)
                                childTreeNode = null;

                                //check if the node could be retreived from the project
                                if (childNode) {
                                    //the node was present on the client side, render ist full data
                                    childTreeNode = this._treeBrowser.createNode(this._nodes[objectId].treeNode, {
                                        id: currentChildId,
                                        name: childNode.getFullyQualifiedName(),
                                        hasChildren: (childNode.getInstancePaths()).length > 0,
                                        class: objType,
                                        icon: this.getIcon(childNode)
                                    });

                                    //store the node's info in the local hashmap
                                    this._nodes[currentChildId] = {
                                        treeNode: childTreeNode,
                                        inheritance: childNode.getInstancePaths(),
                                        state: STATE_LOADED
                                    };
                                } else {
                                    //the node is not present on the client side, render a loading node instead
                                    //create a new node for it in the tree
                                    childTreeNode = this._treeBrowser.createNode(this._nodes[objectId].treeNode, {
                                        id: currentChildId,
                                        name: 'Loading...',
                                        hasChildren: false,
                                        class: NODE_PROGRESS_CLASS
                                    });

                                    //store the node's info in the local hashmap
                                    this._nodes[currentChildId] = {
                                        treeNode: childTreeNode,
                                        inheritance: [],
                                        state: STATE_LOADING
                                    };
                                }
                            }
                        }

                        this._nodes[objectId].inheritance = updatedObject.getInstancePaths();

                        //update the node's representation in the tree
                        this._treeBrowser.updateNode(this._nodes[objectId].treeNode, nodeDescriptor);

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
