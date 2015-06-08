/*globals define*/
/*jshint node:true, evil:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['addon/AddOnBase'], function (AddOnBase) {

    'use strict';
    var ConstraintAddOn = function (Core, storage, gmeConfig, logger, userId) {
        AddOnBase.call(this, Core, storage, gmeConfig, logger, userId);
    };

    ConstraintAddOn.prototype = Object.create(AddOnBase.prototype);
    ConstraintAddOn.prototype.constructor = ConstraintAddOn;

    ConstraintAddOn.prototype.root = null;
    ConstraintAddOn.prototype.contraints = {};
    ConstraintAddOn.prototype.contraintsStorage = {};

    ConstraintAddOn.prototype.getName = function () {
        return 'ConstraintAddOn';
    };

    ConstraintAddOn.prototype.update = function (root, callback) {
        //TODO if we would like a continuous constraint checking we should use this function as well
        this.root = root;
        callback(null);
    };

    ConstraintAddOn.prototype.query = function (parameters, callback) {
        var self = this;
        //several query will be available but the first is the simple run constraint
        switch (parameters.querytype) {
            case 'checkProject':
                this.checkProject(callback);
                break;
            case 'checkModel':
                self.loadNode(parameters.path, function (err, node) {
                    if (err) {
                        return callback(err);
                    }
                    self.checkModel(node, callback);
                });
                break;
            case 'checkNode':
                self.loadNode(parameters.path, function (err, node) {
                    if (err) {
                        return callback(err);
                    }
                    self.checkNode(node, callback);
                });
                break;
            default:
                callback('unknown command');
        }
    };

    /*ConstraintAddOn.prototype.start = function (parameters, callback) {
        var self = this;
        AddOnBase.prototype.start.call(this, parameters, function (err) {
            if (err) {
                return callback(err);
            }
            self.project.getBranchHash(self.branchName, '#hack', function (err, commitHash) {
                if (err) {
                    return callback(err);
                }
                self.project.loadObject(commitHash, function (err, commit) {
                    if (!err && commit) {
                        self.commit = commit;
                        self.core.loadRoot(commit.root, function (err, root) {
                            if (!err && root) {
                                self.root = root;
                                callback(null);
                            } else {
                                callback(err || 'cannot load initial root');
                            }
                        });
                    } else {
                        callback(err || 'cannot find the starting commit');
                    }
                });
            });
        });
    };*/

    ConstraintAddOn.prototype.stop = function (callback) {
        AddOnBase.prototype.stop.call(this, callback);
    };

    ConstraintAddOn.prototype.checkProject = function (callback) {
        this.checkModel(this.root, callback);
    };
    ConstraintAddOn.prototype.checkModel = function (root, callback) {
        var self = this,
            error = null,
            message = {},
            checkChild = function (node, cb) {
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
            };

        if (self.core.getPath(root) === self.core.getPath(self.core.getRoot(root))) {
            message.info = 'project validation';
        } else {
            message.info = 'model [' + self.core.getPath(root) + '] validation';
        }
        message.commit = self.commit;
        checkChild(root, callback);
    };

    ConstraintAddOn.prototype.checkNode = function (node, callback) {
        var self = this,
            message = {},
            error = null;

        self._checkNode(node, function (err, msg) {
            error = error || err;
            message[self.core.getGuid(node)] = msg;
            if (msg) {
                message.info = 'node [' + (self.core.getAttribute(node, 'name') || '') + '] validation';
                //TODO what should be the proper identification
                message.commit = self.commit;
                message.hasViolation = msg.hasViolation === true;
            }
            callback(error, message);
        });
    };

    ConstraintAddOn.prototype._checkNode = function (node, callback) {
        var self = this,
            message = {},
            error = null,
            names = self.core.getConstraintNames(node),
            needed = names.length,
            i,
            check = function (name) {
                self.executeConstraint(node, name, function (err, msg) {
                    error = error || err;
                    message[name] = msg;

                    if (err) {
                        message.hasViolation = true;
                    }
                    if (msg) {
                        if (msg.hasViolation === true) {
                            message.hasViolation = true;
                        }
                    }

                    if (--needed === 0) {
                        callback(error, message);
                    }
                });
            };

        message.info = 'node [' + self.core.getPath(node) + '] validation';
        message.commit = self.commit;
        message._path = self.core.getPath(node);
        message._name = self.core.getAttribute(node, 'name') || 'N/A';
        if (needed > 0) {
            for (i = 0; i < names.length; i++) {
                check(names[i]);
            }
        } else {
            callback(error, message);
        }
    };

    ConstraintAddOn.prototype.loadNode = function (path, callback) {
        this.core.loadByPath(this.root, path, callback);
    };

    ConstraintAddOn.prototype.executeConstraint = function (node, name, callback) {
        var self = this,
            script = self.core.getConstraint(node, name).script;

        if (!self.contraints[script]) {
            var a = '';
            eval('a = ' + script + ';');
            self.contraints[script] = function (core, node, callback) {
                try {
                    a(core, node, callback);
                } catch (e) {
                    callback(null, {
                        hasViolation: true,
                        message: 'Exception was thrown during constraint execution:\n' + e.toString()
                    });
                }
            };
            self.contraintsStorage[script] = {};
        }
        self.contraints[script].call(self.contraintsStorage[script], self.core, node, callback);
    };

    return ConstraintAddOn;
});