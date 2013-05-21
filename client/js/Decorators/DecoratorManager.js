/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */
"use strict";

define(['logManager'], function (logManager) {

    var DecoratorManager;

    DecoratorManager = function () {
        this._logger = logManager.create('DecoratorManager');

        this._decorators = {};

        this._logger.debug("Created");
    };

    DecoratorManager.prototype.download = function (decorators, fnCallBack) {
        var len = decorators.length,
            processDecorators,
            self = this;

        processDecorators = function () {
            var len = decorators.length;

            if (len > 0) {
                self._logger.debug("Remaining: " + len);
                self._downloadOne(decorators.splice(0,1)[0], function () {
                    processDecorators();
                });
            } else {
                self._logger.debug("All decorators has been downloaded.");
                fnCallBack.call(self);
            }
        };

        this._logger.debug("Start downloading of " + decorators.length + " decorators...");
        processDecorators();
    };

    DecoratorManager.prototype.get = function (decorator) {
        return this._decorators[decorator];
    };

    DecoratorManager.prototype._downloadOne = function (decorator, fnCallBack) {
        var self = this;

        this._logger.debug("Initiating decorator download for '" + decorator + "'");

        if (this._decorators[decorator]) {
            this._logger.debug("Decorator is already downloaded...");
            fnCallBack();
        } else {
            require([decorator],
                function (decoratorClass) {
                    self._logger.debug("Decorator '" + decorator + "' has been successfully downloaded");
                    self._decorators[decorator] = decoratorClass;
                    fnCallBack.call(self);
                },
                function (err) {
                    //for any error store undefined in the list and the default decorator will be used on the canvas
                    self._logger.error("Failed to download decorator '" + decorator + "' because of '" + err.requireType + "' with module '" + err.requireModules[0] + "'...");
                    fnCallBack.call(self);
                });
        }
    };

    return DecoratorManager;
});
