/*globals define*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function isTrueObject(value) {
        return typeof value === 'object' && value !== null && value instanceof Array === false;
    }

    /**
     * Overwrites/augments values in toData with values from fromData.
     *
     * @param {object} toData - Object that will be updated with matched keys from toData.
     * @param {object} fromData - Object that will overwrite the keys of toData.
     */
    function updateFieldsRec(toData, fromData) {
        var keys = Object.keys(fromData),
            i;

        for (i = 0; i < keys.length; i += 1) {
            if (isTrueObject(fromData[keys[i]]) && isTrueObject(toData[keys[i]])) {
                updateFieldsRec(toData[keys[i]], fromData[keys[i]]);
            } else {
                toData[keys[i]] = fromData[keys[i]];
            }
        }
    }

    function orderStringArrayByElementLength(strArray) {
        var ordered = [],
            i, j, index;

        for (i = 0; i < strArray.length; i += 1) {
            index = -1;
            j = 0;
            while (index === -1 && j < ordered.length) {
                if (ordered[j].length > strArray[i].length) {
                    index = j;
                }

                j += 1;
            }

            if (index === -1) {
                ordered.push(strArray[i]);
            } else {
                ordered.splice(index, 0, strArray[i]);
            }
        }

        return ordered;
    }

    return {
        isTrueObject: isTrueObject,
        updateFieldsRec: updateFieldsRec,
        orderStringArrayByElementLength: orderStringArrayByElementLength
    };
})