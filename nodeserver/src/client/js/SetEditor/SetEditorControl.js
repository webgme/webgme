"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'nodeAttributeNames',
    'nodeRegistryNames'], function (logManager,
                                    util,
                                    commonUtil,
                                    nodeAttributeNames,
                                    nodeRegistryNames) {

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

        this._setEditorView.onGetSetMembers = function (setId) {
            return self._onGetSetMembers(setId);
        };

        this._logger = logManager.create("SetEditorControl");
        this._logger.debug("Created");
    };

    SetEditorControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            node = this._client.getNode(nodeId),
            setNames = commonUtil.validSetNames,
            num = setNames.length;

        this._currentNodeId = nodeId;

        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this._setEditorView.clear();

        while(--num >= 0) {
            this._setEditorView.addSet({"id": setNames[num],
                                        "name": setNames[num]});
        }
    };

    SetEditorControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.name =  nodeObj.getAttribute(nodeAttributeNames.name);
            objDescriptor.kind = nodeObj.getBaseId();
            objDescriptor.decorator = nodeObj.getRegistry(nodeRegistryNames.decorator) || "DefaultDecorator";
        }

        return objDescriptor;
    };

    SetEditorControl.prototype._onGetSetMembers = function (setId) {
        var result = [],
            node = this._currentNodeId ? this._client.getNode(this._currentNodeId) : null,
            setMemberIds,
            len;

        if (node) {
            setMemberIds = node.getMemberIds(setId);
            if (setMemberIds) {
                len = setMemberIds.length;
                while(--len >= 0) {
                    result.push(this._getObjectDescriptor(setMemberIds[len]));
                }
            }
        }

        return result;
    };



    return SetEditorControl;
});