/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/NodePropertyNames',
    'js/Constants',
    'js/RegistryKeys',
    './ObjectBrowserControlBase',
    'js/Dialogs/LibraryManager/LibraryManager',
    'js/Dialogs/ImportModel/ImportModelDialog',
    'js/Utils/Exporters'
], function (Logger,
             nodePropertyNames,
             CONSTANTS,
             REGISTRY_KEYS,
             ObjectBrowserControlBase,
             LibraryManager,
             ImportModelDialog,
             exporters) {
    'use strict';

    var NODE_PROGRESS_CLASS = 'node-progress',
        GME_MODEL_CLASS = 'gme-model',
        GME_ATOM_CLASS = 'gme-atom',
        GME_CONNECTION_CLASS = 'gme-connection',
        GME_ROOT_CLASS = 'gme-root',
        GME_ASPECT_CLASS = 'gme-aspect',
        GME_LIBRARY_CLASS = 'gme-library',
        GME_META_ATOM_CLASS = 'gme-meta-atom',
        GME_META_SET_CLASS = 'gme-meta-set',
        GME_META_MODEL_CLASS = 'gme-meta-model',
        GME_META_CONNECTION_CLASS = 'gme-meta-connection',
        CROSSCUT_VISUALIZER = 'Crosscut',
        SET_VISUALIZER = 'SetEditor',
        TREE_ROOT = CONSTANTS.PROJECT_ROOT_ID;

    function TreeBrowserControl(client, treeBrowser, config) {
        var logger,
            stateLoading = 0,
            stateLoaded = 1,
            selfId,
            selfPatterns = {},
        //local container for accounting the currently opened node list,
        // its a hashmap with a key of nodeId and a value of { FancyTreeNode, childrenIds[], state }
            nodes = {},
            refresh,
            initialize,
            initialized = false,
            self = this,
            getNodeClass,
            getLibraryInfo;

        //get logger instance for this component
        logger = Logger.create('gme:Panels:ObjectBrowser:TreeBrowserControl', WebGMEGlobal.gmeConfig.client.log);
        this._logger = logger;

        ObjectBrowserControlBase.call(this, client, treeBrowser, logger);

        this._treeRootId = TREE_ROOT;

        this._libraryManager = new LibraryManager(this._client);

        function setTreeRoot() {
            var projectId = client.getActiveProjectId(),
                projectName = client.getActiveProjectName();

            if (config.byProjectId.treeRoot.hasOwnProperty(projectId)) {
                self._treeRootId = config.byProjectId.treeRoot[projectId];
            } else if (config.byProjectName.treeRoot.hasOwnProperty(projectName)) {
                self._treeRootId = config.byProjectName.treeRoot[projectName];
            } else {
                self._treeRootId = config.treeRoot;
            }
        }

        function refreshTreeRoot() {
            // Create a new loading node for it in the tree.
            var loadingRootTreeNode = treeBrowser.createNode(null, {
                id: self._treeRootId,
                name: 'Initializing tree...',
                hasChildren: true,
                class: NODE_PROGRESS_CLASS
            });

            // Store the node's info in the local hash-map.
            nodes[self._treeRootId] = {
                treeNode: loadingRootTreeNode,
                children: [],
                state: stateLoading
            };

            // Add the tree-root to the query and update the territory.
            selfPatterns = {};
            selfPatterns[self._treeRootId] = {children: 1};
            client.updateTerritory(selfId, selfPatterns);
        }

        initialize = function () {
            var rootNode = client.getNode(CONSTANTS.PROJECT_ROOT_ID);
            logger.debug('entered initialize');
            setTreeRoot();

            if (rootNode) {
                logger.debug('rootNode avaliable now');
                selfId = client.addUI(self, function (events) {
                    self._eventCallback(events);
                    if (initialized === false) {
                        if (client.getNode(self._treeRootId)) {
                            logger.debug('loaded territory from "' + self._treeRootId + '" at initialize');
                            initialized = true;

                            logger.debug('expanding tree-root', self._treeRootId);
                            //treeBrowser.updateNode(nodes[self._treeRootId].treeNode, {
                            //    icon: self.getIcon(self._treeRootId, true)
                            //});
                            nodes[self._treeRootId].treeNode.setExpanded(true);
                        } else {
                            logger.error('Specified tree-root ' + self._treeRootId +
                                ' did not exist in model - falling back on root-node.');

                            treeBrowser.deleteNode(nodes[self._treeRootId].treeNode);
                            self._treeRootId = CONSTANTS.PROJECT_ROOT_ID;
                            nodes = {};

                            refreshTreeRoot();
                        }
                    }
                });

                refreshTreeRoot();
            } else {
                logger.debug('rootNode not avaliable at initialize');
                setTimeout(initialize, 500);
            }
        };

        getNodeClass = function (nodeObj, isMetaNode) {
            var objID = nodeObj.getId(),
                c;

            if (objID === CONSTANTS.PROJECT_ROOT_ID) {
                //if root object
                c = GME_ROOT_CLASS;
            } else if (nodeObj.isLibraryRoot()) {
                c = GME_LIBRARY_CLASS;
            } else if (nodeObj.getCrosscutsInfo().length > 0 || nodeObj.getValidSetNames().length > 0) {
                c = isMetaNode ? GME_META_SET_CLASS : GME_ASPECT_CLASS;
            } else if (nodeObj.isConnection()) {
                //if it's a connection, let it have the connection icon
                c = isMetaNode ? GME_META_CONNECTION_CLASS : GME_CONNECTION_CLASS;
            } else if (nodeObj.getChildrenIds().length > 0) {
                //if it has children, let it have the model icon
                c = isMetaNode ? GME_META_MODEL_CLASS : GME_MODEL_CLASS;
            } else {
                //by default everyone is represented with the atom class
                c = isMetaNode ? GME_META_ATOM_CLASS :GME_ATOM_CLASS;
            }

            return c;
        };

        getLibraryInfo = function (nodeObj) {
            var info;

            if (!nodeObj.isLibraryRoot()) {
                return null;
            }

            info = client.getLibraryInfo(nodeObj.getFullyQualifiedName());

            if (info) {
                return 'origin: ' + info.projectId + ' : ' +
                    (info.branchName ? info.branchName + '@' + info.commitHash : info.commitHash);
            }

            return null;

        };

        //called from the TreeBrowserWidget when a node is expanded by its expand icon
        treeBrowser.onNodeOpen = function (nodeId) {

            //first create dummy elements under the parent representing the childrend being loaded
            var parent = client.getNode(nodeId),
                childrenDescriptors = [],
                metaTypeInfo,
                newNodes,
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

                for (i = 0; i < childrenIDs.length; i += 1) {
                    currentChildId = childrenIDs[i];

                    childNode = client.getNode(currentChildId);

                    //local variable for the created treenode of the child node (loading or full)
                    childTreeNode = null;

                    //check if the node could be retreived from the client
                    if (childNode) {
                        metaTypeInfo = self.getMetaInfo(childNode);
                        //the node was present on the client side, render ist full data
                        childrenDescriptors.push({
                            id: currentChildId,
                            name: childNode.getFullyQualifiedName(),
                            hasChildren: (childNode.getChildrenIds()).length > 0,
                            class: getNodeClass(childNode, metaTypeInfo.isMetaNode),
                            icon: self.getIcon(childNode),
                            isConnection: childNode.isConnection(),
                            isAbstract: childNode.isAbstract(),
                            isLibrary: childNode.isLibraryRoot() || childNode.isLibraryElement(),
                            isLibraryRoot: childNode.isLibraryRoot(),
                            isMetaNode: metaTypeInfo.isMetaNode,
                            metaType: metaTypeInfo.name,
                            libraryInfo: getLibraryInfo(childNode),
                            // Data used locally here.
                            STATE: stateLoaded,
                            CHILDREN: childNode.getChildrenIds()
                        });
                    } else {
                        //the node is not present on the client side, render a loading node instead
                        childrenDescriptors.push({
                            id: currentChildId,
                            name: 'Loading...',
                            hasChildren: false,
                            class: NODE_PROGRESS_CLASS,
                            // Data used locally here.
                            STATE: stateLoading,
                            CHILDREN: []
                        });
                    }
                }

                newNodes = treeBrowser.createNodes(parentNode, childrenDescriptors);
                for (i = 0; i < childrenDescriptors.length; i += 1) {
                    nodes[childrenDescriptors[i].id] = {
                        treeNode: newNodes[i],
                        children: childrenDescriptors[i].CHILDREN,
                        state: childrenDescriptors[i].STATE
                    };
                }

                treeBrowser.updateNode(parentNode, {icon: self.getIcon(parent, true)});

                treeBrowser.applyFilters();
            }

            //need to expand the territory
            selfPatterns[nodeId] = {children: 1};
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
                        if (selfPatterns[childNodeId]) {
                            removeFromTerritory.push({nodeid: childNodeId});
                            delete selfPatterns[childNodeId];
                        }
                    }
                }
            };

            //call the cleanup recursively and mark this node (being closed) as non removable
            // (from local hashmap neither from territory)
            deleteNodeAndChildrenFromLocalHash(nodeId, false);
            treeBrowser.updateNode(nodes[nodeId].treeNode, {icon: self.getIcon(nodeId)});

            //if there is anything to remove from the territory, do it
            if (removeFromTerritory.length > 0) {
                client.updateTerritory(selfId, selfPatterns);
            }
        };

        //called from the TreeBrowserWidget when a node has been marked to "copy this"
        treeBrowser.onNodeCopy = function (selectedIds) {
            client.copyNodes(selectedIds);
        };

        //called when the user double-cliked on a node in the tree
        treeBrowser.onNodeDoubleClicked = function (nodeId) {
            logger.debug('Firing onNodeDoubleClicked with nodeId: ' + nodeId);
            //var settings = {};
            WebGMEGlobal.State.registerActiveObject(nodeId);
        };

        // We overwrite the one from the base class..
        treeBrowser.onExtendMenuItems = function (nodeId, menuItems) {
            var validChildren = self._getValidChildrenTypesFlattened(nodeId),
                selectedIds = self._treeBrowser.getSelectedIDs() || [],
                single = selectedIds.length === 1,
                nodeObj = self._client.getNode(nodeId),
                createChildFn = function (key/*, options*/) {
                    self._createChild(nodeId, key);
                },
                keys,
                i;

            if (!nodeObj) {
                return;
            }

            if (single && validChildren['has.children'] === true && !nodeObj.isReadOnly()) {
                menuItems.create = { // The "create" menu item
                    name: 'Create child',
                    icon: 'add',
                    items: {}
                };

                delete validChildren['has.children'];

                keys = Object.keys(validChildren);
                keys.sort();
                //iterate through each possible item and att it to the list
                for (i = 0; i < keys.length; i += 1) {
                    menuItems.create.items[validChildren[keys[i]]] = {
                        name: keys[i],
                        callback: createChildFn
                    };
                }
            }

            //now we are removing invalid items
            if (nodeObj.isReadOnly() || nodeId === CONSTANTS.PROJECT_ROOT_ID) {
                delete menuItems.delete;
            }

            if (client.isReadOnly() || nodeObj.isLibraryElement()) {
                delete menuItems.rename;
            }

            //check if there is any operation left in the menu and set separators accordingly
            if (menuItems.delete || menuItems.rename || menuItems.create) {
                menuItems.separatorOperationsEnd = '-';
            } else {
                delete menuItems.separatorOperationsStart;
            }

            if (nodeId === CONSTANTS.PROJECT_ROOT_ID) {
                if (client.isReadOnly() === false) {
                    menuItems.addLibrary = {
                        name: 'Add Library ...',
                        callback: function (/*key, options*/) {
                            self._libraryManager.add();
                        },
                        icon: false
                    };
                }

                menuItems.exportProject = {
                    name: 'Export project',
                    icon: false,
                    items: {
                        assetfull: {
                            name: 'with assets',
                            callback: function (/*key, options*/) {
                                exporters.exportProject(self._client, self._logger, null, true);
                            },
                            icon: false
                        },
                        assetless: {
                            name: 'without assets',
                            callback: function (/*key, options*/) {
                                exporters.exportProject(self._client, self._logger, null, false);
                            },
                            icon: false
                        }
                    }
                };
            }

            if (selectedIds.indexOf(CONSTANTS.PROJECT_ROOT_ID) === -1 || selectedIds.length === 1) {
                // TODO check and decide where and how to put an additional separator
                // menuItems.separatorModelStart = '-';

                if (selectedIds.indexOf(CONSTANTS.PROJECT_ROOT_ID) === -1) {
                    menuItems.exportModel = {
                        name: 'Export models',
                        icon: false,
                        items: {
                            assetfull: {
                                name: 'with assets',
                                callback: function (/*key, options*/) {
                                    exporters.exportModels(self._client, self._logger, selectedIds, true);
                                },
                                icon: false
                            },
                            assetless: {
                                name: 'without assets',
                                callback: function (/*key, options*/) {
                                    exporters.exportModels(self._client, self._logger, selectedIds, false);
                                },
                                icon: false
                            }
                        }
                    };

                    if (selectedIds.length === 1) {
                        menuItems.exportModel.name = 'Export model';
                    }
                }

                if (selectedIds.length === 1 && nodeObj.isReadOnly() === false) {
                    menuItems.importModel = {
                        name: 'Import models ...',
                        icon: false,
                        callback: function (/*key,options*/) {
                            var importDialog = new ImportModelDialog(self._client, self._logger.fork('ImportModel'));
                            importDialog.show(nodeId);
                        }
                    };
                }
            }

            if (nodeObj.isLibraryRoot() && !nodeObj.isLibraryElement()) {
                delete menuItems.exportModel;
                delete menuItems.importModel;
                menuItems.library = {
                    name: 'Library',
                    items: {
                        viewLibrary: {
                            name: 'View commit of library',
                            callback: function (/*key, options*/) {
                                self._client.openLibraryOriginInNewWindow(nodeId);
                            },
                            icon: false
                        },
                        followLibrary: {
                            name: 'View branch of library',
                            callback: function (/*key, options*/) {
                                self._client.openLibraryOriginInNewWindow(nodeId, true);
                            },
                            icon: false
                        }
                    },
                    icon: false
                };

                if (client.isReadOnly() === false) {
                    menuItems.library.items.libraryEditSepararator = '-';
                    menuItems.library.items.refreshLibrary = {
                        name: 'Update library ...',
                        callback: function (/*key, options*/) {
                            self._libraryManager.update(nodeId);
                        },
                        icon: false
                    };

                    menuItems.library.items.removeLibrary = {
                        name: 'Remove library ...',
                        callback: function (/*key, options*/) {
                            self._libraryManager.remove(nodeId);
                        },
                        icon: 'delete'
                    };

                    //the rename should not be inplace
                    menuItems.rename.callback = function (/*key, options*/) {
                        self._libraryManager.rename(nodeId);
                    };

                    menuItems.rename.name = 'Rename ...';
                }
            }

            if (nodeObj.getCrosscutsInfo().length > 0 || nodeObj.getValidSetNames().length > 0) {
                // Turn open into a menu ..
                menuItems.open = {
                    name: 'Open in visualizer',
                    items: {
                        defaultViz: menuItems.open
                    },
                    icon: 'paste'
                };

                menuItems.open.items.defaultViz.name = 'Default visualizer';
                menuItems.open.items.defaultViz.icon = false;

                if (nodeObj.getCrosscutsInfo().length > 0) {
                    menuItems.open.items.crosscut = { //Open in crosscuts
                        name: 'Crosscuts',
                        callback: function (/*key, options*/) {
                            var settings = {};
                            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
                            WebGMEGlobal.State.set(settings);

                            // Prevent the default to be selected.
                            setTimeout(function () {
                                var settings = {};
                                settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = CROSSCUT_VISUALIZER;
                                WebGMEGlobal.State.set(settings);
                            });
                        },
                        icon: false
                    };
                }

                if (nodeObj.getValidSetNames().length > 0) {
                    menuItems.open.items.set = { //Open in crosscuts
                        name: 'Set membership',
                        callback: function (/*key, options*/) {
                            var settings = {};
                            settings[CONSTANTS.STATE_ACTIVE_OBJECT] = nodeId;
                            WebGMEGlobal.State.set(settings);

                            // Prevent the default to be selected.
                            setTimeout(function () {
                                var settings = {};
                                settings[CONSTANTS.STATE_ACTIVE_VISUALIZER] = SET_VISUALIZER;
                                WebGMEGlobal.State.set(settings);
                            });
                        },
                        icon: false
                    };
                }
            }
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
                metaTypeInfo,
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
                        currentChildren = updatedObject.getChildrenIds();
                        //check what state the object is in according to the local hashmap
                        if (nodes[objectId].state === stateLoading) {
                            //if the object is in "loading" state, meaning we were waiting for it
                            //render it's real data
                            metaTypeInfo = self.getMetaInfo(updatedObject);
                            //specify the icon for the treenode
                            objType = getNodeClass(updatedObject, metaTypeInfo.isMetaNode);

                            //create the node's descriptor for the tree-browser widget
                            nodeDescriptor = {
                                name: updatedObject.getFullyQualifiedName(),
                                hasChildren: currentChildren.length > 0,
                                class: objType,
                                icon: self.getIcon(updatedObject),
                                isConnection: updatedObject.isConnection(),
                                isAbstract: updatedObject.isAbstract(),
                                isLibrary: updatedObject.isLibraryRoot() || updatedObject.isLibraryElement(),
                                isLibraryRoot: updatedObject.isLibraryRoot(),
                                libraryInfo: getLibraryInfo(updatedObject),
                                isMetaNode: metaTypeInfo.isMetaNode,
                                metaType: metaTypeInfo.name
                            };

                            //update the node's representation in the tree
                            treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                            //update the object's children list in the local hashmap
                            nodes[objectId].children = currentChildren;

                            //finally update the object's state showing loaded
                            nodes[objectId].state = stateLoaded;
                        } else {
                            //object is already loaded here, let's see what changed in it

                            //specify the icon for the treenode
                            metaTypeInfo = self.getMetaInfo(updatedObject);
                            objType = getNodeClass(updatedObject, metaTypeInfo.isMetaNode);

                            //create the node's descriptor for the treebrowser widget
                            nodeDescriptor = {
                                name: updatedObject.getFullyQualifiedName(),
                                hasChildren: currentChildren.length > 0,
                                class: objType,
                                icon: self.getIcon(updatedObject),
                                isConnection: updatedObject.isConnection(),
                                isAbstract: updatedObject.isAbstract(),
                                isLibrary: updatedObject.isLibraryRoot() || updatedObject.isLibraryElement(),
                                isLibraryRoot: updatedObject.isLibraryRoot(),
                                libraryInfo: getLibraryInfo(updatedObject),
                                isMetaNode: metaTypeInfo.isMetaNode,
                                metaType: metaTypeInfo.name
                            };

                            oldChildren = nodes[objectId].children;

                            //the concrete child deletion is important only if the node is open in the tree
                            if (treeBrowser.isExpanded(nodes[objectId].treeNode)) {
                                nodeDescriptor.icon = self.getIcon(updatedObject, true);
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
                                        if (selfPatterns[childNodeId]) {
                                            removeFromTerritory.push({nodeid: childNodeId});
                                            delete selfPatterns[childNodeId];
                                        }
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
                                    metaTypeInfo = self.getMetaInfo(childNode);

                                    //local variable for the created treenode of the child node (loading or full)
                                    childTreeNode = null;

                                    //check if the node could be retreived from the project
                                    if (childNode) {
                                        //the node was present on the client side, render ist full data
                                        childTreeNode = treeBrowser.createNode(nodes[objectId].treeNode, {
                                            id: currentChildId,
                                            name: childNode.getFullyQualifiedName(),
                                            hasChildren: (childNode.getChildrenIds()).length > 0,
                                            class: getNodeClass(childNode, metaTypeInfo.isMetaNode),
                                            icon: self.getIcon(childNode),
                                            isConnection: childNode.isConnection(),
                                            isAbstract: childNode.isAbstract(),
                                            isLibrary: childNode.isLibraryRoot() || childNode.isLibraryElement(),
                                            isLibraryRoot: childNode.isLibraryRoot(),
                                            libraryInfo: getLibraryInfo(childNode),
                                            isMetaNode: metaTypeInfo.isMetaNode,
                                            metaType: metaTypeInfo.name
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
                            nodes[objectId].children = currentChildren;

                            //update the node's representation in the tree
                            treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                            //finally update the object's state showing loaded
                            nodes[objectId].state = stateLoaded;

                            // When there is no more children of the current node, remove it from the territory
                            // if it was there and it is not the root node.
                            if (objectId !== CONSTANTS.PROJECT_ROOT_ID && selfPatterns[objectId] &&
                                currentChildren.length === 0) {

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
                changesMade = false,
                len = events.length;

            for (i = 0; i < len; i += 1) {
                if (events[i].etype === 'complete') {
                    // Do nothing..
                } else if (events[i].etype === 'update') {
                    refresh('update', events[i].eid);
                    changesMade = true;
                } else if (events[i].etype === 'load') {
                    refresh('insert', events[i].eid);
                    changesMade = true;
                } else if (events[i].etype === 'unload') {
                    refresh('unload', events[i].eid);
                    changesMade = true;
                } else {
                    logger.debug('unknown event type \'' + events[i].etype + '\' received');
                }
            }
            if (changesMade) {
                treeBrowser.applyFilters();
            }
        };

        this.locateNode = function (nodeId) {
            var parentId = nodeId,
                treeNode;

            while (true) {
                if (nodes.hasOwnProperty(parentId) && nodes[parentId].treeNode.class !== NODE_PROGRESS_CLASS) {
                    treeNode = nodes[parentId].treeNode;
                    treeNode.tree.activateKey(treeNode.key);
                    treeBrowser._deselectSelectedNodes();
                    nodes[parentId].treeNode.setSelected(true);
                    if (parentId !== nodeId) {
                        treeNode.setExpanded(true);
                    }

                    treeNode.tree.setFocus(true);
                    break;
                }
                if (!parentId) {
                    break;
                }
                parentId = parentId.substring(0, parentId.lastIndexOf('/'));
            }
        };

        this.reLaunch = function () {
            logger.debug('reLaunch from client...');

            //forget the old territory
            client.removeUI(selfId);

            treeBrowser.deleteNode(nodes[self._treeRootId].treeNode);

            selfPatterns = {};
            nodes = {};
            initialized = false;
            initialize();
        };

        this.destroy = function () {
            $(document).find('link[href*="css/Panels/ObjectBrowser/TreeBrowserControl.css"]').remove();
        };

        setTimeout(initialize, 250);
    }

    // Prototypical inheritance
    TreeBrowserControl.prototype = Object.create(ObjectBrowserControlBase.prototype);
    TreeBrowserControl.prototype.constructor = TreeBrowserControl;

    TreeBrowserControl.getDefaultConfig = function () {
        return {
            treeRoot: '',
            filters: {
                toggled: {
                    hideConnections: false,
                    hideAbstracts: false,
                    hideLeaves: false,
                    hideLibraries: false,
                    hideMetaNodes: false
                }
            },
            byProjectName: {
                treeRoot: {}
            },
            byProjectId: {
                treeRoot: {}
            }
        };
    };

    TreeBrowserControl.getComponentId = function () {
        return 'GenericUITreeBrowserControl';
    };

    TreeBrowserControl.prototype._getValidChildrenTypes = function (nodeId) {
        var types = {},
            node = this._client.getNode(nodeId),
            validChildrenInfo = {},
            keys,
            id,
            reference,
            nameArray,
            title,
            validNode,
            i;

        if (node) {
            validChildrenInfo = node.getValidChildrenTypesDetailed();
        }

        keys = Object.keys(validChildrenInfo || {});

        for (id in validChildrenInfo) {
            types['has.children'] = true;
            validNode = this._client.getNode(id);
            if (validNode) {
                nameArray = validNode.getFullyQualifiedName().split('.');
                title = nameArray.pop();
                reference = types;
                for (i = 0; i < nameArray.length; i += 1) {
                    reference[nameArray[i]] = reference[nameArray[i]] || {};
                    reference = reference[nameArray[i]];
                }
                reference[title] = reference[title] || {};
                reference[title]['own.id'] = id;
                reference[title]['own.title'] = title;
            }
        }

        return types;
    };

    TreeBrowserControl.prototype._getValidChildrenTypesFlattened = function (nodeId) {
        var types = {},
            node = this._client.getNode(nodeId),
            validChildrenInfo = {},
            keys,
            id,
            title,
            validNode;

        if (node) {
            validChildrenInfo = node.getValidChildrenTypesDetailed();
        }

        keys = Object.keys(validChildrenInfo || {});

        for (id in validChildrenInfo) {
            types['has.children'] = true;
            validNode = this._client.getNode(id);
            if (validNode) {
                title = validNode.getFullyQualifiedName();
                types[title] = id;
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
