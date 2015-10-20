/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Provides functionality (used by the project-cache) for loading objects.
 *
 * To avoid multiple round-trips to the server the loadObject requests are put in a bucket
 * that is loaded when the bucket is full (gmeConfig.storage.loadBucketSize) or when a
 * timeout is triggered (gmeConfig.storage.loadBucketTimer).
 *
 * N.B. when used directly, the user need to make sure that the same object (by hash) is not loaded within in the
 * same bucket, (see the project-cache for example).
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/storage/storageclasses/simpleapi'], function (SimpleAPI) {
    'use strict';

    function StorageObjectLoaders(webSocket, logger, gmeConfig) {
        // watcher counters determining when to join/leave a room on the sever
        this.logger = this.logger || logger.fork('storage');
        SimpleAPI.call(this, webSocket, logger, gmeConfig);
        this.webSocket = webSocket;
        this.gmeConfig = gmeConfig;
        // Bucket for loading objects
        this.loadBucket = [];
        this.loadBucketSize = 0;
        this.loadBucketTimer = null;
        this.logger.debug('StorageObjectLoaders ctor');
    }

    StorageObjectLoaders.prototype = Object.create(SimpleAPI.prototype);
    StorageObjectLoaders.prototype.constructor = StorageObjectLoaders;

    // Getters
    StorageObjectLoaders.prototype.loadObject = function (projectId, hash, callback) {
        var self = this;
        this.logger.debug('loadObject', projectId, hash);

        self.loadBucket.push({projectId: projectId, hash: hash, cb: callback});
        self.loadBucketSize += 1;

        function resetBucketAndLoadObjects() {
            var myBucket = self.loadBucket;
            self.loadBucket = [];
            self.loadBucketTimer = null;
            self.loadBucketSize = 0;
            self.loadObjects(projectId, myBucket);
        }

        if (self.loadBucketSize === 1) {
            self.logger.debug('loadBucket was empty starting timer [ms]', self.gmeConfig.storage.loadBucketTimer);
            self.loadBucketTimer = setTimeout(function () {
                self.logger.debug('loadBucketTimer triggered, bucketSize:', self.loadBucketSize);
                resetBucketAndLoadObjects();
            }, self.gmeConfig.storage.loadBucketTimer);
        }

        if (self.loadBucketSize === self.gmeConfig.storage.loadBucketSize) {
            self.logger.debug('loadBuckSize reached will loadObjects, bucketSize:', self.loadBucketSize);
            clearTimeout(self.loadBucketTimer);
            resetBucketAndLoadObjects();
        }
    };

    StorageObjectLoaders.prototype.loadObjects = function (projectId, hashedObjects) {
        var self = this,
            hashes = {},
            data,
            i;
        for (i = 0; i < hashedObjects.length; i++) {
            hashes[hashedObjects[i].hash] = true;
        }
        hashes = Object.keys(hashes);
        data = {
            hashes: hashes,
            projectId: projectId
        };

        this.webSocket.loadObjects(data, function (err, result) {
            //if (err) {
            //    throw new Error(err);
            //}
            self.logger.debug('loadObjects returned', {metadata: result});
            for (i = 0; i < hashedObjects.length; i++) {
                if (err) {
                    hashedObjects[i].cb(err);
                } else if (typeof result[hashedObjects[i].hash] === 'string') {
                    self.logger.error(result[hashedObjects[i].hash]);
                    hashedObjects[i].cb(new Error(result[hashedObjects[i].hash]));
                } else {
                    hashedObjects[i].cb(err, result[hashedObjects[i].hash]);
                }
            }
        });
    };

    StorageObjectLoaders.prototype.loadPaths = function (projectId, pathsInfo, excludes, callback) {
        var data = {
            projectId: projectId,
            pathsInfo: pathsInfo,
            excludes: excludes
        };

        this.webSocket.loadPaths(data, callback);
    };

    return StorageObjectLoaders;
});
