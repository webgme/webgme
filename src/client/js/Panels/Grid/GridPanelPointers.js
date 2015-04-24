/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/DataGrid/DataGridWidget',
    './GridPanelContainmentControlPointers'
], function (PanelBaseWithHeader,
             IActivePanel,
             DataGridWidget,
             GridPanelContainmentControlPointers) {

    'use strict';

    var GridPanelPointers;

    GridPanelPointers = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'GridPanelPointers';
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('GridPanelPointers ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(GridPanelPointers.prototype, PanelBaseWithHeader.prototype);
    _.extend(GridPanelPointers.prototype, IActivePanel.prototype);

    GridPanelPointers.prototype._initialize = function () {
        //set Widget title
        this.setTitle('ContainmentGrid');

        this.widget = new DataGridWidget(this.$el);

        this.control = new GridPanelContainmentControlPointers({
            client: this._client,
            widget: this.widget,
            panel: this
        });

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    GridPanelPointers.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    GridPanelPointers.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
    };

    GridPanelPointers.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    GridPanelPointers.prototype.onActivate = function () {
        this.widget.onActivate();
        this.control.attachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    GridPanelPointers.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.detachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    return GridPanelPointers;
});
