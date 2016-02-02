/*globals define, _, WebGMEGlobal*/
/*jshint browser: true */
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/MetaEditor/MetaEditorWidget',
    './MetaEditorControl'
], function (PanelBaseWithHeader,
             IActivePanel,
             MetaEditorWidget,
             MetaEditorControl) {

    'use strict';

    var MetaEditorPanel;

    MetaEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'MetaEditorPanel';
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('MetaEditorPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(MetaEditorPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(MetaEditorPanel.prototype, IActivePanel.prototype);

    MetaEditorPanel.prototype._initialize = function () {
        var self = this;

        //remove title container
        if (this.$panelHeaderTitle) {
            this.$panelHeaderTitle.remove();
        }

        this.widget = new MetaEditorWidget(this.$el, {toolBar: this.toolBar});

        this.widget.setTitle = function (/* title */) {
            //self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
            WebGMEGlobal.KeyboardManager.setListener(self.widget);
        };

        this.control = new MetaEditorControl({
            client: this._client,
            widget: this.widget
        });

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    MetaEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
        this.control.setReadOnly(isReadOnly);
    };

    MetaEditorPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    MetaEditorPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onActivate */
    MetaEditorPanel.prototype.onActivate = function () {
        this.widget.onActivate();
        this.control.onActivate();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onDeactivate */
    MetaEditorPanel.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.onDeactivate();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    return MetaEditorPanel;
});
