/*globals define, _*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


//TODO does it really work with the fixed paths
define(['underscore', 'js/Utils/METAAspectHelper'], function (_underscore, METAAspectHelper) {
    'use strict';


    //META ASPECT TYPES
    var _metaTypes = {
        End: '/-8/-6',
        FCO: '/-1',
        Initial: '/-8/-5',
        Language: '/-8',
        Models: '/-9',
        State: '/-8/-3',
        StateBase: '/-8/-2',
        Transition: '/-8/-4',
        UMLStateDiagram: '/-8/-7'
    };

    //META ASPECT TYPE CHECKING
    var _isEnd = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.End);
    };
    var _isFCO = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.FCO);
    };
    var _isInitial = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.Initial);
    };
    var _isLanguage = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.Language);
    };
    var _isModels = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.Models);
    };
    var _isState = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.State);
    };
    var _isStateBase = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.StateBase);
    };
    var _isTransition = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.Transition);
    };
    var _isUMLStateDiagram = function (objID) {
        return METAAspectHelper.isMETAType(objID, _metaTypes.UMLStateDiagram);
    };


    var _queryMetaTypes = function () {
        var nMetaTypes = METAAspectHelper.getMETAAspectTypes(),
            m;

        if (!_.isEqual(_metaTypes, nMetaTypes)) {
            /*var metaOutOfDateMsg = _metaID +
             " is not up to date with the latest META aspect. Please update your local copy!";
             if (console.error) {
             console.error(metaOutOfDateMsg);
             } else {
             console.log(metaOutOfDateMsg);
             }*/

            for (m in _metaTypes) {
                if (_metaTypes.hasOwnProperty(m)) {
                    delete _metaTypes[m];
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
            isEnd: _isEnd,
            isFCO: _isFCO,
            isInitial: _isInitial,
            isLanguage: _isLanguage,
            isModels: _isModels,
            isState: _isState,
            isStateBase: _isStateBase,
            isTransition: _isTransition,
            isUMLStateDiagram: _isUMLStateDiagram
        }
    };
});