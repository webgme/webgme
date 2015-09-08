/*globals define*/
/*jshint node:true, browser: true, evil:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define(['common/core/users/metarules', 'q'], function (metaRules, Q) {
    'use strict';

    var CONSTRAINT_TYPES = {
        META: 'META_RULES',
        CUSTOM: 'CUSTOM_CONSTRAINTS',
        BOTH: 'BOTH'
    };

    /**
     * @param {object} core
     * @param {object} mainLogger
     * @constructor
     */
    function ConstraintChecker(core, mainLogger) {
        this.core = core;
        this.logger = mainLogger.fork('ConstraintChecker');

        this.customContraints = {};
        this.customContraintsStorage = {};

        // Set after initialize
        this.initialized = false;

        this.rootNode = null;
        this.type = null;
        this.commitHash = null;
    }

    ConstraintChecker.prototype.initialize = function (rootNode, commitHash, constraintType) {
        this.rootNode = rootNode;
        this.logger.debug('ConstraintChecker constraintType', constraintType);
        this.type = constraintType || CONSTRAINT_TYPES.META;
        this.commitHash = commitHash;
        this.initialized = true;
    };

    ConstraintChecker.prototype._checkNode = function (node, callback) {
        var self = this,
            deferred = Q.defer(),
        //TODO: These messages need some sort of type/class!!
            message = {
                info: 'node [' + self.core.getPath(node) + '] validation',
                _path: self.core.getPath(node),
                _name: self.core.getAttribute(node, 'name') || 'N/A',
                commit: self.commitHash,
                hasViolation: false
            },
            promises = [],
            customNames,
            checkCustom = function (name) {
                return self._executeCustomConstraint(node, name);
            };

        if (self.type === CONSTRAINT_TYPES.META) {
            promises.push(metaRules(self.core, node));
            customNames = [];
        } else if (self.type === CONSTRAINT_TYPES.CUSTOM) {
            customNames = self.core.getConstraintNames(node);
            promises = customNames.map(checkCustom);
        } else if (self.type === CONSTRAINT_TYPES.BOTH) {
            customNames = self.core.getConstraintNames(node);
            promises = customNames.map(checkCustom);
            promises.push(metaRules(self.core, node));
        } else {
            deferred.reject(new Error('Unknown CONSTRAINT_TYPE' + self.type));
        }

        Q.allSettled(promises)
            .then(function (results) {
                var customCountDown = customNames.length;
                results.map(function (result) {
                    var msg = {
                        hasViolation: false,
                        message: ''
                    };
                    customCountDown -= 1;
                    if (result.state === 'rejected') {
                        msg.message = result.reason instanceof Error ? result.reason.message : result.reason;
                        msg.hasViolation = true;
                    } else if (result.state === 'fulfilled') {
                        msg.message = result.value.message;
                        msg.hasViolation = result.value.hasViolation;
                    } else {
                        msg.message = 'Unknown Q promise state ' + result.state;
                        msg.hasViolation = true;
                    }

                    if (customCountDown > -1) {
                        message[customNames[customCountDown]] = msg;
                    } else {
                        // This is the meta constraint.
                        message.META_RULES = msg;
                    }

                    if (msg.hasViolation) {
                        // Propagate the violation
                        message.hasViolation = true;
                    }
                });

                deferred.resolve(message);
            })
            .catch(deferred.reject);

        return deferred.promise.nodeify(callback);
    };

    ConstraintChecker.prototype._executeCustomConstraint = function (node, name, callback) {
        var self = this,
            deferred = Q.defer(),
            script = self.core.getConstraint(node, name).script;

        if (!self.customContraints[script]) {
            var a = '';
            eval('a = ' + script + ';');
            self.customContraints[script] = function (core, node, constraintCallback) {
                try {
                    a(core, node, constraintCallback);
                } catch (e) {
                    constraintCallback('Exception was thrown during "' + name + '" constraint execution:\n' +
                        e.toString());
                }
            };
            self.customContraintsStorage[script] = {};
        }

        self.customContraints[script].call(self.customContraintsStorage[script], self.core, node,
            function (err, result) {
                if (err) {
                    deferred.reject(err);
                } else {
                    deferred.resolve(result);
                }
            });

        return deferred.promise.nodeify(callback);
    };

    ConstraintChecker.prototype.checkModel = function (node, callback) {
        var self = this,
            deferred = Q.defer(),
            error = null,
            message = {
                info: '',
                commit: self.commitHash,
                hasViolation: false
            };

        function checkChild(node, cb) {
            var needed = 2,
                children = [],
                nextChild = function (index) {
                    if (index >= children.length) {
                        return cb(error, message);
                    }

                    checkChild(children[index], function () {
                        nextChild(index + 1);
                    });
                },
                childrenLoaded = function () {
                    needed = children.length;
                    if (!needed || needed === 0) {
                        return cb(error, message);
                    }
                    nextChild(0);
                };
            self._checkNode(node, function (err, msg) {
                error = error || err;
                if (msg.hasViolation === true) {
                    message.hasViolation = true;
                }
                message[self.core.getGuid(node)] = msg;
                if (--needed === 0) {
                    childrenLoaded();
                }
            });
            self.core.loadChildren(node, function (err, c) {
                children = c || [];
                error = error || err;
                if (--needed === 0) {
                    childrenLoaded();
                }
            });
        }

        if (self.core.getPath(node) === self.core.getPath(self.core.getRoot(node))) {
            message.info = 'project validation';
        } else {
            message.info = 'model [' + self.core.getPath(node) + '] validation';
        }

        checkChild(node, function (err, message_) {
            if (err) {
                deferred.reject(err);
            } else {
                deferred.resolve(message_);
            }
        });

        return deferred.promise.nodeify(callback);
    };

    ConstraintChecker.prototype.checkNode = function (node, callback) {
        var self = this,
            deferred = Q.defer(),
            //TODO what should be the proper identification
            message = {
                info: 'node [' + (self.core.getAttribute(node, 'name') || '') + '] validation',
                commit: self.commitHash,
                hasViolation: false
            };

        self._checkNode(node)
            .then(function (result) {
                message[self.core.getGuid(node)] = result;
                message.hasViolation = result.hasViolation;
                deferred.resolve(result);
            })
            .catch(function (err) {
                deferred.reject(err);
            });

        return deferred.promise.nodeify(callback);
    };

    return {
        Checker: ConstraintChecker,
        TYPES: CONSTRAINT_TYPES
    };
});