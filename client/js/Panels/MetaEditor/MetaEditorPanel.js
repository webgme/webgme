"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/MetaEditor/MetaEditorWidget',
    './MetaEditorControl'
], function (PanelBaseWithHeader,
             IActivePanel,
             MetaEditorWidget,
             MetaEditorControl) {

    var MetaEditorPanel;

    MetaEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "MetaEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;
        options[PanelBaseWithHeader.OPTIONS.HEADER_TOOLBAR] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("MetaEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(MetaEditorPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(MetaEditorPanel.prototype, IActivePanel.prototype);

    MetaEditorPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("MetaEditor");

        this.widget = new MetaEditorWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
        };

        this.control = new MetaEditorControl({"client": this._client,
            "widget": this.widget});

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    MetaEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    MetaEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    MetaEditorPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
    };

    /* override IActivePanel.prototype.onActivate */
    MetaEditorPanel.prototype.onActivate = function () {
        this.control.attachClientEventListeners();
    };

    /* override IActivePanel.prototype.onDeactivate */
    MetaEditorPanel.prototype.onDeactivate = function () {
        this.control.detachClientEventListeners();
    };

    return MetaEditorPanel;
});
