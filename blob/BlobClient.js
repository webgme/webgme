/**
 * Created by zsolt on 4/15/14.
 */

define(['./Artifact'], function (Artifact) {

    var BlobClient = function () {
        this.artifacts = [];

        // TODO: TOKEN???
        this.blobUrl = '/rest/blob/'; // TODO: any ways to ask for this or get it from the configuration?
    };


    BlobClient.prototype.getInfosURL = function () {
        return this.blobUrl + 'metadata/';
    };

    BlobClient.prototype.getInfoURL = function (hash) {
        return this.blobUrl + 'metadata/' + hash + '/';
    };

    BlobClient.prototype.getViewURL = function (hash, subpath) {
        var subpathURL = '';
        if (subpath) {
            subpathURL = subpath;
        }
        return this.blobUrl + 'view/' + hash + '/' + subpathURL;
    };

    BlobClient.prototype.getDownloadURL = function (hash) {
        return this.blobUrl + 'download/' + hash;
    };

    BlobClient.prototype.getCreateURL = function (filename, complex) {
        if (complex) {
            return this.blobUrl + 'createMetadata/';
        } else {
            return this.blobUrl + 'createFile/' + filename;
        }
    };


    BlobClient.prototype.addObject = function (name, data, callback) {
        var oReq = new XMLHttpRequest();
        oReq.open("POST", this.getCreateURL(name), true);
        oReq.onload = function (oEvent) {
            // Uploaded.
            var response = JSON.parse(oEvent.target.response);
            // TODO: handle error
            // Get the first one
            var hash = Object.keys(response)[0];
            callback(null, hash);
        };

        // data is a file object or blob
        oReq.send(data);
    };

    BlobClient.prototype.addComplexObject = function (complexObjectDescriptor, callback) {
        var fnames = Object.keys(complexObjectDescriptor.content);
        fnames.sort();

        var metadata = {
            name: complexObjectDescriptor.name,
            size: complexObjectDescriptor.size,
            mime: complexObjectDescriptor.mime,
            content: {},
            contentType: complexObjectDescriptor.contentType
        };

        if (complexObjectDescriptor.contentType === 'complex') {
            for (var j = 0; j < fnames.length; j += 1) {
                metadata.content[fnames[j]] = complexObjectDescriptor.content[fnames[j]];
            }
        } else {
            callback('not supported metadata type');
            return;
        }


        var oReq = new XMLHttpRequest();
        oReq.open("POST", this.getCreateURL(name, true), true);
        oReq.onload = function (oEvent) {
            // Uploaded.
            var response = JSON.parse(oEvent.target.response);
            // TODO: handle error
            // Get the first one
            var hash = Object.keys(response)[0];
            callback(null, hash);
        };

        // FIXME: in production mode do not indent the json file.
        var blob = new Blob([JSON.stringify(metadata, null, 4)], {type: 'text/plain'});

        oReq.send(blob);
    };

    BlobClient.prototype.addObjects = function (o, callback) {
        var self = this;

        var filenames = Object.keys(o);
        var remaining = filenames.length;

        var hashes = {};

        for (var j = 0; j < filenames.length; j += 1) {
            (function(filename, data) {

                self.addObject(filename, data, function (err, hash) {
                    remaining -= 1;

                    hashes[filename] = hash;

                    if (err) {
                        // TODO: log/handle error
                        return;
                    }

                    if (remaining === 0) {
                        callback(null, hashes);
                    }
                });

            })(filenames[j], o[filenames[j]]);
        }
    };

    BlobClient.prototype.getObject = function (hash, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", this.getViewURL(hash), true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // FIXME: should this be somehow a pipe/stream?
                    callback(null, xhr.responseText);
                } else {
                    callback(xhr.status + ':' + xhr.statusText);
                }
            }
        };
        xhr.onerror = function (e) {
            callback(e);
        };
        xhr.send(null);
    };

    BlobClient.prototype.getInfo = function (hash, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", this.getInfoURL(hash), true);
        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    callback(null, JSON.parse(xhr.responseText));
                } else {
                    callback(xhr.status + ':' + xhr.statusText);
                }
            }
        };
        xhr.onerror = function (e) {
            callback(e);
        };
        xhr.send(null);
    };

    BlobClient.prototype.createArtifact = function (name) {
        var artifact = new Artifact(name, this);
        this.artifacts.push(artifact);
        return artifact;
    };

    BlobClient.prototype.getArtifact = function (metadataHash, callback) {
        // TODO: get info check if complex flag is set to true.
        // TODO: get info get name.
        var self = this;
        this.getInfo(metadataHash, function (err, info) {
            if (err) {
                callback(err);
                return;
            }

            if (info.contentType === 'complex') {
                var artifact = new Artifact(info.name, self, info);
                self.artifacts.push(artifact);
                callback(null, artifact);
            } else {
                callback('not supported contentType ' + JSON.stringify(info, null, 4));
            }


        });
    };

    BlobClient.prototype.saveAllArtifacts = function (callback) {
        var remaining = this.artifacts.length;
        var hashes = [];
        for (var i = 0; i < this.artifacts.length; i += 1) {

            this.artifacts[i].save(function(err, hash) {
                remaining -= 1;

                hashes.push(hash);

                if (err) {
                    // TODO: log/handle errors
                    return;
                }
                if (remaining === 0) {
                    callback(null, hashes);
                }
            });
        }
    };

    return BlobClient
});