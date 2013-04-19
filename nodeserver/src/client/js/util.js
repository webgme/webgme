"use strict";
/*
 * Utility helper functions for the client side
 */

define([], function () {
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
        overlap : function (boundingBoxA, boundingBoxB) {
            var result = false;

            if (boundingBoxA.x < boundingBoxB.x2 && boundingBoxA.x2 > boundingBoxB.x && boundingBoxA.y < boundingBoxB.y2 && boundingBoxA.y2 > boundingBoxB.y) {
                result = true;
            }

            return result;
        },

        /*
         * Loads a CSS file dinamically
         */
        loadCSS : function (filePath) {
            var css	= document.createElement('link');
            css.rel		= 'stylesheet';
            css.type	= 'text/css';
            css.media	= 'all';
            css.href	= filePath;
            document.getElementsByTagName("head")[0].appendChild(css);
        },

        flattenObject: function (obj) {
            var result = {},
                discover;

            discover = function (o, prefix) {
                var i;

                for (i in o) {
                    if (o.hasOwnProperty(i)) {
                        if (_.isObject(o[i]) && !_.isArray(o[i])) {
                            discover(o[i], prefix === "" ? i + "." : prefix + i + ".");
                        } else {
                            result[prefix + i] = o[i];
                        }
                    }
                }
            };

            discover(obj, "");

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

                    if (delta < 60) {
                        result = Math.round(delta) + ' seconds ago';
                    } else {
                        delta = delta / 60;
                        if (delta < 60) {
                            result = Math.round(delta) + ' minutes ago';
                        } else {
                            delta = delta / 60;
                            if (delta < 24) {
                                result = Math.round(delta) + ' hours ago';
                            } else {
                                delta = delta / 24;
                                if (delta < 30) {
                                    result = Math.round(delta) + ' days ago';
                                } else {
                                    delta = delta / 30;
                                    if (delta < 12) {
                                        result = Math.round(delta) + ' months ago';
                                    } else {
                                        delta = delta / 12;
                                        result = Math.round(delta) + ' years ago';
                                    }
                                }
                            }
                        }
                    }
                }
            }

            return result;
        }
    }
});