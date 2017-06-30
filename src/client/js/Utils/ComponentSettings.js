/*globals define, WebGMEGlobal*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/util/util', 'superagent'], function (UTIL, superagent) {

    'use strict';

    /**
     * Updates the defaultSettings based on passed settings.
     *
     * @param {object} defaultSettings - hardcoded in the component.
     * @param {object} [deploymentSettings] - defined on the server at config/components.json.
     * @param {object} [userSettings] - defined for the specific user.
     */
    function resolveSettings(defaultSettings, deploymentSettings, userSettings) {
        if (deploymentSettings && typeof deploymentSettings === 'object') {
            UTIL.updateFieldsRec(defaultSettings, deploymentSettings);
        }

        if (userSettings && typeof userSettings === 'object') {
            UTIL.updateFieldsRec(defaultSettings, userSettings);
        }

        return defaultSettings;
    }

    /**
     * Updates the defaultSettings trying ot extract values from WebGMEGlobal.
     *
     * @param {object} defaultSettings - Defined in the component itself.
     * @param {string} componentID - UniqueId for component.
     */
    function resolveWithWebGMEGlobal(defaultSettings, componentId) {
        var deploymentSettings,
            userSettings;

        if (typeof WebGMEGlobal === 'undefined') {
            throw new Error('WebGMEGlobal must be defined for this function, use resolveSettings');
        }

        deploymentSettings = WebGMEGlobal.componentSettings && WebGMEGlobal.componentSettings[componentId];
        userSettings = WebGMEGlobal.userInfo && WebGMEGlobal.userInfo.settings &&
            WebGMEGlobal.userInfo.settings[componentId];

        return resolveSettings(defaultSettings, deploymentSettings, userSettings);
    }

    /**
     * Merges the currently stored settings for the user with the given new ones.
     *
     * If WebGMEGlobal is defined it will be updated to fit the new settings stored for the user.
     *
     * @param {string} componentID - UniqueId for component.
     * @param {object} newSettings - Settings that will be merged with the current stored ones.
     */
    function updateComponentSettings(componentId, newSettings, callback) {
        superagent.patch('api/user/settings/' + componentId)
            .send(newSettings)
            .end(function (err, res) {
                if (err || res.status !== 200) {
                    callback(err || new Error('Did not return status 200: ' + res.status));
                    return;
                }

                if (typeof WebGMEGlobal !== 'undefined') {
                    if (WebGMEGlobal.userInfo && WebGMEGlobal.userInfo.settings) {
                        WebGMEGlobal.userInfo.settings[componentId] = res.body;
                    }
                }

                callback(null, res.body);
            });
    }

    /**
     * Overwrites the currently stored settings for the user with the given new ones.
     *
     * If WebGMEGlobal is defined it will be updated to fit the new settings stored for the user.
     *
     * @param {string} componentID - UniqueId for component.
     * @param {object} newSettings - Settings that will be merged with the current stored ones.
     */
    function overwriteComponentSettings(componentId, newSettings, callback) {
        superagent.put('api/user/settings/' + componentId)
            .send(newSettings)
            .end(function (err, res) {
                if (err || res.status !== 200) {
                    callback(err || new Error('Did not return status 200: ' + res.status));
                    return;
                }

                if (typeof WebGMEGlobal !== 'undefined') {
                    if (WebGMEGlobal.userInfo && WebGMEGlobal.userInfo.settings) {
                        WebGMEGlobal.userInfo.settings[componentId] = res.body;
                    }
                }

                callback(null, res.body);
            });
    }

    return {
        resolveSettings: resolveSettings,
        resolveWithWebGMEGlobal: resolveWithWebGMEGlobal,
        updateComponentSettings: updateComponentSettings,
        overwriteComponentSettings: overwriteComponentSettings
    };
});