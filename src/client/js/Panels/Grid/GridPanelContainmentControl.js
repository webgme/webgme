/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/util',
    'js/Constants',
    'js/Panels/Grid/GridPanelContainmentControl.DataGridWidgetEventHandlers'
], function (Logger,
             util,
             CONSTANTS,
             GridPanelContainmentControlDataGridWidgetEventHandlers) {

    'use strict';

    var GridPanelContainmentControl;

    GridPanelContainmentControl = function (options) {
        this._client = options.client;
        this._panel = options.panel;
        this._dataGridWidget = options.widget;

        this._dataGridWidget.setNoWrapColumns(['ID', 'GUID']);

        this._currentNodeId = null;

        this._logger = Logger.create('gme:Panels:Grid:GridPanelContainmentControl', WebGMEGlobal.gmeConfig.client.log);

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDataGridWidgetEventHandlers();

        this._logger.debug('Created');
    };

    GridPanelContainmentControl.prototype.selectedObjectChanged = function (nodeId) {
        var self = this,
            desc,
            title;

        this._logger.debug('activeObject "' + nodeId + '"');

        //remove current territory patterns
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._dataGridWidget.clear();
        }

        this._currentNodeId = nodeId;

        if (this._currentNodeId || this._currentNodeId === CONSTANTS.PROJECT_ROOT_ID) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = {children: 1};

            desc = this._discoverNode(nodeId);
            title = (desc.Attributes && desc.Attributes.name ? desc.Attributes.name + ' ' : 'N/A ') + '(' +
                        desc.ID + ')';
            this._panel.setTitle(title);

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    GridPanelContainmentControl.prototype.destroy = function () {
        this.detachClientEventListeners();
        this._client.removeUI(this._territoryId);
    };

    GridPanelContainmentControl.prototype._eventCallback = function (events) {
        var i = events ? events.length : 0,
            e;

        this._logger.debug('_eventCallback "' + i + '" items');

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
                default:
                    break;
            }
        }

        this._dataGridWidget.insertObjects(this._insertList);
        this._dataGridWidget.updateObjects(this._updateList);
        this._dataGridWidget.deleteObjects(this._deleteList);

        this._logger.debug('_eventCallback "' + events.length + '" items - DONE');
    };

    // PUBLIC METHODS
    GridPanelContainmentControl.prototype._onLoad = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._insertList.push(desc);
    };

    GridPanelContainmentControl.prototype._onUpdate = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._updateList.push(desc);
    };

    GridPanelContainmentControl.prototype._onUnload = function (gmeID) {
        this._deleteList.push(gmeID);
    };

    GridPanelContainmentControl.prototype._discoverNode = function (gmeID) {
        var nodeDescriptor = {
                ID: undefined,
                GUID: undefined,
                ParentID: undefined,
                Attributes: undefined,
                Registry: undefined,
                Pointers: undefined
            },

            cNode = this._client.getNode(gmeID),
            _getNodePropertyValues,
            _getPointerInfo;

        _getNodePropertyValues = function (node, propNameFn, propValueFn) {
            var result = {},
                attrNames = node[propNameFn](),
                len = attrNames.length;

            while (--len >= 0) {
                result[attrNames[len]] = node[propValueFn](attrNames[len]);
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
            nodeDescriptor.GUID = cNode.getGuid();
            nodeDescriptor.ParentID = cNode.getParentId();

            nodeDescriptor.Attributes = _getNodePropertyValues(cNode, 'getAttributeNames', 'getAttribute');
            nodeDescriptor.Registry = _getNodePropertyValues(cNode, 'getRegistryNames', 'getRegistry');
            nodeDescriptor.Pointers = _getPointerInfo(cNode);
        }

        return nodeDescriptor;
    };

    GridPanelContainmentControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    GridPanelContainmentControl.prototype.attachClientEventListeners = function () {
        this.detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    GridPanelContainmentControl.prototype.detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    //attach GridPanelContainmentControl - DataGridViewEventHandlers event handler functions
    _.extend(GridPanelContainmentControl.prototype, GridPanelContainmentControlDataGridWidgetEventHandlers.prototype);

    return GridPanelContainmentControl;
});