/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/Constants',
    'js/Utils/GMEConcepts',
    'js/NodePropertyNames',
    'js/RegistryKeys',
    'js/Utils/PreferencesHelper'
], function (Logger,
             CONSTANTS,
             GMEConcepts,
             nodePropertyNames,
             REGISTRY_KEYS,
             PreferencesHelper) {
    'use strict';

    var PartBrowserControl,
        WIDGET_NAME = 'PartBrowser',
        DEFAULT_DECORATOR = 'ModelDecorator';

    PartBrowserControl = function (myClient, myPartBrowserView) {
        var self = this;

        this._client = myClient;
        this._partBrowserView = myPartBrowserView;

        //the ID of the node whose valid children types should be displayed
        this._containerNodeId = WebGMEGlobal.State.getActiveObject() || null;

        //decorators can use it to ask for notifications about their registered sub IDs
        this._componentIDPartIDMap = {};

        //stores the last known active aspect so that we can decide if it is reall
        this._aspect = null;

        //stores the GUID of the UI piece which is the identification of the client communications
        this._guid = '_part_browser_';

        //collects information for all the part descriptors
        this._descriptorCollection = {};

        //the decorator instances of the parts
        this._partInstances = {};

        //the territory rules
        this._territoryRules = {'': {children: 0}};

        //the current visualizer
        this._visualizer = null;

        this._initDragDropFeatures();

        this._logger = Logger.create('gme:Panels:PartBrowser:PartBrowserPanelControl',
            WebGMEGlobal.gmeConfig.client.log);
        this._logger.debug('Created');

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function (model, activeObject) {
            self._containerNodeId = activeObject;
            self._updateDescriptor(self._getPartDescriptorCollection());
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_TAB, function (/*model, activeTabId*/) {
            var activeAspect = WebGMEGlobal.State.getActiveAspect();
            activeAspect = activeAspect === CONSTANTS.ASPECT_ALL ? null : activeAspect;
            if (self._aspect !== activeAspect) {
                self._aspect = activeAspect;
                self._updateDescriptor(self._getPartDescriptorCollection());
            }
            //else {
            //    if (self._visualizer === 'SetEditor') {
            //        //we have to react to all tab change...
            //        self._updateDescriptor(self._getPartDescriptorCollection());
            //    }
            //} //TODO right now we cannot create objects in setEditor so we do not need this functionality
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_VISUALIZER, function (model, activeVisualizer) {
            if (self._visualizer !== activeVisualizer) {
                self._visualizer = activeVisualizer;
                self._updateDescriptor(self._getPartDescriptorCollection());
            }
        });

        this._nodeEventHandling = function (events) {
            var metaChange = false,
                metaNodes = self._client.getAllMetaNodes() || [],
                metaPaths = [],
                i;

            for (i = 0; i < metaNodes.length; i += 1) {
                metaPaths.push(metaNodes[i].getId());
            }
            metaPaths.push(CONSTANTS.PROJECT_ROOT_ID);

            for (i = 0; i < events.length; i += 1) {
                if (metaPaths.indexOf(events[i].eid) !== -1) {
                    metaChange = true;
                    break;
                }
            }

            if (metaChange) {
                self._updateDescriptor(self._getPartDescriptorCollection());
            } else {
                self._updateDecorators();
            }

        };

        this._client.addUI(self, self._nodeEventHandling, this._guid);
        this._client.updateTerritory(this._guid, this._territoryRules);
    };

    PartBrowserControl.prototype._updateDescriptor = function (newDescriptor) {
        var keys = Object.keys(newDescriptor || {}).sort(),
            i,
            self = this,
            div,
            newTerritoryRules;

        //add and update
        for (i = 0; i < keys.length; i += 1) {
            if (!this._descriptorCollection[keys[i]]) {
                //new item
                this._partInstances[keys[i]] = this._partBrowserView.addPart(keys[i], newDescriptor[keys[i]]);
            } else if (this._descriptorCollection[keys[i]].decorator !== newDescriptor[keys[i]].decorator) {
                this._partInstances[keys[i]] = this._partBrowserView.updatePart(keys[i], newDescriptor[keys[i]]);
            }

            if (!this._descriptorCollection[keys[i]] ||
                (this._descriptorCollection[keys[i]].visibility !== newDescriptor[keys[i]].visibility)) {
                div = this._partBrowserView._getPartDiv(keys[i]);
                if (newDescriptor[keys[i]].visibility === 'hidden') {
                    div.hide();
                } else if (newDescriptor[keys[i]].visibility === 'visible') {
                    div.show();
                    this._partBrowserView.setEnabled(keys[i], true);
                } else {
                    div.show();
                    this._partBrowserView.setEnabled(keys[i], false);
                }
            }
        }

        //remove
        keys = Object.keys(this._descriptorCollection);

        for (i = 0; i < keys.length; i += 1) {
            if (!newDescriptor[keys[i]]) {
                this._partBrowserView.removePart(keys[i]);
                delete this._partInstances[keys[i]];
            }
        }

        this._descriptorCollection = newDescriptor;
        newTerritoryRules = this._getTerritoryPatterns();
        if (JSON.stringify(this._territoryRules) !== JSON.stringify(newTerritoryRules)) {
            this._territoryRules = newTerritoryRules;
            setTimeout(function () {
                self._client.updateTerritory(self._guid, self._territoryRules);
            }, 0);
        } else {
            this._updateDecorators();
        }
    };

    PartBrowserControl.prototype._getPartDescriptorCollection = function () {
        var containerNode = this._client.getNode(this._containerNodeId),
            metaNodes = this._client.getAllMetaNodes(),
            descriptorCollection = {},
            descriptor,
            validInfo,
            keys,
            i;
        //getSetName = function () {
        //    var setNamesOrdered = (containerNode.getSetNames() || []).sort(),
        //        tabId = WebGMEGlobal.State.getActiveTab();
        //
        //    if (tabId < setNamesOrdered.length) {
        //        return setNamesOrdered[tabId];
        //    }
        //
        //    return null;
        //}; not used yet

        for (i = 0; i < metaNodes.length; i += 1) {
            descriptor = this._getPartDescriptor(metaNodes[i].getId());
            if (descriptor) {
                descriptorCollection[metaNodes[i].getId()] = this._getPartDescriptor(metaNodes[i].getId());
                descriptorCollection[metaNodes[i].getId()].visibility = 'hidden';
            }
        }

        if (containerNode) {
            if (this._visualizer === 'GraphViz') {
                //do nothing as partBrowser should not have any element in GraphViz
                validInfo = {};
            } else if (this._visualizer === 'SetEditor') {
                //i = getSetName();
                //if (i) {
                //    validInfo = containerNode.getValidSetMemberTypesDetailed(i);
                //} else {
                //    validInfo = {};
                //} //TODO now we cannot create elements in set editor
                validInfo = {};
            } else if (this._visualizer === 'METAAspect') {
                //here we should override the container node to the META container node - ROOT as of now
                containerNode = this._client.getNode(CONSTANTS.PROJECT_ROOT_ID);
                validInfo = containerNode.getValidChildrenTypesDetailed();
            } else {
                //default is the containment based elements
                validInfo = containerNode.getValidChildrenTypesDetailed(this._aspect);
            }

            keys = Object.keys(validInfo);

            for (i = 0; i < keys.length; i += 1) {
                if (validInfo[keys[i]]) {
                    descriptorCollection[keys[i]].visibility = 'visible';
                } else {
                    descriptorCollection[keys[i]].visibility = 'grayed';
                }
            }
        }

        return descriptorCollection;
    };

    PartBrowserControl.prototype._getTerritoryPatterns = function () {
        var patterns = {'': {children: 0}},
            keys,
            query,
            i;

        if (this._containerNodeId) {
            patterns[this._containerNodeId] = {children: 0};

            keys = Object.keys(this._partInstances || {}).sort();
            for (i = 0; i < keys.length; i += 1) {
                if (this._partInstances[keys[i]]) {
                    //console.log(this._partInstances[keys[i]].getTerritoryQuery());
                    query = this._partInstances[keys[i]].getTerritoryQuery() || {};

                    if (query[keys[i]]) {
                        patterns[keys[i]] = query[keys[i]];
                    }
                }
            }
        }


        return patterns;
    };

    PartBrowserControl.prototype._getObjectDescriptor = function (nodeId) {
        var nodeObj = this._client.getNode(nodeId),
            objDescriptor;

        if (nodeObj) {
            objDescriptor = {};

            objDescriptor.id = nodeObj.getId();
            objDescriptor.decorator = nodeObj.getRegistry(REGISTRY_KEYS.DECORATOR) || DEFAULT_DECORATOR;
            objDescriptor.name = nodeObj.getAttribute(nodePropertyNames.Attributes.name);
        } else {
            this._logger.error('Node not loaded', nodeId);
        }

        return objDescriptor;
    };

    PartBrowserControl.prototype._getItemDecorator = function (decorator) {
        var result;

        result = this._client.decoratorManager.getDecoratorForWidget(decorator, WIDGET_NAME);
        if (!result) {
            result = this._client.decoratorManager.getDecoratorForWidget(DEFAULT_DECORATOR, WIDGET_NAME);
        }

        return result;
    };


    PartBrowserControl.prototype._getPartDescriptor = function (id) {
        var desc = this._getObjectDescriptor(id);

        if (desc) {
            desc.decoratorClass = this._getItemDecorator(desc.decorator);
            desc.control = this;
            desc.metaInfo = {};
            desc.metaInfo[CONSTANTS.GME_ID] = id;
            desc.preferencesHelper = PreferencesHelper.getPreferences();
            desc.aspect = this._aspect;
        }


        return desc;
    };

    PartBrowserControl.prototype.registerComponentIDForPartID = function (componentID, partId) {
        this._componentIDPartIDMap[componentID] = this._componentIDPartIDMap[componentID] || [];
        if (this._componentIDPartIDMap[componentID].indexOf(partId) === -1) {
            this._componentIDPartIDMap[componentID].push(partId);
        }
    };

    PartBrowserControl.prototype.unregisterComponentIDFromPartID = function (componentID, partId) {
        var idx;

        if (this._componentIDPartIDMap && this._componentIDPartIDMap[componentID]) {
            idx = this._componentIDPartIDMap[componentID].indexOf(partId);
            if (idx !== -1) {
                this._componentIDPartIDMap[componentID].splice(idx, 1);

                if (this._componentIDPartIDMap[componentID].length === 0) {
                    delete this._componentIDPartIDMap[componentID];
                }
            }
        }
    };


    PartBrowserControl.prototype._initDragDropFeatures = function () {
        var dragEffects = this._partBrowserView.DRAG_EFFECTS;

        this._partBrowserView.getDragEffects = function (/*el*/) {
            return [dragEffects.DRAG_CREATE_INSTANCE];
        };

        this._partBrowserView.getDragItems = function (el) {
            return [el.attr('id')];
        };
    };

    PartBrowserControl.prototype._updateDecorators = function () {
        var i,
            keys = Object.keys(this._partInstances || {});

        for (i = 0; i < keys.length; i += 1) {
            if (this._descriptorCollection[keys[i]] && this._descriptorCollection[keys[i]].visibility !== 'hidden') {
                this._partInstances[keys[i]].update();
            }
        }
    };

    return PartBrowserControl;
});