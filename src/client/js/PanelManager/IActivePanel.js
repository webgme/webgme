/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    var IActivePanel,
        ACTIVE_CLASS = 'active-panel';

    IActivePanel = function () {
    };

    IActivePanel.prototype.setActive = function (isActive) {
        if (isActive === true) {
            this.$pEl.addClass(ACTIVE_CLASS);
            this.onActivate();
        } else {
            this.$pEl.removeClass(ACTIVE_CLASS);
            this.onDeactivate();
        }
    };

    IActivePanel.prototype.onActivate = function () {
        this.logger.warn('IActivePanel.prototype.onActivate IS NOT IMPLEMENTED!!!');
    };

    IActivePanel.prototype.onDeactivate = function () {
        this.logger.warn('IActivePanel.prototype.onDeactivate IS NOT IMPLEMENTED!!!');
    };

    IActivePanel.prototype.getNodeID = function () {
        this.logger.warn('IActivePanel.prototype.getNodeID IS NOT IMPLEMENTED!!!');
        return undefined;
    };

    return IActivePanel;
});