"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    './ModelEditorControl'
], function (PanelBaseWithHeader,
             IActivePanel,
             DiagramDesignerWidget,
             ModelEditorControl) {

    var ModelEditorPanel;

    ModelEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "ModelEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("ModelEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(ModelEditorPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(ModelEditorPanel.prototype, IActivePanel.prototype);

    ModelEditorPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("DiagramDesigner");

        this.widget = new DiagramDesignerWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
            WebGMEGlobal.KeyboardManager.setListener(self.widget);
        };

        this.control = new ModelEditorControl({"client": this._client,
            "widget": this.widget});

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    ModelEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    ModelEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    ModelEditorPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
    };

    /* override IActivePanel.prototype.onActivate */
    ModelEditorPanel.prototype.onActivate = function () {
        this.control.attachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
    };

    /* override IActivePanel.prototype.onDeactivate */
    ModelEditorPanel.prototype.onDeactivate = function () {
        this.control.detachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
    };

    return ModelEditorPanel;
});
