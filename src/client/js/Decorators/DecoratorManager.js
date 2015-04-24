/*globals define, _, WebGMEGlobal, require*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {

    'use strict';

    var DecoratorManager,
        DECORATOR_PATH = 'decorators/',
        NOT_FOUND = '___N/A___';

    DecoratorManager = function () {
        this._logger = Logger.create('gme:Decorators:DecoratorManager', WebGMEGlobal.gmeConfig.client.log);

        this._decorators = {};
        this._widgetDecoratorCache = {};

        this._logger.debug('Created');
    };

    DecoratorManager.prototype.downloadAll = function (decoratorNames, callback) {
        var self = this,
            total = decoratorNames.length,
            cnt = total,
            i;

        function countCallback() {
            cnt -= 1;
            if (cnt === 0) {
                if (Object.keys(self._decorators).length === total) {
                    callback();
                } else {
                    callback('Failed to download all requested decorators ' + decoratorNames.toString() +
                             ' only got ' + Object.keys(self._decorators).toString());
                }
            }
        }

        for (i = 0; i < total; i += 1) {
            self._downloadOne(decoratorNames[i], countCallback);
        }
    };

    DecoratorManager.prototype.download = function (decorators, widget, fnCallBack) {
        var processDecorators,
            queue = decorators.slice(0),
            self = this;

        processDecorators = function () {
            var len = queue.length,
                result,
                decorator,
                i;

            if (len > 0) {
                self._logger.debug('Remaining decorators for widget "' + widget + '": ' + len + ', "' + queue + '"');
                decorator = queue.splice(0, 1)[0];
                self._downloadOne(decorator, function () {
                    //check if the decorator itself supports this widget
                    //or it specifies other decorators instead of itself
                    if (self._decorators[decorator]) {
                        result = self._decorators[decorator].getDecoratorForWidget(widget);
                        if (result) {
                            if (_.isArray(result)) {
                                i = result.len;
                                while (i--) {
                                    if (queue.indexOf(result[i]) === -1) {
                                        queue.push(result[i]);
                                    }
                                }
                            }
                        }
                    }

                    //process remaining
                    processDecorators(queue);
                });
            } else {
                self._logger.debug('No more decorators to download for widget "' + widget + '"');
                fnCallBack.call(self);
            }
        };

        this._logger.debug('Downloading decorators "' + decorators + '" for widget "' + widget + '"');
        processDecorators();
    };

    DecoratorManager.prototype.getDecoratorForWidget = function (decorator, widget) {
        var result;

        if (this._widgetDecoratorCache[widget] && this._widgetDecoratorCache[widget][decorator]) {
            result = this._widgetDecoratorCache[widget][decorator];
        } else {
            this._lookupDecoratorForWidget(decorator, widget);
            result = this._widgetDecoratorCache[widget][decorator];
        }

        if (result === NOT_FOUND) {
            result = undefined;
        }

        return result;
    };

    DecoratorManager.prototype._lookupDecoratorForWidget = function (decorator, widget) {
        var result,
            widgetDecorator,
            processDecoratorChain,
            self = this;

        this._logger.debug('_lookupDecoratorForWidget decorator: "' + decorator + '" for widget "' + widget + '"');

        this._widgetDecoratorCache[widget] = this._widgetDecoratorCache[widget] || {};

        processDecoratorChain = function (decoratorList) {
            var ret,
                i = decoratorList.length,
                fbDec;

            self._logger.debug('processDecoratorChain: ' + decoratorList);

            while (i--) {
                fbDec = decoratorList[i];
                if (self._decorators[fbDec]) {
                    ret = self._decorators[fbDec].getDecoratorForWidget(widget);
                    if (_.isArray(ret)) {
                        self._logger.debug('recursive processDecoratorChain at: ' + fbDec + ' for: ' + ret);
                        ret = processDecoratorChain(ret);
                    } else {
                        if (ret) {
                            self._logger.debug('processDecoratorChain return at: ' + fbDec);
                            break;
                        }
                    }
                }
            }

            return ret;
        };

        if (this._decorators[decorator]) {
            widgetDecorator = this._decorators[decorator].getDecoratorForWidget(widget);
            if (_.isArray(widgetDecorator)) {
                this._logger.debug('fallback decorator list for decorator "' + decorator + '" for widget "' + widget +
                                   '" is: ' + widgetDecorator);
                result = processDecoratorChain(widgetDecorator);
            } else {
                this._logger.debug('found decorator: "' + decorator + '" for widget "' + widget + '"');
                result = widgetDecorator;
            }
        }

        //if still no decorator found, return the default decorator
        if (result) {
            this._widgetDecoratorCache[widget][decorator] = result;
        } else {
            this._logger.debug('There is no decorator with name "' + decorator + '" that supports widget "' + widget +
                               '"');
            this._widgetDecoratorCache[widget][decorator] = NOT_FOUND;
        }

        return result;
    };

    DecoratorManager.prototype._getDecoratorFullPath = function (decorator) {
        return DECORATOR_PATH + decorator + '/' + decorator;
    };

    DecoratorManager.prototype._downloadOne = function (decorator, fnCallBack) {
        var self = this,
            decoratorPath = this._getDecoratorFullPath(decorator);

        this._logger.debug('Initiating decorator download for "' + decorator + '"');

        if (this._decorators[decorator]) {
            this._logger.debug('Decorator "' + decorator + '" has already been downloaded...');
            fnCallBack();
        } else {
            require([decoratorPath],
                function (DecoratorClass) {
                    self._logger.debug('Decorator "' + decorator + '" has been successfully downloaded');
                    try {
                        self._decorators[decorator] = new DecoratorClass();
                    } catch (err) {
                        delete self._decorators[decorator];
                        self._logger.error('Error while trying to instantiate decorator "' + decorator + '"...');
                    }

                    fnCallBack.call(self);
                },
                function (err) {
                    //for any error store undefined in the list and the default decorator will be used on the canvas
                    self._logger.error('Failed to download decorator "' + decorator + '" because of "' +
                                       err.requireType + '" with module "' + err.requireModules[0] + '"...');
                    fnCallBack.call(self);
                });
        }
    };

    return DecoratorManager;
});
