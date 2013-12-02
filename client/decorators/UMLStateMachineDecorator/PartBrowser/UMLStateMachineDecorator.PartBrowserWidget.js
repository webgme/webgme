/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'js/NodePropertyNames',
    'js/Utils/METATypeHelper',
    'js/Widgets/PartBrowser/PartBrowserWidget.DecoratorBase',
    './../Core/UMLStateMachineDecoratorCore',
    'css!./UMLStateMachineDecorator.PartBrowserWidget'], function (CONSTANTS,
                                                         nodePropertyNames,
                                                         METATypeHelper,
                                                         PartBrowserWidgetDecoratorBase,
                                                         UMLStateMachineDecoratorCore) {

    var UMLStateMachineDecoratorPartBrowserWidget,
        DECORATOR_ID = "UMLStateMachineDecoratorPartBrowserWidget",
        WebGMEGlobal_META = WebGMEGlobal[METATypeHelper.METAKey];


    UMLStateMachineDecoratorPartBrowserWidget = function (options) {
        var opts = _.extend( {}, options);

        PartBrowserWidgetDecoratorBase.apply(this, [opts]);

        this._initializeDecorator({"connectors": false});

        this.logger.debug("UMLStateMachineDecoratorPartBrowserWidget ctor");
    };


    /************************ INHERITANCE *********************/
    _.extend(UMLStateMachineDecoratorPartBrowserWidget.prototype, PartBrowserWidgetDecoratorBase.prototype);
    _.extend(UMLStateMachineDecoratorPartBrowserWidget.prototype, UMLStateMachineDecoratorCore.prototype);


    /**************** OVERRIDE INHERITED / EXTEND ****************/

    /**** Override from PartBrowserWidgetDecoratorBase ****/
    UMLStateMachineDecoratorPartBrowserWidget.prototype.DECORATORID = DECORATOR_ID;


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    UMLStateMachineDecoratorPartBrowserWidget.prototype.beforeAppend = function () {
        this.$el = this.$DOMBase.clone();

        this._renderContent();
    };


    /**** Override from PartBrowserWidgetDecoratorBase ****/
    UMLStateMachineDecoratorPartBrowserWidget.prototype.afterAppend = function () {
        if (this._metaType === WebGMEGlobal_META.End ||
            this._metaType === WebGMEGlobal_META.Initial) {
            var nameWidth = this.$name.outerWidth();

            this.$name.css({ "margin-left": nameWidth / -2 });
        }
    };


    return UMLStateMachineDecoratorPartBrowserWidget;
});