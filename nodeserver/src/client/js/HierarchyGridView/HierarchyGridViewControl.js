"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/HierarchyGridView/HierarchyGridViewControl.DataGridViewEventHandlers'], function (logManager,
                                    util,
                                    CONSTANTS,
                                    HierarchyGridViewControlDataGridViewEventHandlers) {

    var HierarchyGridViewControl;

    HierarchyGridViewControl = function (options) {
        this._client = options.client;
        this._myHierarchyGridView = options.widget;

        this._currentNodeId = null;

        this._logger = logManager.create("HierarchyGridViewControl");

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDataGridViewEventHandlers();

        this._logger.debug("Created");
    };

    HierarchyGridViewControl.prototype.selectedObjectChanged = function (nodeId) {
        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //remove current territory patterns
        if (this._currentNodeId) {
            this._client.removeUI(this._territoryId);
            this._myHierarchyGridView.clear();
        }

        this._currentNodeId = nodeId;

        if (this._currentNodeId) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this._displayedParts = {};

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    HierarchyGridViewControl.prototype.onOneEvent = function (events) {
        var i = events ? events.length : 0,
            e;

        this._logger.debug("onOneEvent '" + i + "' items");

        this._insertList = [];
        this._updateList = [];
        this._deleteList = [];

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

        this._myHierarchyGridView.insertObjects(this._insertList);
        this._myHierarchyGridView.updateObjects(this._updateList);
        this._myHierarchyGridView.deleteObjects(this._deleteList);

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    // PUBLIC METHODS
    HierarchyGridViewControl.prototype._onLoad = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._insertList.push(desc);
    };

    HierarchyGridViewControl.prototype._onUpdate = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._updateList.push(desc);
    };

    HierarchyGridViewControl.prototype._onUnload = function (gmeID) {
        this._deleteList.push(gmeID);
    };

    HierarchyGridViewControl.prototype._discoverNode = function (gmeID) {
            var nodeDescriptor = {"ID": undefined,
                                  "ParentID": undefined,
                                  "Attributes": undefined,
                                  "Registry": undefined,
                                  "Sets": undefined,
                                  "Pointers": undefined},

                cNode = this._client.getNode(gmeID),
                _getNodePropertyValues,
                _getSetMembershipInfo,
                _getPointerInfo;

            _getNodePropertyValues = function (node, propNameFn, propValueFn) {
                var result =  {},
                    attrNames = node[propNameFn](),
                    len = attrNames.length;

                while (--len >= 0) {
                    result[attrNames[len]] = node[propValueFn](attrNames[len]);
                }

                return result;
            };

            _getSetMembershipInfo = function (node) {
                var result = {},
                    availableSets = node.getSetNames(),
                    len = availableSets.length;

                while (len--) {
                    result[availableSets[len]] = node.getMemberIds(availableSets[len]);
                }

                return result;
            };

            _getPointerInfo = function (node) {
                var result = {},
                    availablePointers = node.getPointerNames(),
                    len = availablePointers.length;

                while (len--) {
                    result[availablePointers[len]] = node.getPointer(availablePointers[len]);
                }

                return result;
            };

            if (cNode) {
                nodeDescriptor.ID = gmeID;
                nodeDescriptor.ParentID = cNode.getParentId();

                nodeDescriptor.Attributes = _getNodePropertyValues(cNode, "getAttributeNames", "getAttribute");
                nodeDescriptor.Registry = _getNodePropertyValues(cNode, "getRegistryNames", "getRegistry");
                nodeDescriptor.Sets = _getSetMembershipInfo(cNode);
                nodeDescriptor.Pointers = _getPointerInfo(cNode);
            }

            return nodeDescriptor;
    };

    //attach HierarchyGridViewControl - DataGridViewEventHandlers event handler functions
    _.extend(HierarchyGridViewControl.prototype, HierarchyGridViewControlDataGridViewEventHandlers.prototype);

    return HierarchyGridViewControl;
});