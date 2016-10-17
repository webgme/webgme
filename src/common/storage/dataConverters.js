/*globals define*/
/*jshint node:true, browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define(['common/core/constants'], function (CORECONSTANTS) {
    'use strict';

    function isCollectionName(name) {
        if (name.length > CORECONSTANTS.COLLECTION_NAME_SUFFIX.length &&
            CORECONSTANTS.COLLECTION_NAME_SUFFIX === name.slice(-CORECONSTANTS.COLLECTION_NAME_SUFFIX.length)) {
            return true;
        }
        return false;
    }

    // 0.0.0 --> 1.0.0
    // - every inverse relation has to be removed from the overlay
    function zeroToOne(dataObject) {
        var sourcePath,
            overlay = dataObject[CORECONSTANTS.OVERLAYS_PROPERTY] || {},
            relationName;

        for (sourcePath in overlay) {
            for (relationName in overlay[sourcePath]) {
                if (isCollectionName(relationName)) {
                    delete overlay[sourcePath][relationName];
                }
            }
        }
    }

    // 1.0.0 --> 0.0.0
    // - we have to add every inverse relation
    function oneToZero(dataObject) {
        var sourcePath,
            targetPath,
            overlay = dataObject[CORECONSTANTS.OVERLAYS_PROPERTY] || {},
            relationName,
            inverseName;

        for (sourcePath in overlay) {
            for (relationName in overlay[sourcePath]) {
                if (!isCollectionName(relationName)) {
                    inverseName = relationName + CORECONSTANTS.COLLECTION_NAME_SUFFIX;
                    targetPath = overlay[sourcePath][relationName];
                    overlay[targetPath] = overlay[targetPath] || {};
                    overlay[targetPath][inverseName] = overlay[targetPath][inverseName] || [];
                    overlay[targetPath][inverseName].push(sourcePath);
                }
            }
        }
    }

    return {
        '0.0.0': {
            '1.0.0': zeroToOne
        },
        '1.0.0': {
            '0.0.0': oneToZero
        }
    };
});