"use strict";
/*
 * Utility helper functions for the client side
 */

define([], function () {

    /*
     * Disabling selection on element
     */
    /* TODO: OBSOLETE SHOULD NOT BE USED EVER
    *  TODO: USE editOnDblClick INSTEAD */
    $.fn.extend({
        editInPlace : function (editClass, successCallback) {
            this.each(function () {
                var contentWidth = $(this).outerWidth(),
                    inputCtrl,
                    prevTitle = $(this).html(),
                    originalCtrl = $(this);

                originalCtrl.html("<input id='editNode' value='" + prevTitle + "' class='" + editClass + "' />");
                inputCtrl =  $(this).find("#editNode");
                inputCtrl.width(contentWidth - 18);
                inputCtrl.focus().keydown(
                    function (event) {
                        switch (event.which) {
                        case 27: // [esc]
                            // discard changes on [esc]
                            inputCtrl.val(prevTitle);
                            event.preventDefault();
                            $(this).blur();
                            break;
                        case 13: // [enter]
                            // simulate blur to accept new value
                            event.preventDefault();
                            $(this).blur();
                            break;
                        case 46:// DEL
                            //don't need to handle it specially but need to prevent propagation
                            event.stopPropagation();
                            break;
                        }
                    }
                ).blur(function (event) {
                    var newTitle = inputCtrl.val();
                    // Accept new value, when user leaves <input>

                    if (newTitle === "") {
                        newTitle = prevTitle;
                    }

                    originalCtrl.html(newTitle);
                    if (prevTitle !== newTitle) {
                        if (successCallback) {
                            successCallback(newTitle);
                        }
                    }
                });
            });
        }
    });

    Array.prototype.mergeUnique = function (otherArray) {
        var i;

        if (otherArray) {
            for (i = 0; i < otherArray.length; i += 1) {
                if (this.indexOf(otherArray[i]) === -1) {
                    this.push(otherArray[i]);
                }
            }
        }

        return this;
    };

    Array.prototype.insertUnique = function (val) {
        if (this.indexOf(val) === -1) {
            this.push(val);
        }

        return this;
    };

    // Shared empty constructor function to aid in prototype-chain creation.
    var ctor = function () {};

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
         * Returns true if the two position is inside the rectangle
         */
        isPositionInsideRectangle : function (position, boundingBox) {
            var result = false;

            if (boundingBox.x <= position.x && boundingBox.x2 >= position.x && boundingBox.y <= position.y && boundingBox.y2 >= position.y) {
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

        /*
         * Inject a CSS dynamically into the document
         */
        injectCSS: function (css) {
            var injected = document.createElement('style');
            injected.type = 'text/css';
            injected.innerHTML = css;
            document.getElementsByTagName('head')[0].appendChild(injected);
        },

        /*
         * HTML encodes a string
         */
        htmlEncode: function (value) {
            return $('<div/>').text(value).html();
        },

        /*
         * HTML decodes a string
         */
        htmlDecode: function (value) {
            return $('<div/>').html(value).text();
        },

        flattenObject: function (obj) {
            var result = {},
                discover;

            discover = function (o, prefix) {
                var i;

                for (i in o) {
                    if (o.hasOwnProperty(i)) {
                        if (_.isObject(o[i])) {
                            discover(o[i], prefix === "" ? i + "." : prefix + i + ".");
                        } else {
                            result[prefix + i] = o[i];
                        }
                    }
                }
            };

            discover(obj, "");

            return result;
        }
    };
});