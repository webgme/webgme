/*globals define, require*/
/*jshint browser:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function IoClient (gmeConfig) {
        this.connect = function (callback) {
            var protocol = gmeConfig.server.https.enable ? 'https' : 'http',
                socketIoUrl = protocol + '://' + window.location.host + '/socket.io/socket.io.js';
            require([socketIoUrl], function (io_) {
                var io = io_ || window.io,
                    socket = io.connect(window.location.host, gmeConfig.socketIO);
                callback(null, socket);
            });
        };
    }

    return IoClient;
});