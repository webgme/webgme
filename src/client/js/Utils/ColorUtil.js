/*globals define */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    function getHexColor(color) {
        var result,
            pattern6HEX = /^#[0-9A-F]{6}$/,
            pattern3HEX = /^#[0-9A-F]{3}$/,
            patternRGB = /rgb\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3})\s*\)$/,
            patternRGBA = /rgba\(\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d{1,3}),\s*(\d+(.\d*))\s*\)$/,
            c,
            r,
            g,
            b;

        //non-string value can not be color
        if (typeof color === 'string') {
            color = color.toUpperCase();
            //is it standard 6-char HEX color
            c = color.match(pattern6HEX);
            if (c) {
                result = color;
            } else {
                //is it a 3-char HEX color
                c = color.match(pattern3HEX);
                if (c) {
                    result = '#' + color[1] + color[1] + color[2] + color[2] + color[3] + color[3];
                } else {
                    //is it an RGB or RGBA color
                    c = color.match(patternRGB) || color.match(patternRGBA);
                    if (c) {
                        //r = c[1]
                        r = parseInt(c[1], 10).toString(16);
                        if (r.length === 1) {
                            r = '0' + r;
                        }
                        //g = c[2]
                        g = parseInt(c[2], 10).toString(16);
                        if (g.length === 1) {
                            g = '0' + g;
                        }
                        //b = c[3]
                        b = parseInt(c[3], 10).toString(16);
                        if (b.length === 1) {
                            b = '0' + b;
                        }
                        result = ('#' + r + g + b).toUpperCase();
                    }
                }
            }
        }

        return result;
    }

    //return utility functions
    return {
        getHexColor: getHexColor,

        isColor: function (color) {
            return (getHexColor(color) !== undefined);
        }
    };

});