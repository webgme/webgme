"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'js/NodePropertyNames'], function (logManager,
                                    util,
                                    commonUtil,
                                    CONSTANTS,
                                    nodePropertyNames) {

    var SetEditorControl;

    SetEditorControl = function (myClient, mySetEditorView) {
        var self = this;

        this._client = myClient;
        this._setEditorView = mySetEditorView;

        this._currentNodeId = null;

        this._setEditorView.onSetMemberAdd = function (params) {
            if (self._currentNodeId) {
                self._client.addMember(self._currentNodeId, params.id, params.setId);
            }
        };

        this._setEditorView.onSetMemberRemove = function (params) {
            if (self._currentNodeId) {
                self._client.removeMember(self._currentNodeId, params.id, params.setId);
            }
        };

        this._setEditorView.onRefresh = function () {
            if (self._currentNodeId) {
                self._refreshSetMember(self._currentNodeId);
            }
        };

        this._logger = logManager.create("SetEditorControl");
        this._logger.debug("Created");
    };

    SetEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc;

        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //remove current territory patterns
        if (this._currentNodeId) {
            this._client.removeUI(this._territoryId);
            this._setEditorView.setTitle("");
            this._setEditorView.clear();
        }

        this._currentNodeId = nodeId;

        if (this._currentNodeId) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 0 };

            this._setItems = {};

            desc = this._getObjectDescriptor(this._currentNodeId);

            this._setEditorView.setTitle(desc.name);

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    SetEditorControl.prototype.onOneEvent = function (events) {
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
    SetEditorControl.prototype._onLoad = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshSetMember(gmeID);
        }
    };

    SetEditorControl.prototype._onUpdate = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshSetMember(gmeID);
        }
    };

    SetEditorControl.prototype._onUnload = function (gmeID) {
        if (this._currentNodeId === gmeID) {
            this._refreshSetMember(gmeID);
        }
    };

    SetEditorControl.prototype._refreshSetMember = function (gmeID) {
        var setNames = commonUtil.validSetNames,
            num = setNames.length,
            nodeObj = this._client.getNode(gmeID),
            node = this._currentNodeId ? this._client.getNode(this._currentNodeId) : null,
            len,
            oldMembers,
            currentMembers,
            diff,
            idx,
            id;

        if (nodeObj) {
            while (num--) {
                if (!this._setItems[setNames[num]]) {
                    this._setEditorView.addSet({"id": setNames[num],
                        "name": setNames[num]});

                    this._setItems[setNames[num]] = [];
                }

                oldMembers = this._setItems[setNames[num]];

                currentMembers = node.getMemberIds(setNames[num]) || [];

                //check the deleted ones
                diff = _.difference(oldMembers, currentMembers);
                len = diff.length;
                while (len--) {
                    id = diff[len];
                    this._setEditorView.removeSetMember(setNames[num], id);
                    idx = this._setItems[setNames[num]].indexOf(id);
                    this._setItems[setNames[num]].splice(idx, 1);
                }

                //check the added ones
                diff = _.difference(currentMembers, oldMembers);
                len = diff.length;
                while (len--) {
                    id = diff[len];
                    this._setEditorView.addSetMember(setNames[num], this._getObjectDescriptor(id));
                    this._setItems[setNames[num]].push(id);
                }
            }
        }
    };

    SetEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId().toString();
            objDescriptor.name =  nodeObj.getAttribute(nodePropertyNames.Attributes.name);
        }

        return objDescriptor;
    };

    return SetEditorControl;
});