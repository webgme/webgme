/*globals define*/
/*jshint browser: true, node:true*/

/**
 * Client module for creating, monitoring executor jobs.
 *
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 */


define(['superagent', 'q'], function (superagent, Q) {
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

        this.origin = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.origin = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }
        this.relativeUrl = '/rest/executor/';
        this.executorUrl = this.origin + this.relativeUrl;

        // TODO: TOKEN???
        // TODO: any ways to ask for this or get it from the configuration?
        if (parameters.executorNonce) {
            this.executorNonce = parameters.executorNonce;
        }
    };

    /**
     * Creates a new configuration file for the job execution.
     *
     * @param {string} cmd - command to execute.
     * @param {string[]} [args] - command arguments.
     * @returns {{cmd: *, resultArtifacts: Array}}
     */
    ExecutorClient.prototype.getNewExecutorConfig = function (cmd, args) {
        var config = {
            cmd: cmd,
            resultArtifacts: []
        };

        if (args) {
            config.args = args;
        }

        /**
         *
         * @param {string} name - name of the artifact.
         * @param {string[]} [patterns=[]] - inclusive pattern for files to be returned in this artifact.
         */
        config.defineResultArtifact = function (name, patterns) {
            this.resultArtifacts.push({
                name: name,
                resultPatterns: patterns || []
            });
        };

        return config;
    };

    /**
     * @param {object} jobInfo - initial information about the job must contain the hash.
     * @param {object} jobInfo.hash - a unique id for the job (e.g. the hash of the artifact containing the executor_config.json).
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with
     * {JobInfo} <b>result</b>.<br>
     * On error the promise will be rejected with {Error} <b>error</b>.
     */
    ExecutorClient.prototype.createJob = function (jobInfo, callback) {
        var deferred = Q.defer();
        if (typeof jobInfo === 'string') {
            jobInfo = { hash: jobInfo }; // old API
        }
        this.sendHttpRequestWithData('POST', this.getCreateURL(jobInfo.hash), jobInfo, function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.updateJob = function (jobInfo, callback) {
        var deferred = Q.defer();
        this.sendHttpRequestWithData('POST', this.executorUrl + 'update/' + jobInfo.hash, jobInfo,
            function (err, response) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                deferred.resolve(response);
            }
        );

        return deferred.promise.nodeify(callback);
    };

    /**
     * @param {string} hash - unique id for the job (e.g. the hash of the artifact containing the executor_config.json).
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with
     * {JobInfo} <b>result</b>.<br>
     * On error the promise will be rejected with {Error} <b>error</b>.
     */
    ExecutorClient.prototype.getInfo = function (hash, callback) {
        var deferred = Q.defer();
        this.sendHttpRequest('GET', this.getInfoURL(hash), function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getAllInfo = function (callback) {
        var deferred = Q.defer();

        this.sendHttpRequest('GET', this.getInfoURL(), function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getInfoByStatus = function (status, callback) {
        var deferred = Q.defer();

        this.sendHttpRequest('GET', this.executorUrl + '?status=' + status, function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getWorkersInfo = function (callback) {
        var deferred = Q.defer();

        this.sendHttpRequest('GET', this.executorUrl + 'worker', function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    // Helper methods
    ExecutorClient.prototype.getInfoURL = function (hash) {
        return this.origin + this.getRelativeInfoURL(hash);
    };

    ExecutorClient.prototype.getRelativeInfoURL = function (hash) {
        var metadataBase = this.relativeUrl + 'info';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    ExecutorClient.prototype.getCreateURL = function (hash) {
        return this.origin + this.getRelativeCreateURL(hash);
    };

    ExecutorClient.prototype.getRelativeCreateURL = function (hash) {
        var metadataBase = this.relativeUrl + 'create';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
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
