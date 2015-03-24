/*globals define, _, requirejs, WebGMEGlobal*/

define(['jquery',
        'underscore',
        'js/Constants',
        'js/NodePropertyNames',
        'common/LogManager',
        'js/Panels/MetaEditor/MetaEditorConstants',
        'common/EventDispatcher',
        'text!./METATemplate.js'], function (_jquery,
                                    _underscore,
                                    CONSTANTS,
                                    nodePropertyNames,
                                    logManager,
                                    MetaEditorConstants,
                                    EventDispatcher,
                                    METATemplateJS) {

    "use strict";

    var META_RULES_CONTAINER_NODE_ID = MetaEditorConstants.META_ASPECT_CONTAINER_ID,
        _client,
        _territoryId,
        _territoryUI,
        TerritoryUI,
        _metaMembers,
        _patterns = {},
        _logger = logManager.create("METAAspectHelper"),
        _events = {'META_ASPECT_CHANGED': 'META_ASPECT_CHANGED'},
        _metaTypes;

    TerritoryUI = function () {
        $.extend(this, new EventDispatcher());
    };

    var _reset = function () {
        _metaTypes = {};

        if (_territoryId) {
            _client.removeUI(_territoryId);
        }

        //there is an open project
        if (_client.getActiveProjectName()) {
            _territoryId = _client.addUI(_territoryUI, function (/*events*/) {
                _processMetaContainer();
                _territoryUI.dispatchEvent(_events.META_ASPECT_CHANGED);
            });

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
                ret = ret.substr(0, i) + ret.substr(i + 1);
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


    var _generateMETAAspectJavaScript = function () {
        var result = {};

        if (!_.isEmpty(_metaTypes)) {
            var projName = _client.getActiveProjectName();
            var content = METATemplateJS;
            var sortedMetaTypes = _getMETAAspectTypesSorted();
            var typeCheckMethodTemplate = 'var _is__METATYPE__ = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.__METATYPE__); };';
            var typeCheckMethods = '';
            var typeCheckMethodsMap = [];
            var typeCheckMethodNamePrefix = 'is';
            var typeCheckMethodsMapIndent = '\t\t\t';
            var metaAspectTypesMap = [];

            //generate each type checker method
            /*
             var _isXXX = function (objID) {
                return METAAspectHelper.isMETAType(objID, _metaTypes.XXX);
             };
             */
            for (var t in sortedMetaTypes) {
                if (sortedMetaTypes.hasOwnProperty(t)) {
                    typeCheckMethods += typeCheckMethodTemplate.replace(/__METATYPE__/g, t) + '\n\t';
                    typeCheckMethodsMap.push(typeCheckMethodNamePrefix + t + ": _" + typeCheckMethodNamePrefix + t);
                    metaAspectTypesMap.push('\'' + t + '\'' + ': ' + '\'' + sortedMetaTypes[t] + '\'');
                }
            }

            content = content.replace( /__PROJECT__/g, projName);
            content = content.replace(/__META_ASPECT_TYPES__/g, '{\n\t\t' + metaAspectTypesMap.join(',\n\t\t') + '\n\t}');
            content = content.replace(/__META_ASPECT_TYPE_CHECKING__/g, typeCheckMethods);
            content = content.replace(/__TYPE_CHECK_METHOD_MAP__/g, '{\n' + typeCheckMethodsMapIndent + typeCheckMethodsMap.join(',\n' + typeCheckMethodsMapIndent) + '\n\t\t}');

            result.fileName = projName + ".META.js";
            result.content = content;
        }

        return result;
    };


    //return utility functions
    return { initialize: _initialize,
            isMETAType: _isMETAType,
            getMetaAspectMembers: _getMetaAspectMembers,
            events: _events,
            addEventListener: _addEventListener,
            removeEventListener: _removeEventListener,
            getMETAAspectTypes: _getMETAAspectTypes,
            getMETAAspectTypesSorted: _getMETAAspectTypesSorted,
            getMETATypesOf: _getMETATypesOf,
            generateMETAAspectJavaScript: _generateMETAAspectJavaScript
        };
});