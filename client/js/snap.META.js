/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * AUTO GENERATED CODE FOR PROJECT snap
 */

"use strict";

define(['underscore',
        'js/Utils/METAAspectHelper'], function (_underscore,
                                                METAAspectHelper) {

    var _metaID = 'snap.META.js';

    //META ASPECT TYPES
    var _metaTypes = {
		'Add': '/-18',
		'Base': '/-2',
		'Binary_Operation': '/-17',
		'Command': '/-5',
		'Divide': '/-26',
		'Equals': '/-21',
		'Greater_Than': '/-20',
		'Hat': '/-6',
		'If': '/-9',
		'IfElse': '/-10',
		'Less_Than': '/-19',
		'Loop': '/-11',
		'Multiply': '/-25',
		'Predicate': '/-7',
		'Project': '/-3',
		'Repeat': '/-13',
		'Reporter': '/-4',
		'Set': '/-15',
		'Subtract': '/-22',
		'Variable': '/-23',
		'While': '/-12',
		'Write': '/-16'
	};

    //META ASPECT TYPE CHECKING
    var _isAdd = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Add); };
	var _isBase = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Base); };
	var _isBinary_Operation = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Binary_Operation); };
	var _isCommand = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Command); };
	var _isDivide = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Divide); };
	var _isEquals = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Equals); };
	var _isGreater_Than = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Greater_Than); };
	var _isHat = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Hat); };
	var _isIf = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.If); };
	var _isIfElse = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.IfElse); };
	var _isLess_Than = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Less_Than); };
	var _isLoop = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Loop); };
	var _isMultiply = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Multiply); };
	var _isPredicate = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Predicate); };
	var _isProject = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Project); };
	var _isRepeat = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Repeat); };
	var _isReporter = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Reporter); };
	var _isSet = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Set); };
	var _isSubtract = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Subtract); };
	var _isVariable = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Variable); };
	var _isWhile = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.While); };
	var _isWrite = function (objID) { return METAAspectHelper.isMETAType(objID, _metaTypes.Write); };
	

    var _queryMetaTypes = function () {
        var nMetaTypes = METAAspectHelper.getMETAAspectTypes(),
            m;

        if (!_.isEqual(_metaTypes,nMetaTypes)) {
            //TODO: when displaying an error message make sure it's the very same project
            /*var metaOutOfDateMsg = _metaID + " is not up to date with the latest META aspect. Please update your local copy!";
            if (console.error) {
                console.error(metaOutOfDateMsg);
            } else {
                console.log(metaOutOfDateMsg);
            }*/

            for (m in _metaTypes) {
                if (_metaTypes.hasOwnProperty(m)) {
                    //delete _metaTypes[m];
                }
            }

            for (m in nMetaTypes) {
                if (nMetaTypes.hasOwnProperty(m)) {
                    _metaTypes[m] = nMetaTypes[m];
                }
            }
        }
    };

    //hook up to META ASPECT CHANGES
    METAAspectHelper.addEventListener(METAAspectHelper.events.META_ASPECT_CHANGED, function () {
        _queryMetaTypes();
    });

    //generate the META types on the first run
    _queryMetaTypes();

    //return utility functions
    return {
        META_TYPES: _metaTypes,
        TYPE_INFO: {
			isAdd: _isAdd,
			isBase: _isBase,
			isBinary_Operation: _isBinary_Operation,
			isCommand: _isCommand,
			isDivide: _isDivide,
			isEquals: _isEquals,
			isGreater_Than: _isGreater_Than,
			isHat: _isHat,
			isIf: _isIf,
			isIfElse: _isIfElse,
			isLess_Than: _isLess_Than,
			isLoop: _isLoop,
			isMultiply: _isMultiply,
			isPredicate: _isPredicate,
			isProject: _isProject,
			isRepeat: _isRepeat,
			isReporter: _isReporter,
			isSet: _isSet,
			isSubtract: _isSubtract,
			isVariable: _isVariable,
			isWhile: _isWhile,
			isWrite: _isWrite
		}
    };
});
