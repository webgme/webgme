/*globals define,_,WebGMEGlobal*/
/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * @author brollb / https://github/brollb
 */


define(['js/PanelBase/PanelBaseWithHeader',
        'js/PanelManager/IActivePanel',
        'js/Widgets/BlockEditor/BlockEditorWidget',//FIXME 
        './BlockEditorControl'
                                ], function (PanelBaseWithHeader,
                                    IActivePanel,
                                    BlockEditorWidget,
                                    BlockEditorControl) {

    "use strict";

    var BlockEditorPanel;

    BlockEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "BlockEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("BlockEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(BlockEditorPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(BlockEditorPanel.prototype, IActivePanel.prototype);

    BlockEditorPanel.prototype._initialize = function () {
        var self = this;

        this.widget = new BlockEditorWidget(this.$el, {'toolBar': this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
            WebGMEGlobal.KeyboardManager.setListener(self.widget);
        };

        this.control = new BlockEditorControl({"client": this._client,
            "widget": this.widget});

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    BlockEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    BlockEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.setSize(width, height);
    };

    BlockEditorPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onActivate */
    BlockEditorPanel.prototype.onActivate = function () {
        this.control.onActivate();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onDeactivate */
    BlockEditorPanel.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.onDeactivate();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    BlockEditorPanel.prototype.getNodeID = function () {
        return this.control.getNodeID();
    };

    return BlockEditorPanel;
});
