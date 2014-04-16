/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 *
 * Server side BLOB client implementation.
 */

define(['blob/BlobClient', 'http', 'https'],
    function (BlobClient, http, https) {

        /**
         * Initializes a new instance of a server side file system object.
         *
         * Note: This code strictly runs in node.js (server side).
         *
         * @param {{}} parameters
         * @constructor
         */
        function BlobServerClient() {
            BlobClient.call(this);
        }

        // Inherits from BlobClient
        BlobServerClient.prototype = Object.create(BlobClient.prototype);

        // Override the constructor with this object's constructor
        BlobServerClient.prototype.constructor = BlobServerClient;

        BlobServerClient.prototype.getInfo = function (hash, callback) {
            var options = {
                hostname: 'localhost',
                port: 8888,
                path: '/rest/notoken/blob/info' + hash,
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
                hostname: 'localhost',
                port: 8888,
                path: '/rest/notoken/blob/view' + hash,
                method: 'GET'
            };

            this._sendHttpRequest(options, function (err, data) {
                if (err) {
                    callback(err);
                    return;
                }
                callback(null, data);
            });
        };


        BlobServerClient.prototype.addComplexObject = function (name, complexObjectDescriptor, callback) {
            var sortedDescriptor = {};

            var fnames = Object.keys(complexObjectDescriptor);
            fnames.sort();
            for (var j = 0; j < fnames.length; j += 1) {
                sortedDescriptor[fnames[j]] = complexObjectDescriptor[fnames[j]];
            }

            var options = {
                hostname: 'localhost',
                port: 8888,
                path: '/rest/notoken/blob/create/' + name + '.json?complex=true',
                method: 'PUT'
            };

            this._sendHttpRequestWithContent(options, JSON.stringify(sortedDescriptor, null, 4), function (err, data) {
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


        BlobServerClient.prototype.addObject = function (name, data, callback) {
            var options = {
                hostname: 'localhost',
                port: 8888,
                path: '/rest/notoken/blob/create/' + name,
                method: 'PUT'
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


        BlobServerClient.prototype._sendHttpRequest = function (options, callback) {
            var req = http.request(options, function(res) {
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

            req.on('error', function(e) {
                callback(e);
            });

            req.end();
        };


        BlobServerClient.prototype._sendHttpRequestWithContent = function (options, data, callback) {
            var req = http.request(options, function(res) {
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

            req.on('error', function(e) {
                callback(e);
            });

            // write data to request body
            req.write(data);

            req.end();
        };

        return BlobServerClient;
    });
