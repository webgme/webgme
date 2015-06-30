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

    function createStorage(host, sessionId, logger, gmeConfig) {
        var ioClient = new NodeIoClient(host, sessionId, logger, gmeConfig),
            webSocket = new WebSocket(ioClient, logger, gmeConfig),
            storage = new EditorStorage(webSocket, logger, gmeConfig);

        return storage;
    }

    return {
        createStorage: createStorage
    };
});