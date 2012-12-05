"use strict";

define(['logManager',
    'clientUtil',
    'nodeAttributeNames',
    'nodeRegistryNames'], function (logManager,
                             util,
                             nodeAttributeNames,
                             nodeRegistryNames) {

    var PartBrowserControl;

    PartBrowserControl = function (myClient, myPartBrowserView) {
        var self = this;

        this._client = myClient;
        this._partBrowserView = myPartBrowserView;

        this._logger = logManager.create("PartBrowserControl");
        this._logger.debug("Created");
    };

    PartBrowserControl.prototype.selectedObjectChanged = function (nodeId) {
        var desc = this._getObjectDescriptor(nodeId),
            node = this._client.getNode(nodeId),
            childrenTypes = node ? node.getValidChildrenTypes() : [],
            num = childrenTypes ? childrenTypes.length : 0;

        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //delete everything from model editor
        this._partBrowserView.clear();

        //TODO: replace with real query of available components for this node
        if (nodeId) {
            while (--num >= 0) {
                this._partBrowserView.addPart(this._getObjectDescriptor(childrenTypes[num]));
            }
        }
    };

    PartBrowserControl.prototype._getObjectDescriptor = function (nodeId) {
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



    return PartBrowserControl;
});