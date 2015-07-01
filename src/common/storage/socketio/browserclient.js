/*globals define, require*/
/*jshint browser:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function IoClient (mainLogger, gmeConfig) {
        var logger = mainLogger.fork('socketio-browserclient');

        this.connect = function (callback) {
            var hostAddress = window.location.protocol + '//' + window.location.host,
                socketIoUrl;

            if (window.__karma__) {
                // TRICKY: karma uses web sockets too, we need to use the gme server's port
                hostAddress = window.location.protocol + '//localhost:' + gmeConfig.server.port;
            }

            socketIoUrl = hostAddress + '/socket.io/socket.io.js';
            logger.debug('Will require socketIO from', socketIoUrl);

            require([socketIoUrl], function (io_) {
                var io = io_ || window.io,
                    socket;

                logger.debug('Connecting to "' + hostAddress + '" with options', gmeConfig.socketIO);
                socket = io.connect(hostAddress, gmeConfig.socketIO);
                callback(null, socket);
            });
        };
    }

    return IoClient;
});