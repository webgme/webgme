/*globals define*/
/*jshint node:true, browser:true*/

/**
 * This plugin creates a job for the executor and writes back the results to the model. It also illustrates
 * how to use the ExecutorClient (to create, monitor and receive output of a job).
 * <br>
 * Requirements
 * <br>
 * <br> 1) The webgme server must run with enableExecutor: true
 * <br> 2) A worker must be attached, see src/middleware/executor/worker/README.txt
 * <br> 3) The worker must have 2.7 >= Python < 3 installed.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ExecutorPlugin
 */

define([
    'plugin/PluginConfig',
    'plugin/PluginBase',
    'text!./metadata.json',
    'executor/ExecutorClient',
    'common/util/ejs',
    'text!./Templates/generate_name.py.ejs',
    'q'
], function (PluginConfig, PluginBase, pluginMetadata, ExecutorClient, ejs, TEMPLATE, Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ExecutorPlugin.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ExecutorPlugin.
     * @constructor
     */
    function ExecutorPlugin() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ExecutorClient.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ExecutorPlugin.prototype = Object.create(PluginBase.prototype);
    ExecutorPlugin.prototype.constructor = ExecutorPlugin;

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
            executorClient = new ExecutorClient({
                httpsecure: typeof window === 'undefined' ? false : window.location.protocol === 'https:',
                serverPort: typeof window === 'undefined' ? self.gmeConfig.server.port : window.location.port,
                logger: self.logger.fork('ExecutorClient')
            }),
            executorConfig,
            finalJobInfo,
            filesToAdd,
            latestOutputNumber = -1,
            artifact;

        self.logger.info('inside main');
        // This is just to track the current node path in the result from the execution.
        if (!self.activeNode || self.core.getPath(self.activeNode) === '') {
            callback('No activeNode specified or rootNode. Execute on any other node.', self.result);
            return;
        }

        executorConfig = executorClient.getNewExecutorConfig(config.pythonCmd, ['generate_name.py'], 600, 5);
        executorConfig.defineResultArtifact('all', []);
        executorConfig.defineResultArtifact('logs', ['log/**/*']);
        executorConfig.defineResultArtifact('resultFile', ['new_name.json']);

        if (config.update) {
            executorConfig.args.push(self.core.getPath(self.activeNode));
            self.logger.info('will write back to model');
        } else {
            executorConfig.args.push('dummy');
        }

        // The hash of the artifact with these files will define the job. N.B. executor_config.json must exist.
        filesToAdd = {
            'executor_config.json': JSON.stringify(executorConfig, null, 2),
            'generate_name.py': ejs.render(TEMPLATE, {
                exitCode: config.success ? 0 : 1,
                sleepTime: config.time
            })
        };

        artifact = self.blobClient.createArtifact('executionFiles');

        artifact.addFiles(filesToAdd)
            .then(function (hashes) {
                self.logger.info('added files', hashes);
                return artifact.save();
            })
            .then(function (hash) {
                self.logger.info('artifact saved');
                self.result.addArtifact(hash);
                // Here the hash of the artifact is passed to the new job.
                return executorClient.createJob({hash: hash});
            })
            .then(function (jobInfo) {
                var deferred = Q.defer(),
                    intervalID;

                self.logger.info('job created');
                self.logger.debug(jobInfo);

                intervalID = setInterval(function () {
                    // Get the job-info at intervals and check for a non-CREATED/RUNNING status.
                    executorClient.getInfo(jobInfo.hash)
                        .then(function (jInfo) {
                            var key,
                                startOutput;
                            self.logger.debug(JSON.stringify(jInfo, null, 4));

                            if (jInfo.status === 'CREATED' || jInfo.status === 'RUNNING') {
                                // The job is still running..
                                if (jInfo.outputNumber !== null && jInfo.outputNumber >= latestOutputNumber) {
                                    startOutput = latestOutputNumber;
                                    latestOutputNumber = jInfo.outputNumber + 1;
                                    executorClient.getOutput(jInfo.hash, startOutput, latestOutputNumber)
                                        .then(function (output) {
                                            output.forEach(function (o) {
                                                self.logger.debug('partial output\n', o.output);
                                            });
                                        });
                                }
                                return;
                            }

                            clearInterval(intervalID);
                            if (jInfo.status === 'SUCCESS') {
                                if (jInfo.outputNumber) {
                                    executorClient.getOutput(jInfo.hash)
                                        .then(function (output) {
                                            var completeOutput = '';
                                            output.forEach(function (o) {
                                                completeOutput += o.output;
                                            });
                                            self.logger.debug('complete output\n', completeOutput);
                                            deferred.resolve(jInfo);
                                        })
                                        .catch(deferred.reject);
                                } else {
                                    self.logger.debug('no output after success');
                                    deferred.resolve(jInfo);
                                }
                            } else {
                                //Add the resultHashes even though job failed (for user to debug).
                                for (key in jInfo.resultHashes) {
                                    if (jInfo.resultHashes.hasOwnProperty(key)) {
                                        self.result.addArtifact(jInfo.resultHashes[key]);
                                    }
                                }

                                throw new Error('Job execution failed');
                            }
                        })
                        .catch(deferred.reject);
                }, 400);

                return deferred.promise;
            })
            .then(function (jobInfo) {
                self.logger.info('job succeeded', jobInfo);
                finalJobInfo = jobInfo;
                return self.blobClient.getMetadata(jobInfo.resultHashes.resultFile);
            })
            .then(function (metaData) {
                self.logger.debug(metaData);
                return self.blobClient.getObject(metaData.content['new_name.json'].content);
            })
            .then(function (newName) {
                var key;

                if (self.getCurrentConfig().update) {
                    if (typeof Buffer !== 'undefined' && newName instanceof Buffer) {
                        newName = JSON.parse(String.fromCharCode.apply(null, new Uint16Array(newName)));
                    }
                    for (key in newName) {
                        if (newName.hasOwnProperty(key)) {
                            self.core.setAttribute(self.activeNode, 'name', newName[key]);
                        }
                    }
                    for (key in finalJobInfo.resultHashes) {
                        if (finalJobInfo.resultHashes.hasOwnProperty(key)) {
                            self.result.addArtifact(finalJobInfo.resultHashes[key]);
                        }
                    }

                    return self.save('Updated new name from execution');
                } else {
                    for (key in finalJobInfo.resultHashes) {
                        if (finalJobInfo.resultHashes.hasOwnProperty(key)) {
                            self.result.addArtifact(finalJobInfo.resultHashes[key]);
                        }
                    }
                }
            })
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                err = err instanceof Error ? err : new Error(err);
                callback(err, self.result);
            });
    };

    return ExecutorPlugin;
});
