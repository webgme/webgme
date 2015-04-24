/*globals define, _, WebGMEGlobal */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger'], function (Logger) {

    'use strict';

    var WidgetDecoratorBase,
        DECORATOR_ID = 'WidgetDecoratorBase';

    WidgetDecoratorBase = function (params) {
        this.logger = params.logger || Logger.create('gme:Decorators:' +
                                                     this.DECORATORID, WebGMEGlobal.gmeConfig.client.log);
        this.preferencesHelper = params.preferencesHelper;
        this.decoratorParams = {};
        _.extend(this.decoratorParams, this.DECORATOR_DEFAULT_PARAMS, params.decoratorParams);
    };

    WidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    WidgetDecoratorBase.prototype.DECORATOR_DEFAULT_PARAMS = {};

    return WidgetDecoratorBase;
});
