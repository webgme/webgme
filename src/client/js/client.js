/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([
    'js/logger',
    'common/storage/browserstorage',
    'common/EventDispatcher',
    'common/core/core',
    'js/client/constants'
], function (Logger,
             Storage,
             EventDispatcher,
             Core,
             CONSTANTS) {
    'use strict';

    function Client(gmeConfig) {
        var self = this,
            logger = Logger.create('gme:client', gmeConfig.client.log),
            storage = Storage.getStorage(logger, gmeConfig),
            project = null;

        EventDispatcher.call(this);

        this.isConnected = function () {
            return storage.connected;
        };

        this.connectToDatabase = function (callback) {
            if (storage.connected) {
                logger.warn('connectToDatabase - already connected, check isConnected first.');
                callback(null);
                return;
            }
            storage.open(function (connectionState) {
                if (connectionState === CONSTANTS.STORAGE.CONNECTED) {
                    //N.B. this event will only be triggered once.
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, CONSTANTS.STORAGE.CONNECTED);
                    callback(null);
                } else if (connectionState === CONSTANTS.STORAGE.DISCONNECTED) {
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, CONSTANTS.STORAGE.DISCONNECTED);
                } else if (connectionState === CONSTANTS.STORAGE.RECONNECTED) {
                    self.dispatchEvent(CONSTANTS.NETWORK_STATUS_CHANGED, CONSTANTS.STORAGE.CONNECTED);
                } else { //CONSTANTS.ERROR
                    throw new Error('Connection failed!');
                }
            });
        };

        this.getActiveProjectName = function () {
            return project && project.name;
        };

        // REST-like functions and watchers forwarded to storage TODO: add these to separate base class
        this.getProjectNames = function (callback) {
            if (storage.connected) {
                storage.getProjectNames(callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.getProjects = function (callback) {
            if (storage.connected) {
                storage.getProjects(callback);
            } else {
                callback(new Error('There is no open database connection!'));
            }
        };

        this.watchDatabase = function (eventHandler) {
            storage.watchDatabase(eventHandler);
        };

        this.unwatchDatabase = function (eventHandler) {
            storage.watchDatabase(eventHandler);
        };

    }

    // Inherit from the EventDispatcher
    Client.prototype = Object.create(EventDispatcher.prototype);
    Client.prototype.constructor = Client;

    return Client;
});