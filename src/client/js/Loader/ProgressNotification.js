/*globals define, $*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

/*
 * For additional documentation of the notify feature see: http://bootstrap-notify.remabledesigns.com/
 */

define(['clipboard', 'jquery'], function (Clipboard) {

    'use strict';

    function startProgressNotification(options) {
        var note,
            settings = {
                showProgressbar: true,
                delay: 0,
                type: 'info',
                offset: {
                    x: 20,
                    y: 37
                }
            },
            progress = 15,
            btnEl,
            intervalId,
            useClipboard = false,
            clipboardHint = '';

        if (typeof options === 'string') {
            note = $.notify(options, settings);
        } else if (options !== null && options !== undefined) {
            useClipboard = options.useClipboard || false;
            clipboardHint = options.clipboardHint || 'Copy hash to clipboard';
            delete options.useClipboard;
            delete options.clipboardHint;

            if (useClipboard) {
                options.icon = options.icon || 'glyphicon glyphicon-copy btn btn-s';
            }
            note = $.notify(options, settings);

            if (useClipboard) {
                btnEl = $(note.$ele).find('.glyphicon-copy')
                    .attr('title', clipboardHint)
                    .css('cursor', 'copy')
                    .css('padding-top', '0')
                    .css('padding-left', '0')
                    .hide();

                new Clipboard(btnEl[0]);

                note.__oldUpdate = note.update;
                note.update = function (name, value) {
                    var updateObject = {};

                    if (typeof name === 'object') {
                        updateObject = name;
                    } else if (typeof name === 'string' && value !== undefined) {
                        updateObject[name] = value;
                    }

                    if (updateObject.hasOwnProperty('clipboardValue')) {
                        $(this.$ele).find('.glyphicon-copy').attr('data-clipboard-text', updateObject.clipboardValue);
                        delete updateObject.clipboardValue;
                    }

                    this.__oldUpdate(updateObject);
                };
            }

        }

        note.update('progress', progress);
        intervalId = setInterval(function () {
            if (progress < 50) {
                progress += 5;
            } else if (progress < 70) {
                progress += 2;
            } else if (progress < 98) {
                progress += 1;
            } else {
                progress = 10;
                note.update('type', 'warning');
            }

            note.update('progress', progress);
        }, 5000);

        return {
            note: note,
            intervalId: intervalId,
            btnEl: btnEl
        };
    }

    return {
        startProgressNotification: startProgressNotification,
        start: startProgressNotification
    };
});