/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'superagent',
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
            userName = WebGMEGlobal.getUserDisplayName(WebGMEGlobal.userInfo._id),
            logoutEl,
            referrer,
            logoutUrl;

        if (opts.disableUserProfile) {
            widget.append($('<span class="user-name-field"/>').text(userName));
        } else {
            widget.append(
                $('<a href="/profile/" target="_self" class="navbar-link user-name-field" title="View profile"/>')
                    .text(userName)
            );

            referrer = window.sessionStorage.getItem('originalReferrer');

            if (referrer) {
                logoutUrl = '/logout?redirectUrl=' + referrer;
            } else {
                logoutUrl = '/logout';
            }

            logoutEl = $('<a target="_blank" class="navbar-link logout-btn">' +
                '<i class="glyphicon glyphicon-eject icon-white" title="Log out"/></a>');

            logoutEl.on('click', function () {
                var tempAnchor = document.createElement('a');

                tempAnchor.target = '_self';

                if (referrer) {
                    tempAnchor.href = '/logout?redirectUrl=' + referrer;
                } else {
                    tempAnchor.href = '/logout';
                }


                document.body.appendChild(tempAnchor);

                // Make sure to clear the cookie before posting logout (and the parent closes the page).
                document.cookie = WebGMEGlobal.gmeConfig.authentication.jwt.cookieId +
                    '=; expires=Thu, 01 Jan 1970 00:00:00 GMT';
                //While the server processes the request - post logout message to the parent.
                window.parent.postMessage('logout', '*');

                // Send the logout request.
                tempAnchor.click();
            });

            widget.append(logoutEl);
        }

        this._el.append(widget);
    };


    return UserProfileWidget;
});
