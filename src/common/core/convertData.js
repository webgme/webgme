/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/core/constants', 'common/storage/constants'], function (CORE_CONSTANTS, STORAGE_CONSTANTS) {
    'use strict';

    var dataConverters,
        APP_VERSION = STORAGE_CONSTANTS.VERSION,
        MAJOR_APP_VERSION = APP_VERSION.split('.')[0];

    function isCollectionName(name) {
        if (name.length > CORE_CONSTANTS.COLLECTION_NAME_SUFFIX.length &&
            CORE_CONSTANTS.COLLECTION_NAME_SUFFIX === name.slice(-CORE_CONSTANTS.COLLECTION_NAME_SUFFIX.length)) {
            return true;
        }
        return false;
    }

    function clearOvrOfInvRelations(overlay) {
        var sourcePath,
            relationName;

        for (sourcePath in overlay) {
            for (relationName in overlay[sourcePath]) {
                if (isCollectionName(relationName)) {
                    delete overlay[sourcePath][relationName];
                }
            }

            // Remove all empty overlay entries
            if (Object.keys(overlay[sourcePath]).length === 0) {
                delete overlay[sourcePath];
            }
        }
    }

    // 0.0.0 --> 1.0.0
    // - every inverse relation has to be removed from the overlay
    function zeroToOne(dataObject) {

        clearOvrOfInvRelations(dataObject[CORE_CONSTANTS.OVERLAYS_PROPERTY] || {});

        dataObject.__v = '1.0.0';
        return dataObject;
    }

    function oneToOnePointOne(dataObject) {
        var currentSet,
            metaEntry,
            key;

        // Clear direct _sets of inverse overlay relations.
        currentSet = dataObject[CORE_CONSTANTS.ALL_SETS_PROPERTY] || {};
        clearOvrOfInvRelations(currentSet[CORE_CONSTANTS.OVERLAYS_PROPERTY] || {});

        metaEntry = dataObject[CORE_CONSTANTS.META_NODE] || {};
        clearOvrOfInvRelations(metaEntry[CORE_CONSTANTS.OVERLAYS_PROPERTY] || {});

        for (key in metaEntry) {
            currentSet = metaEntry[key];
            currentSet = currentSet[CORE_CONSTANTS.ALL_SETS_PROPERTY] || {};
            clearOvrOfInvRelations(currentSet[CORE_CONSTANTS.OVERLAYS_PROPERTY] || {});
        }

        dataObject.__v = '1.1.0';

        return dataObject;
    }

    dataConverters = {
        '0.0.0': {
            '1.0.0': zeroToOne,
            '1.1.0': function (dataObject) {
                return oneToOnePointOne(zeroToOne(dataObject));
            }
        },
        '1.0.0': {
            '1.1.0': oneToOnePointOne
        }
    };

    /**
     * Converts the passed dataObject to an object (a copy) of the current app version unless the same version.
     * @param {object} dataObject
     * @returns {object} A new object if converted, otherwise the passed dataObject.
     */
    function convertData(dataObject) {
        var dataVersion = dataObject.__v || '0.0.0',
            majorDataVersion = dataVersion.split('.')[0];

        if (majorDataVersion > MAJOR_APP_VERSION) {
            throw new Error('Trying to load data of incompatible version. Current version "' +
                APP_VERSION + '", data version "' + dataVersion + '".');
        }

        if (dataVersion !== APP_VERSION &&
            dataConverters[dataVersion] &&
            typeof dataConverters[dataVersion][APP_VERSION] === 'function') {

            return dataConverters[dataVersion][APP_VERSION](JSON.parse(JSON.stringify(dataObject)));
        }

        return dataObject;
    }

    return convertData;
});