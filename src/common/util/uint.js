/*jshint node: true, browser: true, bitwise: false*/

/**
 * @author kecso / https://github.com/kecso
 */

define(function () {
    'use strict';

    //this helper function is necessary as in case of large json objects,
    // the library standard function causes stack overflow
    function uint8ArrayToString(uintArray) {
        var resultString = '',
            i;
        for (i = 0; i < uintArray.byteLength; i++) {
            resultString += String.fromCharCode(uintArray[i]);
        }
        return decodeURIComponent(escape(resultString));
    }

    return {
        uint8ArrayToString: uint8ArrayToString
    };
});