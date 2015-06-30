/*globals define*/
/*jshint node:true*/
/**
 * //TODO: Consider moving this to src/server/..
 * Socket io client used on the server. Typical use-case is from the users.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['socket.io-client'], function (io) {
    'use strict';

    function IoClient(host, webGMESessionId, mainLogger, gmeConfig) {
        var logger = mainLogger.fork('socketio-nodeclient');

        this.connect = function (callback) {
            var socketIoOptions = JSON.parse(JSON.stringify(gmeConfig.socketIO)),
                protocol = gmeConfig.server.https.enable ? 'https' : 'http',
                hostUrl = protocol + '://' + host + ':' + gmeConfig.server.port;

            socketIoOptions.query = {webGMESessionId: webGMESessionId};
            logger.debug('Connecting to "' + hostUrl + '" with options', {metadata: socketIoOptions});

            callback(null, io.connect(hostUrl, socketIoOptions));
        };
    }

    return IoClient;
});