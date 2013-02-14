"use strict";

define(['logManager',
    'clientUtil',
    'nodeAttributeNames',
    'nodeRegistryNames'], function (logManager,
                                    util,
                                    nodeAttributeNames,
                                    nodeRegistryNames) {

    var GraphVizControl;

    GraphVizControl = function (myClient, myGraphVizView) {
        var self = this;

        this._client = myClient;
        this._graphVizView = myGraphVizView;

        this._logger = logManager.create("GraphVizControl");
        this._logger.debug("Created");

        //this._territoryId = this._client.addUI(this);
        this._selfPatterns = {};

        this._componentStates = { "loading": 0,
            "loaded": 1 };

        this._components = {};

        //local variable holding info about the currently opened node
        this._currentNodeInfo = {"id": null, "children" : []};

        this._initialize();

        /*
         * OVERRIDE GRAPHVIZ EDITOR API
         */

        this._graphVizView.onExpand = function (objectId) {
            self._onExpand(objectId);
        };

        this._graphVizView.onCollapse = function (objectId) {
            //self.onCollapse(objectId);
        };

        this._graphVizView.onCreatePointer = function (sourceId, targetId, pointerName) {
            self._onCreatePointer(sourceId, targetId, pointerName);
        };

        this._graphVizView.onDeletePointer = function (sourceId, pointerName) {
            self._onDeletePointer(sourceId, pointerName);
        };

        /*
         * END OF - OVERRIDE GRAPHVIZ EDITOR API
         */
    };

    GraphVizControl.prototype._initialize = function () {
        var self = this;
    };

    GraphVizControl.prototype.selectedObjectChanged = function (nodeId) {
        var selectedNode = this._client.getNode(nodeId),
            i = 0,
            childrenIDs = [],
            currentChildId;

        //delete everything from model editor
        this._graphVizView.clear();

        //clean up local hash map
        this._components = {};

        if (this._currentNodeInfo.id) {
            this._client.removeUI(this._territoryId);
        }

        this._currentNodeInfo = { "id": null, "children" : [] };

        if (selectedNode) {
            this._components[nodeId] = {   "componentInstance": null,
                "state": this._componentStates.loading,
                "children": [] };
            this._createObject(nodeId);

            //save the given nodeId as the currently handled one
            this._currentNodeInfo.id = nodeId;
            this._currentNodeInfo.children = childrenIDs;
        }

        this._selfPatterns[nodeId] = { "children": 1 };

        this._territoryId = this._client.addUI(this, true);
        this._client.updateTerritory(this._territoryId, this._selfPatterns);

        this._logger.debug("SELECTEDOBJECT_CHANGED handled for '" + nodeId + "'");
    };


    GraphVizControl.prototype._onExpand = function (objectId) {
        var expandedNode = this._client.getNode(objectId),
            childrenIDs,
            currentChildId,
            i;

        //get the children IDs of the parent
        childrenIDs = expandedNode.getChildrenIds();

        for (i = 0; i < childrenIDs.length; i += 1) {

            currentChildId = childrenIDs[i];

            if (this._components.hasOwnProperty(currentChildId) === false) {
                //assume that the child is not yet loaded on the client
                this._components[currentChildId] = {   "componentInstance": null,
                    "state": this._componentStates.loading,
                    "children": []};

                this._createObject(currentChildId);
            }
        }

        this._components[objectId].componentInstance._drawContainmentLines();

        this._selfPatterns[objectId] = { "children": 1 };
        this._client.updateTerritory(this._territoryId, this._selfPatterns);
    };

    GraphVizControl.prototype._getObjectDescriptor = function (nodeObj) {
        var objDescriptor = {},
            pointerNames =  nodeObj.getPointerNames(),
            i,
            pointerTo;

        objDescriptor.id = nodeObj.getId();
        objDescriptor.name =  nodeObj.getAttribute(nodeAttributeNames.name);
        objDescriptor.expandable =  nodeObj.getChildrenIds().length > 0;

        objDescriptor.pointers = {};

        for (i = 0; i < pointerNames.length; i += 1) {
            pointerTo = nodeObj.getPointer(pointerNames[i]).to;
            if (pointerTo) {
                objDescriptor.pointers[pointerNames[i]] = pointerTo;
            }
        }

        return objDescriptor;
    };

    GraphVizControl.prototype._createObject = function (nodeId) {
        var node = this._client.getNode(nodeId),
            parentObject;

        if (node) {
            if (node.getParentId()) {
                if (this._components[node.getParentId()]) {
                    parentObject = this._components[node.getParentId()].componentInstance;
                }
            }
            this._components[nodeId].componentInstance = this._graphVizView.createObject(this._getObjectDescriptor(node), parentObject);
            this._components[nodeId].state = this._componentStates.loaded;
            this._components[nodeId].children = node.getChildrenIds().slice();
        }
    };

    // PUBLIC METHODS
    GraphVizControl.prototype.onEvent = function (etype, eid) {
        this._logger.debug("onEvent '" + etype + "', '" + eid + "'");
        switch (etype) {
        case "load":
            this._onLoad(eid);
            break;
        case "update":
            this._onUpdate(eid);
            break;
        case "unload":
            //this._onUnload(eid);
            break;
        }
    };

    GraphVizControl.prototype.onOneEvent = function (events) {
        var i;

        this._logger.debug("onOneEvent '" + events.length + "' items");

        if (events && events.length > 0) {
            i = events.length;
            while (--i >= 0) {
                this.onEvent(events[i].etype, events[i].eid);
            }
        }

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    GraphVizControl.prototype._onLoad = function (objectId) {
        //child loaded
        if (this._components[objectId] && this._components[objectId].state === this._componentStates.loading) {
            this._createObject(objectId);
        }
    };

    GraphVizControl.prototype._onUpdate = function (objectId) {
        //self or child updated
        var updatedObject = this._client.getNode(objectId),
            oldChildren,
            newChildren,
            childrenDiff,
            i,
            childId;

        //check if the updated object is the opened node
        if (this._components[objectId] && this._components[objectId].state === this._componentStates.loaded) {
            //the updated object is the parent whose children are displayed here
            //the interest about the parent is:
            // - name change
            // - new children
            // - deleted children

            //save old and current children info to be able to see the difference
            oldChildren = this._components[objectId].children.slice();
            newChildren = updatedObject.getChildrenIds() || [];

            //Handle children deletion
            childrenDiff = util.arrayMinus(oldChildren, newChildren);

            for (i = 0; i < childrenDiff.length; i += 1) {
                childId = childrenDiff[i];
                if (this._components[childId] && this._components[childId].componentInstance) {
                    this._graphVizView.deleteObject(this._components[childId].componentInstance, this._components[objectId].componentInstance);
                    delete this._components[childId];
                }
            }

            //Handle children addition
            childrenDiff = util.arrayMinus(newChildren, oldChildren);
            for (i = 0; i < childrenDiff.length; i += 1) {
                childId = childrenDiff[i];

                //assume that the child is not yet loaded on the client
                this._components[childId] = {   "componentInstance": null,
                    "state" : this._componentStates.loading,
                    "children": [] };

                this._createObject(childId);
            }

            //finally store the actual children info for the parent
            this._components[objectId].children = newChildren;

            this._graphVizView.updateObject(this._components[objectId].componentInstance, this._getObjectDescriptor(updatedObject));
        }
    };

    GraphVizControl.prototype._onUnload = function (objectId) {
        //self or child unloaded
        //we care about self unload only, since child unload pretty much handled by self update (child added / child removed)
        //this._logger.warning("_onUnload NOT YET IMPLEMENTED - '" + objectId + "'");
    };

    GraphVizControl.prototype._onCreatePointer = function (sourceId, targetId, pointerName) {
        this._client.makePointer(sourceId, pointerName, targetId);
    };

    GraphVizControl.prototype._onDeletePointer = function (sourceId, pointerName) {
        this._client.delPointer(sourceId, pointerName);
    };

    //TODO: check this here...
    GraphVizControl.prototype.destroy = function () {
        this._client.removeUI(this._territoryId);
    };

    return GraphVizControl;
});
