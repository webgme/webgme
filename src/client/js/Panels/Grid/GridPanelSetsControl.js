/*globals define, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/util',
    'js/Constants',
    'js/NodePropertyNames'
], function (Logger,
             util,
             CONSTANTS,
             nodePropertyNames) {

    'use strict';

    var GridPanelSetsControl;

    GridPanelSetsControl = function (options) {
        this._client = options.client;
        this._panel = options.panel;
        this._dataGridWidget = options.widget;

        this._dataGridWidget._rowDelete = false;
        this._dataGridWidget._rowEdit = false;

        this._setContainerID = null;

        this._logger = Logger.create('gme:Panels:Grid:GridPanelSetsControl', WebGMEGlobal.gmeConfig.client.log);

        this._logger.debug('Created');
    };

    GridPanelSetsControl.prototype.selectedObjectChanged = function (nodeId) {
        var self = this;

        this._logger.debug('activeObject nodeId "' + nodeId + '"');

        //remove current territory patterns
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
            this._dataGridWidget.clear();
        }

        this._setContainerID = nodeId;

        if (this._setContainerID || this._setContainerID === CONSTANTS.PROJECT_ROOT_ID) {
            //put new node's info into territory rules
            this._selfPatterns = {};
            this._selfPatterns[nodeId] = {children: 0};

            this._territoryId = this._client.addUI(this, function (/* events */) {
                self._processSetContainer();
            });
            //update the territory
            this._client.updateTerritory(this._territoryId, this._selfPatterns);
        }
    };

    GridPanelSetsControl.prototype.destroy = function () {
        this.detachClientEventListeners();
        this._client.removeUI(this._territoryId);
    };

    GridPanelSetsControl.prototype._processSetContainer = function () {
        var setContainer = this._client.getNode(this._setContainerID),
            setDescriptor,
            setNames,
            i,
            setName,
            setMembers,
            j,
            memberRegistryNames,
            k,
            title = ' (' + this._setContainerID + ')',
            setMemberRegName,
            keyValue;

        this._dataGridWidget.clear();

        this._insertList = [];

        if (setContainer) {
            title = (setContainer.getAttribute(nodePropertyNames.Attributes.name) || 'N/A') + title;
            //get set names
            //get set members
            //get set registries

            setNames = setContainer.getSetNames();

            i = setNames.length;
            while (i--) {
                setName = setNames[i];
                setMembers = setContainer.getMemberIds(setName);

                //fill set names and member list
                setDescriptor = {
                    ID: setName,
                    Members: setMembers
                };

                j = setMembers.length;
                while (j--) {
                    //get set registry
                    memberRegistryNames = setContainer.getMemberRegistryNames(setName, setMembers[j]);
                    k = memberRegistryNames.length;
                    while (k--) {
                        setMemberRegName = /*set + '_' + */memberRegistryNames[k];
                        setDescriptor[setMemberRegName] = setDescriptor[setMemberRegName] || [];
                        keyValue = setMembers[j] + ': ' + JSON.stringify(setContainer.getMemberRegistry(setName,
                                setMembers[j],
                                memberRegistryNames[k]));
                        setDescriptor[setMemberRegName].push(keyValue);
                    }
                }

                this._insertList.push(setDescriptor);
            }


            this._dataGridWidget.insertObjects(this._insertList);
        }

        this._panel.setTitle(title);
    };

    GridPanelSetsControl.prototype._stateActiveObjectChanged = function (model, activeObjectId) {
        this.selectedObjectChanged(activeObjectId);
    };

    GridPanelSetsControl.prototype.attachClientEventListeners = function () {
        this.detachClientEventListeners();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged, this);
    };

    GridPanelSetsControl.prototype.detachClientEventListeners = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._stateActiveObjectChanged);
    };

    return GridPanelSetsControl;
});