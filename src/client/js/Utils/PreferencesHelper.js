/*globals define, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'underscore',
    'common/util/assert'
], function (_underscore, ASSERT) {

    'use strict';

    var Preferences,
        _client;

    Preferences = function (registyList) {
        this._registryList = registyList ? JSON.parse(JSON.stringify(registyList)) : [];
    };

    Preferences.prototype.getRegistry = function (objID, regKey, includeItemRegistry) {
        var i,
            len = this._registryList.length,
            result,
            registryDesc,
            container;

        for (i = 0; i < len; i += 1) {
            registryDesc = this._registryList[i];
            container = _client.getNode(registryDesc.containerID);
            if (container) {
                result = container.getMemberRegistry(registryDesc.setID, objID, regKey);
                if (result !== undefined && result !== null) {
                    break;
                }
            }
        }

        //if still not found and interested in item's registry, try that
        if ((result === undefined || result === null) &&
            includeItemRegistry === true) {
            container = _client.getNode(objID);
            if (container) {
                result = container.getRegistry(regKey);
            }
        }

        return result;
    };

    Preferences.prototype.setRegistry = function (objID, regKey, value) {
        var registryDesc;

        if (this._registryList.length === 0) {
            //no prefernece list, writing item's registry
            _client.setRegistry(objID, regKey, value);
        } else {
            registryDesc = this._registryList[0];
            _client.setMemberRegistry(registryDesc.containerID, objID, registryDesc.setID, regKey, value);
        }
    };

    Preferences.prototype.delRegistry = function (objID, regKey) {
        var registryDesc;

        if (this._registryList.length === 0) {
            //no prefernece list, writing item's registry
            _client.delRegistry(objID, regKey);
        } else {
            registryDesc = this._registryList[0];
            _client.delMemberRegistry(registryDesc.containerID, objID, registryDesc.setID, regKey);
        }
    };

    var _initialize = function (c) {
        //if already initialized, just return
        if (_client) {
            return;
        }
        _client = c;
    };

    var _getPreferencesInstance = function (registyList) {
        if (registyList) {
            ASSERT(registyList);
            ASSERT(_.isArray(registyList));
            ASSERT(registyList.length > 0);
        }
        return new Preferences(registyList);
    };

    //return utility functions
    return {
        initialize: _initialize,
        getPreferences: _getPreferencesInstance
    };
});