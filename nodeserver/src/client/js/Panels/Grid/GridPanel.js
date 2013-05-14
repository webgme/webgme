"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
        'js/Widgets/DataGrid/DataGridWidget'
        ], function (PanelBaseWithHeader,
                     DataGridWidget) {

    var GridPanel,
        __parent__ = PanelBaseWithHeader;

    GridPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "GridPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("GridPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(GridPanel.prototype, __parent__.prototype);

    GridPanel.prototype._initialize = function () {
        //set Widget title
        this.setTitle("ContainmentGrid");

        this.widget = new DataGridWidget(this.$el, {'toolBar': this.toolBar});
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    GridPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    return GridPanel;
});
