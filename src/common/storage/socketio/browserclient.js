/*globals define, require*/
/*jshint browser:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function IoClient (gmeConfig) {
        this.connect = function (callback) {
            var hostAddress = window.location.protocol + '//' + window.location.host;

            if (window.__karma__) {
                // TRICKY: karma uses web sockets too, we need to use the gme server's port
                hostAddress = window.location.protocol + '//localhost:' + gmeConfig.server.port;
            }

            require([hostAddress + '/socket.io/socket.io.js'], function (io_) {
                var io = io_ || window.io,
                    socket = io.connect(hostAddress, gmeConfig.socketIO);
                callback(null, socket);
            });
        };
    }

    return IoClient;
});