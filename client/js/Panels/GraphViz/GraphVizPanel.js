"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/GraphViz/GraphVizWidget',
    './GraphVizPanelControl'], function (PanelBaseWithHeader,
                                         IActivePanel,
                                            GraphVizWidget,
                                            GraphVizPanelControl) {

    var GraphVizPanel;

    GraphVizPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "GraphVizPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("GraphVizPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(GraphVizPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(GraphVizPanel.prototype, IActivePanel.prototype);

    GraphVizPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("Graph visualizer");

        this.widget = new GraphVizWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.control = new GraphVizPanelControl({"client": this._client,
            "widget": this.widget});

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    GraphVizPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        //this._graphVizWidget.setReadOnly(isReadOnly);
    };

    GraphVizPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    GraphVizPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
    };

    GraphVizPanel.prototype.onActivate = function () {
        this.control.attachClientEventListeners();
    };

    GraphVizPanel.prototype.onDeactivate = function () {
        this.control.detachClientEventListeners();
    };

    return GraphVizPanel;
});
