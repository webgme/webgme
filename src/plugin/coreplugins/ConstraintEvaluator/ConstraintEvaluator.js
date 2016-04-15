/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Plugin for facilitating construction of constraints. This plugin is mainly intended for developers.
 * There are three different modes to execute the plugin:
 * <br><br>
 * - EvaluateConstraints
 * <br>
 * Loads the constraints defined in "Constraints.js" and applies them to all nodes starting
 * from the activeNode. If the constraint returns an error or an exception is thrown it is reported
 * as an error and a message with the full stack is added to the result. If the constraint succeeds or
 * fails, it is simply reported in the summary.
 * <br><br>
 * - GenerateConstraints
 * <br>
 * Goes through all the meta-nodes in the model and extracts the constraints and generates a "Constraints.js".
 * This is intended to be used to overwrite the file and run/tweak and write the fixed constraints back to the model.
 * <br><br>
 * - PopulateFromConstraints
 * <br>
 * Reads in the constraints from "Constraints.js" and adds them to the matched meta-nodes in the model.
 * N.B. if the constraint already exists it will be overwritten by the new one.
 *
 * @author pmeijer / https://github.com/pmeijer
 * @module CorePlugins:ConstraintEvaluator
 */

define([
    'plugin/PluginBase',
    'text!./metadata.json',
    './Constraints',
    './Templates/Templates',
    'common/util/ejs',
    'q'
], function (PluginBase, pluginMetadata, Constraints, TEMPLATES, ejs, Q) {
    'use strict';

    pluginMetadata = JSON.parse(pluginMetadata);

    /**
     * Initializes a new instance of ConstraintEvaluator.
     * @class
     * @augments {PluginBase}
     * @classdesc This class represents the plugin ConstraintEvaluator.
     * @constructor
     */
    function ConstraintEvaluator() {
        // Call base class' constructor.
        PluginBase.call(this);
        this.pluginMetadata = pluginMetadata;
    }

    ConstraintEvaluator.metadata = pluginMetadata;

    // Prototypical inheritance from PluginBase.
    ConstraintEvaluator.prototype = Object.create(PluginBase.prototype);
    ConstraintEvaluator.prototype.constructor = ConstraintEvaluator;

    /**
     * Main function for the plugin to execute. This will perform the execution.
     * Notes:
     * - Always log with the provided logger.[error,warning,info,debug].
     * - Do NOT put any user interaction logic UI, etc. inside this method.
     * - callback always has to be called even if error happened.
     *
     * @param {function(string, plugin.PluginResult)} callback - the result callback
     */
    ConstraintEvaluator.prototype.main = function (callback) {
        var self = this,
            currentConfig = self.getCurrentConfig(),
            promise;

        if (currentConfig.mode === 'EvaluateConstraints') {
            promise = self.evaluateConstraints(currentConfig);
        } else if (currentConfig.mode === 'GenerateConstraints') {
            promise = self.generateConstraints(currentConfig);
        } else if (currentConfig.mode === 'PopulateFromConstraints') {
            promise = self.populateFromConstraints(currentConfig);
        } else {
            promise = Q.defer();
            promise.reject(new Error('Unexpected mode ' + currentConfig.mode));
            promise = promise.promise;
        }

        promise
            .then(function () {
                self.result.setSuccess(true);
                callback(null, self.result);
            })
            .catch(function (err) {
                callback(err, self.result);
            });
    };

    ConstraintEvaluator.prototype.evaluateConstraints = function (/*config*/) {
        var self = this,
            constraints = new Constraints();

        function checkRule(node, key) {
            var deferred = Q.defer(),
                info = constraints[key](),
                error;

            if (self.META.hasOwnProperty(info.metaType) === true) {
                if (self.isMetaTypeOf(node, self.META[info.metaType])) {
                    Q.nfcall(info.fn, self.core, node)
                        .then(function (result) {
                            deferred.resolve({
                                res: result,
                                node: node,
                                constraintName: key
                            });
                        })
                        .catch(function (err) {
                            err = err instanceof Error ? err : new Error(err);
                            err.constraintName = key;
                            err.node = node;
                            deferred.reject(err);
                        });
                } else {
                    deferred.resolve({skipped: true, res: {}});
                }
            } else {
                error = new Error('METAType not present in model "' + info.metaType + '"');
                error.constraintName = key;
                deferred.reject(error);
            }

            return deferred.promise;
        }

        function checkNode(node) {
            var key,
                promises = [];

            if (self.core.getPath(node) === '') {
                return [];
            }

            for (key in constraints) {
                if (key.indexOf('Constraint_') === 0) {
                    promises.push(checkRule(node, key));
                }
            }

            return Q.allSettled(promises);
        }

        return self.core.loadSubTree(self.activeNode)
            .then(function (nodes) {
                return Q.allSettled(nodes.map(function (node) {
                    return checkNode(node);
                }));
            })
            .then(function (nodeResults) {
                var jointResults = [];

                nodeResults.forEach(function (res) {
                    if (res.state === 'fulfilled') {
                        jointResults = jointResults.concat(res.value);
                    } else {
                        throw new Error(res.reason);
                    }
                });

                return jointResults;
            })
            .then(function (results) {
                var deferred = Q.defer(),
                    successes = 0,
                    failures = 0,
                    errors = 0;

                results.forEach(function (res) {
                    if (res.state === 'fulfilled') {
                        if (res.value.res === null || typeof res.value.res !== 'object') {
                            errors += 1;
                            self.createMessage(res.value.node, 'Constraint did not return an object "' +
                                res.value.constraintName + '", instead returned: "' + res.value.res + '".', 'error');
                        } else if (res.value.res.hasViolation === false) {
                            successes += 1;
                        } else if (res.value.res.hasViolation === true) {
                            if (typeof res.value.res.message === 'string') {
                                failures += 1;
                            } else {
                                errors += 1;
                                self.createMessage(res.value.node, 'Failing constraint "' + res.value.constraintName +
                                    '" did not have a message.', 'error');
                            }
                        } else if (res.value.skipped === true) {
                            // Skip
                        } else {
                            errors += 1;
                            self.createMessage(res.value.node, 'Constraint did not return "hasViolation" in result "' +
                                res.value.constraintName + '"', 'error');
                        }
                    } else if (res.state === 'rejected') {
                        errors += 1;
                        self.createMessage(res.reason.node, 'Evaluation of Constraint "' + res.reason.constraintName +
                            '" resulted in error: ' + res.reason.stack, 'error');
                        self.logger.error(res.reason);
                    } else {
                        // This should never ever happen..
                        throw Error('Unexpected Q state', res.state);
                    }
                });

                if (errors > 0) {
                    deferred.reject(new Error('Constraint evaluation encountered errors!'));
                } else {
                    if (failures > 0) {
                        self.logger.warn('There were failures but the constraints did not error.');
                    }
                    deferred.resolve();
                }

                self.createMessage(null, 'Successes: ' + successes + ' Failures: ' + failures + ' Errors: ' + errors,
                    'info');

                self.logger.info('Successes : ' + successes);
                self.logger.info('Failures  : ' + failures);
                self.logger.info('Errors    : ' + errors);

                return deferred.promise;
            });
    };

    ConstraintEvaluator.prototype.generateConstraints = function (/*config*/) {
        var self = this,
            cInfos = [],
            metaNames = Object.keys(self.META),
            artifact,
            fileContent;

        metaNames.forEach(function (metaName) {
            var cNames = self.core.getOwnConstraintNames(self.META[metaName]);

            cNames.forEach(function (cName) {
                var constraint = self.core.getConstraint(self.META[metaName], cName);
                cInfos.push({
                    name: cName,
                    safeName: cName.replace(/[^\w]/gi, '_'),
                    metaType: metaName,
                    safeMetaType: metaName.replace(/[^\w]/gi, '_'),
                    script: constraint.script,
                    info: constraint.info
                });
            });
        });

        fileContent = ejs.render(TEMPLATES['Constraints.js.ejs'], {constraints: cInfos})
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&#39;/g, '\'')
            .replace(/&quot;/g, '"');
        //TODO: Are the other special characters that can raise hell?

        artifact = self.blobClient.createArtifact('constraints');

        return artifact.addFileAsSoftLink('Constraints.js', fileContent)
            .then(function (/*fileHash*/) {
                self.createMessage(self.rootNode, 'Generated ' + cInfos.length + ' constraints. ' +
                    'Overwrite the Constraints.js in this plugin with the new one to evaluate the ' +
                    'newly generated.', 'info');

                return artifact.save();
            })
            .then(function (hash) {
                self.result.addArtifact(hash);
            });
    };

    ConstraintEvaluator.prototype.populateFromConstraints = function (config) {
        var self = this,
            skipped = 0,
            added = 0,
            overwritten = 0,
            constraints = new Constraints(),
            msg,
            prevConstraints,
            metaNode,
            info,
            key;

        if (config.clear === true) {
            self.logger.debug('Will clear all existing constraints (on meta nodes).');
            self.clearExistingConstraints();
        }

        for (key in constraints) {
            if (key.indexOf('Constraint_') === 0) {
                info = constraints[key]();
                metaNode = self.META[info.metaType];
                if (metaNode) {
                    prevConstraints = self.core.getOwnConstraintNames(metaNode);

                    if (prevConstraints.indexOf(info.name) > -1) {
                        self.logger.debug('Constraint overwritten for metaNode', info.name, info.metaType);
                        overwritten += 1;
                    } else {
                        added += 1;
                    }

                    self.core.setConstraint(metaNode, info.name, {
                        script: '' + info.fn,
                        info: info.info
                    });
                } else {
                    self.logger.warn('Constraint metaType not present in model', info);
                    skipped += 1;
                }
            }
        }

        msg = 'Added constraints, new: ' + added + ', overwritten: ' + overwritten;
        self.createMessage(self.rootNode, msg + ', skipped: ' + skipped + '.');

        return self.save(msg + '.');
    };

    ConstraintEvaluator.prototype.clearExistingConstraints = function () {
        var self = this,
            removed = 0,
            metaNames = Object.keys(self.META);

        metaNames.forEach(function (metaName) {
            var cNames = self.core.getOwnConstraintNames(self.META[metaName]);

            cNames.forEach(function (cName) {
                self.core.delConstraint(self.META[metaName], cName);
                removed += 1;
            });
        });

        self.createMessage(self.rootNode, 'Removed ' + removed + ' constraints at start.');
    };

    return ConstraintEvaluator;
});