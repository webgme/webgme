/*globals define, _, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBaseWithHeader',
    'js/PanelManager/IActivePanel',
    'js/Widgets/DataGrid/DataGridWidget',
    './GridPanelSetsControl'
], function (PanelBaseWithHeader,
             IActivePanel,
             DataGridWidget,
             GridPanelSetsControl) {

    'use strict';

    var GridPanelSets;

    GridPanelSets = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'GridPanelSets';
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] = true;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('GridPanelSets ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(GridPanelSets.prototype, PanelBaseWithHeader.prototype);
    _.extend(GridPanelSets.prototype, IActivePanel.prototype);

    GridPanelSets.prototype._initialize = function () {
        //set Widget title
        this.setTitle('ContainmentGrid');

        this.widget = new DataGridWidget(this.$el);

        this.control = new GridPanelSetsControl({
            client: this._client,
            widget: this.widget,
            panel: this
        });

        this.onActivate();
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    GridPanelSets.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        PanelBaseWithHeader.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this.widget.setReadOnly(isReadOnly);
    };

    GridPanelSets.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
    };

    GridPanelSets.prototype.destroy = function () {
        this.control.destroy();
        this.widget.destroy();

        PanelBaseWithHeader.prototype.destroy.call(this);
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    GridPanelSets.prototype.onActivate = function () {
        this.widget.onActivate();
        this.control.attachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(this.widget);
        WebGMEGlobal.Toolbar.refresh();
    };

    GridPanelSets.prototype.onDeactivate = function () {
        this.widget.onDeactivate();
        this.control.detachClientEventListeners();
        WebGMEGlobal.KeyboardManager.setListener(undefined);
        WebGMEGlobal.Toolbar.refresh();
    };

    return GridPanelSets;
});
