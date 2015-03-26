/*globals define, _, requirejs, WebGMEGlobal*/

define([
        'js/PanelBase/PanelBase',
        'js/Widgets/NetworkStatus/NetworkStatusWidget',
        'js/Widgets/BranchStatus/BranchStatusWidget',
        'js/Widgets/BranchSelector/BranchSelectorWidget',
        'js/Widgets/KeyboardManager/KeyboardManagerWidget'
        //,'text!./template.html'
    ],
    function (
        PanelBase,
        NetworkStatusWidget,
        BranchStatusWidget,
        BranchSelectorWidget,
        KeyboardManagerWidget,
        template) {

    "use strict";

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
        var separator = $('<div class="spacer pull-right"></div>');
        var widgetPlaceHolder = $('<div class="pull-right"></div>');

        navBar.append(navBarInner);
        this.$el.append(navBar);

        //add ISIS link
        var pullLeft = $('<div class="pull-left inline"></div>');
        pullLeft.append($('<div class="navbar-text"><div class="webgme-copyright">© 2015 <a href="http://www.isis.vanderbilt.edu/" title="Vanderbilt University" target="_blank">Vanderbilt University</a></div></div>'));
        navBarInner.append(pullLeft);

        //add version UI piece
        pullLeft = $('<div class="pull-left inline"></div>');
        var version;
        if (WebGMEGlobal.NpmVersion) {
            version = 'version: <a href="https://github.com/webgme/webgme/releases/tag/v' + WebGMEGlobal.version + '">' + WebGMEGlobal.version + '</a>';
        } else {
            version = 'version: ' + WebGMEGlobal.version + '</a>';
        }
        pullLeft.append($('<div class="navbar-text"><div class="webgme-version">' + version + '</div></div>'));

        navBarInner.append(pullLeft);

        if (WebGMEGlobal.GitHubVersion) {
            pullLeft = $('<div class="pull-left inline"></div>');
            pullLeft.append($('<div class="navbar-text"><div class="webgme-version">SHA1 or branch - <a href="https://github.com/webgme/webgme/commits/' + WebGMEGlobal.GitHubVersion + '">' + WebGMEGlobal.GitHubVersion + '</a></div></div>'));
            navBarInner.append(pullLeft);
        }

        //padding from screen right edge
        navBarInner.append(separator.clone());

        //keyboard enable/disbale widget (NOTE: only on non touch device)
        if (WebGMEGlobal.SUPPORTS_TOUCH !== true) {
            var keyBoardManagerEl = widgetPlaceHolder.clone();
            var k = new KeyboardManagerWidget(keyBoardManagerEl);
            navBarInner.append(keyBoardManagerEl).append(separator.clone());
        }

        var networkStatusEl = widgetPlaceHolder.clone();
        var n = new NetworkStatusWidget(networkStatusEl, this._client);
        navBarInner.append(networkStatusEl).append(separator.clone());

        var branchStatusEl = widgetPlaceHolder.clone();
        var b = new BranchStatusWidget(branchStatusEl, this._client);
        navBarInner.append(branchStatusEl).append(separator.clone());

        /*var branchSelectorEl = widgetPlaceHolder.clone();
        new BranchSelectorWidget(branchSelectorEl, this._client);
        navBarInner.append(branchSelectorEl).append(separator.clone());*/
    };

    return FooterControlsPanel;
});
