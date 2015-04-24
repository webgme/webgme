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

    var GridPanelContainmentControlPointers;

    GridPanelContainmentControlPointers = function (options) {
        this._client = options.client;
        this._panel = options.panel;
        this._dataGridWidget = options.widget;

        this._dataGridWidget._rowDelete = false;
        this._dataGridWidget._rowEdit = false;

        this._currentNodeId = null;

        this._logger = Logger.create('gme:Panels:Grid:GridPanelContainmentControlPointers',
            WebGMEGlobal.gmeConfig.client.log);

        //attach all the event handlers for event's coming from DesignerCanvas
        this.attachDataGridWidgetEventHandlers();

        this._logger.debug('Created');
    };

    GridPanelContainmentControlPointers.prototype.selectedObjectChanged = function (nodeId) {
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
            title = (desc.Name ? desc.Name + ' ' : 'N/A ') + '(' + desc.ID + ')';
            this._panel.setTitle(title);

            this._territoryId = this._client.addUI(this, function (events) {
                self._eventCallback(events);
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    GridPanelContainmentControlPointers.prototype.destroy = function () {
        this.detachClientEventListeners();
        this._client.removeUI(this._territoryId);
    };

    GridPanelContainmentControlPointers.prototype._eventCallback = function (events) {
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
    GridPanelContainmentControlPointers.prototype._onLoad = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._insertList.push(desc);
    };

    GridPanelContainmentControlPointers.prototype._onUpdate = function (gmeID) {
        var desc = this._discoverNode(gmeID);

        this._updateList.push(desc);
    };

    GridPanelContainmentControlPointers.prototype._onUnload = function (gmeID) {
        this._deleteList.push(gmeID);
    };

    GridPanelContainmentControlPointers.prototype._discoverNode = function (gmeID) {
        var nodeDescriptor = {
                ID: undefined,
                Name: undefined,
                ParentID: undefined,
                Pointers: undefined
            },

            cNode = this._client.getNode(gmeID),
            _getPointerInfo,
            ptr;

        _getPointerInfo = function (node) {
            var result = {},
                availablePointers = node.getPointerNames(),
                len = availablePointers.length;

            while (len--) {
                ptr = node.getPointer(availablePointers[len]);
                if (ptr) {
                    result[availablePointers[len]] = ptr.to;
                }
            }

            return result;
        };

        if (cNode) {
            nodeDescriptor.ID = gmeID;
            nodeDescriptor.Name = cNode.getAttribute('name');
            nodeDescriptor.ParentID = cNode.getParentId();
            nodeDescriptor.Pointers = _getPointerInfo(cNode);
        }

        return nodeDescriptor;
    };

    GridPanelContainmentControlPointers.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    GridPanelContainmentControlPointers.prototype.attachClientEventListeners = function () {
        this.detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    GridPanelContainmentControlPointers.prototype.detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    //attach GridPanelContainmentControlPointers - DataGridViewEventHandlers event handler functions
    _.extend(GridPanelContainmentControlPointers.prototype,
        GridPanelContainmentControlDataGridWidgetEventHandlers.prototype);

    return GridPanelContainmentControlPointers;
});