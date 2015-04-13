/*globals define, Raphael, window, WebGMEGlobal*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'css!./styles/UserProfileWidget.css'], function (Logger) {

    "use strict";

    var UserProfileWidget,
        USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN = '<i class="glyphicon glyphicon-user icon-white" title="Logged in as"></i> <a href="#" class="navbar-link">__USERNAME__</a> <a href="/logout" target="_top" class="navbar-link"><i class="glyphicon glyphicon-eject icon-white" title="Log out"></i></a>',
        USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN = '<i class="glyphicon glyphicon-user" title="Not logged in"></i>';

    UserProfileWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:UserProfile:UserProfileWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug("Created");
    };


    UserProfileWidget.prototype._initializeUI = function () {
        var tmp = USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN;

        if (this._client &&
            this._client.getUserId &&
            this._client.getUserId() !== 'n/a') {
            tmp = USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN.replace("__USERNAME__", this._client.getUserId());
        }

        tmp = '<p class="navbar-text">' + tmp + '</p>';

        this._el.html(tmp);
    };


    return UserProfileWidget;
});