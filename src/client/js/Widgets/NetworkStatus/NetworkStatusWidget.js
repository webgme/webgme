/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/logger',
    'js/Controls/DropDownMenu',
    'js/Controls/PopoverBox',
    'js/Constants'
], function (Logger, DropDownMenu, PopoverBox, CONSTANTS) {

    'use strict';

    var NetworkStatusWidget,
        ITEM_VALUE_CONNECT = 'connect',
        ITEM_VALUE_REFRESH = 'refresh',
        ITEM_VALUE_LOGOUT = 'logout',
        ITEM_VALUE_DOWNLOAD_ERROR = 'downloadError';

    NetworkStatusWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:NetworkStatus:NetworkStatusWidget',
            WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;
        this._urlAtDisconnect = '';

        this._initializeUI();

        this._logger.debug('Created');
    };

    NetworkStatusWidget.prototype._initializeUI = function () {
        var self = this,
            initialStatus = this._client.getNetworkStatus();

        this._el.empty();

        //#1 - NetworkStatus
        this._ddNetworkStatus = new DropDownMenu({
            dropUp: true,
            pullRight: true,
            size: 'micro',
            sort: true
        });
        this._ddNetworkStatus.setTitle('NETWORKSTATUS');

        this._el.append(this._ddNetworkStatus.getEl());

        this._ddNetworkStatus.onItemClicked = function (value) {
            if (value === ITEM_VALUE_CONNECT) {

            } else if (value === ITEM_VALUE_REFRESH) {
                document.location.href = self._urlAtDisconnect;
            } else if (value === ITEM_VALUE_LOGOUT) {
                document.location.href = '/logout';
            } else if (value === ITEM_VALUE_DOWNLOAD_ERROR) {
                self._client.downloadError();
            }
        };

        this._client.addEventListener(CONSTANTS.CLIENT.NETWORK_STATUS_CHANGED, function (client, networkStatus) {
            self._refreshNetworkStatus(networkStatus);
        });

        this._refreshNetworkStatus(initialStatus);
    };

    NetworkStatusWidget.prototype._refreshNetworkStatus = function (status) {
        this._logger.debug('_refreshNetworkStatus', status);
        switch (status) {
            case CONSTANTS.CLIENT.STORAGE.CONNECTED:
                this._modeConnected();
                break;
            case CONSTANTS.CLIENT.STORAGE.RECONNECTED:
                this._modeReconnected();
                break;
            case CONSTANTS.CLIENT.STORAGE.DISCONNECTED:
                this._urlAtDisconnect = window.location.href;
                this._modeDisconnected();
                break;
            case CONSTANTS.CLIENT.STORAGE.INCOMPATIBLE_CONNECTION:
                this._modeIncompatible();
                break;
            case CONSTANTS.CLIENT.STORAGE.JWT_EXPIRED:
                this._modeTokenExpired();
                break;
            case CONSTANTS.CLIENT.STORAGE.CONNECTION_ERROR:
                this._modeError();
                break;
            case CONSTANTS.CLIENT.UNCAUGHT_EXCEPTION:
                this._modeUncaughtException();
                break;
        }
    };

    NetworkStatusWidget.prototype._modeConnected = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('CONNECTED');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);

        if (this._disconnected === true) {
            this._popoverBox.show('Connected to the server',
                this._popoverBox.alertLevels.SUCCESS, true);
            delete this._disconnected;
        }
    };

    NetworkStatusWidget.prototype._modeReconnected = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('RECONNECTED');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.GREEN);

        if (this._disconnected === true) {
            this._popoverBox.show('Connection to the server has been restored...',
                this._popoverBox.alertLevels.SUCCESS, true);
            delete this._disconnected;
        }
    };

    NetworkStatusWidget.prototype._modeDisconnected = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('DISCONNECTED');
        this._ddNetworkStatus.addItem({
            text: 'Awaiting automatic reconnect...',
            value: ITEM_VALUE_CONNECT
        });
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.ORANGE);

        this._disconnected = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNetworkStatus.getEl());
        this._popoverBox.show('Connection to the server has been lost...', this._popoverBox.alertLevels.WARNING, false);
    };

    NetworkStatusWidget.prototype._modeIncompatible = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('INCOMPATIBLE_CONNECTION');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.RED);
        this._ddNetworkStatus.addItem({
            text: 'Refresh...',
            value: ITEM_VALUE_REFRESH
        });

        this._disconnected = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNetworkStatus.getEl());
        this._popoverBox.show('New connection is not compatible with client - refresh required.',
            this._popoverBox.alertLevels.ERROR, true);
    };

    NetworkStatusWidget.prototype._modeTokenExpired = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('AUTH_TOKEN_EXPIRED');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.RED);
        this._ddNetworkStatus.addItem({
            text: 'Logout...',
            value: ITEM_VALUE_LOGOUT
        });

        this._disconnected = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNetworkStatus.getEl());
        this._popoverBox.show('Token has expired - a new login is required.',
            this._popoverBox.alertLevels.ERROR, true);
    };

    NetworkStatusWidget.prototype._modeError = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('CONNECTION_ERROR');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.RED);
        this._ddNetworkStatus.addItem({
            text: 'Refresh...',
            value: ITEM_VALUE_REFRESH
        });

        this._disconnected = true;
        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNetworkStatus.getEl());
        this._popoverBox.show('Unexpected connection error - refresh required.',
            this._popoverBox.alertLevels.ERROR, true);
    };

    NetworkStatusWidget.prototype._modeUncaughtException = function () {
        this._ddNetworkStatus.clear();
        this._ddNetworkStatus.setTitle('UNCAUGHT_EXCEPTION');
        this._ddNetworkStatus.setColor(DropDownMenu.prototype.COLORS.RED);
        this._ddNetworkStatus.addItem({
            text: 'Refresh...',
            value: ITEM_VALUE_REFRESH
        });
        this._ddNetworkStatus.addItem({
            text: 'Download error data',
            value: ITEM_VALUE_DOWNLOAD_ERROR
        });

        this._popoverBox = this._popoverBox || new PopoverBox(this._ddNetworkStatus.getEl());
        this._popoverBox.show('Uncaught exception - click here for actions',
            this._popoverBox.alertLevels.ERROR, true);
    };

    return NetworkStatusWidget;
});