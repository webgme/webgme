/**
 * Created by zsolt on 4/19/14.
 */

define(['./BlobBackendBase',
    'fs',
    'crypto',
    'path',
    'util/guid',
    'util/ensureDir'],
    function (BlobBackendBase, fs, crypto, path, GUID, ensureDir) {

    var BlobFSBackend = function () {
        BlobBackendBase.call(this);
        this.blobDir = path.join('./', 'blob-local-storage');
    };

    // Inherits from BlobManagerBase
    BlobFSBackend.prototype = Object.create(BlobBackendBase.prototype);

    // Override the constructor with this object's constructor
    BlobFSBackend.prototype.constructor = BlobFSBackend;


    BlobFSBackend.prototype.putObject = function (readStream, bucket, callback) {
        // TODO generate a GUID or something for the temporary filename to allow parallel functioning
        var self = this,
            tempName = GUID() + ".tbf",// TODO: create this in the system temp folder
            writeStream = fs.createWriteStream(tempName),
            shasum = crypto.createHash(this.shaMethod),
            size = 0;

        writeStream.on('finish', function () {
            // at this point the temporary file have been written out
            // now the file have been written out
            // finalizing hash and moving temporary file..
            var hash = shasum.digest('hex'),
                objectFilename = path.join(self.blobDir, bucket, self._getObjectRelativeLocation(hash));

            ensureDir(path.dirname(objectFilename), function (err) {
                if (err) {
                    // FIXME: this code has to be reviewed.
                    fs.unlink(tempName, function (e) {
                        callback(err);
                    });
                    return;
                }

                fs.rename(tempName, objectFilename, function (err) {
                    // FIXME: this code has to be reviewed.
                    if (err) {
                        fs.unlink(tempName, function (e) {
                            callback(err);
                        });
                        return;
                    }

                    callback(null, hash, size);
                });
            });
        });

        readStream.pipe(writeStream);

        //TODO this implementation should be moved to another class which inherits from writeablestream...
        readStream.on('data', function (chunk) {
            shasum.update(chunk);
            size += chunk.length; //TODO does it really have a length field always???
        });
    };

    BlobFSBackend.prototype.getObject = function (hash, writeStream, bucket, callback) {
        var filename = path.join(this.blobDir, bucket, this._getObjectRelativeLocation(hash)),
            readStream = fs.createReadStream(filename);

        writeStream.on('finish', function () {
            // FIXME: any error handling here?
            callback(null);
        });

        readStream.pipe(writeStream);
    };

    BlobFSBackend.prototype.listObjects = function (bucket, callback) {
        throw new Error('Not implemented yet.');
    };

    BlobFSBackend.prototype._getObjectRelativeLocation = function (hash) {
        return hash.slice(0, 2) + '/' + hash.slice(2);
    };

    return BlobFSBackend;
});