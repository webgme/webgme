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
        'js/Panels/MetaEditor/MetaEditorConstants'], function (_jquery,
                                    _underscore,
                                    CONSTANTS,
                                    nodePropertyNames,
                                    logManager,
                                    MetaEditorConstants) {

    var METAKey = "META",
        META_RULES_CONTAINER_NODE_ID = CONSTANTS.PROJECT_ROOT_ID,
        META_EDITOR_REGISTRY_KEY = MetaEditorConstants.META_EDITOR_REGISTRY_KEY,
        _client,
        _territoryId,
        _territoryUI,
        TerritoryUI,
        _metaMembers,
        _patterns = {},
        _logger = logManager.create("METATypeHelper"),
        _btnMETA;

    TerritoryUI = function () {
    };

    TerritoryUI.prototype.onOneEvent = function (/*events*/) {
        _processMetaContainer();
    };

    var _reset = function () {
        WebGMEGlobal[METAKey] = undefined;

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
        WebGMEGlobal[METAKey] = undefined;

        if (metaContainer) {
            //read the META rules out of the META container and generate
            var metaContainerRegistry = metaContainer.getRegistry(META_EDITOR_REGISTRY_KEY),
                diff,
                territoryChanged = false,
                len,
                nodeID,
                nodeName;

            if (metaContainerRegistry && metaContainerRegistry.Members) {
                var members = metaContainerRegistry.Members;

                //check deleted nodes
                diff = _.difference(_metaMembers, members);
                len = diff.length;
                while (len--) {
                    if (diff[len] !== META_RULES_CONTAINER_NODE_ID) {
                        delete _patterns[diff[len]];
                        territoryChanged = true;
                    }
                }

                //check added nodes
                diff = _.difference(members, _metaMembers);
                len = diff.length;
                while (len--) {
                    if (diff[len] !== META_RULES_CONTAINER_NODE_ID) {
                        _patterns[diff[len]] = { "children": 0 };
                        territoryChanged = true;
                    }
                }

                //save the new contained nodes
                _metaMembers = members.slice(0);

                WebGMEGlobal[METAKey] = {};

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
                            if (WebGMEGlobal[METAKey].hasOwnProperty(nodeName)) {
                                _logger.error('Duplicate name on META level: "' + nodeName + '"');
                                delete WebGMEGlobal[METAKey][nodeName];
                            } else {
                                WebGMEGlobal[METAKey][nodeName] = nodeID;
                            }
                        }
                    }
                }

                //_logger.warning('WebGMEGlobal_META: \n' + JSON.stringify(WebGMEGlobal[METAKey]));

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
                        alert('META entries: \n' + JSON.stringify(WebGMEGlobal[METAKey], undefined, 2));
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

    //return utility functions
    return { initialize: _initialize,
            METAKey: METAKey,
            isMETAType: _isMETAType};
});