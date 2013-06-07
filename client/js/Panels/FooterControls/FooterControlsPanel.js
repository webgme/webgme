"use strict";

define(['js/PanelBase/PanelBase',
    'js/Widgets/LogLevelManager/LogLevelManagerWidget',
    'js/Widgets/NetworkStatus/NetworkStatusWidget',
    'js/Widgets/BranchStatus/BranchStatusWidget',
    'js/Widgets/BranchSelector/BranchSelectorWidget',
    'js/Widgets/KeyboardManager/KeyboardManagerWidget'], function (PanelBase,
                                                  LogLevelManagerWidget,
                                                  NetworkStatusWidget,
                                                  BranchStatusWidget,
                                                  BranchSelectorWidget,
                                                  KeyboardManagerWidget) {

    var FooterControlsPanel,
        __parent__ = PanelBase;

    FooterControlsPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = "FooterControlsPanel";

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("FooterControlsPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(FooterControlsPanel.prototype, __parent__.prototype);

    FooterControlsPanel.prototype._initialize = function () {
        this.$el.html('<div class="spacer pull-right"></div><div class="keyBoardManager pull-right"></div><div class="spacer pull-right"></div><div class="logLevelManager pull-right"></div><div class="spacer pull-right"></div><div class="pull-right networkStatus"></div><div class="spacer pull-right"></div><div class="pull-right branchStatus"></div><div class="spacer pull-right"></div><div class="pull-right branchSelector"></div>');

        var keyBoardManagerEl = this.$el.find('.keyBoardManager').first();
        new KeyboardManagerWidget(keyBoardManagerEl);

        var logLevelManagerEl = this.$el.find('.logLevelManager').first();
        new LogLevelManagerWidget(logLevelManagerEl);

        var networkStatusEl = this.$el.find('.networkStatus').first();
        new NetworkStatusWidget(networkStatusEl, this._client);

        var branchStatusEl = this.$el.find('.branchStatus').first();
        new BranchStatusWidget(branchStatusEl, this._client);

        var branchSelectorEl = this.$el.find('.branchSelector').first();
        new BranchSelectorWidget(branchSelectorEl, this._client);
    };

    return FooterControlsPanel;
});
