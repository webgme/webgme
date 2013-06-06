"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Widgets/GraphViz/GraphVizWidget',
    './GraphVizPanelControl'], function (PanelBaseWithHeader,
                                            GraphVizWidget,
                                            GraphVizPanelControl) {

    var GraphVizPanel,
        __parent__ = PanelBaseWithHeader;

    GraphVizPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "GraphVizPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("GraphVizPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(GraphVizPanel.prototype, __parent__.prototype);

    GraphVizPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("Graph visualizer");

        this.widget = new GraphVizWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    GraphVizPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        //this._graphVizWidget.setReadOnly(isReadOnly);
    };

    GraphVizPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    return GraphVizPanel;
});
