"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
        'js/PanelManager/IActivePanel',
        'js/Widgets/ModelEditor/ModelEditorWidget',//FIXME 
        './SnapEditorControl'
                                ], function (PanelBaseWithHeader,
             IActivePanel,
             SnapEditorWidget,
             SnapEditorControl) {

    var SnapEditorPanel;
/*
 * TODO:
 *
 * + Clear out ModelEditor specific code
 * + Create a SNAP-specific skeleton
 * + Find where the SNAP code handles the "snapping" functionality
 * + Try to port the SNAP code to the respective SNAP skeleton (at least as much as possible)
 * 
 * + Find the image rendering part of the SNAP code
 * + Move the image rendering part to a decorator or widget
 *
 */

    SnapEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "SnapEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("SnapEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(SnapEditorPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(SnapEditorPanel.prototype, IActivePanel.prototype);

    SnapEditorPanel.prototype._initialize = function () {
        var self = this;

        this.widget = new SnapEditorWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
            WebGMEGlobal.KeyboardManager.setListener(self.widget);
        };

        this.control = new SnapEditorControl({"client": this._client,
            "widget": this.widget});

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    SnapEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    SnapEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    SnapEditorPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onActivate */
    SnapEditorPanel.prototype.onActivate = function () {
        this.widget.onActivate();
        this.control.onActivate();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onDeactivate */
    SnapEditorPanel.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.onDeactivate();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    SnapEditorPanel.prototype.getNodeID = function () {
        return this.control.getNodeID();
    };

    return SnapEditorPanel;
});
