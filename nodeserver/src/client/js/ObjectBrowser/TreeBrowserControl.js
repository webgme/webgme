"use strict";

define(['logManager',
        'clientUtil',
        'commonUtil'], function (logManager, util, commonUtil) {

    var TreeBrowserControl = function (client, treeBrowser) {

        var logger,
            rootNodeId = "root",
            stateLoading = 0,
            stateLoaded = 1,
            selfId,
            selfPatterns = {},
            nodes = {}, //local container for accounting the currently opened node list, its a hashmap with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[], state }
            refresh,
            initialize,
            self = this;

        //get logger instance for this component
        logger = logManager.create("TreeBrowserControl");

        initialize = function () {
            var loadingRootTreeNode;

            selfId = client.addUI(self);

            //add "root" with its children to territory
            //create a new loading node for it in the tree
            loadingRootTreeNode = treeBrowser.createNode(null, {   "id": rootNodeId,
                "name": "Initializing tree...",
                "hasChildren" : false,
                "class" :  "gme-loading" });

            //store the node's info in the local hashmap
            nodes[rootNodeId] = {   "treeNode": loadingRootTreeNode,
                "children" : [],
                "state" : stateLoading };

            //add the root to the query
            selfPatterns = { "root": { "children": 1} };
            client.updateTerritory(selfId, selfPatterns);
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

                for (i = 0; i < childrenIDs.length; i += 1) {
                    currentChildId = childrenIDs[i];

                    childNode = client.getNode(currentChildId);

                    //local variable for the created treenode of the child node (loading or full)
                    childTreeNode = null;

                    //check if the node could be retreived from the client
                    if (childNode) {
                        //the node was present on the client side, render ist full data
                        childTreeNode = treeBrowser.createNode(parentNode, {   "id": currentChildId,
                                                                                "name": childNode.getAttribute("name"),
                                                                                "hasChildren" : (childNode.getChildrenIds()).length > 0,
                                                                                "class" :   ((childNode.getChildrenIds()).length > 0) ? "gme-model" : "gme-atom" });

                        //store the node's info in the local hashmap
                        nodes[currentChildId] = {    "treeNode": childTreeNode,
                                                        "children" : childNode.getChildrenIds(),
                                                        "state" : stateLoaded };
                    } else {
                        //the node is not present on the client side, render a loading node instead
                        //create a new node for it in the tree
                        childTreeNode = treeBrowser.createNode(parentNode, {   "id": currentChildId,
                                                                                "name": "Loading...",
                                                                                "hasChildren" : false,
                                                                                "class" :  "gme-loading" });

                        //store the node's info in the local hashmap
                        nodes[currentChildId] = {    "treeNode": childTreeNode,
                                                        "children" : [],
                                                        "state" : stateLoading };
                    }
                }
            }

            //need to expand the territory
            selfPatterns[nodeId] = { "children": 1};
            client.updateTerritory(selfId, selfPatterns);
        };

        //called from the TreeBrowserWidget when a node has been closed by its collapse icon
        treeBrowser.onNodeClose = function (nodeId) {
            //remove all children (all deep-nested children) from the accounted open-node list

            //local array to hold all the (nested) children ID to remove from the territory
            var removeFromTerritory = [],
                deleteNodeAndChildrenFromLocalHash;

            //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
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
                        removeFromTerritory.push({ "nodeid": childNodeId  });
                        delete selfPatterns[childNodeId];
                    }
                }
            };

            //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
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
            /*var i;
            for (i = 0; i < selectedIds.length; i += 1) {
                client.deleteNode(selectedIds[i]);
            }*/
            client.delMoreNodes(selectedIds);
        };

        //called from the TreeBrowserWidget when a node has been renamed
        treeBrowser.onNodeTitleChanged = function (nodeId, oldText, newText) {

            //send name update to the server
            client.setAttributes(nodeId, "name", newText);

            //reject name change on client side - need server roundtrip to notify about the name change
            return false;
        };

        //called when the user double-cliked on a node in the tree
        treeBrowser.onNodeDoubleClicked = function (nodeId) {
            logger.debug("Firing onNodeDoubleClicked with nodeId: " + nodeId);
            client.setSelectedObjectId(nodeId);
        };

        //called from the TreeBrowserWidget when a create function is called from context menu
        treeBrowser.onNodeCreate = function (nodeId) {
            client.createChild({parentId: nodeId});
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

            logger.debug("Refresh event '" + eventType + "', with objectId: '" + objectId + "'");

            //HANDLE INSERT
            //object got inserted into the territory
            if (eventType === "insert") {
                //check if this control shows any interest for this object
                if (nodes[objectId]) {

                    //if the object is in "loading" state according to the local hashmap
                    //update the "loading" node accordingly
                    if (nodes[objectId].state === stateLoading) {
                        //set eventType to "update" and let it go and be handled by "update" event
                        eventType = "update";
                    }
                }

                if (commonUtil.DEBUG === "DEMOHACK" && objectId === 'root') {
                    client.setSelectedObjectId(objectId);
                }
            }
            //ENDOF : HANDLE INSERT

            //HANDLE UPDATE
            //object got updated in the territory
            if (eventType === "update") {
                //handle deleted children
                removeFromTerritory = [];
                //check if this control shows any interest for this object
                if (nodes[objectId]) {
                    logger.debug("Update object with id: " + objectId);
                    //get the node from the client
                    updatedObject = client.getNode(objectId);

                    if (updatedObject) {

                        //check what state the object is in according to the local hashmap
                        if (nodes[objectId].state === stateLoading) {
                            //if the object is in "loading" state, meaning we were waiting for it
                            //render it's real data

                            //specify the icon for the treenode
                            //TODO: fixme (determine the type based on the 'kind' of the object)
                            objType = ((updatedObject.getChildrenIds()).length > 0) ? "gme-model" : "gme-atom";
                            //for root node let's specify specific type
                            if (objectId === rootNodeId) {
                                objType = "gme-root";
                            }

                            //create the node's descriptor for the tree-browser widget
                            nodeDescriptor = {  "text" :  updatedObject.getAttribute("name"),
                                "hasChildren" : (updatedObject.getChildrenIds()).length > 0,
                                "class" : objType };

                            //update the node's representation in the tree
                            treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                            //update the object's children list in the local hashmap
                            nodes[objectId].children = updatedObject.getChildrenIds();

                            //finally update the object's state showing loaded
                            nodes[objectId].state = stateLoaded;
                        } else {
                            //object is already loaded here, let's see what changed in it

                            //create the node's descriptor for the treebrowser widget
                            nodeDescriptor = {
                                "text" : updatedObject.getAttribute("name"),
                                "hasChildren" : (updatedObject.getChildrenIds()).length > 0//,
                                //"icon" : "img/temp/icon1.png"  --- SET ICON HERE IF NEEDED
                            };

                            //update the node's representation in the tree
                            treeBrowser.updateNode(nodes[objectId].treeNode, nodeDescriptor);

                            oldChildren = nodes[objectId].children;
                            currentChildren = updatedObject.getChildrenIds();

                            //the concrete child deletion is important only if the node is open in the tree
                            if (treeBrowser.isExpanded(nodes[objectId].treeNode)) {
                                //figure out what are the deleted children's IDs
                                childrenDeleted = _.difference(oldChildren, currentChildren);

                                //removes all the (nested)childrendIDs from the local hashmap accounting the currently opened nodes's info
                                deleteNodeAndChildrenFromLocalHash = function (childNodeId) {
                                    var xx;
                                    //if the given node is in this hashmap itself, go forward with its children's ID recursively
                                    if (nodes[childNodeId]) {
                                        for (xx = 0; xx < nodes[childNodeId].children.length; xx += 1) {
                                            deleteNodeAndChildrenFromLocalHash(nodes[childNodeId].children[xx]);
                                        }

                                        //finally delete the nodeId itself (if needed)
                                        delete nodes[childNodeId];

                                        //and collect the nodeId from territory removal
                                        removeFromTerritory.push({ "nodeid": childNodeId  });
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

                                        //call the cleanup recursively and mark this node (being closed) as non removable (from local hashmap neither from territory)
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
                                        childTreeNode = treeBrowser.createNode(nodes[objectId].treeNode, {  "id": currentChildId,
                                            "name": childNode.getAttribute("name"),
                                            "hasChildren": (childNode.getChildrenIds()).length > 0,
                                            "class" :  ((childNode.getChildrenIds()).length > 0) ? "gme-model" : "gme-atom" });

                                        //store the node's info in the local hashmap
                                        nodes[currentChildId] = {   "treeNode": childTreeNode,
                                            "children" : childNode.getChildrenIds(),
                                            "state" : stateLoaded };
                                    } else {
                                        //the node is not present on the client side, render a loading node instead
                                        //create a new node for it in the tree
                                        childTreeNode = treeBrowser.createNode(nodes[objectId].treeNode, {  "id": currentChildId,
                                            "name": "Loading...",
                                            "hasChildren" : false,
                                            "class" :  "gme-loading"  });

                                        //store the node's info in the local hashmap
                                        nodes[currentChildId] = {   "treeNode": childTreeNode,
                                            "children" : [],
                                            "state" : stateLoading };
                                    }
                                }
                            }

                            //update the object's children list in the local hashmap
                            nodes[objectId].children = updatedObject.getChildrenIds();

                            //finally update the object's state showing loaded
                            nodes[objectId].state = stateLoaded;

                            //if there is no more children of the current node, remove it from the territory
                            if ((updatedObject.getChildrenIds()).length === 0 && objectId !== "root") {
                                removeFromTerritory.push({ "nodeid" : objectId });
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

        this.onEvent = function (etype, eid) {
            switch (etype) {
            case "load":
                refresh("insert", eid);
                break;
            case "update":
                refresh("update", eid);
                break;
            /*case "create":
                refresh("insert", eid);
                break;
            case "delete":
                refresh("update", eid);
                break;*/
            case "unload":
                refresh("update", eid);
                break;
            }
        };

        this.reLaunch = function () {
            logger.debug('reLaunch from client...');

            //forget the old territory
            client.removeUI(selfId);

            treeBrowser.deleteNode(nodes[rootNodeId].treeNode);

            selfPatterns = {};
            nodes = {};

            initialize();
        };

        setTimeout(initialize, 250);
    };

    return TreeBrowserControl;
});
