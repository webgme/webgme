/*globals define,_*/
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 * 
 * @author rkereskenyi / https://github/rkereskenyi
 */

define(['logManager'], function (logManager) {

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
