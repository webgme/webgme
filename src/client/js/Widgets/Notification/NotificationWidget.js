/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox',
    'js/Constants'
], function (Logger, DropDownMenu, PopoverBox, CONSTANTS) {

    'use strict';

    var NotificationWidget;

    NotificationWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:NotificationWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug('Created');
    };

    NotificationWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();

        //BranchStatus DropDownMenu
        this._ddNotification = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true
        });
        this._ddNotification.setTitle('Notifications');

        this._el.append(this._ddNotification.getEl());

        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNotification.getEl());

        this._ddNotification.onItemClicked = function (value) {
            //self._logger.warn('Item clicked: ' + value);

        };

        this._client.addEventListener(CONSTANTS.CLIENT.NOTIFICATION, function (__client, eventData) {
                //self._logger.warn('TODO: process new notification ', eventData);

                self._refreshNotifications(eventData);
            }
        );

        //this._refreshNotifications({}); // initial notification
    };

    NotificationWidget.prototype._refreshNotifications = function (eventData) {
        var self = this,
            alertLevel = self._popoverBox.alertLevels[eventData.severity] || self._popoverBox.alertLevels.INFO;

        //self._logger.warn('TODO: show notification: ', eventData);

        self._popoverBox.show(eventData.message, alertLevel, 5000);
        //self._ddNotification.addItem({
        //    text: 'Text',
        //    value: 123
        //});
    };

    return NotificationWidget;
});