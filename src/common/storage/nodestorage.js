/*globals define*/
/*jshint browser:true*/
/**
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/storageclasses/editorstorage',
    'common/storage/socketio/nodeclient',
    'common/storage/socketio/websocket'
], function (EditorStorage, NodeIoClient, WebSocket) {
    'use strict';

    function createStorage(hostUrl, token, logger, gmeConfig) {
        var ioClient,
            webSocket;

        hostUrl = hostUrl || 'http://127.0.0.1:' + gmeConfig.server.port;

        ioClient = new NodeIoClient(hostUrl, token, logger, gmeConfig);
        webSocket = new WebSocket(ioClient, logger, gmeConfig);

        return new EditorStorage(webSocket, logger, gmeConfig);
    }

    return {
        createStorage: createStorage
    };
});