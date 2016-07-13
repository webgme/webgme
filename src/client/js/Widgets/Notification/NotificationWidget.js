/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox',
    'js/Constants',
    'css!./styles/NotificationWidget.css'
], function (Logger, DropDownMenu, PopoverBox, CONSTANTS) {

    'use strict';

    var NotificationWidget,
        ITEM_VALUE_CLEAR = 'clearAll',
        CLEAR_ALL_HTML = '<li><a class="notification-drop-down-menu-item notification-drop-down-menu-item-clear ' +
            'empty">Clear Notifications<i class="glyphicon glyphicon-trash clear-all-icon pull-right"/></a></li>';

    NotificationWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:NotificationWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;
        this._el.addClass('notification-widget');
        this._notifications = [];

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
            size: 'micro'
        });

        this._ddNotification.setTitle('NOTIFICATIONS [0]');
        this._ddNotification.setColor(DropDownMenu.prototype.COLORS.BLUE);

        this._ddNotification.onItemClicked = function (value) {
            if (value === ITEM_VALUE_CLEAR) {
                self._notifications = [];
                //self._ddNotification.setColor(DropDownMenu.prototype.COLORS.GRAY);
                self._ddNotification.clear();
                self._ddNotification.setTitle('NOTIFICATIONS [0]');
            }
        };

        this._el.append(this._ddNotification.getEl());

        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNotification.getEl());

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

        if (self._notifications.length === 0) {
            self._ddNotification.addItem({
                html: CLEAR_ALL_HTML,
                value: ITEM_VALUE_CLEAR
            });
        }
        self._notifications.push(eventData);
        self._ddNotification.setTitle('NOTIFICATIONS [' + self._notifications.length + ']');
        //if (alertLevel === self._popoverBox.alertLevels.SUCCESS) {
        //    self._ddNotification.setColor(DropDownMenu.prototype.COLORS.GREEN);
        //} else if (alertLevel === self._popoverBox.alertLevels.INFO) {
        //    self._ddNotification.setColor(DropDownMenu.prototype.COLORS.BLUE);
        //} else if (alertLevel === self._popoverBox.alertLevels.WARN) {
        //    self._ddNotification.setColor(DropDownMenu.prototype.COLORS.ORANGE);
        //} else if (alertLevel === self._popoverBox.alertLevels.ERROR) {
        //    self._ddNotification.setColor(DropDownMenu.prototype.COLORS.RED);
        //}
        this._ddNotification.addItem({
            html: '<li><a class="notification-drop-down-menu-item notification-drop-down-menu-item-' +
            eventData.severity.toLowerCase() + '">' + eventData.message + '</a></li>'
        });

        if (this._ddNotification._el.hasClass('open') === false) {
            // Don't show popover when dropdown list is open
            if (eventData.severity.toLowerCase() === 'error') {
                self._popoverBox.show(eventData.message, alertLevel, 5000);
            } else {
                self._popoverBox.show('New message', alertLevel, 500);
            }
        }
        //self._ddNotification.addItem({
        //    text: 'Text',
        //    value: 123
        //});
    };

    return NotificationWidget;
});