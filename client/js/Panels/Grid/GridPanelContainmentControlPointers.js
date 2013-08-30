"use strict";

define(['logManager',
    'clientUtil',
    'js/Constants',
    'js/Panels/Grid/GridPanelContainmentControl.DataGridWidgetEventHandlers'], function (logManager,
                                    util,
                                    CONSTANTS,
                                    GridPanelContainmentControlDataGridWidgetEventHandlers) {

    var GridPanelContainmentControPointers;

    GridPanelContainmentControPointers = function (options) {
        var self = this;
        this._client = options.client;
        this._panel = options.panel;
        this._dataGridWidget = this._panel.widget;

        this._currentNodeId = null;

        this._logger = logManager.create("GridPanelContainmentControPointers");

        this._selectedObjectChanged = function (__project, nodeId) {
            self.selectedObjectChanged(nodeId);
        };
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDataGridWidgetEventHandlers();

        this._logger.debug("Created");
    };

    GridPanelContainmentControPointers.prototype.selectedObjectChanged = function (nodeId) {
        this._logger.debug("SELECTEDOBJECT_CHANGED nodeId '" + nodeId + "'");

        //remove current territory patterns
        if (this._currentNodeId) {
            this._client.removeUI(this._territoryId);
            this._dataGridWidget.clear();
        }

        this._currentNodeId = nodeId;

        if (this._currentNodeId) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = { "children": 1 };

            this._displayedParts = {};

            var desc = this._discoverNode(nodeId);
            var title = (desc.Attributes && desc.Attributes.name ? desc.Attributes.name + " " : "N/A ") + "(" + desc.ID + ")";
            this._panel.setTitle(title);

            this._territoryId = this._client.addUI(this, true);
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    GridPanelContainmentControPointers.prototype.destroy = function () {
        this._client.removeEventListener(this._client.events.SELECTEDOBJECT_CHANGED, this._selectedObjectChanged);
        this._client.removeUI(this._territoryId);
    };

    GridPanelContainmentControPointers.prototype.onOneEvent = function (events) {
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

        this._dataGridWidget.insertObjects(this._insertList);
        this._dataGridWidget.updateObjects(this._updateList);
        this._dataGridWidget.deleteObjects(this._deleteList);

        this._logger.debug("onOneEvent '" + events.length + "' items - DONE");
    };

    // PUBLIC METHODS
    GridPanelContainmentControPointers.prototype._onLoad = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._insertList.push(desc);
    };

    GridPanelContainmentControPointers.prototype._onUpdate = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._updateList.push(desc);
    };

    GridPanelContainmentControPointers.prototype._onUnload = function (gmeID) {
        this._deleteList.push(gmeID);
    };

    GridPanelContainmentControPointers.prototype._discoverNode = function (gmeID) {
            var nodeDescriptor = {"ID": undefined,
                                  "Attributes": undefined,
                                  "ParentID": undefined,
                                  "Registry": undefined,
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
                nodeDescriptor.Attributes = {'name': cNode.getAttribute('name')};

                //nodeDescriptor.Registry = _getNodePropertyValues(cNode, "getRegistryNames", "getRegistry");
                nodeDescriptor.Pointers = _getPointerInfo(cNode);
            }

            return nodeDescriptor;
    };

    //attach GridPanelContainmentControPointers - DataGridViewEventHandlers event handler functions
    _.extend(GridPanelContainmentControPointers.prototype, GridPanelContainmentControlDataGridWidgetEventHandlers.prototype);

    return GridPanelContainmentControPointers;
});