/*globals define*/
/*jshint browser:true*/
/**
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/storageclasses/editorstorage',
    'common/storage/socketio/nodeclient',
    'common/storage/socketio/websocket',
], function (EditorStorage, NodeIoClient, WebSocket) {
    'use strict';

    var _storage;

    function _createStorage(hostAddress, sessionId, logger, gmeConfig) {
        var ioClient = new NodeIoClient(hostAddress, sessionId, gmeConfig),
            webSocket = new WebSocket(ioClient, logger),
            storage = new EditorStorage(webSocket, logger, gmeConfig);

        return storage;
    }

    function getStorage (hostAddress, sessionId, logger, gmeConfig) {
        if (!_storage) {
            _storage = _createStorage(hostAddress, sessionId, logger, gmeConfig);
        }
        return _storage;
    }

    return {
        getStorage: getStorage
    };
});