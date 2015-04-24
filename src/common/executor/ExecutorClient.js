/*globals define*/
/*jshint browser: true, node:true*/

/**
 * Client module for creating, monitoring executor jobs.
 *
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */


define(['superagent'], function (superagent) {
    'use strict';

    var ExecutorClient = function (parameters) {
        parameters = parameters || {};
        this.isNodeJS = (typeof window === 'undefined') && (typeof process === 'object');
        this.isNodeWebkit = (typeof window === 'object') && (typeof process === 'object');
        //console.log(isNode);
        if (this.isNodeJS) {
            this.server = '127.0.0.1';
            this._clientSession = null; // parameters.sessionId;;
        }
        this.server = parameters.server || this.server;
        this.serverPort = parameters.serverPort || this.serverPort;
        this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
        if (this.isNodeJS) {
            this.http = this.httpsecure ? require('https') : require('http');
        }
        this.executorUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.executorUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }
        // TODO: TOKEN???
        // TODO: any ways to ask for this or get it from the configuration?
        this.executorUrl = this.executorUrl + '/rest/executor/';
        if (parameters.executorNonce) {
            this.executorNonce = parameters.executorNonce;
        }
    };

    ExecutorClient.prototype.getInfoURL = function (hash) {
        var metadataBase = this.executorUrl + 'info';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };


    ExecutorClient.prototype.getCreateURL = function (hash) {
        var metadataBase = this.executorUrl + 'create';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    ExecutorClient.prototype.createJob = function (jobInfo, callback) {
        if (typeof jobInfo === 'string') {
            jobInfo = { hash: jobInfo }; // old API
        }
        this.sendHttpRequestWithData('POST', this.getCreateURL(jobInfo.hash), jobInfo, function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.updateJob = function (jobInfo, callback) {
        this.sendHttpRequestWithData('POST', this.executorUrl + 'update/' + jobInfo.hash, jobInfo,
            function (err, response) {
                if (err) {
                    callback(err);
                    return;
                }

                callback(null, response);
            }
        );
    };

    ExecutorClient.prototype.getInfo = function (hash, callback) {
        this.sendHttpRequest('GET', this.getInfoURL(hash), function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getAllInfo = function (callback) {

        this.sendHttpRequest('GET', this.getInfoURL(), function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getInfoByStatus = function (status, callback) {

        this.sendHttpRequest('GET', this.executorUrl + '?status=' + status, function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.getWorkersInfo = function (callback) {

        this.sendHttpRequest('GET', this.executorUrl + 'worker', function (err, response) {
            if (err) {
                callback(err);
                return;
            }

            callback(null, JSON.parse(response));
        });
    };

    ExecutorClient.prototype.sendHttpRequest = function (method, url, callback) {
        return this.sendHttpRequestWithData(method, url, null, callback);
    };

    ExecutorClient.prototype.sendHttpRequestWithData = function (method, url, data, callback) {
        var req = new superagent.Request(method, url);
        if (this.executorNonce) {
            req.set('x-executor-nonce', this.executorNonce);
        }
        if (data) {
            req.send(data);
        }
        req.end(function (err, res) {
            if (err) {
                callback(err);
                return;
            }
            if (res.status > 399) {
                callback(res.status, res.text);
            } else {
                callback(null, res.text);
            }
        });
    };

    ExecutorClient.prototype._ensureAuthenticated = function (options, callback) {
        //this function enables the session of the client to be authenticated
        //TODO currently this user does not have a session, so it has to upgrade the options always!!!
//        if (options.headers) {
//            options.headers.webgmeclientsession = this._clientSession;
//        } else {
//            options.headers = {
//                'webgmeclientsession': this._clientSession
//            }
//        }
        callback(null, options);
    };

    return ExecutorClient;
});
