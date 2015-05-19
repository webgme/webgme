/*globals define*/
/*jshint node:true*/
/**
 * //TODO: Consider moving this to src/server/..
 * Socket io client used on the server. Typical use-case is from the users.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['socket.io-client'], function (io) {
    'use strict';

    function IoClient (hostAddress, webGMESessionId, gmeConfig) {
        this.connect = function (callback) {
            var socketIoOptions = JSON.parse(JSON.stringify(gmeConfig.socketIO));

            if (webGMESessionId) {
                socketIoOptions.query = webGMESessionId;
            }

            callback(null, io.connect(hostAddress, socketIoOptions));
        };
    }

    return IoClient;
});