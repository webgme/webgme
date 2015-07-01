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
        var ioClient = new BrowserIoClient(logger, gmeConfig),
            webSocket = new WebSocket(ioClient, logger, gmeConfig),
            storage = new EditorStorage(webSocket, logger, gmeConfig);

        return storage;
    }

    function getStorage (logger, gmeConfig, forceNew) {
        logger.debug('getStorage');

        if (!_storage) {
            logger.debug('No storage existed, will create new one..');
            _storage = _createStorage(logger, gmeConfig);
        } else {
            logger.debug('Storage existed...');

            if (forceNew === true) {
                logger.debug('Force new set to true, will create new one.');
                _storage = _createStorage(logger, gmeConfig);
            }
        }

        return _storage;
    }

    return {
        getStorage: getStorage
    };
});