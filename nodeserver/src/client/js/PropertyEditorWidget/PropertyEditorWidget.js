"use strict";

define(['clientUtil',
        'js/WidgetBase/WidgetBaseWithHeader',
        'js/PropertyGrid/PropertyGrid',
        'css!/css/PropertyEditorWidget/PropertyEditorWidget'], function (util,
                                                           WidgetBaseWithHeader,
                                                           PropertyGrid) {

    var PropertyEditorWidget,
        __parent__ = WidgetBaseWithHeader;

    PropertyEditorWidget = function (options) {
        //set properties from options
        options[WidgetBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "PropertyEditorWidget";
        options[WidgetBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        //initialize UI
        this._initializeUI();

        this.logger.debug("PropertyEditorWidget ctor finished");
    };
    //inherit from WidgetBase
    _.extend(PropertyEditorWidget.prototype, __parent__.prototype);

    PropertyEditorWidget.prototype._initializeUI = function () {
        var self = this;

        //set Widget title
        this.setTitle("Property Editor");

        //load PropertyEditor control
        this.propertyGrid = new PropertyGrid();
        this.$el.append(this.propertyGrid.$el);

        this.propertyGrid.registerWidgetForType('boolean', 'iCheckBox');
    };

    return PropertyEditorWidget;
});