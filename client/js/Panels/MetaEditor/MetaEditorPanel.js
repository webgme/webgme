"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Widgets/MetaEditor/MetaEditorWidget'
], function (PanelBaseWithHeader,
             MetaEditorWidget) {

    var MetaEditorPanel,
        __parent__ = PanelBaseWithHeader;

    MetaEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "MetaEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("MetaEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(MetaEditorPanel.prototype, __parent__.prototype);

    MetaEditorPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("MetaEditor");

        this.widget = new MetaEditorWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        //TODO:
        //remove route manager selection buttons
        if (this.widget.$btnGroupConnectionRouteManager) {
            this.widget.$btnGroupConnectionRouteManager.remove();
        }
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    MetaEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    MetaEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    return MetaEditorPanel;
});
