/*globals define, WebGMEGlobal*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {
    'use strict';

    var UserProfileWidget,
        USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN = '<i class="glyphicon glyphicon-user icon-white" title="Logged in as">' +
            '</i> <a href="/profile/" target="_top" class="navbar-link" title="View profile">__USERNAME__</a> ' +
            '<a href="/logout" target="_top" class="navbar-link">' +
            '<i class="glyphicon glyphicon-eject icon-white" title="Log out"></i></a>',
        USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN = '<i class="glyphicon glyphicon-user" title="Not logged in"></i>';

    UserProfileWidget = function (containerEl, client) {
        this._logger = Logger.create('gme:Widgets:UserProfile:UserProfileWidget', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;
        this._el = containerEl;

        this._initializeUI();

        this._logger.debug('Created');
    };


    UserProfileWidget.prototype._initializeUI = function () {
        var tmp = USER_PROFILE_WIDGET_TEMPLATE_NOTLOGGEDIN;
            tmp = USER_PROFILE_WIDGET_TEMPLATE_LOGGEDIN.replace('__USERNAME__', WebGMEGlobal.userInfo._id);
        tmp = '<p class="navbar-text">' + tmp + '</p>';

        this._el.html(tmp);
    };


    return UserProfileWidget;
});