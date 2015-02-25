/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Controls/PropertyGrid/PropertyGrid',
    './PropertyEditorPanelController'], function (PanelBaseWithHeader,
                                                                     PropertyGrid,
                                                                     PropertyEditorPanelController) {
    "use strict";

    "use strict";

    var PropertyEditorPanel,
        __parent__ = PanelBaseWithHeader;

    PropertyEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "PropertyEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("PropertyEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(PropertyEditorPanel.prototype, __parent__.prototype);

    PropertyEditorPanel.prototype._initialize = function () {
        //set Widget title
        this.setTitle("Property Editor");

        //load PropertyEditor control
        this.propertyGrid = new PropertyGrid();
        this.$el.append(this.propertyGrid.$el);

        //attach control to the PropertyGrid
        var p = new PropertyEditorPanelController(this._client, this.propertyGrid);
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PropertyEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.propertyGrid.setReadOnly(isReadOnly);
    };

    return PropertyEditorPanel;
});
