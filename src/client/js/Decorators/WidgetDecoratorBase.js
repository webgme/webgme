/*globals define, _, requirejs, WebGMEGlobal, Raphael*/

define(['common/LogManager'], function (logManager) {

    "use strict";

    var WidgetDecoratorBase,
        DECORATOR_ID = "WidgetDecoratorBase";

    WidgetDecoratorBase = function (params) {
        this.logger = params.logger || logManager.create(this.DECORATORID);
        this.preferencesHelper = params.preferencesHelper;
        this.decoratorParams = {};
        _.extend(this.decoratorParams, this.DECORATOR_DEFAULT_PARAMS, params.decoratorParams);
    };

    WidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    WidgetDecoratorBase.prototype.DECORATOR_DEFAULT_PARAMS = {};

    return WidgetDecoratorBase;
});
