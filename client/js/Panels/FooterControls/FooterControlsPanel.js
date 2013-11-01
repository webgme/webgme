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
        //main container
        var navBar = $('<div/>', {'class': "navbar navbar-inverse navbar-fixed-bottom"});
        var navBarInner = $('<div/>', {'class': "navbar-inner"});

        navBar.append(navBarInner);
        this.$el.append(navBar);

        navBarInner.html('<div class="pull-left inline"></div><div class="spacer pull-right"></div><div class="keyBoardManager pull-right"></div><div class="spacer pull-right"></div><div class="logLevelManager pull-right"></div><div class="spacer pull-right"></div><div class="pull-right networkStatus"></div><div class="spacer pull-right"></div><div class="pull-right branchStatus"></div><div class="spacer pull-right"></div><div class="pull-right branchSelector"></div>');

        var pullLeft = navBarInner.find('.pull-left').first();
        //add version UI piece
        pullLeft.append($('<div class="navbar-text"><div class="webgme-version">version: ' + WebGMEGlobal.version + '</div></div>'));

        var keyBoardManagerEl = navBarInner.find('.keyBoardManager').first();
        new KeyboardManagerWidget(keyBoardManagerEl);

        var logLevelManagerEl = navBarInner.find('.logLevelManager').first();
        new LogLevelManagerWidget(logLevelManagerEl);

        var networkStatusEl = navBarInner.find('.networkStatus').first();
        new NetworkStatusWidget(networkStatusEl, this._client);

        var branchStatusEl = navBarInner.find('.branchStatus').first();
        new BranchStatusWidget(branchStatusEl, this._client);

        var branchSelectorEl = navBarInner.find('.branchSelector').first();
        new BranchSelectorWidget(branchSelectorEl, this._client);
    };

    return FooterControlsPanel;
});
