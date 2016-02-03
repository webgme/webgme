/*globals define*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/util/util'], function (UTIL) {

    'use strict';

    /**
     * //TODO: Add a method that takes user settings into account (async).
     * @param {GmeConfig} gmeConfig
     * @param {string} guid - unique key for ui component.
     * @param {object} defaultSettings - defined in the component.
     */
    function resolveSettings(gmeConfig, guid, defaultSettings) {
        if (!gmeConfig.components[guid]) {
            return defaultSettings;
        }

        UTIL.updateFieldsRec(defaultSettings, gmeConfig.components[guid]);
    }

    return {
        resolveSettings: resolveSettings
    };
});