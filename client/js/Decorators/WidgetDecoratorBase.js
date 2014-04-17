/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager'], function (logManager) {

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