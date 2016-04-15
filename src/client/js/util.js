/*globals define, _, $*/
/*jshint browser: true*/
/**
 * Utility helper functions for the client side
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['urlparse', 'jquery'], function (URLPARSE) {

    'use strict';

    var span = $('<span></span>');

    Array.prototype.pushUnique = function (val) {
        if (this.indexOf(val) === -1) {
            this.push(val);
        }

        return this;
    };

    //return utility functions
    return {
        /*
         * Returns true if the two boundingbox overlap
         */
        overlap: function (boundingBoxA, boundingBoxB) {
            var result = false;

            if (boundingBoxA.x < boundingBoxB.x2 && boundingBoxA.x2 > boundingBoxB.x &&
                boundingBoxA.y < boundingBoxB.y2 && boundingBoxA.y2 > boundingBoxB.y) {
                result = true;
            }

            return result;
        },

        flattenObject: function (obj) {
            var result = {},
                discover;

            discover = function (o, prefix) {
                var i;

                for (i in o) {
                    if (o.hasOwnProperty(i)) {
                        if (_.isObject(o[i]) && !_.isArray(o[i])) {
                            discover(o[i], prefix === '' ? i + '.' : prefix + i + '.');
                        } else {
                            result[prefix + i] = o[i];
                        }
                    }
                }
            };

            discover(obj, '');

            return result;
        },

        formattedDate: function (date, format) {
            var result = '',
                currentDate = new Date(),
                delta;

            format = format || 'UTC';

            //toISOString --> 2013-04-17T19:40:00.574Z
            //toUTCString --> Wed, 17 Apr 2013 19:40:15 GMT

            if (_.isDate(date)) {
                if (format === 'UTC') {
                    result = date.toUTCString();
                } else if (format === 'elapsed') {
                    delta = (currentDate - date) / 1000;    //elapsed time in seconds

                    if (delta < 45) {       //0..45 sec
                        result = 'just now';
                    } else if (delta < 90) {    //45..90 sec
                        result = 'a minute ago';
                    } else if (delta < 45 * 60) {    //90 sec 45 min
                        result = Math.round(delta / 60) + ' minutes ago';
                    } else if (delta < 90 * 60) {    //45 min to 90 min
                        result = 'an hour ago';
                    } else if (delta < 22 * 3600) {       //90 min to 22 hours
                        result = Math.round(delta / 3600) + ' hours ago';
                    } else if (delta < 36 * 3600) {       //22 hours to 36 hours
                        result = 'a day ago';
                    } else if (delta < 25 * 86400) {       //36 hours to 25 days
                        result = Math.round(delta / 86400) + ' days ago';
                    } else if (delta < 45 * 86400) {       //25 days to 45 days
                        result = 'a month ago';
                    } else if (delta < 345 * 86400) {       //45 days to 345 days
                        result = Math.round(delta / 2592000) + ' months ago';
                    } else if (delta < 547 * 86400) {       //45 days to 547 days (1.5 years)
                        result = 'a year ago';
                    } else {       //548+ days (1.5 years)
                        result = Math.round(delta / 31536000) + ' years ago';
                    }
                }
            }

            return result;
        },

        getURLParameterByName: function (name) {
            var queryParams = URLPARSE(location, true).param();

            if (queryParams[name] !== undefined) {
                return queryParams[name];
            }

            return '';
        },

        getURLParameterByNameFromString: function (url, name) {
            var queryParams = URLPARSE(url, true).param();

            if (queryParams[name] !== undefined) {
                return queryParams[name];
            }

            return '';
        },

        getObjectFromUrlQuery: function (queryString) {
            //http://stevenbenner.com/2010/03/javascript-regex-trick-parse-a-query-string-into-an-object/
            var queryObj = {};
            queryString.replace(
                new RegExp('([^?=&]+)(=([^&]*))?', 'g'),
                function ($0, $1, $2, $3) {
                    queryObj[$1] = $3;
                }
            );
            return queryObj;
        },

        toSafeString: function (string) {
            return span.text(string).html();
        },

        caseInsensitiveSort: function (a, b) {
            if (a.toLowerCase() < b.toLowerCase()) {
                return -1;
            } else {
                return 1;
            }
        },

        escapeHTML: function (str) {
            var div = document.createElement('div');
            div.appendChild(document.createTextNode(str));
            return div.innerHTML;
        }
    };
});