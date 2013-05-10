"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/NodePropertyNames'], function (logManager,
                             util,
                             CONSTANTS,
                             nodePropertyNames) {

    var PartBrowserControl,
        DECORATOR_PATH = "js/ModelEditor3/Decorators/";      //TODO: fix path;

    PartBrowserControl = function (myClient, myPartBrowserView) {
        this._client = myClient;
        this._partBrowserView = myPartBrowserView;

        this._currentNodeId = null;
        this._decoratorClasses = {};

        this._logger = logManager.create("PartBrowserControl");
        this._logger.debug("Created");
    };

    PartBrowserControl.prototype.selectedObjectChanged = function (nodeId) {
        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //remove current territory patterns
        if (this._currentNodeId) {
            this._client.removeUI(this._territoryId);
            this._partBrowserView.clear();
        }

        this._currentNodeId = nodeId;

        if (this._currentNodeId) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 0 };

            this._displayedParts = [];

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    PartBrowserControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name =  nodeObj.getAttribute(nodePropertyNames.Attributes.name);
            objDescriptor.kind = nodeObj.getBaseId();
            objDescriptor.decorator = nodeObj.getRegistry(nodePropertyNames.Registry.decorator) || "DefaultDecorator";
        }

        return objDescriptor;
    };

    PartBrowserControl.prototype._downloadDecorators = function (decoratorList, callBack) {
        var len = decoratorList.length,
            decoratorName,
            processRemainingList,
            self = this;

        processRemainingList = function () {
            var len = decoratorList.length;

            if (len > 0) {
                self._downloadDecorators(decoratorList, callBack);
            } else {
                self._logger.debug("All downloaded...");
                callBack.fn.call(callBack.context, callBack.data);
            }
        };

        this._logger.debug("Remaining: " + len);

        if (len > 0) {
            decoratorName = decoratorList.pop();

            require([DECORATOR_PATH + decoratorName + "/" + decoratorName],
                function (decoratorClass) {
                    self._logger.warning("downloaded:" + decoratorName);
                    self._decoratorClasses[decoratorName] = decoratorClass;
                    processRemainingList();
                },
                function (err) {
                    //for any error store undefined in the list and the default decorator will be used on the canvas
                    self._logger.error("Failed to load decorator because of '" + err.requireType + "' with module '" + err.requireModules[0] + "'. Fallback to default...");
                    self._decoratorClasses[decoratorName] = undefined;
                    processRemainingList();
                });
        }
    };

    PartBrowserControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0,
            e;

        this._logger.debug("onOneEvent '" + i + "' items");

        while (i--) {
            e = events[i];
            switch (e.etype) {
                case CONSTANTS.TERRITORY_EVENT_LOAD:
                    this._onLoad(e.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UPDATE:
                    this._onUpdate(e.eid);
                    break;
                case CONSTANTS.TERRITORY_EVENT_UNLOAD:
                    this._onUnload(e.eid);
                    break;
            }
        }

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    // PUBLIC METHODS
    PartBrowserControl.prototype._onLoad = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshParts(gmeID);
        }
    };

    PartBrowserControl.prototype._onUpdate = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshParts(gmeID);
        } else if (this._displayedParts.indexOf(gmeID) !== -1) {
            //update on one of the parts
            this._refreshOnePart(gmeID);
        }
    };

    PartBrowserControl.prototype._onUnload = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshParts(gmeID);
        }
    };

    PartBrowserControl.prototype._refreshParts = function (gmeID) {
        var node = this._client.getNode(gmeID),
            currentMembers = node ? node.getValidChildrenTypes() : [],
            oldMembers = this._displayedParts.slice(0),
            len,
            diff,
            idx,
            id,
            requiredDecorators = [],
            diffInserted;

        if (node) {

            //check the deleted ones
            diff = _.difference(oldMembers, currentMembers);
            len = diff.length;
            while (len--) {
                id = diff[len];
                this._partBrowserView.removePart(id);
                idx = this._displayedParts.indexOf(id);
                this._displayedParts.splice(idx, 1);

                //remove it from the territory
                delete this._selfPatterns[id];
            }

            //check the added ones
            diffInserted = _.difference(currentMembers, oldMembers);
            len = diffInserted.length;
            while (len--) {
                id = diffInserted[len];
                requiredDecorators.pushUnique(this._getObjectDescriptor(id).decorator);

                //add to the territory
                this._selfPatterns[id] = { "children": 0 };
            }

            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);

            //download the required decorators
            this._downloadDecorators(requiredDecorators, { "fn": this._refreshInsertedUpdatedParts,
                                                           "context": this,
                                                           "data": { "inserted": diffInserted,
                                                                     "updated": [] }});
        }
    };

    PartBrowserControl.prototype._refreshInsertedUpdatedParts = function (params) {
        var inserted = params.inserted,
            updated = params.updated,
            len,
            id,
            desc,
            decClass;

        len = inserted.length;
        while (len--) {
            id = inserted[len];
            desc = this._getObjectDescriptor(id);

            decClass = this._decoratorClasses[desc.decorator];

            desc.decoratorClass = decClass;
            desc.control = this;
            desc.metaInfo = {};
            desc.metaInfo[CONSTANTS.GME_ID] = id;

            this._partBrowserView.addPart(id, desc);
            this._displayedParts.push(id);
        }

        len = updated.length;
        while (len--) {
            id = updated[len];
            desc = this._getObjectDescriptor(id);

            decClass = this._decoratorClasses[desc.decorator];

            desc.decoratorClass = decClass;
            desc.control = this;
            desc.metaInfo = {};
            desc.metaInfo[CONSTANTS.GME_ID] = id;

            this._partBrowserView.updatePart(id, desc);
        }
    };

    PartBrowserControl.prototype._refreshOnePart = function (gmeID) {
        var decorator = this._getObjectDescriptor(gmeID).decorator;

        if (decorator !== null && decorator !== undefined) {
            this._downloadDecorators([decorator], { "fn": this._refreshInsertedUpdatedParts,
                "context": this,
                "data": { "inserted": [],
                    "updated": [gmeID] }});
        }
    };

    return PartBrowserControl;
});