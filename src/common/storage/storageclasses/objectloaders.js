/*globals define*/
/*jshint browser: true, node:true*/
/**
 * Provides functionality (used by the project-cache) for loading objects.
 *
 * To avoid multiple round-trips to the server the loadObject requests are put in a bucket
 * that is loaded when the bucket is full (gmeConfig.storage.loadBucketSize) or when a
 * timeout is triggered (gmeConfig.storage.loadBucketTimer).
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
    StorageObjectLoaders.prototype.loadObject = function (projectName, hash, callback) {
        var self = this;
        this.logger.debug('loadObject', projectName, hash);

        self.loadBucket.push({projectName: projectName, hash: hash, cb: callback});
        self.loadBucketSize += 1;

        function resetBucketAndLoadObjects() {
            var myBucket = self.loadBucket;
            self.loadBucket = [];
            self.loadBucketTimer = null;
            self.loadBucketSize = 0;
            self.loadObjects(projectName, myBucket);
        }

        if (self.loadBucketSize === 1) {
            self.logger.debug('loadBucket was empty starting timer [ms]', self.gmeConfig.storage.loadBucketTimer);
            self.loadBucketTimer = setTimeout(function () {
                self.logger.debug('loadBucketTimer triggered, loadBucket size', self.loadBucketSize);
                resetBucketAndLoadObjects();
            }, self.gmeConfig.storage.loadBucketTimer);
        } else if (self.loadBucketSize === self.gmeConfig.storage.loadBucketSize) {
            self.logger.debug('loadBuckSize reached sending out loadObjects', self.loadBucketSize);
            clearTimeout(self.loadBucketTimer);
            resetBucketAndLoadObjects();
        }
    };

    StorageObjectLoaders.prototype.loadObjects = function (projectName, hashedObjects) {
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
            projectName: projectName
        };

        this.webSocket.loadObjects(data, function (err, result) {
            if (err) {
                throw new Error(err);
            }
            self.logger.debug('loadObjects returned', result);
            for (i = 0; i < hashedObjects.length; i++) {
                if (typeof result[hashedObjects[i].hash] === 'string') {
                    self.logger.error(result[hashedObjects[i].hash]);
                    hashedObjects[i].cb(result[hashedObjects[i].hash]);
                } else {
                    hashedObjects[i].cb(err, result[hashedObjects[i].hash]);
                }
            }
        });
    };

    return StorageObjectLoaders;
});