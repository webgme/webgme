/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define(['./Artifact', 'blob/BlobMetadata', 'superagent'], function (Artifact, BlobMetadata, superagent) {

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
        superagent.post(this.getCreateURL(name))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', data.length)
            .send(data)
            .end(function (err, res) {
                var response = res.body;
                // TODO: handle error
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var self = this;
        var metadata = new BlobMetadata(metadataDescriptor);

        // FIXME: in production mode do not indent the json file.
        var blob;
        var contentLength;
        if (typeof Blob !== 'undefined') {
            blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});
            contentLength = blob.size;
        } else {
            blob = new Buffer(JSON.stringify(metadata.serialize(), null, 4), 'utf8');
            contentLength = blob.length;
        }

        superagent.post(this.getCreateURL(metadataDescriptor.name, true))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', contentLength)
            .send(blob)
            .end(function (err, res) {
                // Uploaded.
                var response = JSON.parse(res.text);
                // TODO: handle error
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
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
        superagent.parse['application/zip'] = function (obj, parseCallback) {
            if (parseCallback) {
                // Running on node; this should be unreachable due to req.pipe() below
            } else {
                return obj;
            }
        }

        var req = superagent.get(this.getViewURL(hash));
        if (req.pipe) {
            // running on node
            var Writable = require('stream').Writable;
            require('util').inherits(BuffersWritable, Writable);

            function BuffersWritable(options) {
                Writable.call(this, options);

                var self = this;
                self.buffers = [];
            }
            BuffersWritable.prototype._write = function(chunk, encoding, callback) {
                this.buffers.push(chunk);
                callback();
            };

            var buffers = new BuffersWritable();
            buffers.on('finish', function () {
                callback(null, Buffer.concat(buffers.buffers));
            });
            buffers.on('error', function (err) {
                callback(err);
            });
            req.pipe(buffers);
        } else {
            req.on('request', function () {
                if (typeof this.xhr !== 'undefined') {
                    this.xhr.responseType = 'arraybuffer';
                }
            })
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                } else {
                    // response is an arraybuffer
                    callback(null, res.xhr.response);
                }
            });
        }
    };

    BlobClient.prototype.getMetadata = function (hash, callback) {
        superagent.get(this.getMetadataURL(hash))
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                } else {
                    callback(null, JSON.parse(res.text));
                }
            });
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