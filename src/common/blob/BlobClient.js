/*globals define*/
/*jshint browser: true, node:true*/
/*
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */

define(['blob/Artifact', 'blob/BlobMetadata', 'superagent'], function (Artifact, BlobMetadata, superagent) {
    'use strict';

    var BlobClient = function (parameters) {
        this.artifacts = [];

        if (parameters) {
            this.server = parameters.server || this.server;
            this.serverPort = parameters.serverPort || this.serverPort;
            this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
            this.webgmeclientsession = parameters.webgmeclientsession;
            this.keepaliveAgentOptions = parameters.keepaliveAgentOptions || {
                maxSockets: 100,
                maxFreeSockets: 10,
                timeout: 60000,
                keepAliveTimeout: 30000 // free socket keep alive for 30 seconds
            };
        }
        this.blobUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.blobUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }

        // TODO: TOKEN???
        this.blobUrl = this.blobUrl + '/rest/blob/'; // TODO: any ways to ask for this or get it from the configuration?

        this.isNodeOrNodeWebKit = typeof process !== 'undefined';
        if (this.isNodeOrNodeWebKit) {
            // node or node-webkit
            if (this.httpsecure) {
                this.Agent = require('agentkeepalive').HttpsAgent;
            } else {
                this.Agent = require('agentkeepalive');
            }
            this.keepaliveAgent = new this.Agent(this.keepaliveAgentOptions);
        }
    };

    BlobClient.prototype.getMetadataURL = function (hash) {
        var metadataBase = this.blobUrl + 'metadata';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    BlobClient.prototype._getURL = function (base, hash, subpath) {
        var subpathURL = '';
        if (subpath) {
            subpathURL = subpath;
        }
        return this.blobUrl + base + '/' + hash + '/' + encodeURIComponent(subpathURL);
    };

    BlobClient.prototype.getViewURL = function (hash, subpath) {
        return this._getURL('view', hash, subpath);
    };

    BlobClient.prototype.getDownloadURL = function (hash, subpath) {
        return this._getURL('download', hash, subpath);
    };

    BlobClient.prototype.getCreateURL = function (filename, isMetadata) {
        if (isMetadata) {
            return this.blobUrl + 'createMetadata/';
        } else {
            return this.blobUrl + 'createFile/' + encodeURIComponent(filename);
        }
    };

    BlobClient.prototype.putFile = function (name, data, callback) {
        var contentLength,
            req;
        function toArrayBuffer(buffer) {
            var ab = new ArrayBuffer(buffer.length);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; ++i) {
                view[i] = buffer[i];
            }
            return ab;
        }
        // on node-webkit, we use XMLHttpRequest, but xhr.send thinks a Buffer is a string and encodes it in utf-8. Send an ArrayBuffer instead
        if (typeof window !== 'undefined' && typeof Buffer !== 'undefined' && data instanceof Buffer) {
            data = toArrayBuffer(data); // FIXME will this have performance problems
        }
        // on node, empty Buffers will cause a crash in superagent
        if (typeof window === 'undefined' && typeof Buffer !== 'undefined' && data instanceof Buffer) {
            if (data.length === 0) {
                data = '';
            }
        }
        contentLength = data.hasOwnProperty('length') ? data.length : data.byteLength;
        req = superagent.post(this.getCreateURL(name));

        if (this.isNodeOrNodeWebKit) {
            req.agent(this.keepaliveAgent);
        }

        if (this.webgmeclientsession) {
            req.set('webgmeclientsession', this.webgmeclientsession);
        }
        req.set('Content-Type', 'application/octet-stream')
            .set('Content-Length', contentLength)
            .send(data)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                var response = res.body;
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var metadata = new BlobMetadata(metadataDescriptor),
            blob,
            contentLength,
            req;
        // FIXME: in production mode do not indent the json file.
        if (typeof Blob !== 'undefined') {
            blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});
            contentLength = blob.size;
        } else {
            blob = new Buffer(JSON.stringify(metadata.serialize(), null, 4), 'utf8');
            contentLength = blob.length;
        }

        req = superagent.post(this.getCreateURL(metadataDescriptor.name, true));
        if (this.webgmeclientsession) {
            req.set('webgmeclientsession', this.webgmeclientsession);
        }

        if (this.isNodeOrNodeWebKit) {
            req.agent(this.keepaliveAgent);
        }

        req.set('Content-Type', 'application/octet-stream')
            .set('Content-Length', contentLength)
            .send(blob)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                // Uploaded.
                var response = JSON.parse(res.text);
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putFiles = function (o, callback) {
        var self = this,
            error = '',
            filenames = Object.keys(o),
            remaining = filenames.length,
            hashes = {},
            putFile;
        if (remaining === 0) {
            callback(null, hashes);
        }
        putFile = function(filename, data) {
            self.putFile(filename, data, function (err, hash) {
                remaining -= 1;

                hashes[filename] = hash;

                if (err) {
                    error += 'putFile error: ' + err.toString();
                }

                if (remaining === 0) {
                    callback(error, hashes);
                }
            });
        };

        for (var j = 0; j < filenames.length; j += 1) {
            putFile(filenames[j], o[filenames[j]]);
        }
    };

    BlobClient.prototype.getSubObject = function (hash, subpath, callback) {
        return this.getObject(hash, callback, subpath);
    };

    BlobClient.prototype.getObject = function (hash, callback, subpath) {
        superagent.parse['application/zip'] = function (obj, parseCallback) {
            if (parseCallback) {
                // Running on node; this should be unreachable due to req.pipe() below
            } else {
                return obj;
            }
        };
        //superagent.parse['application/json'] = superagent.parse['application/zip'];

        var req = superagent.get(this.getViewURL(hash, subpath));
        if (this.webgmeclientsession) {
            req.set('webgmeclientsession', this.webgmeclientsession);
        }

        if (this.isNodeOrNodeWebKit) {
            req.agent(this.keepaliveAgent);
        }

        if (req.pipe) {
            // running on node
            var Writable = require('stream').Writable;
            var BuffersWritable = function (options) {
                Writable.call(this, options);

                var self = this;
                self.buffers = [];
            };
            require('util').inherits(BuffersWritable, Writable);

            BuffersWritable.prototype._write = function(chunk, encoding, callback) {
                this.buffers.push(chunk);
                callback();
            };

            var buffers = new BuffersWritable();
            buffers.on('finish', function () {
                if (req.req.res.statusCode > 399) {
                    return callback(req.req.res.statusCode);
                }
                callback(null, Buffer.concat(buffers.buffers));
            });
            buffers.on('error', function (err) {
                callback(err);
            });
            req.pipe(buffers);
        } else {
            req.removeAllListeners('end');
            req.on('request', function () {
                if (typeof this.xhr !== 'undefined') {
                    this.xhr.responseType = 'arraybuffer';
                }
            });
            // req.on('error', callback);
            req.on('end', function() {
                if (req.xhr.status > 399) {
                    callback(req.xhr.status);
                } else {
                    var contentType = req.xhr.getResponseHeader('content-type');
                    var response = req.xhr.response; // response is an arraybuffer
                    if (contentType === 'application/json') {
                        var utf8ArrayToString = function (uintArray) {
                            var inputString = '',
                                i;
                            for (i = 0; i < uintArray.byteLength; i++) {
                                inputString += String.fromCharCode(uintArray[i]);
                            }
                            return decodeURIComponent(escape(inputString));
                        };
                        response = JSON.parse(utf8ArrayToString(new Uint8Array(response)));
                    }
                    callback(null, response);
                }
            });
            req.end(callback);
        }
    };

    BlobClient.prototype.getMetadata = function (hash, callback) {
        var req = superagent.get(this.getMetadataURL(hash));
        if (this.webgmeclientsession) {
            req.set('webgmeclientsession', this.webgmeclientsession);
        }

        if (this.isNodeOrNodeWebKit) {
            req.agent(this.keepaliveAgent);
        }

        req.end(function (err, res) {
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
        var remaining = this.artifacts.length,
            hashes = [],
            error = '',
            saveCallback;

        if (remaining === 0) {
            callback(null, hashes);
        }

        saveCallback = function(err, hash) {
            remaining -= 1;

            hashes.push(hash);

            if (err) {
                error += 'artifact.save err: ' + err.toString();
            }
            if (remaining === 0) {
                callback(error, hashes);
            }
        };

        for (var i = 0; i < this.artifacts.length; i += 1) {

            this.artifacts[i].save(saveCallback);
        }
    };

    return BlobClient;
});
