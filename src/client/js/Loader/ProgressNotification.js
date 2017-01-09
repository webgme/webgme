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
            intervalId,
            useClipboard = false,
            clipboardHint = '';

        if (typeof options === 'string') {
            note = $.notify(options, settings);
        } else if (options !== null && options !== undefined) {
            useClipboard = options.useClipboard || false;
            clipboardHint = options.clipboardHint || 'click to copy hash to clipboard';
            delete options.useClipboard;
            delete options.clipboardHint;
            if (useClipboard) {
                options.icon = options.icon || 'glyphicon glyphicon-copy';
            }
            note = $.notify(options, settings);

            if (useClipboard) {
                new Clipboard($(note.$ele).find('.glyphicon-copy')
                    .attr('title', clipboardHint)
                    .css('cursor', 'copy')
                    .addClass('btn btn-xs')[0]);

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
            intervalId: intervalId
        };
    }

    return {
        startProgressNotification: startProgressNotification,
        start: startProgressNotification
    };
});