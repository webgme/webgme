/*globals define, console*/
/*jshint browser: true, node:true*/

/**
 * Client module for accessing the blob.
 *
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */

define([
    'blob/Artifact',
    'blob/BlobMetadata',
    'superagent',
    'q',
    'common/util/uint'
], function (Artifact, BlobMetadata, superagent, Q, UINT) {
    'use strict';

    /**
     * Client to interact with the blob-storage. <br>
     *
     * @param {object} parameters
     * @param {object} parameters.logger
     * @constructor
     * @alias BlobClient
     */
    var BlobClient = function (parameters) {
        var self = this;
        this.artifacts = [];
        if (parameters && parameters.logger) {
            this.logger = parameters.logger;
        } else {
            var doLog = function () {
                console.log.apply(console, arguments);
            };
            this.logger = {
                debug: doLog,
                log: doLog,
                info: doLog,
                warn: doLog,
                error: doLog
            };
            console.warn('Since v1.3.0 BlobClient requires a logger, falling back on console.log.');
        }

        if (parameters && parameters.uploadProgressHandler) {
            this.uploadProgressHandler = parameters.uploadProgressHandler;
        } else {
            this.uploadProgressHandler = function (fName, e) {
                self.logger.debug('File upload of', fName, e.percent, '%');
            };
        }

        this.logger.debug('ctor', {metadata: parameters});

        if (parameters) {
            this.server = parameters.server || this.server;
            this.serverPort = parameters.serverPort || this.serverPort;
            this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
            this.webgmeToken = parameters.webgmeToken;
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
            this.logger.debug('Running under node or node-web-kit');
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

        this.logger.debug('origin', this.origin);
        this.logger.debug('blobUrl', this.blobUrl);
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

    /**
     * Returns the get-url for downloading a blob.
     * @param {string} metadataHash
     * @param {string} [subpath] - optional file-like path to sub-object if complex blob
     * @return {string} get-url for blob
     */
    BlobClient.prototype.getDownloadURL = function (metadataHash, subpath) {
        return this.origin + this.getRelativeDownloadURL(metadataHash, subpath);
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

    /**
     * Adds a file to the blob storage.
     * @param {string} name - file name.
     * @param {string|Buffer|ArrayBuffer} data - file content.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise} On success the promise will be resolved with {string} <b>metadataHash</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.putFile = function (name, data, callback) {
        var deferred = Q.defer(),
            self = this,
            contentLength,
            req;

        this.logger.debug('putFile', name);

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

        if (this.webgmeToken) {
            req.set('Authorization', 'Bearer ' + this.webgmeToken);
        }

        if (typeof data !== 'string' && !(data instanceof String) && typeof window === 'undefined') {
            req.set('Content-Length', contentLength);
        }

        req.set('Content-Type', 'application/octet-stream')
            .send(data)
            .on('progress', function (event) {
                self.uploadProgressHandler(name, event);
            })
            .end(function (err, res) {
                if (err || res.status > 399) {
                    deferred.reject(err || new Error(res.status));
                    return;
                }
                var response = res.body;
                // Get the first one
                var hash = Object.keys(response)[0];
                self.logger.debug('putFile - result', hash);
                deferred.resolve(hash);
            });

        return deferred.promise.nodeify(callback);
    };

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var metadata = new BlobMetadata(metadataDescriptor),
            deferred = Q.defer(),
            self = this,
            blob,
            contentLength,
            req;
        // FIXME: in production mode do not indent the json file.
        this.logger.debug('putMetadata', {metadata: metadataDescriptor});
        if (typeof Blob !== 'undefined') {
            blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});
            contentLength = blob.size;
        } else {
            blob = new Buffer(JSON.stringify(metadata.serialize(), null, 4), 'utf8');
            contentLength = blob.length;
        }

        req = superagent.post(this.getCreateURL(metadataDescriptor.name, true));
        if (this.webgmeToken) {
            req.set('Authorization', 'Bearer ' + this.webgmeToken);
        }

        if (typeof window === 'undefined') {
            req.agent(this.keepaliveAgent);
            req.set('Content-Length', contentLength);
        }

        req.set('Content-Type', 'application/octet-stream')
            .send(blob)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    deferred.reject(err || new Error(res.status));
                    return;
                }
                // Uploaded.
                var response = JSON.parse(res.text);
                // Get the first one
                var hash = Object.keys(response)[0];
                self.logger.debug('putMetadata - result', hash);
                deferred.resolve(hash);
            });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Adds multiple files to the blob storage.
     * @param {object.<string, string|Buffer|ArrayBuffer>} o - Keys are file names and values the content.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise} On success the promise will be resolved with {object} <b>fileNamesToMetadataHashes</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.putFiles = function (o, callback) {
        var self = this,
            deferred = Q.defer(),
            error,
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
                    error = err;
                    self.logger.error('putFile failed with error', {metadata: err});
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

    /**
     * Retrieves object from blob storage as a Buffer under node and as an ArrayBuffer in the client.
     * N.B. if the retrieved file is a json-file and running in a browser, the content will be decoded and
     * the string parsed as a JSON.
     * @param {string} metadataHash - hash of metadata for object.
     * @param {function} [callback] - if provided no promise will be returned.
     * @param {string} [subpath] - optional file-like path to sub-object if complex blob
     *
     * @return {external:Promise} On success the promise will be resolved with {Buffer|ArrayBuffer|object}
     * <b>content</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.getObject = function (metadataHash, callback, subpath) {
        var deferred = Q.defer(),
            self = this;

        this.logger.debug('getObject', metadataHash, subpath);

        superagent.parse['application/zip'] = function (obj, parseCallback) {
            if (parseCallback) {
                // Running on node; this should be unreachable due to req.pipe() below
            } else {
                return obj;
            }
        };
        //superagent.parse['application/json'] = superagent.parse['application/zip'];

        var req = superagent.get(this.getViewURL(metadataHash, subpath));
        if (this.webgmeToken) {
            req.set('Authorization', 'Bearer ' + this.webgmeToken);
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
                    deferred.reject(new Error(req.req.res.statusCode));
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
                    deferred.reject(new Error(req.xhr.status));
                } else {
                    var contentType = req.xhr.getResponseHeader('content-type');
                    var response = req.xhr.response; // response is an arraybuffer
                    if (contentType === 'application/json') {
                        response = JSON.parse(UINT.uint8ArrayToString(new Uint8Array(response)));
                    }
                    self.logger.debug('getObject - result', {metadata: response});
                    deferred.resolve(response);
                }
            });
            // TODO: Why is there an end here too? Isn't req.on('end',..) enough?
            req.end(function (err, result) {
                if (err) {
                    deferred.reject(err);
                } else {
                    self.logger.debug('getObject - result', {metadata: result});
                    deferred.resolve(result);
                }
            });
        }

        return deferred.promise.nodeify(callback);
    };

    /**
     * Retrieves object from blob storage and parses the content as a string.
     * @param {string} metadataHash - hash of metadata for object.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise} On success the promise will be resolved with {string} <b>contentString</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.getObjectAsString = function (metadataHash, callback) {
        var self = this;
        return self.getObject(metadataHash)
            .then(function (content) {
                if (typeof content === 'string') {
                    // This does currently not happen..
                    return content;
                } else if (typeof Buffer !== 'undefined' && content instanceof Buffer) {
                    return UINT.uint8ArrayToString(new Uint8Array(content));
                } else if (content instanceof ArrayBuffer) {
                    return UINT.uint8ArrayToString(new Uint8Array(content));
                } else if (content !== null && typeof content === 'object') {
                    return JSON.stringify(content);
                } else {
                    throw new Error('Unknown content encountered: ' + content);
                }
            })
            .nodeify(callback);
    };

    /**
     * Retrieves object from blob storage and parses the content as a JSON. (Will resolve with error if not valid JSON.)
     * @param {string} metadataHash - hash of metadata for object.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise} On success the promise will be resolved with {object} <b>contentJSON</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.getObjectAsJSON = function (metadataHash, callback) {
        var self = this;
        return self.getObject(metadataHash)
            .then(function (content) {
                if (typeof content === 'string') {
                    // This does currently not happen..
                    return JSON.parse(content);
                } else if (typeof Buffer !== 'undefined' && content instanceof Buffer) {
                    return JSON.parse(UINT.uint8ArrayToString(new Uint8Array(content)));
                } else if (content instanceof ArrayBuffer) {
                    return JSON.parse(UINT.uint8ArrayToString(new Uint8Array(content)));
                } else if (content !== null && typeof content === 'object') {
                    return content;
                } else {
                    throw new Error('Unknown content encountered: ' + content);
                }
            })
            .nodeify(callback);
    };

    /**
     * Retrieves metadata from blob storage.
     * @param {string} metadataHash - hash of metadata.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise} On success the promise will be resolved with {object} <b>metadata</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.getMetadata = function (metadataHash, callback) {
        var req = superagent.get(this.getMetadataURL(metadataHash)),
            deferred = Q.defer(),
            self = this;

        this.logger.debug('getMetadata', metadataHash);

        if (this.webgmeToken) {
            req.set('Authorization', 'Bearer ' + this.webgmeToken);
        }

        if (typeof window === 'undefined') {
            req.agent(this.keepaliveAgent);
        }

        req.end(function (err, res) {
            if (err || res.status > 399) {
                deferred.reject(err || new Error(res.status));
            } else {
                self.logger.debug('getMetadata', res.text);
                deferred.resolve(JSON.parse(res.text));
            }
        });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Creates a new artifact and adds it to array of artifacts of the instance.
     * @param {string} name - Name of artifact
     * @return {Artifact}
     */
    BlobClient.prototype.createArtifact = function (name) {
        var artifact = new Artifact(name, this);
        this.artifacts.push(artifact);
        return artifact;
    };

    /**
     * Retrieves the {@link Artifact} from the blob storage.
     * @param {hash} metadataHash - hash associated with the artifact.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with
     * {@link Artifact} <b>artifact</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.getArtifact = function (metadataHash, callback) {
        // TODO: get info check if complex flag is set to true.
        // TODO: get info get name.
        var self = this,
            deferred = Q.defer();
        this.logger.debug('getArtifact', metadataHash);
        this.getMetadata(metadataHash, function (err, info) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.logger.debug('getArtifact - return', {metadata: info});
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

    /**
     * Saves all the artifacts associated with the current instance.
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with
     * {string[]} <b>artifactHashes</b> (metadataHashes).<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    BlobClient.prototype.saveAllArtifacts = function (callback) {
        var promises = [];

        for (var i = 0; i < this.artifacts.length; i += 1) {
            promises.push(this.artifacts[i].save());
        }

        return Q.all(promises).nodeify(callback);
    };

    /**
     * Converts bytes to a human readable string.
     * @param {number} - File size in bytes.
     * @param {boolean} [si] - If true decimal conversion will be used (by default binary is used).
     * @returns {string}
     */
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
