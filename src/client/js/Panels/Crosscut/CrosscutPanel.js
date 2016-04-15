/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/Crosscut/CrosscutWidget',
    './CrosscutController'
], function (PanelBaseWithHeader,
             IActivePanel,
             CrosscutWidget,
             CrosscutController) {

    'use strict';

    var CrosscutPanel;

    CrosscutPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'CrosscutPanel';
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('CrosscutPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(CrosscutPanel.prototype, PanelBaseWithHeader.prototype);
    _.extend(CrosscutPanel.prototype, IActivePanel.prototype);

    CrosscutPanel.prototype._initialize = function () {
        var self = this;

        //remove title container
        /*if (this.$panelHeaderTitle) {
         this.$panelHeaderTitle.remove();
         }*/

        this.widget = new CrosscutWidget(this.$el, {toolBar: this.toolBar});

        this.widget.setTitle = function (title) {
            self.setTitle(title);
        };

        this.widget.onUIActivity = function () {
            WebGMEGlobal.PanelManager.setActivePanel(self);
            WebGMEGlobal.KeyboardManager.setListener(self.widget);
        };

        this.control = new CrosscutController({
            client: this._client,
            widget: this.widget
        });
        this.control.setReadOnly = function (isReadOnly) {
            self.setReadOnly(isReadOnly);
        };
        
        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    CrosscutPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
        this.control.setReadOnly(isReadOnly);
    };

    CrosscutPanel.prototype.onResize = function (width, height) {
        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);
        this.widget.onWidgetContainerResize(width, height);
    };

    CrosscutPanel.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onActivate */
    CrosscutPanel.prototype.onActivate = function () {
        this.widget.onActivate();
        this.control.onActivate();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    /* override IActivePanel.prototype.onDeactivate */
    CrosscutPanel.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.onDeactivate();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    return CrosscutPanel;
});
