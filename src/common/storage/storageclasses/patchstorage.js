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

    function _insertObject(project, coreObject) {
        var deferred = Q.defer(),
            patchObject;
        if (coreObject) {
            if (coreObject.type === 'patch') {
                patchObject = coreObject;
                project.loadObject(patchObject.base, function (err, baseObject) {
                    if (err || !baseObject) {
                        return deferred.reject(new Error('Patch object\'s base cannot be loaded!'));
                    }

                    coreObject = jsonPatcher.apply(baseObject, patchObject.patch);
                    if (coreObject.status === 'success') {
                        coreObject = coreObject.result;
                        coreObject[CONSTANTS.MONGO_ID] = patchObject[CONSTANTS.MONGO_ID];
                        project.insertObject(coreObject);
                        deferred.resolve();
                    } else {
                        deferred.reject(new Error('failed to patch root object!'));
                    }
                });
            } else {
                project.insertObject(coreObject);
                deferred.resolve();
            }
        } else {
            deferred.reject(new Error('only objects can be inserted into client cache!'));
        }

        return deferred.promise;
    }

    PatchStorage.prototype = Object.create(StorageObjectLoaders.prototype);

    PatchStorage.prototype.constructor = PatchStorage;

    PatchStorage.prototype.insertObjects = function (project, objects) {
        var deferred = Q.defer(),
            i,
            inserts = [],
            insertFailed = false,
            self = this;

        for (i = 0; i < objects.length; i += 1) {
            inserts.push(_insertObject(project, objects[i]));
        }

        Q.allSettled(inserts)
            .then(function (insertResults) {
                insertResults.map(function (res) {
                    if (res.state === 'rejected') {
                        self.logger.error(res.reason);
                        insertFailed = true;
                    }
                });

                if (insertFailed) {
                    deferred.reject(new Error('faulty commit received!!'));

                } else {
                    deferred.resolve();
                }
            });

        return deferred.promise;
    };

    PatchStorage.prototype._fillPatchRoot = function (project, commitData, newRootHash, baseRootHash) {
        var deferred = Q.defer(),
            self = this;

        if (self.gmeConfig.storage.patchRootCommunicationEnabled &&
            baseRootHash !== null && commitData.coreObjects[newRootHash] && project) {
            project.loadObject(baseRootHash, function (err, baseRoot) {
                if (!err && baseRoot) {
                    commitData.patchRoot = {
                        type: 'patch',
                        base: baseRootHash,
                        patch: jsonPatcher.create(baseRoot, commitData.coreObjects[newRootHash])
                    };
                    commitData.patchRoot[CONSTANTS.MONGO_ID] = newRootHash;
                } else {
                    self.logger.warn('unable to create patch root, fallback to complete object sending');
                }
                deferred.resolve();
            });
        } else {
            deferred.resolve();
        }

        return deferred.promise;
    };

    return PatchStorage;
});