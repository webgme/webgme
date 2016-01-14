/*globals define*/
/*jshint node:true*/

/**
 * Continuously validates the meta rules for the entire project. Will send notifications when violations
 * are found (and when they have been fixed).
 *
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 * @module CoreAddOns:ConstraintAddOn
 */

define(['addon/AddOnBase', 'common/core/users/constraintchecker'], function (AddOnBase, constraint) {

    'use strict';
    var ConstraintAddOn = function (logger, gmeConfig) {
        AddOnBase.call(this, logger, gmeConfig);
        this.constraintChecker = null;
        this.rootNode = null;
        this.hadViolation = false;
    };

    ConstraintAddOn.prototype = Object.create(AddOnBase.prototype);
    ConstraintAddOn.prototype.constructor = ConstraintAddOn;

    ConstraintAddOn.prototype.getName = function () {
        return 'Constraint AddOn';
    };

    ConstraintAddOn.prototype.getVersion = function () {
        return '1.0.0';
    };

    ConstraintAddOn.prototype.getQueryParamsStructure = function () {
        return [{
            name: 'queryType',
            displayName: 'Query Type',
            description: 'Which type of constraint checking',
            value: 'checkProject',
            valueType: 'string',
            valueItems: [
                'checkProject',
                'checkModel',
                'checkNode'
            ]
        }];
    };

    ConstraintAddOn.prototype.update = function (rootNode, commitObj, callback) {
        var self = this;

        self.rootNode = rootNode;
        self.constraintChecker.reinitialize(self.rootNode, commitObj._id, constraint.TYPES.META);
        self.logger.debug('update invoked, checking project for meta violations.');
        self.constraintChecker.checkModel(self.core.getPath(self.rootNode))
            .then(function (result) {
                if (result.hasViolation === true) {
                    self.addNotification({message: 'Model contains META violations', severity: 'warn'});
                    self.hadViolation = true;
                } else {
                    self.logger.debug('There were no violations');
                    if (self.hadViolation === true) {
                        self.addNotification({message: 'No more META violations', severity: 'success'});
                        self.hadViolation = false;
                    }
                }

                callback(null, self.updateResult);
            })
            .catch(callback);
    };

    ConstraintAddOn.prototype.initialize = function (rootNode, commitObj, callback) {
        var self = this;
        self.logger.debug('initialized called, will create checker using core');

        self.constraintChecker = new constraint.Checker(self.core, self.logger);
        self.constraintChecker.initialize(self.rootNode, commitObj._id, constraint.TYPES.META);

        self.update(rootNode, commitObj, callback);
    };

    ConstraintAddOn.prototype.query = function (commitHash, queryParams, callback) {
        //var self = this;
        //
        //switch (queryParams.querytype) {
        //    case 'checkProject':
        //        self.constraintChecker.checkModel(self.core.getPath(self.rootNode), callback);
        //        break;
        //    case 'checkModel':
        //        self.constraintChecker.checkModel(queryParams.path, callback);
        //        break;
        //    case 'checkNode':
        //        self.constraintChecker.checkNode(queryParams.path, callback);
        //        break;
        //    default:
        //        callback(new Error('Unknown command'));
        //}
    };

    return ConstraintAddOn;
});