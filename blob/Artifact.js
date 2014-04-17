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
        throw new Error('not implemented yet.');
    };

    Artifact.prototype.addHash = function (name, hash) {
        this.descriptor[name] = hash;
    };

    Artifact.prototype.save = function (callback) {
        this.blobClient.addComplexObject(this.name, this.descriptor, callback);
    };


    return Artifact
});