"use strict";

define(['./../../common/LogManager.js', './../../common/EventDispatcher.js', './util.js'], function (logManager, EventDispatcher, util) {

    var ModelEditorControl = function (myProject, myModelEditor) {
        var logger,
            project,
            territoryId,
            stateLoading = 0,
            stateLoaded = 1,
            nodes,
            modelEditor,
            currentNodeInfo,
            refresh,
            nodeAttrNames = {   "id": "_id",
                                "name" : "name",
                                "children": "children",
                                "parentId": "parent",
                                "posX": "attr.posX",
                                "posY": "attr.posY",
                                "source" : "srcId",
                                "target" : "trgtId",
                                "directed" : "directed",
                                "outgoingConnections": "connSrc",
                                "incomingConnections": "connTrgt" },
            createObject,
            updateObject,
            getObjectDescriptor;

        //get logger instance for this component
        logger = logManager.create("ModelEditorControl");

        project = myProject;

        territoryId = project.reserveTerritory(this);

        //local container for accounting the currently opened node list
        //its a hash map with a key of nodeId and a value of { DynaTreeDOMNode, childrenIds[] }
        nodes = {};

        //create the tree using our custom widget
        modelEditor = myModelEditor;

        //local variable holding info about the currently opened node
        currentNodeInfo = { "id": null, "children" : [] };

        modelEditor.onObjectPositionChanged = function (nodeId, position) {
            var selectedNode = project.getNode(nodeId);
            logger.debug("Object position changed for id:'" + nodeId + "', new pos:[" + position.posX + ", " + position.posY + "]");
            selectedNode.setAttribute("attr", { "posX": position.posX, "posY": position.posY });
        };

        modelEditor.onConnectionCreated = function (sourceId, targetId) {
            logger.debug("Creating connection between models: '" + sourceId + "' and '" + targetId + "' in parent '" + currentNodeInfo.id + "'");
        };

        //called from the TreeBrowserWidget when a node has been marked to "copy this"
        modelEditor.onNodeCopy = function (selectedIds) {
            project.copy(selectedIds);
        };

        //called from the TreeBrowserWidget when a node has been marked to "paste here"
        modelEditor.onNodePaste = function () {
            if (currentNodeInfo.id) {
                project.paste(currentNodeInfo.id);
            }
        };

        project.addEventListener(project.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var newPattern = {},
                selectedNode,
                i = 0,
                childrenIDs = [],
                currentChildId,
                childNode;

            //delete everything from model editor
            modelEditor.clear();

            //clean up local hash map
            nodes = {};

            if (currentNodeInfo.id) {
                project.removePatterns(territoryId, { "nodeid": currentNodeInfo.id });
            }

            currentNodeInfo = { "id": null, "children" : [] };

            newPattern[nodeId] = { "children": 1 };
            project.addPatterns(territoryId, newPattern);

            selectedNode = project.getNode(nodeId);

            if (selectedNode) {
                modelEditor.setTitle(selectedNode.getAttribute(nodeAttrNames.name));

                //get the children IDs of the parent
                childrenIDs = selectedNode.getAttribute(nodeAttrNames.children);

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
                        createObject(project.getNode(objectId));
                    }
                }
            }
            //END IF : HANDLE INSERT

            //HANDLE UPDATE
            //object got updated in the territory
            if (eventType === "update") {
                updatedObject = project.getNode(objectId);

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
                    currentChildren = updatedObject.getAttribute(nodeAttrNames.children) || [];

                    //Handle children deletion
                    childrenDeleted = util.arrayMinus(oldChildren, currentChildren);

                    for (j = 0; j < childrenDeleted.length; j += 1) {
                        deletedChildId = childrenDeleted[j];
                        modelEditor.deleteObject(nodes[deletedChildId].modelObject);
                        delete nodes[deletedChildId];
                    }

                    //Handle children addition
                    childrenAdded = util.arrayMinus(currentChildren, oldChildren);
                    for (j = 0; j < childrenAdded.length; j += 1) {
                        addedChildId = childrenAdded[j];

                        //assume that the child is not yet loaded on the client
                        nodes[addedChildId] = {   "modelObject": null,
                            "state" : stateLoading };

                        //if the child is already loaded on the client side
                        childNode = project.getNode(addedChildId);
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
            case "modify":
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
            var currentNodeId = nodeObj.getAttribute(nodeAttrNames.id);

            //store the node's info in the local hash map
            nodes[currentNodeId].state = stateLoaded;
            nodes[currentNodeId].modelObject = modelEditor.createObject(getObjectDescriptor(nodeObj));
        };

        updateObject = function (nodeObj) {
            var objectId = nodeObj.getAttribute(nodeAttrNames.id);

            //update the node's representation in the tree
            if (nodes[objectId].modelObject) {
                modelEditor.updateObject(nodes[objectId].modelObject, getObjectDescriptor(nodeObj));
            }
        };

        getObjectDescriptor = function (nodeObj) {
            var objDescriptor = {};

            objDescriptor.id = nodeObj.getAttribute(nodeAttrNames.id);

            //fill the descriptor based on its type
            if (nodeObj.getAttribute(nodeAttrNames.source) && nodeObj.getAttribute(nodeAttrNames.target)) {
                objDescriptor.kind = "CONNECTION";
                objDescriptor.source = nodeObj.getAttribute(nodeAttrNames.source);
                objDescriptor.target = nodeObj.getAttribute(nodeAttrNames.target);
                objDescriptor.title =  nodeObj.getAttribute(nodeAttrNames.name);
                objDescriptor.directed =  nodeObj.getAttribute(nodeAttrNames.directed);
                objDescriptor.sourceComponent = nodes[objDescriptor.source].modelObject;
                objDescriptor.targetComponent = nodes[objDescriptor.target].modelObject;
            } else {
                objDescriptor.kind = "MODEL";
                objDescriptor.posX = nodeObj.getAttribute(nodeAttrNames.posX);
                objDescriptor.posY = nodeObj.getAttribute(nodeAttrNames.posY);
                objDescriptor.title =  nodeObj.getAttribute(nodeAttrNames.name);
            }

            return objDescriptor;
        };
    };

    return ModelEditorControl;
});
