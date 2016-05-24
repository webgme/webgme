/*globals define, WebGMEGlobal, d3, $*/
/*jshint browser: true*/

/**
 * Widget for displaying connected users.
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/logger',
    'js/UIEvents',
    'css!./styles/ConnectedUsersWidget.css',
    'jquery'
], function (Logger, UI_EVENTS) {
    'use strict';

    var COLORS = [
        // 'aqua',
        // 'aquamarine',
        // 'blue',
        // 'blueviolet',
        // 'coral',
        // 'chartreuse',
        // 'orange',
        // 'fuchsia',
        // 'khaki',
        // 'orangered',
        // 'plum',
        // 'yellow',
        // 'red'
        'default',
        'primary',
        'success',
        'danger',
        'info',
        'warning'
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

        this.rooms = {
            //<projectId>%<branchName>: {
                    //users: {},
                    //colors: {}
                //}
        };

        this.userId = WebGMEGlobal.userInfo._id;

        this.client.addEventListener(this.client.CONSTANTS.CONNECTED_USERS_CHANGED, function (_client, eventData) {
            self._userChanged(eventData);
        });

        this.client.addEventListener(this.client.CONSTANTS.PROJECT_OPENED, function (/*_client*/) {
            self._reinitialize();
        });

        this.client.addEventListener(this.client.CONSTANTS.BRANCH_CHANGED, function (/*_client, eventData*/) {
            self._reinitialize();
        });

        this.logger.debug('ctor');

        this._reinitialize();
    }

    ConnectedUsersWidget.prototype._reinitialize = function () {
        var projectId = this.client.getActiveProjectId(),
            branchName = this.client.getActiveBranchName(),
            self = this,
            roomName;

        if (!projectId || !branchName) {
            this.$el.empty();
            this.rooms = {};
        } else {
            roomName = this._getBranchRoomName({projectId: projectId, branchName: branchName});
            Object.keys(this.rooms).forEach(function (rName) {
                if (rName !== roomName) {
                    // The room data is not the current one.
                    Object.keys(self.rooms[rName].users).forEach(function (uName) {
                        // For each user clear event handlers ..
                        self.rooms[rName].users[uName].$el.off('click');
                        // and remove user element from the DOM..
                        self.rooms[rName].users[uName].$el.remove();
                    });
                    // and delete the room.
                    delete self.rooms[rName];
                }
            });
        }
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
        var roomName = this._getBranchRoomName(eventData),
            self = this,
            colorInd,
            userInfo;

        this.rooms[roomName] = this.rooms[roomName] || {
                users: {},
                colors: COLORS.slice()
            };

        if (this.rooms[roomName].users.hasOwnProperty(eventData.userId) === true) {
            this.logger.debug('New user was already added', eventData.userId);
            return;
        }

        if (eventData.userId === this.userId) {
            this.logger.debug('New user was you', eventData.userId);
            return;
        }

        colorInd = Math.floor(Math.random() * this.rooms[roomName].colors.length);

        userInfo = {
            userId: eventData.userId,
            color: this.rooms[roomName].colors[colorInd],
            $el: $('<button/>', {
                class: 'user-badge btn btn-xs',
                title: eventData.userId,
                text: eventData.userId[0].toUpperCase() // Display first letter of the user.
            }),
            state: {}
        };

        // userInfo.$el.css('background-color', userInfo.color);
        userInfo.$el.addClass('btn-' + userInfo.color);

        userInfo.$el.on('click', function () {
            if (typeof userInfo.state.activeObject === 'string') {
                self.client.dispatchEvent(UI_EVENTS.LOCATE_NODE, {nodeId: userInfo.state.activeObject});
            }
        });

        this.rooms[roomName].colors.splice(colorInd, 1);
        if (this.rooms[roomName].colors.length === 0) {
            this.rooms[roomName].colors = COLORS.slice();
        }

        this.rooms[roomName].users[eventData.userId] = userInfo;
        this.$el.append(userInfo.$el.hide().fadeIn(3000));
    };

    ConnectedUsersWidget.prototype._userLeft = function (eventData) {
        var roomName = this._getBranchRoomName(eventData),
            userInfo = this.rooms[roomName] && this.rooms[roomName].users[eventData.userId];

        if (!userInfo) {
            this.logger.debug('Leaving user was already removed', eventData.userId);
            return;
        }

        userInfo.$el.remove();
        delete this.rooms[roomName].users[eventData.userId];

        this.rooms[roomName].colors.push(userInfo.color);
    };

    ConnectedUsersWidget.prototype._userUpdated = function (eventData) {
        var userInfo,
            roomName = this._getBranchRoomName(eventData);

        if (eventData.userId === this.userId) {
            this.logger.debug('Updating user was you', eventData.userId);
            return;
        }

        // Ensure that the user is accounted for.
        this._userJoined(eventData);

        userInfo = this.rooms[roomName].users[eventData.userId];

        // Currently we only check the activeObject.
        if (eventData.state && userInfo.state.activeObject !== eventData.state.activeObject) {
            userInfo.state.activeObject = eventData.state.activeObject;

            userInfo.$el.prop('title', userInfo.userId + '@' + userInfo.state.activeObject);
        }
    };

    ConnectedUsersWidget.prototype._getBranchRoomName = function (eventData) {
        if (eventData.hasOwnProperty('projectId') === false || eventData.hasOwnProperty('branchName') === false) {
            this.logger.error(new Error('EventData did not contain branch room info "' + eventData.projectId + '", "' +
                eventData.branchName + '"'));
        } else {
            return eventData.projectId + this.client.CONSTANTS.STORAGE.ROOM_DIVIDER + eventData.branchName;
        }
    };

    return ConnectedUsersWidget;
});