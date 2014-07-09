/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(['./Artifact', 'blob/BlobMetadata'], function (Artifact, BlobMetadata) {

    var BlobClient = function (parameters) {
        this.artifacts = [];

        if (parameters) {
            this.server = parameters.server || this.server;
            this.serverPort = parameters.serverPort || this.serverPort;
            this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
        }
        this.blobUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.blobUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }

        // TODO: TOKEN???
        this.blobUrl = this.blobUrl + '/rest/blob/'; // TODO: any ways to ask for this or get it from the configuration?
    };

    BlobClient.prototype.getMetadataURL = function (hash) {
        var metadataBase = this.blobUrl + 'metadata';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
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

    BlobClient.prototype.getCreateURL = function (filename, isMetadata) {
        if (isMetadata) {
            return this.blobUrl + 'createMetadata/';
        } else {
            return this.blobUrl + 'createFile/' + filename;
        }
    };


    BlobClient.prototype.putFile = function (name, data, callback) {
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

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var self = this;
        var metadata = new BlobMetadata(metadataDescriptor);

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
        var blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});

        oReq.send(blob);
    };

    BlobClient.prototype.putFiles = function (o, callback) {
        var self = this;

        var filenames = Object.keys(o);
        var remaining = filenames.length;

        var hashes = {};

        for (var j = 0; j < filenames.length; j += 1) {
            (function(filename, data) {

                self.putFile(filename, data, function (err, hash) {
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
        xhr.responseType = "arraybuffer";

        xhr.onload = function (e) {
            if (xhr.readyState === 4) {
                if (xhr.status === 200) {
                    // response is an arraybuffer
                    callback(null, xhr.response);
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

    BlobClient.prototype.getMetadata = function (hash, callback) {
        var xhr = new XMLHttpRequest();
        xhr.open("GET", this.getMetadataURL(hash), true);
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
        this.getMetadata(metadataHash, function (err, info) {
            if (err) {
                callback(err);
                return;
            }

            if (info.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
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

        if (remaining === 0) {
            callback(null, hashes);
        }

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

    return BlobClient;
});