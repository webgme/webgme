/*globals define*/
/*jshint browser:true*/
/**
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/storage/storageclasses/editorstorage',
    'common/storage/socketio/browserclient',
    'common/storage/socketio/websocket',
], function (EditorStorage, BrowserIoClient, WebSocket) {
    'use strict';

    var _storage;

    function _createStorage(logger, gmeConfig) {
        var ioClient = new BrowserIoClient(gmeConfig),
            webSocket = new WebSocket(ioClient, logger, gmeConfig),
            storage = new EditorStorage(webSocket, logger, gmeConfig);

        return storage;
    }

    function getStorage (logger, gmeConfig) {
        if (!_storage) {
            _storage = _createStorage(logger, gmeConfig);
        }
        return _storage;
    }

    return {
        getStorage: getStorage
    };
});