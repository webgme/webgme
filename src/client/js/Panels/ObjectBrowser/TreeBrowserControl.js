/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/NodePropertyNames',
    'js/Utils/ExportManager',
    'js/Utils/ImportManager',
    'js/Constants',
    'js/RegistryKeys',
    'css!./styles/TreeBrowserControl.css'
], function (Logger,
             nodePropertyNames,
             ExportManager,
             ImportManager,
             CONSTANTS,
             REGISTRY_KEYS) {
    'use strict';


    var NODE_PROGRESS_CLASS = 'node-progress',
        GME_MODEL_CLASS = 'gme-model',
        GME_ATOM_CLASS = 'gme-atom',
        GME_CONNECTION_CLASS = 'gme-connection',
        GME_ROOT_ICON = 'gme-root',
        GME_ASPECT_ICON = 'gme-aspect',
        DEFAULT_VISUALIZER = 'ModelEditor',
        CROSSCUT_VISUALIZER = 'Crosscut',
        SET_VISUALIZER = 'SetEditor',

        TreeBrowserControl = function (client, treeBrowser) {

            var logger,
                stateLoading = 0,
                stateLoaded = 1,
                selfId,
                selfPatterns = {},
            //local container for accounting the currently opened node list,
            // its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[], state }
                nodes = {},
                refresh,
                initialize,
                self = this,
                getNodeClass;

            //get logger instance for this component
            logger = Logger.create('gme:Panels:ObjectBrowser:TreeBrowserControl', WebGMEGlobal.gmeConfig.client.log);
            this._logger = logger;

            this._client = client;

            initialize = function () {
                var rootNode = client.getNode(CONSTANTS.PROJECT_ROOT_ID); //TODO make this loaded from constants
                logger.debug('entered initialize');
                if (rootNode) {
                    var loadingRootTreeNode;
                    logger.debug('rootNode avaliable now');
                    selfId = client.addUI(self, function (events) {
                        logger.debug('loaded territory from rootNode at initialize');
                        self._eventCallback(events);
                    });

                    //add "root" with its children to territory
                    //create a new loading node for it in the tree
                    loadingRootTreeNode = treeBrowser.createNode(null, {
                        id: CONSTANTS.PROJECT_ROOT_ID,
                        name: 'Initializing tree...',
                        hasChildren: false,
                        class: NODE_PROGRESS_CLASS
                    });

                    //store the node's info in the local hashmap
                    nodes[CONSTANTS.PROJECT_ROOT_ID] = {
                        treeNode: loadingRootTreeNode,
                        children: [],
                        state: stateLoading
                    };

                    //add the root to the query
                    selfPatterns = {};
                    selfPatterns[CONSTANTS.PROJECT_ROOT_ID] = {children: 2};
                    client.updateTerritory(selfId, selfPatterns);

                    // expand root
                    // FIXME: how to detect, when the root is loaded for the first time
                    setTimeout(function () {
                        var settings = {},
                            activeObj = WebGMEGlobal.State.getActiveObject();
                        logger.debug('expanding root-tree');
                        loadingRootTreeNode.expand(true);
                        if (activeObj || activeObj === CONSTANTS.PROJECT_ROOT_ID) {
                            logger.debug('Active object already set. In init phase:',
                                WebGMEGlobal.State.getIsInitPhase());
                        } else if (!WebGMEGlobal.State.getIsInitPhase()) {
                            logger.debug('Not in init-phase will set root node to active object.');
                            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = CONSTANTS.PROJECT_ROOT_ID;
                            WebGMEGlobal.State.set(settings);
                        } else {
                            logger.debug('In init-phase will not select an active object.');
                        }
                    }, 100);
                } else {
                    logger.debug('rootNode not avaliable at initialize');
                    setTimeout(initialize, 500);
                }
            };

            getNodeClass = function (nodeObj) {
                var objID = nodeObj.getId(),
                    c = GME_ATOM_CLASS; //by default everyone is represented with the atom class

                if (objID === CONSTANTS.PROJECT_ROOT_ID) {
                    //if root object
                    c = GME_ROOT_ICON;
                } else if (nodeObj.getCrosscutsInfo().length > 0) {
                    c = GME_ASPECT_ICON;
                } else if (nodeObj.getValidSetNames().length > 0) {
                    c = GME_ASPECT_ICON;
                } else if (nodeObj.isConnection()) {
                    //if it's a connection, let it have the connection icon
                    c = GME_CONNECTION_CLASS;
                } else if (nodeObj.getChildrenIds().length > 0) {
                    //if it has children, let it have the model icon
                    c = GME_MODEL_CLASS;
                }

                return c;
            };

            //called from the TreeBrowserWidget when a node is expanded by its expand icon
            treeBrowser.onNodeOpen = function (nodeId) {

                //first create dummy elements under the parent representing the childrend being loaded
                var parent = client.getNode(nodeId),
                    parentNode,
                    childrenIDs,
                    i,
                    currentChildId,
                    childNode,
                    childTreeNode;

                if (parent) {

                    //get the DOM node representing the parent in the tree
                    parentNode = nodes[nodeId].treeNode;

                    //get the children IDs of the parent
                    childrenIDs = parent.getChildrenIds();

                    treeBrowser.enableUpdate(false);

                    for (i = 0; i < childrenIDs.length; i += 1) {
                        currentChildId = childrenIDs[i];

                        childNode = client.getNode(currentChildId);

                        //local variable for the created treenode of the child node (loading or full)
                        childTreeNode = null;

                        //check if the node could be retreived from the client
                        if (childNode) {
                            //the node was present on the client side, render ist full data
                            childTreeNode = treeBrowser.createNode(parentNode, {
                                id: currentChildId,
                                name: childNode.getAttribute('name'),
                                hasChildren: (childNode.getChildrenIds()).length > 0,
                                class: getNodeClass(childNode)
                            });

                            //store the node's info in the local hashmap
                            nodes[currentChildId] = {
                                treeNode: childTreeNode,
                                children: childNode.getChildrenIds(),
                                state: stateLoaded
                            };
                        } else {
                            //the node is not present on the client side, render a loading node instead
                            //create a new node for it in the tree
                            childTreeNode = treeBrowser.createNode(parentNode, {
                                id: currentChildId,
                                name: 'Loading...',
                                hasChildren: false,
                                class: NODE_PROGRESS_CLASS
                            });

                            //store the node's info in the local hashmap
                            nodes[currentChildId] = {
                                treeNode: childTreeNode,
                                children: [],
                                state: stateLoading
                            };
                        }
                    }

                    treeBrowser.enableUpdate(true);
                }

                //need to expand the territory
                selfPatterns[nodeId] = {children: 2};
                client.updateTerritory(selfId, selfPatterns);
            };

            //called from the TreeBrowserWidget when a node has been closed by its collapse icon
            treeBrowser.onNodeClose = function (nodeId) {
                //remove all children (all deep-nested children) from the accounted open-node list

                //local array to hold all the (nested) children ID to remove from the territory
                var removeFromTerritory = [],
                    deleteNodeAndChildrenFromLocalHash;

                //removes all the (nested)childrendIDs from the local hashmap
                // accounting the currently opened nodes's info
                deleteNodeAndChildrenFromLocalHash = function (childNodeId, deleteSelf) {
                    var xx;

                    //if the given node is in this hashmap itself, go forward with its children's ID recursively
                    if (nodes[childNodeId]) {
                        for (xx = 0; xx < nodes[childNodeId].children.length; xx += 1) {
                            deleteNodeAndChildrenFromLocalHash(nodes[childNodeId].children[xx], true);
                        }

                        //finally delete the nodeId itself (if needed)
                        if (deleteSelf === true) {
                            delete nodes[childNodeId];

                            //and collect the nodeId from territory removal
                            removeFromTerritory.push({nodeid: childNodeId});
                            delete selfPatterns[childNodeId];
                        }
                    }
                };

                //call the cleanup recursively and mark this node (being closed) as non removable
                // (from local hashmap neither from territory)
                deleteNodeAndChildrenFromLocalHash(nodeId, false);

                //if there is anything to remove from the territory, do it
                if (removeFromTerritory.length > 0) {
                    client.updateTerritory(selfId, selfPatterns);
                }
            };

            //called from the TreeBrowserWidget when a node has been marked to "copy this"
            treeBrowser.onNodeCopy = function (selectedIds) {
                client.copyNodes(selectedIds);
            };

            //called from the TreeBrowserWidget when a node has been marked to "paste here"
            treeBrowser.onNodePaste = function (nodeId) {
                client.pasteNodes(nodeId);
            };

            //called from the TreeBrowserWidget when a node has been marked to "delete this"
            treeBrowser.onNodeDelete = function (selectedIds) {
                var i = selectedIds.length;
                //temporary fix to not allow deleting ROOT AND FCO
                while (i--) {
                    if (client.getNode(selectedIds[i]).getBaseId() === null) {
                        logger.warn('Can not delete item with ID: ' +
                            selectedIds[i] + '. Possibly it is the ROOT or FCO');
                        selectedIds.splice(i, 1);
                    }
                }
                client.delMoreNodes(selectedIds);
            };

            //called from the TreeBrowserWidget when a node has been renamed
            treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

                //send name update to the server
                client.setAttributes(nodeId, 'name', newText);

                //reject name change on client side - need server roundtrip to notify about the name change
                return false;
            };

            //called when the user double-cliked on a node in the tree
            treeBrowser.onNodeDoubleClicked = function (nodeId) {
                logger.debug('Firing onNodeDoubleClicked with nodeId: ' + nodeId);
                var settings = {};
                settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
                settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = DEFAULT_VISUALIZER;
                WebGMEGlobal.State.set(settings);
            };

            treeBrowser.onExtendMenuItems = function (nodeId, menuItems) {

                //'create...' menu
                var validChildren = self._getValidChildrenTypes(nodeId),
                    cChild,
                    nodeObj = self._client.getNode(nodeId),
                    menuItemsCallback = function (key/*, options*/) {
                        self._createChild(nodeId, key);
                    };
                if (validChildren && validChildren.length > 0) {
                    menuItems.separatorCreate = '-';
                    menuItems.create = { // The "create" menu item
                        name: 'Create...',
                        icon: 'add',
                        items: {}
                    };

                    //iterate through each possible item and att it to the list
                    for (var i = 0; i < validChildren.length; i += 1) {
                        cChild = validChildren[i];
                        menuItems.create.items[cChild.id] = {
                            name: cChild.title,
                            callback: menuItemsCallback
                        };
                    }
                }

                menuItems.exportLibrary = { // Export...
                    name: 'Export as library...',
                    callback: function (/*key, options*/) {
                        ExportManager.expLib(nodeId);
                    },
                    icon: false
                };

                menuItems.updateLibrary = { // Import...
                    name: 'Update library from file...',
                    callback: function (/*key, options*/) {
                        ImportManager.importLibrary(nodeId);
                    },
                    icon: false
                };

                menuItems.insertLibrary = { // Merge...
                    name: 'Import library here...',
                    callback: function (/*key, options*/) {
                        ImportManager.addLibrary(nodeId);
                    },
                    icon: false
                };

                //menuItems["exportContext"] = { //Export context for plugin
                //    "name": "Export context...",
                //    "callback": function(/*key, options*/){
                //        ExportManager.exIntConf([nodeId]);
                //    },
                //    "icon": false
                //};

                if (nodeObj.getCrosscutsInfo().length > 0) {
                    menuItems.openInCrossCut = { //Open in crosscuts
                        name: 'Open in \'Crosscuts\'',
                        callback: function (/*key, options*/) {
                            var settings = {};
                            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
                            settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = CROSSCUT_VISUALIZER;
                            WebGMEGlobal.State.set(settings);
                        },
                        icon: false
                    };
                }

                if (nodeObj.getValidSetNames().length > 0) {
                    menuItems.openInSetEditor = { //Open in crosscuts
                        name: 'Open in \'Set membership\'',
                        callback: function (/*key, options*/) {
                            var settings = {};
                            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
                            settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = SET_VISUALIZER;
                            WebGMEGlobal.State.set(settings);
                        },
                        icon: false
                    };
                }
            };

            treeBrowser.getDragEffects = function (/*el*/) {
                return [treeBrowser.DRAG_EFFECTS.DRAG_COPY,
                    treeBrowser.DRAG_EFFECTS.DRAG_MOVE,
                    treeBrowser.DRAG_EFFECTS.DRAG_CREATE_POINTER,
                    treeBrowser.DRAG_EFFECTS.DRAG_CREATE_INSTANCE];
            };

            treeBrowser.getDragItems = function (/*el*/) {
                return treeBrowser.getSelectedIDs();
            };

            refresh = function (eventType, objectId) {
                var nodeDescriptor = null,
                    currentChildId = null,
                    j = 0,
                    removeFromTerritory,
                    updatedObject,
                    objType,
                    oldChildren,
                    currentChildren,
                    childrenDeleted,
                    deleteNodeAndChildrenFromLocalHash,
                    childrenAdded,
                    childNode,
                    childTreeNode;

                logger.debug('Refresh event \'' + eventType + '\', with objectId: \'' + objectId + '\'');

                //HANDLE INSERT
                //object got inserted into the territory
                if (eventType === 'insert') {
                    //check if this control shows any interest for this object
                    if (nodes[objectId]) {
                        //if the object is in "loading" state according to the local hashmap
                        //update the "loading" node accordingly
                        if (nodes[objectId].state === stateLoading) {
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
                    if (nodes[objectId]) {
                        logger.debug('Update object with id: ' + objectId);
                        //get the node from the client
                        updatedObject = client.getNode(objectId);

                        if (updatedObject) {

                            //check what state the object is in according to the local hashmap
                            if (nodes[objectId].state === stateLoading) {
                                //if the object is in "loading" state, meaning we were waiting for it
                                //render it's real data

                                //specify the icon for the treenode
                                objType = getNodeClass(updatedObject);

                                //create the node's descriptor for the tree-browser widget
                                nodeDescriptor = {
                                    name: updatedObject.getAttribute('name'),
                                    hasChildren: (updatedObject.getChildrenIds()).length > 0,
                                    class: objType
                                };

                                //update the node's representation in the tree
                                treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                                //update the object's children list in the local hashmap
                                nodes[objectId].children = updatedObject.getChildrenIds();

                                //finally update the object's state showing loaded
                                nodes[objectId].state = stateLoaded;
                            } else {
                                //object is already loaded here, let's see what changed in it

                                //specify the icon for the treenode
                                objType = getNodeClass(updatedObject);

                                //create the node's descriptor for the treebrowser widget
                                nodeDescriptor = {
                                    name: updatedObject.getAttribute('name'),
                                    hasChildren: (updatedObject.getChildrenIds()).length > 0,
                                    class: objType
                                };

                                //update the node's representation in the tree
                                treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                                oldChildren = nodes[objectId].children;
                                currentChildren = updatedObject.getChildrenIds();

                                //the concrete child deletion is important only if the node is open in the tree
                                if (treeBrowser.isExpanded(nodes[objectId].treeNode)) {
                                    //figure out what are the deleted children's IDs
                                    childrenDeleted = _.difference(oldChildren, currentChildren);

                                    //removes all the (nested)childrendIDs from the local hashmap accounting
                                    // the currently opened nodes's info
                                    deleteNodeAndChildrenFromLocalHash = function (childNodeId) {
                                        var xx;
                                        //if the given node is in this hashmap itself,
                                        // go forward with its children's ID recursively
                                        if (nodes[childNodeId]) {
                                            for (xx = 0; xx < nodes[childNodeId].children.length; xx += 1) {
                                                deleteNodeAndChildrenFromLocalHash(nodes[childNodeId].children[xx]);
                                            }

                                            //finally delete the nodeId itself (if needed)
                                            delete nodes[childNodeId];

                                            //and collect the nodeId from territory removal
                                            removeFromTerritory.push({nodeid: childNodeId});
                                            delete selfPatterns[childNodeId];
                                        }
                                    };

                                    for (j = 0; j < childrenDeleted.length; j += 1) {

                                        currentChildId = childrenDeleted[j];

                                        if (nodes[currentChildId]) {

                                            //get all the children that have been removed with this node deletion
                                            //and remove them from this.nodes

                                            //call the node deletion in the tree-browser widget
                                            treeBrowser.deleteNode(nodes[currentChildId].treeNode);

                                            //call the cleanup recursively and mark this node (being closed)
                                            // as non removable (from local hashmap neither from territory)
                                            deleteNodeAndChildrenFromLocalHash(currentChildId);
                                        }
                                    }
                                }

                                //the concrete child addition is important only if the node is open in the tree
                                if (treeBrowser.isExpanded(nodes[objectId].treeNode)) {
                                    //figure out what are the new children's IDs
                                    childrenAdded = _.difference(currentChildren, oldChildren);

                                    //handle added children
                                    for (j = 0; j < childrenAdded.length; j += 1) {
                                        currentChildId = childrenAdded[j];

                                        childNode = client.getNode(currentChildId);

                                        //local variable for the created treenode of the child node (loading or full)
                                        childTreeNode = null;

                                        //check if the node could be retreived from the project
                                        if (childNode) {
                                            //the node was present on the client side, render ist full data
                                            childTreeNode = treeBrowser.createNode(nodes[objectId].treeNode, {
                                                id: currentChildId,
                                                name: childNode.getAttribute('name'),
                                                hasChildren: (childNode.getChildrenIds()).length > 0,
                                                class: getNodeClass(childNode)
                                            });

                                            //store the node's info in the local hashmap
                                            nodes[currentChildId] = {
                                                treeNode: childTreeNode,
                                                children: childNode.getChildrenIds(),
                                                state: stateLoaded
                                            };
                                        } else {
                                            //the node is not present on the client side, render a loading node instead
                                            //create a new node for it in the tree
                                            childTreeNode = treeBrowser.createNode(nodes[objectId].treeNode, {
                                                id: currentChildId,
                                                name: 'Loading...',
                                                hasChildren: false,
                                                class: NODE_PROGRESS_CLASS
                                            });

                                            //store the node's info in the local hashmap
                                            nodes[currentChildId] = {
                                                treeNode: childTreeNode,
                                                children: [],
                                                state: stateLoading
                                            };
                                        }
                                    }
                                }

                                //update the object's children list in the local hashmap
                                nodes[objectId].children = updatedObject.getChildrenIds();

                                //finally update the object's state showing loaded
                                nodes[objectId].state = stateLoaded;

                                //if there is no more children of the current node, remove it from the territory
                                if ((updatedObject.getChildrenIds()).length === 0 &&
                                    objectId !== CONSTANTS.PROJECT_ROOT_ID) {
                                    removeFromTerritory.push({nodeid: objectId});
                                    delete selfPatterns[objectId];
                                }

                                //if there is anythign to remove from the territory, do so
                                if (removeFromTerritory.length > 0) {
                                    client.updateTerritory(selfId, selfPatterns);
                                }
                            }
                        }
                    }
                }
                //ENDOF : HANDLE UPDATE
            };

            this._eventCallback = function (events) {
                var i,
                    len = events.length;

                for (i = 0; i < len; i += 1) {
                    if (events[i].etype === 'load') {
                        refresh('insert', events[i].eid);
                    } else if (events[i].etype === 'update') {
                        refresh('update', events[i].eid);
                    } else if (events[i].etype === 'unload') {
                        refresh('unload', events[i].eid);
                    } else {
                        logger.debug('unknown event type \'' + events[i].etype + '\' received');
                    }
                }
            };

            this.reLaunch = function () {
                logger.debug('reLaunch from client...');

                //forget the old territory
                client.removeUI(selfId);

                treeBrowser.deleteNode(nodes[CONSTANTS.PROJECT_ROOT_ID].treeNode);

                selfPatterns = {};
                nodes = {};

                initialize();
            };

            this.destroy = function () {
                $(document).find('link[href*="css/Panels/ObjectBrowser/TreeBrowserControl.css"]').remove();
            };

            setTimeout(initialize, 250);
        };

    TreeBrowserControl.prototype._getValidChildrenTypes = function (nodeId) {
        var types = [],
            node = this._client.getNode(nodeId),
            validChildrenInfo = node.getValidChildrenTypesDetailed(),
            keys = Object.keys(validChildrenInfo || {}),
            validNode,
            i;

        for (i = 0; i < keys.length; i += 1) {
            if (validChildrenInfo[keys[i]] === true) {
                validNode = this._client.getNode(keys[i]);
                types.push({id: validNode.getId(), title: validNode.getAttribute('name')});
            }
        }

        return types;
    };

    TreeBrowserControl.prototype._createChild = function (nodeId, childId) {
        var client = this._client;

        var params = {parentId: nodeId};
        params[childId] = {registry: {}};
        params[childId].registry[REGISTRY_KEYS.POSITION] = {x: 100, y: 100};
        client.createChildren(params);
    };

    return TreeBrowserControl;
});
