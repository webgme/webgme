/*globals requireJS*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

'use strict';

var fs = require('fs'),
    path = require('path'),
    crypto = require('crypto'),

    GUID = requireJS('common/util/guid'),

    ensureDir = require('../../util/ensureDir'),
    BlobBackendBase = require('./BlobBackendBase'),
    BlobError = require('./BlobError');

var BlobFSBackend = function (gmeConfig, logger) {
    BlobBackendBase.call(this, logger);
    this.blobDir = gmeConfig.blob.fsDir;
    this.tempBucket = this.tempBucket + '-' + gmeConfig.server.port;
    this.logger.info('local-storage:', path.resolve(this.blobDir));
};

// Inherits from BlobManagerBase
BlobFSBackend.prototype = Object.create(BlobBackendBase.prototype);

// Override the constructor with this object's constructor
BlobFSBackend.prototype.constructor = BlobFSBackend;

BlobFSBackend.prototype.putObject = function (readStream, bucket, callback) {
    var self = this,
        // TODO: create this in the system temp folder
        tempName = path.join(self.blobDir, self.tempBucket, GUID() + '.tbf'),
        shasum = crypto.createHash(this.shaMethod),
        readStreamWasClosed = false,
        writeStreamWasClosed = false,
        size = 0;

    ensureDir(path.dirname(tempName), function (err) {
        if (err) {
            callback(err);
            return;
        }

        var writeStream = fs.createWriteStream(tempName);

        writeStream.on('close', function () {
            writeStreamWasClosed = true;
            self.logger.debug('writeStream on close, was read closed?', readStreamWasClosed);
            if (readStreamWasClosed) {
                callback(new Error('ReadStream was closed while writing file!'));
                return;
            }
            // at this point the temporary file have been written out
            // now the file have been written out
            // finalizing hash and moving temporary file..
            var hash = shasum.digest('hex'),
                objectFilename = path.join(self.blobDir, bucket, self._getObjectRelativeLocation(hash));

            ensureDir(path.dirname(objectFilename), function (err) {
                if (err) {
                    // FIXME: this code has to be reviewed.
                    fs.unlink(tempName, function (/*e*/) {
                        callback(err);
                    });
                    return;
                }
                fs.rename(tempName, objectFilename, function (err) {
                    // FIXME: this code has to be reviewed.
                    if (err) {
                        fs.exists(objectFilename, function (exists) {
                            fs.unlink(tempName, function (e) {
                                if (e) {
                                    // The tempName could not be deleted, something is very wrong.
                                    callback(e);
                                } else {
                                    if (exists) {
                                        callback(null, hash, size);
                                    } else {
                                        callback(err);
                                    }
                                }
                            });
                        });
                        return;
                    }
                    callback(null, hash, size);
                });
            });
        });

        writeStream.on('error', function (err) {
            self.logger.error(err);
            callback(err);
        });

        readStream.pipe(writeStream);

        //TODO this implementation should be moved to another class which inherits from writeablestream...
        readStream.on('data', function (chunk) {
            shasum.update(chunk);
            size += chunk.length; //TODO does it really have a length field always???
        });

        readStream.on('close', function () {
            self.logger.error('readStream on close');
            if (writeStreamWasClosed === false) {
                readStreamWasClosed = true;
                writeStream.close();
            }
        });

        readStream.on('error', function (err) {
            // TODO: Do we need to handle this or will close take care of it?
            self.logger.error('readStream on error, rsClosed?', readStreamWasClosed, 'wsClosed?', writeStreamWasClosed,
                'tempName', tempName, 'err', err);
        });
    });
};

BlobFSBackend.prototype.getObject = function (hash, writeStream, bucket, callback) {
    var filename = path.join(this.blobDir, bucket, this._getObjectRelativeLocation(hash)),
        readStream;

    fs.lstat(filename, function (err, stat) {
        if ((err && err.code === 'ENOENT') || !stat.isFile()) {
            return callback(new BlobError('Requested object does not exist: ' + hash, 404));
        } else if (err) {
            return callback('getObject error: ' + err.code || 'unknown');
        }
        readStream = fs.createReadStream(filename);

        writeStream.on('finish', function () {
            // FIXME: any error handling here?
            callback(null, {lastModified: stat.mtime.toISOString()});
        });

        readStream.pipe(writeStream);
    });
};

BlobFSBackend.prototype.listObjects = function (bucket, callback) {
    var self = this;
    var bucketName = path.join(self.blobDir, bucket);
    if (fs.existsSync(bucketName)) {
        self._readDir(bucketName, function (err, found) {
            if (err) {
                callback(err);
                return;
            }

            var hashes = [];

            for (var i = 0; i < found.files.length; i += 1) {
                var f = found.files[i];
                var hash = f.name.slice(bucketName.length).replace(/(\/|\\)/g, '');
                hashes.push(hash);
            }

            callback(null, hashes);
        });

    } else {
        // metadata storage is empty
        callback(null, []);
    }
};

// -----------------------------------------------------------------------------------------------------------------
// Private helper functions

BlobFSBackend.prototype._getObjectRelativeLocation = function (hash) {
    // FIXME: what if hash is null or emprty string. Hash validation is needed.
    return hash.slice(0, 2) + '/' + hash.slice(2);
};

BlobFSBackend.prototype._readDir = function (start, callback) {
    var self = this;
    // Use lstat to resolve symlink if we are passed a symlink
    fs.lstat(start, function (err, stat) {
        if (err) {
            return callback(err);
        }
        var found = {dirs: [], files: []},
            total = 0,
            processed = 0;

        function isDir(abspath) {
            fs.stat(abspath, function (err, stat) {
                if (stat.isDirectory()) {
                    found.dirs.push(abspath);
                    // If we found a directory, recursion
                    self._readDir(abspath, function (err, data) {
                        found.dirs = found.dirs.concat(data.dirs);
                        found.files = found.files.concat(data.files);
                        if (++processed === total) {
                            callback(null, found);
                        }
                    });
                } else {
                    found.files.push({name: abspath, mtime: stat.mtime});
                    if (++processed === total) {
                        callback(null, found);
                    }
                }
            });
        }

        // Read through all the files in this directory
        if (stat.isDirectory()) {
            fs.readdir(start, function (err, files) {
                var x, l;
                total = files.length;
                if (total === 0) {
                    callback(null, found);
                }
                for (x = 0, l = files.length; x < l; x++) {
                    isDir(path.join(start, files[x]));
                }
            });
        } else {
            return callback(new Error('path: ' + start + ' is not a directory'));
        }
    });
};

// Util methods for clean up
BlobFSBackend.prototype.__deleteObject = function (bucket, hash, callback) {
    var self = this,
        fPath = path.join(self.blobDir, bucket, self._getObjectRelativeLocation(hash));

    fs.unlink(fPath, callback);
};

module.exports = BlobFSBackend;
