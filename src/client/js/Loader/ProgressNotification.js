/*globals define, $*/
/*jshint browser:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['jquery'], function () {

    'use strict';

    function startProgressNotification(msg) {
        var note = $.notify(msg, {
                showProgressbar: true,
                delay: 0,
                type: 'info',
                offset: {
                    x: 20,
                    y: 37
                }
            }),
            progress = 15,
            intervalId;

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