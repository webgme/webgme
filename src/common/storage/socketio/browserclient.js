/*globals define, require*/
/*jshint browser:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    function IoClient (gmeConfig) {
        this.connect = function (callback) {
            var protocol = gmeConfig.server.https.enable ? 'https' : 'http';
            require([protocol + '://' + window.location.host + '/socket.io/socket.io.js'], function () {
                var socket = window.io.connect(window.location.host, gmeConfig.socketIO);
                callback(null, socket);
            });
        };
    }

    return IoClient;
});