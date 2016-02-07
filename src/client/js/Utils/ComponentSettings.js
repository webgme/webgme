/*globals define*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/util/util'], function (UTIL) {

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
     * @param {object} defaultSettings - hardcoded in the component.
     * @param {string} componentID - UniqueId for component.
     */
    function resolveWithWebGMEGlobal(defaultSettings, componentId) {
        var deploymentSettings,
            userSettings;

        if (typeof WebGMEGlobal === 'undefined') {
            throw new Error('WebGMEGlobal must be defined for this function, use resolveSettings');
        }

        deploymentSettings = WebGMEGlobal.componentSettings[componentId];
        userSettings = WebGMEGlobal.userInfo.settings[componentId];

        return resolveSettings(defaultSettings, deploymentSettings, defaultSettings);
    }

    return {
        resolveSettings: resolveSettings,
        resolveWithWebGMEGlobal: resolveWithWebGMEGlobal
    };
});