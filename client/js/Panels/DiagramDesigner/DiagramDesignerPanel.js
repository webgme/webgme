"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget'
], function (PanelBaseWithHeader,
             DiagramDesignerWidget) {

    var DiagramDesignerPanel,
        __parent__ = PanelBaseWithHeader;

    DiagramDesignerPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "DiagramDesignerPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("DiagramDesignerPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(DiagramDesignerPanel.prototype, __parent__.prototype);

    DiagramDesignerPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("DiagramDesigner");

        this.widget = new DiagramDesignerWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    DiagramDesignerPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    DiagramDesignerPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    return DiagramDesignerPanel;
});
