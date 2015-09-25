/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


//TODO does it really work with the fixed paths
define(['underscore'], function (_underscore) {
    'use strict';

    var META_TYPES = {
        End: 'End',
        FCO: 'FCO',
        Initial: 'Initial',
        Language: 'Language',
        Models: 'Models',
        State: 'State',
        StateBase: 'StateBase',
        Transition: 'Transition',
        UMLStateDiagram: 'UMLStateDiagram'
    },
        client = WebGMEGlobal.Client;

    function _getMetaTypes() {
        var metaNodes = client.getAllMetaNodes(),
            dictionary = {},
            i,
            name;

        for (i = 0; i < metaNodes.length; i += 1) {
            name = metaNodes[i].getAttribute('name');
            if (META_TYPES[name]) {
                dictionary[name] = metaNodes[i].getId();
            }
        }

        return dictionary;
    }

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
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.End]);
    };
    var _isFCO = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.FCO]);
    };
    var _isInitial = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Initial]);
    };
    var _isLanguage = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Language]);
    };
    var _isModels = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Models]);
    };
    var _isState = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.State]);
    };
    var _isStateBase = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.StateBase]);
    };
    var _isTransition = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.Transition]);
    };
    var _isUMLStateDiagram = function (objID) {
        return client.isTypeOf(objID, _getMetaTypes()[META_TYPES.UMLStateDiagram]);
    };



    //return utility functions
    return {
        getMetaTypes: _getMetaTypes,
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