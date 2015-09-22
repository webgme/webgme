/*globals define*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([], function () {
    'use strict';
    function AddOnUpdateResult(commitObj) {
        this.commitMessage = '';
        // Not yet supported
        this.notifications = [];
        this.commitObj = commitObj;
    }

    /**
     *
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