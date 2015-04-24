/*globals define, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/Decorators/WidgetDecoratorBase'
], function (Logger, WidgetDecoratorBase) {

    'use strict';

    var PartBrowserWidgetDecoratorBase,
        DECORATOR_ID = 'PartBrowserWidgetDecoratorBase';

    PartBrowserWidgetDecoratorBase = function (params) {
        WidgetDecoratorBase.call(this, params);

        this.skinParts = {};

        this._initialize();

        this.logger.debug('Created');
    };

    _.extend(PartBrowserWidgetDecoratorBase.prototype, WidgetDecoratorBase.prototype);

    PartBrowserWidgetDecoratorBase.prototype.DECORATORID = DECORATOR_ID;

    /*PartBrowserWidgetDecoratorBase.prototype.setControlSpecificAttributes = function () {
     };*/

    PartBrowserWidgetDecoratorBase.prototype.setControl = function (control) {
        this._control = control;
    };

    PartBrowserWidgetDecoratorBase.prototype.getControl = function () {
        return this._control;
    };

    PartBrowserWidgetDecoratorBase.prototype.setMetaInfo = function (params) {
        this._metaInfo = params;
    };

    PartBrowserWidgetDecoratorBase.prototype.getMetaInfo = function () {
        return this._metaInfo;
    };

    //called by the controller and the decorator can specify the territory rule for itself
    //must return an object of id - rule pairs, like
    //{'id': {'children': 0, ...}}
    PartBrowserWidgetDecoratorBase.prototype.getTerritoryQuery = function () {
        return undefined;
    };

    //called by the controller when an event arrives about registered subcomponent ID
    PartBrowserWidgetDecoratorBase.prototype.notifyComponentEvent = function (componentList) {
        this.logger.warn('notifyComponentEvent ' + componentList);
    };

    //initialization code for the decorator
    //this.$el will be created as the top-level container for the decorator's DOM
    //this.$el will be used later in the PartBrowserWidget's code, it must exist
    //NOTE - SHOULD NOT BE OVERRIDDEN
    PartBrowserWidgetDecoratorBase.prototype._initialize = function () {
        this.$el = $('<div/>');
    };

    //Called before the host designer item is added to the canvas DOM (DocumentFragment more precisely)
    //At this point the decorator should create its DOM representation
    //At this point no dimension information is available since the content exist only in memory, not yet rendered
    //NOTE - SHALL BE OVERRIDDEN WHEN NEEDED
    PartBrowserWidgetDecoratorBase.prototype.beforeAppend = function () {
    };

    PartBrowserWidgetDecoratorBase.prototype.afterAppend = function () {
    };

    //Called when the decorator of the DesignerItem needs to be destroyed
    //There is no need to touch the DOM, it will be taken care of in the DesignerItem's code
    //Remove any additional business logic, free up resources, territory, etc...
    //NOTE - CAN BE OVERRIDDEN WHEN NEEDED
    PartBrowserWidgetDecoratorBase.prototype.destroy = function () {
        this.logger.debug('PartBrowserWidgetDecoratorBase.destroyed');
    };


    /************* ADDITIONAL METHODS ***************************/
        //called when the designer item should be updated
    PartBrowserWidgetDecoratorBase.prototype.update = function () {
    };


    return PartBrowserWidgetDecoratorBase;
});