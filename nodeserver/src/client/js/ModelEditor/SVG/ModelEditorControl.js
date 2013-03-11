"use strict";

define(['logManager',
        'clientUtil'], function (logManager, util) {

    var ModelEditorControl = function (myClient, myModelEditor) {
        var logger,
            client,
            selfId,
            selfPatterns = {},
            stateLoading = 0,
            stateLoaded = 1,
            nodes,
            modelEditor,
            currentNodeInfo,
            refresh,
            nodeAttrNames = { "name" : "name" },
            nodeRegistryNames = {   "position" : "position" },
            createObject,
            updateObject,
            getObjectDescriptor;

        //get logger instance for this component
        logger = logManager.create("ModelEditorControl");

        client = myClient;

        selfId = client.addUI(this);

        //local container for accounting the currently opened node list
        //its a hash map with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        nodes = {};

        //create the tree using our custom widget
        modelEditor = myModelEditor;

        //local variable holding info about the currently opened node
        currentNodeInfo = { "id": null, "children" : [] };

        modelEditor.onObjectPositionChanged = function (nodeId, position) {
            client.setRegistry(nodeId, nodeRegistryNames.position, { "x": position.posX, "y": position.posY });
        };

        modelEditor.onConnectionCreated = function (sourceId, targetId) {
            logger.debug("Creating connection between models: '" + sourceId + "' and '" + targetId + "' in parent '" + currentNodeInfo.id + "'");
            client.makeConnection({   "parentId": currentNodeInfo.id,
                "sourceId": sourceId,
                "targetId": targetId });
        };

        //called from the TreeBrowserWidget when a node has been marked to "copy this"
        modelEditor.onNodeCopy = function (selectedIds) {
            client.copyNodes(selectedIds);
        };

        //called from the TreeBrowserWidget when a node has been marked to "paste here"
        modelEditor.onNodePaste = function () {
            if (currentNodeInfo.id) {
                client.pasteNodes(currentNodeInfo.id);
            }
        };

        client.addEventListener(client.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var selectedNode,
                i = 0,
                childrenIDs = [],
                currentChildId,
                childNode;

            //delete everything from model editor
            modelEditor.clear();

            //clean up local hash map
            nodes = {};

            if (currentNodeInfo.id) {
                delete selfPatterns[currentNodeInfo.id];
                client.updateTerritory(selfId, selfPatterns);
            }

            currentNodeInfo = { "id": null, "children" : [] };

            selfPatterns[nodeId] = { "children": 1};
            client.updateTerritory(selfId, selfPatterns);

            selectedNode = project.getNode(nodeId);

            if (selectedNode) {
                modelEditor.setTitle(selectedNode.getAttribute(nodeAttrNames.name));

                //get the children IDs of the parent
                childrenIDs = selectedNode.getChildrenIds();

                for (i = 0; i < childrenIDs.length; i += 1) {

                    currentChildId = childrenIDs[i];

                    childNode = project.getNode(currentChildId);

                    //assume that the child is not yet loaded on the client
                    nodes[currentChildId] = {   "modelObject": null,
                                                    "state": stateLoading };

                    //if the child is already loaded on the client side
                    if (childNode) {
                        createObject(childNode);
                    }
                }

                //save the given nodeId as the currently handled one
                currentNodeInfo.id = nodeId;
                currentNodeInfo.children = childrenIDs;
            }
        });

        refresh = function (eventType, objectId) {
            var j,
                oldChildren,
                currentChildren,
                childrenDeleted,
                deletedChildId,
                childrenAdded,
                addedChildId,
                childNode,
                updatedObject;

            //HANDLE INSERT
            //object got inserted into the territory
            if (eventType === "insert") {
                //check if this control shows any interest for this object
                if (nodes[objectId]) {

                    //if the object is in "loading" state according to the local hashmap
                    //update the "loading" node accordingly
                    if (nodes[objectId].state === stateLoading) {
                        //set eventType to "update" and let it go and be handled by "update" event
                        createObject(client.getNode(objectId));
                    }
                }
            }
            //END IF : HANDLE INSERT

            //HANDLE UPDATE
            //object got updated in the territory
            if (eventType === "update") {
                updatedObject = client.getNode(objectId);

                //check if the updated object is the opened node
                if (objectId === currentNodeInfo.id) {
                    //the updated object is the parent whose children are displayed here
                    //the interest about the parent is:
                    // - name change
                    // - new children
                    // - deleted children

                    //handle name change
                    modelEditor.setTitle(updatedObject.getAttribute(nodeAttrNames.name));

                    //save old and current children info to be able to see the difference
                    oldChildren = currentNodeInfo.children;
                    currentChildren = updatedObject.getChildrenIds() || [];

                    //Handle children deletion
                    childrenDeleted = _.difference(oldChildren, currentChildren);

                    for (j = 0; j < childrenDeleted.length; j += 1) {
                        deletedChildId = childrenDeleted[j];
                        modelEditor.deleteObject(nodes[deletedChildId].modelObject);
                        delete nodes[deletedChildId];
                    }

                    //Handle children addition
                    childrenAdded = _.difference(currentChildren, oldChildren);
                    for (j = 0; j < childrenAdded.length; j += 1) {
                        addedChildId = childrenAdded[j];

                        //assume that the child is not yet loaded on the client
                        nodes[addedChildId] = {   "modelObject": null,
                            "state" : stateLoading };

                        //if the child is already loaded on the client side
                        childNode = client.getNode(addedChildId);
                        if (childNode) {
                            createObject(childNode);
                        }
                    }

                    //finally store the actual children info for the parent
                    currentNodeInfo.children = currentChildren;

                } else if (nodes[objectId]) {
                    //one of the children of the opened node has been updated
                    logger.debug("Update object with id: " + objectId);
                    if (nodes[objectId].state === stateLoaded) {
                        updateObject(updatedObject);
                    }
                }
            }
            //END IF : HANDLE UPDATE
        };

        // PUBLIC METHODS
        this.onEvent = function (etype, eid) {
            switch (etype) {
            case "load":
                refresh("insert", eid);
                break;
            case "update":
                refresh("update", eid);
                break;
            case "create":
                refresh("insert", eid);
                break;
            case "delete":
                refresh("update", eid);
                break;
            }
        };

        createObject = function (nodeObj) {
            var currentNodeId = nodeObj.getId();

            //store the node's info in the local hash map
            nodes[currentNodeId].state = stateLoaded;
            nodes[currentNodeId].modelObject = modelEditor.createObject(getObjectDescriptor(nodeObj));
        };

        updateObject = function (nodeObj) {
            var objectId = nodeObj.getId();

            //update the node's representation in the tree
            if (nodes[objectId].modelObject) {
                modelEditor.updateObject(nodes[objectId].modelObject, getObjectDescriptor(nodeObj));
            }
        };

        getObjectDescriptor = function (nodeObj) {
            var objDescriptor = {},
                position;

            objDescriptor.id = nodeObj.getId();

            //fill the descriptor based on its type
            if (nodeObj.getBaseId() === "connection") {
                objDescriptor.kind = "CONNECTION";
                objDescriptor.source = nodeObj.getPointer("source").to;
                objDescriptor.target = nodeObj.getPointer("target").to;
                objDescriptor.title =  nodeObj.getAttribute(nodeAttrNames.name);
                objDescriptor.directed =  true;//nodeObj.getAttribute(nodeAttrNames.directed);
                objDescriptor.sourceComponent = nodes[objDescriptor.source] ? nodes[objDescriptor.source].modelObject : null;
                objDescriptor.targetComponent = nodes[objDescriptor.target] ? nodes[objDescriptor.target].modelObject : null;
            } else {
                objDescriptor.kind = "MODEL";
                position = nodeObj.getRegistry(nodeRegistryNames.position);
                objDescriptor.posX = position.x;
                objDescriptor.posY = position.y;
                objDescriptor.title =  nodeObj.getAttribute(nodeAttrNames.name);
            }

            return objDescriptor;
        };
    };

    return ModelEditorControl;
});
