/*globals define*/
/*jshint node:true*/

/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 *
 * Server side BLOB client implementation.
 */

define(['blob/BlobClient', 'blob/BlobMetadata', 'http', 'https', 'util/StringStreamWriter'],
    function (BlobClient, BlobMetadata, http, https, StringStreamWriter) {
        'use strict';
        /**
         * Initializes a new instance of a server side blob client that makes http requests.
         *
         * Note: This code strictly runs in node.js (server side).
         *
         * @param {{}} parameters
         * @constructor
         */
        function BlobServerClient(parameters) {
            BlobClient.call(this);
            this.server = parameters.server || '127.0.0.1';
            this.serverPort = parameters.serverPort;
            this._clientSession = parameters.sessionId;
        }

        // Inherits from BlobClient
        BlobServerClient.prototype = Object.create(BlobClient.prototype);

        // Override the constructor with this object's constructor
        BlobServerClient.prototype.constructor = BlobServerClient;

        BlobServerClient.prototype.getMetadata = function (hash, callback) {
            var options = {
                hostname: this.server,
                port: this.serverPort,
                path: this.getMetadataURL(hash),
                method: 'GET'
            };

            this._sendHttpRequest(options, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, JSON.parse(data));
            });
        };

        BlobServerClient.prototype.getObject = function (hash, callback) {
            var options = {
                hostname: this.server,
                port: this.serverPort,
                path: this.getViewURL(hash),
                method: 'GET'
            };

            this._sendHttpRequest(options, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                // TODO: we should use arraybuffer here.
                callback(null, data);
            });
        };


        BlobServerClient.prototype.putMetadata = function (metadataDescriptor, callback) {
            var self = this;
            var metadata = new BlobMetadata(metadataDescriptor);

            var options = {
                hostname: this.server,
                port: this.serverPort,
                path: this.getCreateURL(metadata.name, true),
                method: 'POST'
            };

            self._sendHttpRequestWithContent(options, JSON.stringify(metadata.serialize(), null, 4), function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }

                var response = JSON.parse(data);
                // TODO: handle error
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
        };


        BlobServerClient.prototype.putFile = function (name, data, callback) {
            var options = {
                hostname: this.server,
                port: this.serverPort,
                path: this.getCreateURL(name),
                method: 'POST'
            };

            this._sendHttpRequestWithContent(options, data, function (err, responseData) {
                if (err) {
                    callback(err);
                    return;
                }

                var response = JSON.parse(responseData);
                // TODO: handle error
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
        };

        // -------------------------------------------------------------------------------------------------------------
        // Private helper functions

        BlobServerClient.prototype._ensureAuthenticated = function (options, callback) {
            //this function enables the session of the client to be authenticated
            //TODO curently this user does not have a session, so it has to upgrade the options always!!!
            if (options.headers) {
                options.headers.webgmeclientsession = this._clientSession;
            } else {
                options.headers = {
                    'webgmeclientsession': this._clientSession
                };
            }
            callback(null, options);
        };

        BlobServerClient.prototype._sendHttpRequest = function (options, callback) {
            var self = this;
            self._ensureAuthenticated(options, function (err, updatedOptions) {
                if (err) {
                    callback(err);
                } else {
                    self.__sendHttpRequest(updatedOptions, callback);
                }
            });
        };

        BlobServerClient.prototype.__sendHttpRequest = function (options, callback) {
            // TODO: use the http or https
            var req = http.request(options, function (res) {
                var bufferStream = new StringStreamWriter();

                res.on('end', function () {
                    if (res.statusCode === 200) {
                        callback(null, bufferStream.getBuffer());
                    } else {
                        callback(res.statusCode, bufferStream.getBuffer());
                    }
                });

                res.pipe(bufferStream);

            });

            req.on('error', function (e) {
                callback(e);
            });

            req.end();
        };

        BlobServerClient.prototype._sendHttpRequestWithContent = function (options, data, callback) {
            var self = this;
            self._ensureAuthenticated(options, function (err, updatedOptions) {
                if (err) {
                    callback(err);
                } else {
                    self.__sendHttpRequestWithContent(updatedOptions, data, callback);
                }
            });
        };

        BlobServerClient.prototype.__sendHttpRequestWithContent = function (options, data, callback) {
            // TODO: use the http or https
            var req = http.request(options, function (res) {
                //    console.log('STATUS: ' + res.statusCode);
                //    console.log('HEADERS: ' + JSON.stringify(res.headers));
                //    res.setEncoding('utf8');
                var d = '';
                res.on('data', function (chunk) {
                    d += chunk;
                });

                res.on('end', function () {
                    if (res.statusCode === 200) {
                        callback(null, d);
                    } else {
                        callback(res.statusCode, d);
                    }
                });
            });

            req.on('error', function (e) {
                callback(e);
            });

            // write data to request body
            req.write(data);

            req.end();
        };

        return BlobServerClient;
    });
