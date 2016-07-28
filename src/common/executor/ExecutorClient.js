/*globals define*/
/*jshint browser: true, node:true*/

/**
 * Client module for creating, monitoring executor jobs.
 *
 * @author lattmann / https://github.com/lattmann
 * @author ksmyth / https://github.com/ksmyth
 * @author pmeijer / https://github.com/pmeijer
 */


define(['superagent', 'q'], function (superagent, Q) {
    'use strict';

    /**
     * Client for creating, monitoring, and receiving output executor jobs.
     * This client is used by the Executor Workers and some of the API calls are not
     * meant to be used by "end users".
     *
     * @param {object} parameters
     * @param {object} parameters.logger
     * @constructor
     * @alias ExecutorClient
     */
    var ExecutorClient = function (parameters) {
        parameters = parameters || {};
        if (parameters.logger) {
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
            console.warn('Since v1.3.0 ExecutorClient requires a logger, falling back on console.log.');
        }

        this.logger.debug('ctor', {metadata: parameters});

        this.isNodeJS = (typeof window === 'undefined') && (typeof process === 'object');
        this.isNodeWebkit = (typeof window === 'object') && (typeof process === 'object');
        //console.log(isNode);
        if (this.isNodeJS) {
            this.logger.debug('Running under node');
            this.server = '127.0.0.1';
            this.httpsecure = false;
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

        this.logger.debug('origin', this.origin);
        this.logger.debug('executorUrl', this.executorUrl);
    };

    /**
     * Creates a new configuration object for the job execution.
     *
     * To make the worker post output either the outputInterval and/or outputSegmentSize must be specified.
     * <br> - If both are negative (or falsy) no output will be given.
     * <br> - When both are specified a timeout will be set at start (and after each posted output). If the number of lines
     *  exceeds outputSegmentSize during that timeout, the output will be posted and a new timeout will be triggered.
     * <br>
     * N.B. even though a short outputInterval is set, the worker won't post new output until the responses from
     * previous posts have returned. Before the job returns with a "completed" status code, all queued outputs will be
     * posted (and the responses will be ensured to have returned).
     *
     * @param {string} cmd - command to execute.
     * @param {string[]} [args] - command arguments.
     * @param {number} [outputInterval=-1] - max time [ms] between (non-empty) output posts from worker.
     * @param {number} [outputSegmentSize=-1] - number of lines before new output is posted from worker. (N.B. posted
     * segments can still contain more number of lines).
     * @return {object}
     */
    ExecutorClient.prototype.getNewExecutorConfig = function (cmd, args, outputInterval, outputSegmentSize) {
        var config = {
            cmd: cmd,
            resultArtifacts: [],
            outputSegmentSize: typeof outputSegmentSize === 'number' ? outputSegmentSize : -1,
            outputInterval: typeof outputInterval === 'number' ? outputInterval : -1
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
     * Creates a new job.
     *
     * @param {object} jobInfo - initial information about the job must contain the hash.
     * @param {object} jobInfo.hash - a unique id for the job (e.g. the hash of the artifact containing the executor_config.json).
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {@link JobInfo} <b>result</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    ExecutorClient.prototype.createJob = function (jobInfo, callback) {
        var deferred = Q.defer(),
            self = this;
        if (typeof jobInfo === 'string') {
            jobInfo = { hash: jobInfo }; // old API
        }

        this.logger.debug('createJob', {metadata: jobInfo});
        this.sendHttpRequestWithData('POST', this.getCreateURL(jobInfo.hash), jobInfo, function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.logger.debug('createJob - result', response);

            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.cancelJob = function (jobInfoOrHash, secret, callback) {
        var deferred = Q.defer(),
            hash = typeof jobInfoOrHash === 'string' ? jobInfoOrHash : jobInfoOrHash.hash,

            self = this;

        this.logger.debug('cancel', hash);
        this.sendHttpRequestWithData('POST', this.executorUrl + 'cancel/' + hash, {secret: secret},
            function (err, response) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                self.logger.debug('cancel - result', response);
                deferred.resolve(response);
            }
        );

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.updateJob = function (jobInfo, callback) {
        var deferred = Q.defer(),
            self = this;
        this.logger.debug('updateJob', {metadata: jobInfo});
        this.sendHttpRequestWithData('POST', this.executorUrl + 'update/' + jobInfo.hash, jobInfo,
            function (err, response) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                self.logger.debug('updateJob - result', response);
                deferred.resolve(response);
            }
        );

        return deferred.promise.nodeify(callback);
    };

    /**
     * Retrieves the current state of the job in form of a {@link JobInfo}
     * @param {string} hash - unique id for the job (e.g. the hash of the artifact containing the executor_config.json).
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {@link JobInfo} <b>jobInfo</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    ExecutorClient.prototype.getInfo = function (hash, callback) {
        var deferred = Q.defer(),
            self = this;
        this.logger.debug('getInfo', hash);
        this.sendHttpRequest('GET', this.getInfoURL(hash), function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.logger.debug('getInfo - result', response);
            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getAllInfo = function (callback) {
        var deferred = Q.defer(),
            self = this;
        this.logger.debug('getAllInfo');
        this.sendHttpRequest('GET', this.executorUrl, function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }

            self.logger.debug('getAllInfo - result', response);
            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getInfoByStatus = function (status, callback) {
        var deferred = Q.defer(),
            self = this;
        this.logger.debug('getInfoByStatus', status);
        this.sendHttpRequest('GET', this.executorUrl + '?status=' + status, function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }
            self.logger.debug('getInfoByStatus - result', response);
            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.getWorkersInfo = function (callback) {
        var deferred = Q.defer(),
            self = this;
        this.logger.debug('getWorkersInfo');
        this.sendHttpRequest('GET', this.executorUrl + 'worker', function (err, response) {
            if (err) {
                deferred.reject(err);
                return;
            }
            self.logger.debug('getWorkersInfo - result', response);
            deferred.resolve(JSON.parse(response));
        });

        return deferred.promise.nodeify(callback);
    };

    /**
     * Retrieves the output associated with jobHash, to limit the output pass start and/or end.
     * The outputs are identified by 0, 1, 2, ...
     * @param {string} hash - hash of job related to output.
     * @param {number} [start] - number/id of the output segment to start from (inclusive).
     * @param {number} [end] - number/id of segment to end at (exclusive).
     * @param {function} [callback] - if provided no promise will be returned.
     *
     * @return {external:Promise}  On success the promise will be resolved with {@link OutputInfo} <b>result</b>.<br>
     * On error the promise will be rejected with {@link Error} <b>error</b>.
     */
    ExecutorClient.prototype.getOutput = function (hash, start, end, callback) {
        var deferred = Q.defer(),
            url = this.executorUrl + 'output/' + hash,
            query = '';

        if (typeof start === 'number') {
            query += '?start=' + start;
        }

        if (typeof end === 'number') {
            if (query) {
                query += '&end=' + end;
            } else {
                query += '?end=' + end;
            }
        }

        url += query;

        this.logger.debug('getOutput, url=', url);

        this.sendHttpRequest('GET', url, function (err, response) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(JSON.parse(response));
            }
        });

        return deferred.promise.nodeify(callback);
    };

    ExecutorClient.prototype.sendOutput = function (outputInfo, callback) {
        var deferred = Q.defer(),
            url = this.executorUrl + 'output/' + outputInfo.hash;

        this.logger.debug('sendOutput', outputInfo._id);

        this.sendHttpRequestWithData('POST', url, outputInfo, function (err) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve();
            }
        });

        return deferred.promise.nodeify(callback);
    };

    //<editor-fold desc="Helper methods">
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
    //</editor-fold>

    return ExecutorClient;
});
