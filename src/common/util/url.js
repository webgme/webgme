/*globals define*/
/*jshint browser: true, node:true*/

/**
 * @author kecso / https://github.com/kecso
 *
 * FIXME: is there a built in function to JavaScript to parse cookies?
 */

define(function () {
    'use strict';

    function parseCookie(cookie) {
        var parsed,
            elements,
            i,
            pair;

        cookie = decodeURIComponent(cookie);
        parsed = {};
        elements = cookie.split(/[;] */);
        for (i = 0; i < elements.length; i++) {
            pair = elements[i].split('=');
            parsed[pair[0]] = pair[1];
        }
        return parsed;
    }

    function urlToRefObject(url) {
        return {
            $ref: url
        };
    }

    return {
        parseCookie: parseCookie,
        urlToRefObject: urlToRefObject
    };
});
