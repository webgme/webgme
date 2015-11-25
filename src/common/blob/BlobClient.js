/*globals define, escape*/
/*jshint browser: true, node:true*/

/**
 * Client module for accessing the blob.
 *
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */

define(['blob/Artifact',
        'blob/BlobMetadata',
        'superagent',
        'q',
        'common/util/uint'
    ],
    function (Artifact, BlobMetadata, superagent, Q, UINT) {
        'use strict';

        /**
         *
         * @param {object} parameters
         * @constructor
         * @alias BlobClient
         */
        var BlobClient = function (parameters) {
            this.artifacts = [];

            if (parameters) {
                this.server = parameters.server || this.server;
                this.serverPort = parameters.serverPort || this.serverPort;
                this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
                this.webgmeclientsession = parameters.webgmeclientsession;
                this.keepaliveAgentOptions = parameters.keepaliveAgentOptions || {/* use defaults */};
            } else {
                this.keepaliveAgentOptions = {/* use defaults */};
            }
            this.origin = '';
            if (this.httpsecure !== undefined && this.server && this.serverPort) {
                this.origin = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
            }
            this.relativeUrl = '/rest/blob/';
            this.blobUrl = this.origin + this.relativeUrl;
            // TODO: TOKEN???
            // TODO: any ways to ask for this or get it from the configuration?

            this.isNodeOrNodeWebKit = typeof process !== 'undefined';
            if (this.isNodeOrNodeWebKit) {
                // node or node-webkit
                if (this.httpsecure) {
                    this.Agent = require('agentkeepalive').HttpsAgent;
                } else {
                    this.Agent = require('agentkeepalive');
                }
                if (this.keepaliveAgentOptions.hasOwnProperty('ca') === false) {
                    this.keepaliveAgentOptions.ca = require('https').globalAgent.options.ca;
                }
                this.keepaliveAgent = new this.Agent(this.keepaliveAgentOptions);
            }
        };

        BlobClient.prototype.getMetadataURL = function (hash) {
            return this.origin + this.getRelativeMetadataURL(hash);
        };

        BlobClient.prototype.getRelativeMetadataURL = function (hash) {
            var metadataBase = this.relativeUrl + 'metadata';
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
            return this.relativeUrl + base + '/' + hash + '/' + encodeURIComponent(subpathURL);
        };

        BlobClient.prototype.getViewURL = function (hash, subpath) {
            return this.origin + this.getRelativeViewURL(hash, subpath);
        };

        BlobClient.prototype.getRelativeViewURL = function (hash, subpath) {
            return this._getURL('view', hash, subpath);
        };

        BlobClient.prototype.getDownloadURL = function (hash, subpath) {
            return this.origin + this.getRelativeDownloadURL(hash, subpath);
        };

        BlobClient.prototype.getRelativeDownloadURL = function (hash, subpath) {
            return this._getURL('download', hash, subpath);
        };

        BlobClient.prototype.getCreateURL = function (filename, isMetadata) {
            return this.origin + this.getRelativeCreateURL(filename, isMetadata);
        };

        BlobClient.prototype.getRelativeCreateURL = function (filename, isMetadata) {
            if (isMetadata) {
                return this.relativeUrl + 'createMetadata/';
            } else {
                return this.relativeUrl + 'createFile/' + encodeURIComponent(filename);
            }
        };

        BlobClient.prototype.putFile = function (name, data, callback) {
            var deferred = Q.defer(),
                contentLength,
                req;

            function toArrayBuffer(buffer) {
                var ab = new ArrayBuffer(buffer.length);
                var view = new Uint8Array(ab);
                for (var i = 0; i < buffer.length; ++i) {
                    view[i] = buffer[i];
                }
                return ab;
            }

            // On node-webkit, we use XMLHttpRequest, but xhr.send thinks a Buffer is a string and encodes it in utf-8 -
            // send an ArrayBuffer instead.
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

            if (typeof window === 'undefined') {
                req.agent(this.keepaliveAgent);
            }

            if (this.webgmeclientsession) {
                req.set('webgmeclientsession', this.webgmeclientsession);
            }
            if (typeof data !== 'string' && !(data instanceof String)) {
                req.set('Content-Length', contentLength);
            }
            req.set('Content-Type', 'application/octet-stream')
                .send(data)
                .end(function (err, res) {
                    if (err || res.status > 399) {
                        deferred.reject(err || res.status);
                        return;
                    }
                    var response = res.body;
                    // Get the first one
                    var hash = Object.keys(response)[0];
                    deferred.resolve(hash);
                });

            return deferred.promise.nodeify(callback);
        };

        BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
            var metadata = new BlobMetadata(metadataDescriptor),
                deferred = Q.defer(),
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

            if (typeof window === 'undefined') {
                req.agent(this.keepaliveAgent);
            }

            req.set('Content-Type', 'application/octet-stream')
                .set('Content-Length', contentLength)
                .send(blob)
                .end(function (err, res) {
                    if (err || res.status > 399) {
                        deferred.reject(err || res.status);
                        return;
                    }
                    // Uploaded.
                    var response = JSON.parse(res.text);
                    // Get the first one
                    var hash = Object.keys(response)[0];
                    deferred.resolve(hash);
                });

            return deferred.promise.nodeify(callback);
        };

        BlobClient.prototype.putFiles = function (o, callback) {
            var self = this,
                deferred = Q.defer(),
                error = '',
                filenames = Object.keys(o),
                remaining = filenames.length,
                hashes = {},
                putFile;

            if (remaining === 0) {
                deferred.resolve(hashes);
            }
            putFile = function (filename, data) {
                self.putFile(filename, data, function (err, hash) {
                    remaining -= 1;

                    hashes[filename] = hash;

                    if (err) {
                        error += 'putFile error: ' + err.toString();
                    }

                    if (remaining === 0) {
                        if (error) {
                            deferred.reject(error);
                        } else {
                            deferred.resolve(hashes);
                        }
                    }
                });
            };

            for (var j = 0; j < filenames.length; j += 1) {
                putFile(filenames[j], o[filenames[j]]);
            }

            return deferred.promise.nodeify(callback);
        };

        BlobClient.prototype.getSubObject = function (hash, subpath, callback) {
            return this.getObject(hash, callback, subpath);
        };

        BlobClient.prototype.getObject = function (hash, callback, subpath) {
            var deferred = Q.defer();

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

            if (typeof window === 'undefined') {
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

                BuffersWritable.prototype._write = function (chunk, encoding, cb) {
                    this.buffers.push(chunk);
                    cb();
                };

                var buffers = new BuffersWritable();
                buffers.on('finish', function () {
                    if (req.req.res.statusCode > 399) {
                        deferred.reject(req.req.res.statusCode);
                    } else {
                        deferred.resolve(Buffer.concat(buffers.buffers));
                    }
                });
                buffers.on('error', function (err) {
                    deferred.reject(err);
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
                req.on('end', function () {
                    if (req.xhr.status > 399) {
                        deferred.reject(req.xhr.status);
                    } else {
                        var contentType = req.xhr.getResponseHeader('content-type');
                        var response = req.xhr.response; // response is an arraybuffer
                        if (contentType === 'application/json') {
                            response = JSON.parse(UINT.uint8ArrayToString(new Uint8Array(response)));
                        }
                        deferred.resolve(response);
                    }
                });
                // TODO: Why is there an end here too? Isn't req.on('end',..) enough?
                req.end(function (err, result) {
                    if (err) {
                        deferred.reject(err);
                    } else {
                        deferred.resolve(result);
                    }
                });
            }

            return deferred.promise.nodeify(callback);
        };

        BlobClient.prototype.getMetadata = function (hash, callback) {
            var req = superagent.get(this.getMetadataURL(hash)),
                deferred = Q.defer();

            if (this.webgmeclientsession) {
                req.set('webgmeclientsession', this.webgmeclientsession);
            }

            if (typeof window === 'undefined') {
                req.agent(this.keepaliveAgent);
            }

            req.end(function (err, res) {
                if (err || res.status > 399) {
                    deferred.reject(err || res.status);
                } else {
                    deferred.resolve(JSON.parse(res.text));
                }
            });

            return deferred.promise.nodeify(callback);
        };

        /**
         *
         * @param {string} name
         * @returns {Artifact}
         */
        BlobClient.prototype.createArtifact = function (name) {
            var artifact = new Artifact(name, this);
            this.artifacts.push(artifact);
            return artifact;
        };

        BlobClient.prototype.getArtifact = function (metadataHash, callback) {
            // TODO: get info check if complex flag is set to true.
            // TODO: get info get name.
            var self = this,
                deferred = Q.defer();
            this.getMetadata(metadataHash, function (err, info) {
                if (err) {
                    callback(err);
                    return;
                }

                if (info.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                    var artifact = new Artifact(info.name, self, info);
                    self.artifacts.push(artifact);
                    deferred.resolve(artifact);
                } else {
                    deferred.reject(new Error('not supported contentType ' + JSON.stringify(info, null, 4)));
                }

            });

            return deferred.promise.nodeify(callback);
        };

        BlobClient.prototype.saveAllArtifacts = function (callback) {
            var promises = [];

            for (var i = 0; i < this.artifacts.length; i += 1) {
                promises.push(this.artifacts[i].save());
            }

            return Q.all(promises).nodeify(callback);
        };

        BlobClient.prototype.getHumanSize = function (bytes, si) {
            var thresh = si ? 1000 : 1024,
                units = si ?
                    ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] :
                    ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'],
                u = -1;

            if (bytes < thresh) {
                return bytes + ' B';
            }

            do {
                bytes = bytes / thresh;
                u += 1;
            } while (bytes >= thresh);

            return bytes.toFixed(1) + ' ' + units[u];
        };

        return BlobClient;
    });
