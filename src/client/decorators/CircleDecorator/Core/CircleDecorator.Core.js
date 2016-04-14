/*globals define*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/Constants',
    'js/Utils/DisplayFormat'
], function (CONSTANTS, displayFormat) {
    'use strict';
    var CircleDecoratorCore,
        CIRCLE_SIZE = 11;   //MAKE SURE IT IS THE SAME AS THE SVG's widh&height & the scss's $CIRCLE_SIZE

    CircleDecoratorCore = function () {
    };

    /**** Override from WidgetDecoratorBase ****/
    CircleDecoratorCore.prototype.DECORATOR_DEFAULT_PARAMS = {displayName: true};

    CircleDecoratorCore.prototype._initializeVariables = function (params) {
        this.formattedName = '';
        this.circleSize = CIRCLE_SIZE;

        this._displayConnectors = false;
        if (params && params.connectors) {
            this._displayConnectors = params.connectors;
        }
    };


    /**** Override from *.WidgetDecoratorBase ****/
    CircleDecoratorCore.prototype.destroy = function () {
    };

    /**** Override from *.WidgetDecoratorBase ****/
    CircleDecoratorCore.prototype.doSearch = function (searchDesc) {
        var searchText = searchDesc.toString().toLowerCase();

        return (this.formattedName && this.formattedName.toLowerCase().indexOf(searchText) !== -1);
    };


    CircleDecoratorCore.prototype._renderContent = function () {
        //render GME-ID in the DOM, for debugging
        this.$el.attr({'data-id': this._metaInfo[CONSTANTS.GME_ID]});

        /* BUILD UI*/
        //find placeholders
        this.skinParts.$name = this.$el.find('.name');

        if (this.decoratorParams.displayName === false) {

            this.skinParts.$name.remove();
            delete this.skinParts.$name;
        }

        this._update();
    };

    CircleDecoratorCore.prototype._update = function () {
        this._updateName();
    };

    /***** UPDATE THE NAME OF THE NODE *****/
    CircleDecoratorCore.prototype._updateName = function () {
        var client = this._control._client,
            nodeObj = client.getNode(this._metaInfo[CONSTANTS.GME_ID]),
            noName = '(N/A)';

        if (this.skinParts.$name) {
            if (nodeObj) {
                this.formattedName = displayFormat.resolve(nodeObj);
            } else {
                this.formattedName = noName;
            }

            this.skinParts.$name.text(this.formattedName);
            this.skinParts.$name.attr('title', this.formattedName);
        }
    };

    return CircleDecoratorCore;
});