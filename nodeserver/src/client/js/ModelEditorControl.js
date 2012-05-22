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
                                "incomingConnections": "connTrgt" };

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

        project.addEventListener(project.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var newPattern = {},
                selectedNode,
                i = 0,
                childrenIDs = [],
                currentChildId,
                childNode,
                childObject,
                childDescriptor;

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

                    childObject = null;

                    //assume that the child is not yet loaded on the client
                    nodes[currentChildId] = {   "modelObject": childObject,
                                                    "state": stateLoading };

                    childDescriptor =  { "id" : currentChildId };

                    //is it a connection
                    if (childNode.getAttribute(nodeAttrNames.source) && childNode.getAttribute(nodeAttrNames.target)) {
                        childDescriptor.kind = "CONNECTION";
                        childDescriptor.source = childNode.getAttribute(nodeAttrNames.source);
                        childDescriptor.target = childNode.getAttribute(nodeAttrNames.target);
                        childDescriptor.title =  childNode.getAttribute(nodeAttrNames.name);
                        childDescriptor.directed =  childNode.getAttribute(nodeAttrNames.directed);
                        childDescriptor.sourceComponent = nodes[childDescriptor.source].modelObject;
                        childDescriptor.targetComponent = nodes[childDescriptor.target].modelObject;
                    } else {
                        childDescriptor.kind = "MODEL";
                        childDescriptor.posX = childNode.getAttribute(nodeAttrNames.posX);
                        childDescriptor.posY = childNode.getAttribute(nodeAttrNames.posY);
                        childDescriptor.title =  childNode.getAttribute(nodeAttrNames.name);
                    }

                    //store the node's info in the local hash map
                    nodes[currentChildId].state = stateLoaded;
                    nodes[currentChildId].modelObject = modelEditor.createObject(childDescriptor);
                }

                //save the given nodeId as the currently handled one
                currentNodeInfo.id = nodeId;
                currentNodeInfo.children = childrenIDs;
            }
        });

        refresh = function (eventType, objectId) {
            var nodeDescriptor = null,
                j,
                parentNode,
                oldChildren,
                currentChildren,
                childrenDeleted,
                deletedChildId,
                childrenAdded,
                addedChildId,
                childNode,
                childObject,
                childDescriptor,
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
                        eventType = "update";
                    }
                }
            }
            //END IF : HANDLE INSERT

            //HANDLE UPDATE
            //object got updated in the territory
            if (eventType === "update") {
                //handle deleted children

                //check if the updated object is the opened node
                if (objectId === currentNodeInfo.id) {
                    //the updated object is the parent whose children are drawn here
                    //the only interest about the parent are the new and deleted children
                    parentNode = project.getNode(objectId);

                    modelEditor.setTitle(parentNode.getAttribute(nodeAttrNames.name));

                    oldChildren = currentNodeInfo.children;
                    currentChildren = [];
                    if (parentNode) {
                        currentChildren = parentNode.getAttribute(nodeAttrNames.children);
                    }

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

                        childNode = project.getNode(addedChildId);

                        childObject = null;

                        //assume that the child is not yet loaded on the client
                        nodes[addedChildId] = {   "modelObject": childObject,
                            "state" : stateLoading };

                        if (childNode) {
                            childDescriptor =  { "id" : addedChildId };

                            childDescriptor.posX = childNode.getAttribute(nodeAttrNames.posX);
                            childDescriptor.posY = childNode.getAttribute(nodeAttrNames.posY);
                            childDescriptor.title =  childNode.getAttribute(nodeAttrNames.name);

                            //store the node's info in the local hash map
                            nodes[addedChildId].state = stateLoaded;

                            nodes[addedChildId].modelObject = modelEditor.createObject(childDescriptor);
                        }
                    }

                    //finally store the actual children info for the parent
                    currentNodeInfo.children = currentChildren;

                } else if (nodes[objectId]) {
                    //this control shows an interest for this object
                    logger.debug("Update object with id: " + objectId);
                    //get the node from the project
                    updatedObject = project.getNode(objectId);

                    if (updatedObject && updatedObject.getAttribute("attr")) {

                        //create the node's descriptor for the widget
                        nodeDescriptor = {   "id" : objectId,
                            "posX": updatedObject.getAttribute(nodeAttrNames.posX),
                            "posY": updatedObject.getAttribute(nodeAttrNames.posY),
                            "title": updatedObject.getAttribute(nodeAttrNames.name) };

                        //check what state the object is in according to the local hashmap
                        if (nodes[objectId].state === stateLoading) {
                            nodes[objectId].state = stateLoaded;
                        }

                        //update the node's representation in the tree
                        modelEditor.updateObject(nodes[objectId].modelObject, nodeDescriptor);
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
    };

    return ModelEditorControl;
});
