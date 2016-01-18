/*globals define*/
/*jshint node:true, browser:true*/

/**
 * Simple addOn sending notification on each branch update.
 * @author pmeijer / https://github.com/pmeijer
 * @module CoreAddOns:NotificationAddOn
 */

define([
    'addon/AddOnBase'
], function (AddOnBase) {
    'use strict';

    /**
     * Initializes a new instance of NotificationAddOn.
     * @class
     * @augments {AddOnBase}
     * @classdesc This class represents the addOn NotificationAddOn.
     * @constructor
     */
    var NotificationAddOn = function (mainLogger, gmeConfig) {
        // Call base class' constructor.
        AddOnBase.call(this, mainLogger, gmeConfig);

        // Counter that is increased on each update.
        this.cnt = 0;
    };

    // Prototypal inheritance from AddOnBase.
    NotificationAddOn.prototype = Object.create(AddOnBase.prototype);
    NotificationAddOn.prototype.constructor = NotificationAddOn;

    /**
     * Gets the name of the NotificationAddOn.
     * @returns {string} The name of the AddOn.
     * @public
     */
    NotificationAddOn.prototype.getName = function () {
        return 'Notification AddOn';
    };

    /**
     * Gets the semantic version (semver.org) of the NotificationAddOn.
     * @returns {string} The version of the AddOn.
     * @public
     */
    NotificationAddOn.prototype.getVersion = function () {
        return '0.1.0';
    };

    /**
     * Gets the description of the NotificationAddOn.
     * @returns {string} The description of the AddOn.
     * @public
     */
    NotificationAddOn.prototype.getDescription = function () {
        return 'Add-on illustrating how to send notifications from an add-on.';
    };

    /**
     * This is invoked each time changes in the branch of the project are done. AddOns are allowed to make changes on
     * an update, but should not persist by themselves. (The AddOnManager will persist after each addOn has had its way
     * ordered by the usedAddOn registry in the rootNode).
     * Before each invocation a new updateResult is created which should be returned in the callback. There is no need
     * for the AddOn to report if it made changes or not, the monitor/manager will always persist and if there are no
     * changed objects - it won't commit to the storage.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     */
    NotificationAddOn.prototype.update = function (rootNode, commitObj, callback) {
        var reminder;

        this.logger.info('NotificationAddOn in update at commitHash', commitObj._id);
        this.cnt += 1;

        reminder = this.cnt % 4;

        if (reminder === 0) {
            this.addNotification({message: 'Counter is ' + this.cnt, severity: 'info'});
        } else if (reminder === 1) {
            this.addNotification({message: 'Counter is ' + this.cnt, severity: 'success'});
        } else if (reminder === 2) {
            this.addNotification({message: 'Counter is ' + this.cnt, severity: 'warn'});
        } else if (reminder === 3) {
            this.addNotification({message: 'Counter is ' + this.cnt, severity: 'error'});
        }

        callback(null, this.updateResult);
    };

    /**
     * Called once when the addOn is started for the first time.
     * @param {object} rootNode
     * @param {object} commitObj
     * @param {function(Error, AddOnUpdateResult)} callback
     */
    NotificationAddOn.prototype.initialize = function (rootNode, commitObj, callback) {
        this.logger.info('NotificationAddOn got initialized at commitHash', commitObj._id);

        this.update(rootNode, commitObj, callback);
    };

    return NotificationAddOn;
});
