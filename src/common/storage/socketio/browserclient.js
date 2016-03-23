/*globals define, require, document*/
/*jshint browser:true, camelcase:false*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/util/url'], function (URL) {
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

                logger.debug('Connecting to "' + hostAddress + '" with options', gmeConfig.socketIO.clientOptions);
                socket = io.connect(hostAddress, gmeConfig.socketIO.clientOptions);
                callback(null, socket);
            });
        };

        this.getToken = function () {
            var cookies = URL.parseCookie(document.cookie);
            if (cookies[gmeConfig.authentication.jwt.cookieId]) {
                return cookies[gmeConfig.authentication.jwt.cookieId];
            }
        };
    }

    return IoClient;
});