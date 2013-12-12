/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['jquery',
        'underscore',
        'js/Constants',
        'js/NodePropertyNames',
        'logManager',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'eventDispatcher',
        'text!./METATemplate.js'], function (_jquery,
                                    _underscore,
                                    CONSTANTS,
                                    nodePropertyNames,
                                    logManager,
                                    MetaEditorConstants,
                                    EventDispatcher,
                                    METATemplateJS) {

    var META_RULES_CONTAINER_NODE_ID = MetaEditorConstants.META_ASPECT_CONTAINER_ID,
        _client,
        _territoryId,
        _territoryUI,
        TerritoryUI,
        _metaMembers,
        _patterns = {},
        _logger = logManager.create("METAAspectHelper"),
        _btnMETA,
        _events = {'META_ASPECT_CHANGED': 'META_ASPECT_CHANGED'},
        _metaTypes;

    TerritoryUI = function () {
        $.extend(this, new EventDispatcher());
    };

    TerritoryUI.prototype.onOneEvent = function (/*events*/) {
        _processMetaContainer();

        this.dispatchEvent(_events.META_ASPECT_CHANGED);
    };

    var _reset = function () {
        _metaTypes = {};

        if (_territoryId) {
            _client.removeUI(_territoryId);
        }

        //there is an open project
        if (_client.getActiveProject()) {
            _territoryId = _client.addUI(_territoryUI, true);

            _patterns = {};
            _metaMembers = [];
            _patterns[META_RULES_CONTAINER_NODE_ID] = { "children": 0 };

            setTimeout(function (){
                _client.updateTerritory(_territoryId, _patterns);
            }, 100);

        }
    };

    var _metaFriendlyName = function (name) {
        var ret = name,
            re,
            i;

        // Not allowed characters to replace.
        var input = "áéíóöőúüűÁÉÍÓÖŐÚÜŰ ";

        // Safe characters to replace to.
        var output = "aeiooouuuAEIOOOUUU_";

        // allowed characters
        var allowed = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789_';

        i = input.length;
        while (i--) {
            re = new RegExp(input[i], "g");
            ret = ret.replace(re, output[i]);
        }

        i = ret.length;
        while (i--) {
            if (allowed.indexOf(ret[i]) === -1) {
                ret.splice(i, 1);
            }
        }

        return ret;
    };

    var _processMetaContainer = function () {
        var metaContainer = _client.getNode(META_RULES_CONTAINER_NODE_ID);

        //reset META info container
        _metaTypes = {};

        if (metaContainer) {
            //read the META rules out of the META container and generate
            var metaAspectSetMembers = metaContainer.getMemberIds(MetaEditorConstants.META_ASPECT_SET_NAME),
                diff,
                territoryChanged = false,
                len,
                nodeID,
                nodeName;

            if (metaAspectSetMembers && metaAspectSetMembers.length > 0) {
                //check deleted nodes
                diff = _.difference(_metaMembers, metaAspectSetMembers);
                len = diff.length;
                while (len--) {
                    if (diff[len] !== META_RULES_CONTAINER_NODE_ID) {
                        delete _patterns[diff[len]];
                        territoryChanged = true;
                    }
                }

                //check added nodes
                diff = _.difference(metaAspectSetMembers, _metaMembers);
                len = diff.length;
                while (len--) {
                    if (diff[len] !== META_RULES_CONTAINER_NODE_ID) {
                        _patterns[diff[len]] = { "children": 0 };
                        territoryChanged = true;
                    }
                }

                //save the new contained nodes
                _metaMembers = metaAspectSetMembers.slice(0);

                _metaTypes = {};

                //generate the ID - TYPE mapping
                len = _metaMembers.length;
                while (len--) {
                    nodeID = _metaMembers[len];
                    var metaMemberNode = _client.getNode(nodeID);

                    if (metaMemberNode) {
                        nodeName = _metaFriendlyName(metaMemberNode.getAttribute(nodePropertyNames.Attributes.name));

                        if (nodeName === undefined || nodeName === null || nodeName === "") {
                            _logger.error('META item "' + nodeID + '" has an invalid name of: ' + nodeName);
                        } else {
                            if (_metaTypes.hasOwnProperty(nodeName)) {
                                _logger.error('Duplicate name on META level: "' + nodeName + '"');
                                delete _metaTypes[nodeName];
                            } else {
                                _metaTypes[nodeName] = nodeID;
                            }
                        }
                    }
                }

                _logger.debug('_metaTypes: \n' + JSON.stringify(_metaTypes));

                //there was change in the territory
                if (territoryChanged === true) {
                    setTimeout(function (){
                        _client.updateTerritory(_territoryId, _patterns);
                    }, 10);
                }
            }
        }

        if (!_btnMETA && DEBUG) {
            if (WebGMEGlobal.Toolbar) {
                _btnMETA = WebGMEGlobal.Toolbar.addButton({ "title": "Display META entries...",
                    "icon": "icon-barcode",
                    "clickFn": function (/*data*/) {
                        alert('META entries: \n' + JSON.stringify(_getMETAAspectTypesSorted(), undefined, 2));
                    }});

                WebGMEGlobal.Toolbar.addButton({ "title": "Download Domain's META...",
                    "icon": "icon-file",
                    "clickFn": function (/*data*/) {
                        _downloadMETA();
                    }});
            }
        }

    };

    var _initialize = function (c) {
        //if already initialized, just return
        if (_client) {
            return;
        }
        _client = c;

        _client.addEventListener(_client.events.PROJECT_OPENED, function (/*__project, projectName*/) {
            _reset();
        });

        _client.addEventListener(_client.events.PROJECT_CLOSED, function (/*__project*/) {
            _reset();
        });

        _client.addEventListener(_client.events.BRANCH_CHANGED, function (/*__project, branch*/) {
            _reset();
        });

        _territoryUI = new TerritoryUI();
        _initialize = undefined;
    };

    var _isMETAType = function (objID, metaTypeID) {
        var result = false;

        if (objID && metaTypeID) {
            result = _client.isTypeOf(objID, metaTypeID);
        }

        return result;
    };

    var _getMetaAspectMembers = function () {
        var members = [];

        for (var m in _metaTypes) {
            if (_metaTypes.hasOwnProperty(m)) {
                members.push(_metaTypes[m]);
            }
        }

        return members;
    };

    var _addEventListener = function (event, callback) {
        if (_territoryUI) {
            _territoryUI.addEventListener(event, callback);
        }
    };

    var _removeEventListener = function (event, callback) {
        if (_territoryUI) {
            _territoryUI.removeEventListener(event, callback);
        }
    };

    var _getMETAAspectTypes = function () {
        var result = {};
        _.extend(result, _metaTypes);

        return result;
    };

    var _getMETAAspectTypesSorted = function () {
        var result = {},
            typeNames = [],
            m;

        for (m in _metaTypes) {
            if (_metaTypes.hasOwnProperty(m)) {
                typeNames.push(m);
            }
        }

        typeNames.sort();

        for (m = 0; m < typeNames.length; m += 1) {
            result[typeNames[m]] = _metaTypes[typeNames[m]];
        }

        return result;
    };

    /*
    Returns the parent meta types of the given object ID in the order of inheritance.
     */
    var _getMETATypesOf = function (objID) {
        var result = [];

        for (var m in _metaTypes) {
            if (_metaTypes.hasOwnProperty(m)) {
                if (_isMETAType(objID, _metaTypes[m])) {
                    result.push(m);
                }
            }
        }

        // sort based on metatypes inheritance
        result.sort(function(a, b) {
            return  _isMETAType(_metaTypes[a], _metaTypes[b]) ? -1 : 1;
        });

        return result;
    };


    var _downloadMETA = function () {
        if (!_.isEmpty(_metaTypes)) {
            var projName = _client.getActiveProject();
            var fileName = projName + ".META.js";
            var content = METATemplateJS;
            var regExpPROJ = /__PROJECT__/g;
            var regExpMETAASPECTTYPES = /__META_ASPECT_TYPES__/g;

            content = content.replace(regExpPROJ, projName);
            content = content.replace(regExpMETAASPECTTYPES, JSON.stringify(_getMETAAspectTypesSorted(), undefined, 2));

            var pom = document.createElement('a');
            pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
            pom.setAttribute('download', fileName);
            pom.click();
        }
    };


    //return utility functions
    return { initialize: _initialize,
            isMETAType: _isMETAType,
            getMetaAspectMembers: _getMetaAspectMembers,
            events: _events,
            addEventListener: _addEventListener,
            removeEventListener: _removeEventListener,
            getMETAAspectTypes: _getMETAAspectTypes,
            getMETATypesOf: _getMETATypesOf
        };
});