/*globals define*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';

    /**
     * Represents the report format add-ons resolves with after an update.
     * There is no need for the add-on to report if it made changes or not,
     * the monitor/manager will always persist and if there are no changed objects
     * - it won't commit to the storage.
     * @param {object} - commitObj
     * @constructor
     * @alias AddOnUpdateResult
     */
    function AddOnUpdateResult(commitObj) {
        this.commitMessage = '';
        // Not yet supported
        this.notifications = [];
        this.commitObj = commitObj;
    }

    /**
     * Create or appends to the commit message.
     * @param {AddOnBase} addOn
     * @param {string} msg
     */
    AddOnUpdateResult.prototype.addCommitMessage = function (addOn, msg) {
        if (this.commitMessage) {
            this.commitMessage += ', ' + msg;
        } else {
            this.commitMessage = ' - [' + addOn.getName() + '] (v' + addOn.getVersion() + ') ' + msg;
        }
    };

    /**
     *
     * @param {AddOnBase} addOn
     * @param {Notification} notification
     */
    AddOnUpdateResult.prototype.addNotification = function (addOn, notification) {
        this.notifications.push(notification);
    };

    return AddOnUpdateResult;
});