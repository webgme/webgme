/**
 * Created by Zsolt on 4/11/2014.
 */
define(['./BlobManagerBase', 'fs','crypto', 'path'], function (BlobManagerBase, fs, crypto, path) {


    var BlobManagerFS = function () {
        this.blobDir = path.join('./', 'blob-local-storage');
        this.indexFile = path.join(this.blobDir, 'index.json');
        this.indexedFiles = {};
        this.shaMethod = 'sha1'; // in the future this may change to sha512 method
    };

// Inherits from BlobManagerBase
    BlobManagerFS.prototype = Object.create(BlobManagerBase.prototype);

// Override the constructor with this object's constructor
    BlobManagerFS.prototype.constructor = BlobManagerFS;

    BlobManagerFS.prototype.initialize = function (callback) {
        var self = this;

        // TODO: use the async version here
        self._ensureDirectory(self.blobDir, function (err) {
            if (err) {
                callback(err);
                return;
            }


            // TODO: use the async version here

            if (fs.existsSync(self.indexFile)) {
                self.indexedFiles = JSON.parse(fs.readFileSync(self.indexFile));
            }

            // testing storage
            self.save({name:'test'}, 'test storage', function (err, hash) {
                if (err) {
                    callback(err);
                    return;
                }

                self.load(hash, function (err) {
                    if (err) {
                        callback(err);
                    } else {
                        callback(null);
                    }
                });
            });
        });
    };

    BlobManagerFS.prototype.save = function (info, blob, callback) {
        var self = this;

        var size = blob.length;

        var shasum = crypto.createHash(this.shaMethod);

        shasum.update(blob);

        var hash = shasum.digest('hex');

        var objectFilename = path.join(this.blobDir, this._getObjectRelativeLocation(hash));

        self._ensureDirectory(path.dirname(objectFilename), function (err) {
            if (err) {
                callback(err);
                return;
            }

            fs.writeFile(objectFilename, blob, function (err) {
                if (err) {
                    callback(err);
                    return;
                }

                self.indexedFiles[hash] = {
                    fullPath: info.name,
                    filename: path.basename(info.name),
                    type: path.extname(info.name),
                    created: (new Date()).toISOString(),
                    size: size
                };

                // TODO: we need a lock if multiple processes are accessing to this file
                fs.writeFileSync(self.indexFile, JSON.stringify(self.indexedFiles, null, 4));
                callback(null, hash);
            });
        });


    };

    BlobManagerFS.prototype.load = function (hash, callback) {
        var self = this;

        var filename = path.join(this.blobDir, this._getObjectRelativeLocation(hash));
        fs.readFile(filename, function (err, data) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, data, self.getInfo(hash).filename);
        });
    };

    BlobManagerFS.prototype.loadInfos = function (query, callback) {
        // TODO: what is the expected return value here?
        callback(null, this.indexedFiles);
    };

    BlobManagerFS.prototype._ensureDirectory = function (dirname, callback) {
        // FIXME: this function does not create all missing directories in the path

        if (fs.existsSync(dirname) === false) {
            fs.mkdir(dirname, function (err) {
                callback(err);
            });
        } else {
            callback(null);
        }
    };

    BlobManagerFS.prototype._getObjectRelativeLocation = function (hash) {
        return hash.slice(0, 2) + '/' + hash.slice(2);
    };

    BlobManagerFS.prototype.getObjectLocation = function (hash) {
        return path.join(this.blobDir, this._getObjectRelativeLocation(hash));
    };

    BlobManagerFS.prototype.getInfo = function(hash) {
        return this.indexedFiles[hash];
    };

    BlobManagerFS.prototype.getHashes = function() {
        return Object.keys(this.indexedFiles);
    };


    return BlobManagerFS
});
