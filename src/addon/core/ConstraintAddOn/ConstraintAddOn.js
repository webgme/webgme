/*globals define*/
/*jshint node:true*/

/**
 * @author kecso / https://github.com/kecso
 */

define(['addon/AddOnBase', 'common/core/users/constraintchecker'], function (AddOnBase, constraint) {

    'use strict';
    var ConstraintAddOn = function (Core, storage, gmeConfig, logger, userId) {
        AddOnBase.call(this, Core, storage, gmeConfig, logger, userId);
        this.constraintChecker = null;
    };

    ConstraintAddOn.prototype = Object.create(AddOnBase.prototype);
    ConstraintAddOn.prototype.constructor = ConstraintAddOn;

    ConstraintAddOn.prototype.getName = function () {
        return 'ConstraintAddOn';
    };

    ConstraintAddOn.prototype.update = function (root, callback) {
        //TODO if we would like a continuous constraint checking we should use this function as well
        this.root = root;
        this.constraintChecker.initialize(this.root, this.commit, constraint.TYPES.CUSTOM);
        callback(null);
    };

    ConstraintAddOn.prototype.query = function (parameters, callback) {
        var self = this;
        //several query will be available but the first is the simple run constraint
        switch (parameters.querytype) {
            case 'checkProject':
                self.constraintChecker.checkModel(self.root, callback);
                break;
            case 'checkModel':
                self._loadNode(parameters.path, function (err, node) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    self.constraintChecker.checkModel(node, callback);
                });
                break;
            case 'checkNode':
                self._loadNode(parameters.path, function (err, node) {
                    if (err) {
                        callback(err);
                        return;
                    }
                    self.constraintChecker.checkNode(node, callback);
                });
                break;
            default:
                callback('unknown command');
        }
    };

    ConstraintAddOn.prototype.start = function (parameters, callback) {
        var self = this;
        AddOnBase.prototype.start.call(self, parameters, function (err) {
            if (err) {
                callback(err);
            } else {
                self.constraintChecker = new constraint.Checker(self.core, self.logger);
                self.constraintChecker.initialize(self.root, self.commit, constraint.TYPES.CUSTOM);
                callback(null);
            }
        });
    };

    ConstraintAddOn.prototype._loadNode = function (path, callback) {
        this.core.loadByPath(this.root, path, callback);
    };

    return ConstraintAddOn;
});