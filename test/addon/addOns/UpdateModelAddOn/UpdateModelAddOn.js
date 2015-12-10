/*globals define*/
/*jshint node:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */
if (typeof define === 'undefined') {

} else {
    define(['addon/AddOnBase'], function (AddOnBase) {

        'use strict';

        /**
         *
         * @param logger
         * @param gmeConfig
         * @constructor
         */
        var UpdateModelAddOn = function (logger, gmeConfig) {
            AddOnBase.call(this, logger, gmeConfig);
            this.nodePaths = {
                //nodePath: {boolean}
            };
            this.commitCnt = 0;
        };

        UpdateModelAddOn.prototype = Object.create(AddOnBase.prototype);
        UpdateModelAddOn.prototype.constructor = UpdateModelAddOn;

        UpdateModelAddOn.prototype.getName = function () {
            return 'UpdateModelAddOn';
        };

        UpdateModelAddOn.prototype.getVersion = function () {
            return '1.0.0';
        };

        UpdateModelAddOn.prototype.update = function (rootNode, commitObj, callback) {
            var self = this,
                newName = self.core.getAttribute(rootNode, 'name') + '_';
            self.core.setAttribute(rootNode, 'name', newName);
            self.addNotification('Changed rootNode name to :' + newName);
            callback(null, self.updateResult);
        };

        UpdateModelAddOn.prototype.initialize = function (rootNode, commitObj, callback) {
            var self = this;
            self.update(rootNode, commitObj, callback);
        };

        return UpdateModelAddOn;
    });
}