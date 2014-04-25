/**
 * Created by zsolt on 4/15/14.
 *
 * Represents a complex artifact in BLOB storage.
 */

define([], function () {

    var Artifact = function (name, blobClient, descriptor) {
        this.name = name;
        this.blobClient = blobClient;
        this.descriptor = descriptor || {
            name: name + '.zip',
            size: 0,
            mime: 'application/zip',
            content: {},
            contentType: 'complex'
        }; // name and hash pairs
    };

    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClient.addObject(filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.blobClient.getInfo(hash, function (err, metadata) {
                if (self.descriptor.content.hasOwnProperty(name)) {
                    callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

                } else {
                    self.descriptor.size += metadata.size;

                    self.descriptor.content[name] = {
                        content: metadata.content,
                        contentType: 'object'
                    };
                    callback(null, hash);
                }
            });
        });
    };

    Artifact.prototype.addFiles = function (o, callback) {
        var self = this,
            fileNames = Object.keys(o),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i;

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

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

    Artifact.prototype.addHash = function (name, hash, callback) {
        var self = this;

        self.blobClient.getInfo(hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: metadata.content,
                    contentType: 'object'
                };
                callback(null, hash);
            }
        });
    };

    Artifact.prototype.save = function (callback) {
        this.blobClient.addComplexObject(this.descriptor, callback);
    };


    return Artifact
});