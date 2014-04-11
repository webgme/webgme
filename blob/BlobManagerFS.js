/**
 * Created by Zsolt on 4/11/2014.
 */
define(['./BlobManagerBase', 'fs','crypto', 'path'], function (BlobManagerBase, fs, crypto, path) {

    var BlobManagerFS = function () {
        this.blobDir = path.join('./', 'blob-local-storage');
        this.indexFile = path.join(this.blobDir, 'index.json');
        this.shaMethod = 'sha1';

        if (fs.existsSync(this.blobDir) === false) {
            fs.mkdirSync(this.blobDir);
        }

        this.indexedFiles = {};

        if (fs.existsSync(this.indexFile)) {
            this.indexedFiles = JSON.parse(fs.readFileSync(this.indexFile));
        }
    };


    // Inherits from BlobManagerBase
    BlobManagerFS.prototype = Object.create(BlobManagerBase.prototype);

    // Override the constructor with this object's constructor
    BlobManagerFS.prototype.constructor = BlobManagerFS;


    BlobManagerFS.prototype.save = function (info, blob, callback) {
        // TODO: make this async and nicer
        // TODO: add error handling
        var shasum = crypto.createHash(this.shaMethod);

        shasum.update(blob);

        var hash = shasum.digest('hex');

        var objectFilename = path.join(this.blobDir, this._getObjectRelativeLocation(hash));

        if (fs.existsSync(path.dirname(objectFilename)) === false) {
            fs.mkdirSync(path.dirname(objectFilename));
        }

        fs.writeFileSync(objectFilename, blob);

        this.indexedFiles[hash] = {
            fullPath: info.name,
            filename: path.basename(info.name),
            type: path.extname(info.name),
            created: (new Date()).toISOString()
        };

        fs.writeFileSync(this.indexFile, JSON.stringify(this.indexedFiles, null, 4));

        callback(null, hash);
    };

    BlobManagerFS.prototype.load = function (hash, callback) {
        // TODO: make this async and nicer
        // TODO: add error handling
        callback(null, fs.readFileSync(path.join(this.blobDir, this._getObjectRelativeLocation(hash))), this.getInfo(hash).filename);
    };

    BlobManagerFS.prototype.loadInfos = function (query, callback) {
        // TODO: what is the expected return value here?
        callback(null, this.indexedFiles);
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
