/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['underscore',
        'util/assert'], function (_underscore,
                                 ASSERT) {

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
    return { initialize: _initialize,
             getPreferences: _getPreferencesInstance
    };
});