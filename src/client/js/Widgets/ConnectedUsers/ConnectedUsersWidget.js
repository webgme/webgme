/*globals define, WebGMEGlobal, d3, $*/
/*jshint browser: true*/

/**
 * Widget for displaying connected users.
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'css!./styles/ConnectedUsersWidget.css',
    'jquery'
], function (Logger) {
    'use strict';

    var COLORS = [
        'aqua',
        'aquamarine',
        'blue',
        'blueviolet',
        'coral',
        'chartreuse',
        'orange',
        'fuchsia',
        'khaki',
        'orangered',
        'plum',
        'yellow',
        'red'
    ];

    function ConnectedUsersWidget(containerEl, client) {
        var self = this;
        this.logger = Logger.create('gme:Widgets:ConnectedUsers:ConnectedUsersWidget',
            WebGMEGlobal.gmeConfig.client.log);

        this.client = client;

        this.$el = ($('<div/>', {
            class: 'connected-users-widget'
        }));

        containerEl.append(this.$el);

        this.users = {};

        this.userId = WebGMEGlobal.userInfo._id;

        this.client.addEventListener(this.client.CONSTANTS.CONNECTED_USERS_CHANGED, function (_client, eventData) {
            self._userChanged(eventData);
        });

        this.client.addEventListener(this.client.CONSTANTS.PROJECT_CLOSED, function (/*_client*/) {
            self._reinitialize();
        });

        this.client.addEventListener(this.client.CONSTANTS.BRANCH_CHANGED, function (/*_client, eventData*/) {
            self._reinitialize();
        });

        this.logger.debug('ctor');

        this._reinitialize();
    }

    ConnectedUsersWidget.prototype._reinitialize = function () {
        this.$el.empty();
        this.users = {};
        this.colors = COLORS.slice();
    };

    ConnectedUsersWidget.prototype._userChanged = function (eventData) {
        if (eventData.type === this.client.CONSTANTS.STORAGE.BRANCH_ROOM_SOCKETS) {
            if (eventData.join === true) {
                this.logger.debug('user joined branch-room', eventData);
                this._userJoined(eventData);
            } else {
                this.logger.debug('user left branch-room', eventData);
                this._userLeft(eventData);
            }
        } else if (eventData.type === this.client.CONSTANTS.STORAGE.CLIENT_STATE_NOTIFICATION) {
            this.logger.debug('user updated its state', eventData);
            this._userUpdated(eventData);
        } else {
            this.logger.error(new Error('Unexpected event type ' + eventData.type));
        }
    };

    ConnectedUsersWidget.prototype._userJoined = function (eventData) {
        var colorInd,
            userInfo;

        if (this.users.hasOwnProperty(eventData.userId) === true) {
            this.logger.debug('New user was already added', eventData.userId);
            return;
        }

        if (eventData.userId === this.userId) {
            this.logger.debug('New user was you', eventData.userId);
            return;
        }

        colorInd = Math.floor(Math.random() * this.colors.length);

        userInfo = {
            userId: eventData.userId,
            color: this.colors[colorInd],
            $el: $('<div/>', {
                class: 'user-badge',
                text: eventData.userId[0].toUpperCase() // Display first letter of the user.
            }),
            state: {}
        };

        userInfo.$el.css('background-color', userInfo.color);

        this.colors.splice(colorInd, 1);
        if (this.colors.length === 0) {
            this.colors = COLORS.slice();
        }

        this.users[eventData.userId] = userInfo;
        this.$el.append(userInfo.$el);
    };

    ConnectedUsersWidget.prototype._userLeft = function (eventData) {
        var userInfo = this.users[eventData.userId];
        if (!userInfo) {
            this.logger.debug('Leaving user was already removed', eventData.userId);
            return;
        }

        userInfo.$el.remove();
        delete this.users[eventData.userId];
        this.colors.push(userInfo.color);
    };

    ConnectedUsersWidget.prototype._userUpdated = function (eventData) {
        var userInfo;

        if (eventData.userId === this.userId) {
            this.logger.debug('Updating user was you', eventData.userId);
            return;
        }

        // Ensure that the user is accounted for.
        this._userJoined(eventData);

        userInfo = this.users[eventData.userId];

        // Currently we only check the activeObject.
        if (eventData.state && userInfo.state.activeObject !== eventData.state.activeObject) {
            userInfo.state.activeObject = eventData.state.activeObject;

            userInfo.$el.prop('title', userInfo.state.activeObject);
        }
    };


    return ConnectedUsersWidget;
});