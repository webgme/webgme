/*globals define*/
/*jshint node:true*/

/**
 * Continuously validates the meta rules for the entire project.
 * If there are violations the Root node will be renamed Meta Rules Violation else No Violations.
 *
 * TODO: This is just to illustrate a not a very nice way to show changes.
 * TODO: Until AddOns support notifications - this will have to do.
 *
 * @author kecso / https://github.com/kecso
 * @author pmeijer / https://github.com/pmeijer
 */

define(['addon/AddOnBase', 'common/core/users/constraintchecker'], function (AddOnBase, constraint) {

    'use strict';
    var ConstraintAddOn = function (logger, gmeConfig) {
        AddOnBase.call(this, logger, gmeConfig);
        this.constraintChecker = null;
        this.rootNode = null;
    };

    ConstraintAddOn.prototype = Object.create(AddOnBase.prototype);
    ConstraintAddOn.prototype.constructor = ConstraintAddOn;

    ConstraintAddOn.prototype.getName = function () {
        return 'ConstraintAddOn';
    };

    ConstraintAddOn.prototype.getVersion = function () {
        return '1.0.0';
    };

    ConstraintAddOn.prototype.getQueryParamsStructure = function () {
        return [{
            'name': 'queryType',
            'displayName': 'Query Type',
            'description': 'Which type of constraint checking',
            'value': 'checkProject',
            'valueType': 'string',
            'valueItems': [
                'checkProject',
                'checkModel',
                'checkNode'
            ]
        }];
    };

    ConstraintAddOn.prototype.update = function (rootNode, commitObj, callback) {
        var self = this,
            updateData = {
                commitMessage: ''
            };
        self.rootNode = rootNode;

        self.constraintChecker.reinitialize(self.rootNode, commitObj._id, constraint.TYPES.META);
        self.logger.debug('update invoked, checking project for meta violations.');
        self.constraintChecker.checkModel(self.core.getPath(self.rootNode))
            .then(function (result) {
                var previousName = self.core.getAttribute(self.rootNode, 'name');
                if (result.hasViolation === true) {
                    self.logger.debug('There were violations, will name rootNode "Violations", previous name:',
                        previousName);

                    if (previousName !== 'Violations') {
                        self.core.setAttribute(self.rootNode, 'name', 'Violations');
                        updateData.commitMessage += 'Found meta-rule violations, please check meta rules for details.';
                    }
                } else {
                    self.logger.debug('There were no violations, will name rootNode "No Violations", previous name:',
                        previousName);
                    if (previousName !== 'No Violations') {
                        self.core.setAttribute(self.rootNode, 'name', 'No Violations');
                        updateData.commitMessage += 'No meta-rule violations.';
                        updateData.commitMessage += 'No meta-rule violations.';
                    }
                }
                callback(null, updateData);
            })
            .catch(callback);
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

    ConstraintAddOn.prototype.initialize = function (rootNode, commitObj, callback) {
        var self = this;
        self.logger.debug('initialized called, will create checker using core');

        self.constraintChecker = new constraint.Checker(self.core, self.logger);
        self.constraintChecker.initialize(self.rootNode, commitObj._id, constraint.TYPES.META);

        self.update(rootNode, commitObj, callback);
    };

    return ConstraintAddOn;
});