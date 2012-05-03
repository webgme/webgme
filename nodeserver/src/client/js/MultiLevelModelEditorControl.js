"use strict";

define(['./../../common/LogManager.js', './../../common/EventDispatcher.js', './util.js'], function (logManager, EventDispatcher, util) {

    var MultiLevelModelEditorControl = function (myProject, myModelEditor) {
        var logger,
            project,
            territoryId,
            stateLoading = 0,
            stateLoaded = 1,
            nodes,
            modelEditor,
            currentNodeInfo,
            refresh;

        //get logger instance for this component
        logger = logManager.create("MultiLevelModelEditorControl");

        project = myProject;

        territoryId = project.reserveTerritory(this);

        //local container for accounting the currently opened node list
        //its a hash map with a key of nodeId and a value of { , childrenIds[] }
        nodes = {};

        //create the tree using our custom widget
        modelEditor = myModelEditor;
        modelEditor.setProject(project);

        //local variable holding info about the currently opened node
        currentNodeInfo = { "id": null, "children" : [] };

        modelEditor.onObjectPositionChanged = function (nodeId, position) {
            var selectedNode = project.getNode(nodeId);
            logger.debug("Object position changed for id:'" + nodeId + "', new pos:[" + position.x + ", " + position.y + "]");
            selectedNode.setAttribute("attr", { "posX": position.x, "posY": position.y });
        };

        modelEditor.onComponentExpanded = function (nodeId) {
            //first create dummy elements under the parent representing the childrend being loaded
            var parent = project.getNode(nodeId),
                parentModelComponent,
                childrenIDs,
                i,
                currentChildId,
                childNode,
                childModelComponent,
                newPattern;

            if (parent) {

                //get the DOM node representing the parent in the tree
                parentModelComponent = nodes[nodeId].modelObject;

                //get the children IDs of the parent
                childrenIDs = parent.getAttribute("children");

                for (i = 0; i < childrenIDs.length; i += 1) {
                    currentChildId = childrenIDs[i];

                    childNode = project.getNode(currentChildId);

                    //local variable for the created treenode of the child node (loading or full)
                    childModelComponent = null;

                    //check if the node could be retreived from the client
                    if (childNode) {
                        //the node was present on the client side, render ist full data
                        childModelComponent = modelEditor.createObject(currentChildId, childNode, parentModelComponent);

                        //store the node's info in the local hashmap
                        nodes[currentChildId] = {    "modelObject": childModelComponent,
                            "children" : childNode.getAttribute("children"),
                            "state" : stateLoaded };
                    } else {
                        //the node is not present on the client side, render a loading node instead
                        //create a new node for it in the tree
                        childModelComponent = modelEditor.createObject(currentChildId, childNode, parentModelComponent);

                        //store the node's info in the local hashmap
                        nodes[currentChildId] = {    "modelObject": childModelComponent,
                            "children" : [],
                            "state" : stateLoading };
                    }
                }
            }

            //need to expand the territory
            newPattern = {};
            newPattern[nodeId] = { "children": 1 };
            project.addPatterns(territoryId, newPattern);
        };

        project.addEventListener(project.events.SELECTEDOBJECT_CHANGED, function (project, nodeId) {
            var newPattern = {},
                selectedNode,
                i = 0,
                childrenIDs = [],
                currentChildId,
                childNode,
                childObject;

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
                currentNodeInfo.rootNode = modelEditor.createRootFromNode(selectedNode);

                //get the children IDs of the parent
                childrenIDs = selectedNode.getAttribute("children");

                for (i = 0; i < childrenIDs.length; i += 1) {

                    currentChildId = childrenIDs[i];

                    childNode = project.getNode(currentChildId);

                    childObject = null;

                    //assume that the child is not yet loaded on the client
                    nodes[currentChildId] = {   "modelObject": childObject,
                        "children" : [],
                        "state": stateLoading };

                    if (childNode) {
                        //store the node's info in the local hash map
                        nodes[currentChildId].children = childNode.getAttribute("children");
                        nodes[currentChildId].state = stateLoaded;
                    }

                    nodes[currentChildId].modelObject = modelEditor.createObject(currentChildId, childNode, currentNodeInfo.rootNode);
                }

                //save the given nodeId as the currently handled one
                currentNodeInfo.id = nodeId;
                currentNodeInfo.children = childrenIDs;
            }
        });

        refresh = function (eventType, objectId) {
            var j,
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

                    parentNode = project.getNode(objectId);

                    //make sure to update any rendered properties change
                    modelEditor.updateObject(currentNodeInfo.rootNode, parentNode);

                    //the only interest about the parent are the new and deleted children
                    oldChildren = currentNodeInfo.children;
                    currentChildren = [];
                    if (parentNode) {
                        currentChildren = parentNode.getAttribute("children");
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

                        childDescriptor =  { "id" : addedChildId,
                            "posX": 20,
                            "posY": 20,
                            "title": "Loading..."  };

                        if (childNode) {
                            childDescriptor.posX = childNode.getAttribute("attr").posX;
                            childDescriptor.posY = childNode.getAttribute("attr").posY;
                            childDescriptor.title =  childNode.getAttribute("name");

                            //store the node's info in the local hash map
                            nodes[addedChildId].state = stateLoaded;
                        }

                        nodes[addedChildId].modelObject = modelEditor.createObject(childDescriptor);
                    }

                    //finally store the actual children info for the parent
                    currentNodeInfo.children = currentChildren;

                } else if (nodes[objectId]) {
                    //this control shows an interest for this object
                    logger.debug("Update object with id: " + objectId);
                    //get the node from the project
                    updatedObject = project.getNode(objectId);

                    if (updatedObject) {
                        //check what state the object is in according to the local hashmap
                        if (nodes[objectId].state === stateLoading) {
                            nodes[objectId].state = stateLoaded;
                        }

                        //update the node's representation in the widget
                        modelEditor.updateObject(nodes[objectId].modelObject, updatedObject);
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

    return MultiLevelModelEditorControl;
});
