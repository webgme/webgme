/*globals define, _ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Controls/PropertyGrid/PropertyGrid',
    'js/Constants',
    './PropertyEditorPanelController'
], function (PanelBaseWithHeader,
             PropertyGrid,
             CONSTANTS,
             PropertyEditorPanelController) {

    'use strict';

    var PropertyEditorPanel,
        __parent__ = PanelBaseWithHeader,
        PROPERTY_EDITOR_CLASS = 'property-editor';

    PropertyEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'PropertyEditorPanel';
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('PropertyEditorPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(PropertyEditorPanel.prototype, __parent__.prototype);

    PropertyEditorPanel.prototype._initialize = function () {
        var self = this,
            p,
            propertyGrid;

        this.$el.addClass(PROPERTY_EDITOR_CLASS);

        this.$el.html('<ul class="nav nav-tabs">' +
            '<li class="active"><a href="#attributes" data-toggle="tab">Attributes</a></li>' +
            '<li class=""><a href="#pointers" data-toggle="tab">Pointers</a></li>' +
            '<li class=""><a href="#meta" data-toggle="tab">Meta</a></li>' +
            '<li class=""><a href="#preferences" data-toggle="tab">Preferences</a></li>' +
            '</ul>' + '<div class="tab-content">' +
            '<div class="tab-pane active" id="attributes">attributes</div>' +
            '<div class="tab-pane" id="pointers">pointers</div>' +
            '<div class="tab-pane" id="meta">meta</div>' +
            '<div class="tab-pane" id="preferences">preferences</div>' +
            '</div>');

        //set Widget title
        this.setTitle('Property Editor');

        this.propertyGrids = [];

        //load PropertyEditor control for PROPERTY_GROUP_ATTRIBUTES
        propertyGrid = new PropertyGrid();
        this.propertyGrids.push(propertyGrid);
        this.$el.find('div#attributes').html(propertyGrid.$el);

        // FIXME: This approach of multiple controllers can be very inefficient when selecting many nodes.

        //attach control to the PropertyGrid for PROPERTY_GROUP_ATTRIBUTES
        p = new PropertyEditorPanelController(this._client, propertyGrid, CONSTANTS.PROPERTY_GROUP_ATTRIBUTES);
        p.setReadOnly = function (isReadOnly) {
            self.setReadOnly(isReadOnly);
        };

        //load PropertyEditor control for PROPERTY_GROUP_POINTERS
        propertyGrid = new PropertyGrid();
        this.propertyGrids.push(propertyGrid);
        this.$el.find('div#pointers').html(propertyGrid.$el);

        //attach control to the PropertyGrid for PROPERTY_GROUP_POINTERS
        p = new PropertyEditorPanelController(this._client, propertyGrid, CONSTANTS.PROPERTY_GROUP_POINTERS);
        p.setReadOnly = function (isReadOnly) {
            self.setReadOnly(isReadOnly);
        };

        //load PropertyEditor control for PROPERTY_GROUP_META
        propertyGrid = new PropertyGrid();
        this.propertyGrids.push(propertyGrid);
        this.$el.find('div#meta').html(propertyGrid.$el);

        //attach control to the PropertyGrid for PROPERTY_GROUP_META
        p = new PropertyEditorPanelController(this._client, propertyGrid, CONSTANTS.PROPERTY_GROUP_META);
        p.setReadOnly = function (isReadOnly) {
            self.setReadOnly(isReadOnly);
        };

        //load PropertyEditor control for PROPERTY_GROUP_PREFERENCES
        propertyGrid = new PropertyGrid();
        this.propertyGrids.push(propertyGrid);
        this.$el.find('div#preferences').html(propertyGrid.$el);

        //attach control to the PropertyGrid for PROPERTY_GROUP_PREFERENCES
        p = new PropertyEditorPanelController(this._client, propertyGrid, CONSTANTS.PROPERTY_GROUP_PREFERENCES);
        p.setReadOnly = function (isReadOnly) {
            self.setReadOnly(isReadOnly);
        };
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PropertyEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        var i;

        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        for (i = 0; i < this.propertyGrids.length; i += 1) {
            this.propertyGrids[i].setReadOnly(isReadOnly);
        }
    };

    return PropertyEditorPanel;
});
