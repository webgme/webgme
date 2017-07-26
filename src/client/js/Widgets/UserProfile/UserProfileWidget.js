/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/logger',
    'css!./styles/UserProfileWidget.css'
], function (Logger) {
    'use strict';

    var TEMPLATE = '<p class="navbar-text user-profile-container">' +
        '<i class="glyphicon glyphicon-user icon-white" title="Logged in as"/>' +
        '</p>';

    function UserProfileWidget(containerEl, client, opts) {
        this._logger = Logger.create('gme:Widgets:UserProfile:UserProfileWidget', WebGMEGlobal.gmeConfig.client.log);
        opts = opts || {};
        this._client = client;
        this._el = containerEl;

        this._initializeUI(opts);

        this._logger.debug('Created');
    }


    UserProfileWidget.prototype._initializeUI = function (opts) {
        var widget = $(TEMPLATE),
            logoutUrl,
            userName = WebGMEGlobal.userInfo._id;

        if (window !== window.top) {
            logoutUrl = '/logout?redirect=' + window.top.document.referrer;
        } else {
            logoutUrl = '/logout';
        }

        if (opts.disableUserProfile) {
            widget.append($('<span class="user-name-field"/>').text(userName));
        } else {
            widget.append(
                $('<a href="/profile/" target="_self" class="navbar-link user-name-field" title="View profile"/>')
                    .text(userName)
            );
            widget.append($('<a target="_top" class="navbar-link">' +
                '<i class="glyphicon glyphicon-eject icon-white" title="Log out"/></a>').attr('href', logoutUrl));
        }

        this._el.append(widget);
    };


    return UserProfileWidget;
});