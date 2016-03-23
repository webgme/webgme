/*globals define*/
/*jshint node:true, camelcase:false*/
/**
 * //TODO: Consider moving this to src/server/..
 * Socket io client used on the server. Typical use-case is from the users.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['socket.io-client'], function (io) {
    'use strict';

    function IoClient(host, webgmeToken, mainLogger, gmeConfig) {
        var logger = mainLogger.fork('socketio-nodeclient');

        this.connect = function (callback) {
            var socketIoOptions = JSON.parse(JSON.stringify(gmeConfig.socketIO.clientOptions)),
                protocol = 'http',
                hostUrl = protocol + '://' + host + ':' + gmeConfig.server.port;

            logger.debug('Connecting to "' + hostUrl + '" with options', {metadata: socketIoOptions});

            if (webgmeToken) {
                socketIoOptions.extraHeaders = {
                    Cookie: gmeConfig.authentication.jwt.cookieId + '=' + webgmeToken
                };

                logger.debug('webgmeToken was defined adding it as an extra header in the cookie..');
            }

            callback(null, io.connect(hostUrl, socketIoOptions));
        };

        this.getToken = function () {
            return webgmeToken;
        };
    }

    return IoClient;
});
