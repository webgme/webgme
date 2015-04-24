/*globals define*/
/*jshint node:true, browser:true*/

/** This plugin creates a job for the executor and writes back the results to the model.
 * Requirements
 * 1) The webgme server must run with enableExecutor: true
 * 2) A worker must be attached, see src/middleware/executor/worker/README.txt
 * 3) The worker must have 2.7 >= Python < 3 installed.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'executor/ExecutorClient',
    'common/util/ejs',
    'plugin/ExecutorPlugin/ExecutorPlugin/Templates/Templates'
], function (PluginConfig, PluginBase, ExecutorClient, ejs, TEMPLATES) {
    'use strict';

    /**
     * Initializes a new instance of ExecutorPlugin.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExecutorPlugin.
     * @constructor
     */
    var ExecutorPlugin = function () {
        // Call base class' constructor.
        PluginBase.call(this);
    };

    // Prototypal inheritance from PluginBase.
    ExecutorPlugin.prototype = Object.create(PluginBase.prototype);
    ExecutorPlugin.prototype.constructor = ExecutorPlugin;

    /**
     * Gets the name of the ExecutorPlugin.
     * @returns {string} The name of the plugin.
     * @public
     */
    ExecutorPlugin.prototype.getName = function () {
        return 'Executor Plugin';
    };

    /**
     * Gets the semantic version (semver.org) of the ExecutorPlugin.
     * @returns {string} The version of the plugin.
     * @public
     */
    ExecutorPlugin.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the description of the ExecutorPlugin.
     * @returns {string} The description of the plugin.
     * @public
     */
    ExecutorPlugin.prototype.getDescription = function () {
        return 'Plugin using the Executor Client';
    };

    ExecutorPlugin.prototype.getConfigStructure = function () {
        return [
            {
                name: 'pythonCmd',
                displayName: 'Python path',
                description: 'How Python is executed',
                value: 'C:/Python27/python.exe',
                valueType: 'string',
                readOnly: false
            },
            {
                name: 'update',
                displayName: 'Write back to model',
                description: 'If false no need to provide active node.',
                value: true,
                valueType: 'boolean',
                readOnly: false
            },
            {
                name: 'success',
                displayName: 'Should succeed',
                description: 'Should the execution exit with 0?',
                value: true,
                valueType: 'boolean',
                readOnly: false
            },
            {
                name: 'time',
                displayName: 'Execution time [s]',
                description: 'How long should the script run?',
                value: 1,
                valueType: 'number',
                minValue: 0.1,
                maxValue: 10000,
                readOnly: false
            }
        ];
    };

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ExecutorPlugin.prototype.main = function (callback) {
        // Use self to access core, project, result, logger etc from PluginBase.
        // These are all instantiated at this point.
        var self = this,
            config = self.getCurrentConfig(),
            exitCode = config.success ? 0 : 1,
            executorConfig = {
                cmd: config.pythonCmd, // This is the command that will be executed on the worker
                                       // Make sure no arguments are here, put them in args
                args: ['generate_name.py'],
                resultArtifacts: [ // These are the results that will be returned
                    {
                        name: 'all',
                        resultPatterns: []
                    },
                    {
                        name: 'logs',
                        resultPatterns: ['log/**/*']
                    },
                    {
                        name: 'resultFile',
                        resultPatterns: ['new_name.json']
                    }
                ]
            },
            filesToAdd,
            artifact;
        self.logger.info('inside main');
        // This is just to track the current node path in the result from the execution.
        if (config.update) {
            if (!self.activeNode) {
                callback('No activeNode specified! Set update to false or invoke from a node.', self.result);
                return;
            }
            executorConfig.args.push(self.core.getPath(self.activeNode));
            self.logger.info('will write back to model');
        } else {
            executorConfig.args.push('dummy');
        }

        // The hash of the artifact with these files will define the job. N.B. executor_config.json must exist.
        filesToAdd = {
            'executor_config.json': JSON.stringify(executorConfig, null, 4),
            'generate_name.py': ejs.render(TEMPLATES['generate_name.py.ejs'], {
                exitCode: exitCode,
                sleepTime: config.time
            })
        };

        artifact = self.blobClient.createArtifact('executionFiles');

        artifact.addFiles(filesToAdd, function (err) {
            if (err) {
                callback(err, self.result);
                return;
            }
            self.logger.info('added files');
            artifact.save(function (err, hash) {
                var executorClient;
                if (err) {
                    callback(err, self.result);
                    return;
                }
                self.logger.info('artifact saved');
                self.result.addArtifact(hash);
                executorClient = new ExecutorClient({
                    httpsecure: self.gmeConfig.server.https.enable,
                    serverPort: self.gmeConfig.server.port
                });
                self.logger.info('created new ExecutorClient instance');
                // Here the hash of the artifact is passed to the new job.
                executorClient.createJob({hash: hash}, function (err, jobInfo) {
                    var intervalID;
                    if (err) {
                        callback('Creating job failed: ' + err.toString(), self.result);
                        return;
                    }
                    self.logger.info('job created');
                    self.logger.debug(jobInfo);
                    // This will be called after a succeed job

                    intervalID = setInterval(function () {
                        // Get the job-info at intervals and check for a non-CREATED/RUNNING status.
                        executorClient.getInfo(hash, function (err, jInfo) {
                            var key;
                            self.logger.info(JSON.stringify(jInfo, null, 4));
                            if (jInfo.status === 'CREATED' || jInfo.status === 'RUNNING') {
                                // The job is still running..
                                return;
                            }

                            clearInterval(intervalID);
                            if (jInfo.status === 'SUCCESS') {
                                self.atSucceedJob(jInfo, callback);
                            } else {
                                //Add the resultHashes even though job failed (for user to debug).
                                for (key in jInfo.resultHashes) {
                                    if (jInfo.resultHashes.hasOwnProperty(key)) {
                                        self.result.addArtifact(jInfo.resultHashes[key]);
                                    }
                                }
                                callback('Job execution failed', self.result);
                            }
                        });
                    }, 400);
                });
            });
        });
    };

    ExecutorPlugin.prototype.atSucceedJob = function (jobInfo, mainCallback) {
        var self = this;
        //After the job has been executed jobInfo will contain the result hashes.
        self.logger.info('job succeeded');
        self.blobClient.getMetadata(jobInfo.resultHashes.resultFile, function (err, metaData) {
            var newNameJsonHash;
            if (err) {
                mainCallback('Getting results metadata failed: ' + err.toString(), self.result);
                return;
            }
            newNameJsonHash = metaData.content['new_name.json'].content;
            self.blobClient.getObject(newNameJsonHash, function (err, newName) {
                var key;
                if (err) {
                    mainCallback('Getting content failed: ' + err.toString(), self.result);
                    return;
                }
                if (self.getCurrentConfig().update) {
                    for (key in newName) {
                        if (newName.hasOwnProperty(key)) {
                            self.core.setAttribute(self.activeNode, 'name', newName[key]);
                        }
                    }
                    for (key in jobInfo.resultHashes) {
                        if (jobInfo.resultHashes.hasOwnProperty(key)) {
                            self.result.addArtifact(jobInfo.resultHashes[key]);
                        }
                    }

                    self.save('Updated new name from execution', function (err) {
                        if (err) {
                            mainCallback(err, self.result);
                            return;
                        }
                        self.result.setSuccess(true);
                        mainCallback(null, self.result);
                    });
                } else {
                    for (key in jobInfo.resultHashes) {
                        if (jobInfo.resultHashes.hasOwnProperty(key)) {
                            self.result.addArtifact(jobInfo.resultHashes[key]);
                        }
                    }
                    self.result.setSuccess(true);
                    mainCallback(null, self.result);
                }
            });
        });
    };

    return ExecutorPlugin;
});