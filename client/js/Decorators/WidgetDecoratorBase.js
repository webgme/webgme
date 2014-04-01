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
        this.decoratorParams = params.decoratorParams;
    };

    WidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    return WidgetDecoratorBase;
});