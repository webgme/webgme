/**
 * Created by zsolt on 4/15/14.
 *
 * Represents a complex artifact in BLOB storage.
 */

define([], function () {

    var Artifact = function (name, blobClient, descriptor) {
        this.name = name;
        this.blobClient = blobClient;
        this.descriptor = descriptor || {}; // name and hash pairs
    };

    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);
        this.blobClient.addObject(filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.descriptor[name] = hash;
            callback(null, hash);
        });
    };

    Artifact.prototype.addFiles = function (o, callback) {
        var self = this,
            fileNames = Object.keys(o),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i;

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFile(fileNames[i], o[fileNames[i]], function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        callback('Failed adding files: ' + error, hashes);
                        return;
                    }
                    callback(null, hashes);
                }
            });
        }
    };

    Artifact.prototype.addHash = function (name, hash) {
        this.descriptor[name] = hash;
    };

    Artifact.prototype.save = function (callback) {
        this.blobClient.addComplexObject(this.name, this.descriptor, callback);
    };


    return Artifact
});