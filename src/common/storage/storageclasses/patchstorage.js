/*globals define*/
/*jshint node:true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([
    'common/util/jsonPatcher',
    'common/storage/constants',
    'common/storage/storageclasses/objectloaders',
    'q'
], function (jsonPatcher, CONSTANTS, StorageObjectLoaders, Q) {
    'use strict';

    function PatchStorage(webSocket, logger, gmeConfig) {
        StorageObjectLoaders.call(this, webSocket, logger, gmeConfig);
        this.logger = this.logger || logger.fork('patch');
    }

    PatchStorage.prototype = Object.create(StorageObjectLoaders.prototype);

    PatchStorage.prototype.constructor = PatchStorage;

    PatchStorage.prototype._fillPatchRoot = function (commitData, rootInfo) {

        if (this.gmeConfig.storage.patchRootCommunicationEnabled &&
            rootInfo.baseHash && rootInfo.newHash && rootInfo.baseData &&
            commitData.coreObjects &&
            commitData.coreObjects[rootInfo.newHash]) {

            commitData.patchRoot = {
                type: 'patch',
                base: rootInfo.baseHash,
                patch: jsonPatcher.create(rootInfo.baseData, commitData.coreObjects[rootInfo.newHash])
            };
            commitData.patchRoot[CONSTANTS.MONGO_ID] = rootInfo.newHash;
        }
        commitData.rootHash = typeof rootInfo === 'string' ? rootInfo : rootInfo.newHash;
    };

    return PatchStorage;
});