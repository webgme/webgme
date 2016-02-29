/*globals define, $*/
/*jshint browser: true*/
/**
 * NOTIFICATION MANAGER
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'jquery-gritter',
    'js/util'
], function (/*myjgrowl, mygritter, util*/) {

    'use strict';


    $.extend($.gritter.options, {
        // defaults to 'top-right' but can be 'bottom-left', 'bottom-right', 'top-left', 'top-right' (added in 1.7.1)
        position: 'bottom-left'
    });

    return {
        displayMessage: function (msg) {
            //$.jGrowl(msg);

            $.gritter.add({
                title: '',
                text: msg,
                time: 3000
            });

        },

        addStickyMessage: function (msg) {
            return $.gritter.add({
                title: '',
                text: msg,
                sticky: true
            });
        },

        removeStickyMessage: function (msgId) {
            $.gritter.remove(msgId, {
                fade: true, // optional
                speed: 'fast' // optional
            });
        }
    };
});

