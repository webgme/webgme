/*globals define, _, WebGMEGlobal, $, requirejs*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/PanelBase/PanelBase',
    'js/Widgets/NetworkStatus/NetworkStatusWidget',
    'js/Widgets/BranchStatus/BranchStatusWidget',
    'js/Widgets/KeyboardManager/KeyboardManagerWidget',
    'js/Widgets/Notification/NotificationWidget',
    'js/Utils/ComponentSettings'
], function (PanelBase,
             NetworkStatusWidget,
             BranchStatusWidget,
             KeyboardManagerWidget,
             NotificationWidget,
             ComponentSettings) {

    'use strict';

    var FooterControlsPanel,
        __parent__ = PanelBase;

    FooterControlsPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = 'FooterControlsPanel';

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;
        this._config = FooterControlsPanel.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, FooterControlsPanel.getComponentId());

        this._widgets = [];
        //initialize UI
        this._initialize();

        this.logger.debug('FooterControlsPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(FooterControlsPanel.prototype, __parent__.prototype);

    FooterControlsPanel.prototype._initialize = function () {
        //main container
        var navBar = $('<div/>', {class: 'navbar navbar-inverse navbar-fixed-bottom'}),
            navBarInner = $('<div/>', {class: 'navbar-inner'}),
            separator = $('<div class="spacer pull-right"></div>');

        navBar.append(navBarInner);
        this.$el.append(navBar);

        //add ISIS link
        this.createCredits(navBarInner);

        //padding from screen right edge
        navBarInner.append(separator.clone());
        this.createWidgets(navBarInner);
    };

    FooterControlsPanel.prototype.createCredits = function (navBarInner) {
        var pullLeft = $('<div class="pull-left inline"></div>'),
            version;

        pullLeft.append($('<div class="navbar-text"><div class="webgme-copyright">&copy; 2016 <a href="http://www.isis.vanderbilt.edu/" title="Vanderbilt University" target="_blank">Vanderbilt University</a></div></div>'));
        navBarInner.append(pullLeft);

        //add version UI piece
        pullLeft = $('<div class="pull-left inline"></div>');
        if (WebGMEGlobal.NpmVersion) {
            version = 'version: <a href="https://github.com/webgme/webgme/releases/tag/v' + WebGMEGlobal.version +
                      '">' + WebGMEGlobal.version + '</a>';
        } else {
            version = 'version: ' + WebGMEGlobal.version + '</a>';
        }
        pullLeft.append($('<div class="navbar-text"><div class="webgme-version">' + version + '</div></div>'));

        navBarInner.append(pullLeft);

        // if (WebGMEGlobal.GitHubVersion) {
        //     pullLeft = $('<div class="pull-left inline"></div>');
        //     pullLeft.append($('<div class="navbar-text"><div class="webgme-version">SHA1 or branch - <a href="https://github.com/webgme/webgme/commits/' +
        //                       WebGMEGlobal.GitHubVersion + '">' + WebGMEGlobal.GitHubVersion + '</a></div></div>'));
        //     navBarInner.append(pullLeft);
        // }
    };

    FooterControlsPanel.prototype.createWidgets = function (navBarInner) {
        var widgetPlaceHolder = $('<div class="pull-right"></div>'),
            separator = $('<div class="spacer pull-right"></div>'),
            extraWidgets = Object.keys(this._config.extraWidgets),
            i,
            branchStatusEl,
            extraEl,
            notificationEl,
            networkStatusEl,
            keyBoardManagerEl;

        //keyboard enable/disbale widget (NOTE: only on non touch device)
        if (WebGMEGlobal.SUPPORTS_TOUCH !== true) {
            keyBoardManagerEl = widgetPlaceHolder.clone();
            this._widgets.push(new KeyboardManagerWidget(keyBoardManagerEl));
            navBarInner.append(keyBoardManagerEl).append(separator.clone());
        }

        for (i = 0; i < extraWidgets.length; i += 1) {
            extraEl = widgetPlaceHolder.clone();
            navBarInner.append(extraEl).append(separator.clone());

            this._loadExtraWidget(extraWidgets[i], extraEl, navBarInner);
        }

        networkStatusEl = widgetPlaceHolder.clone();
        this._widgets.push(new NetworkStatusWidget(networkStatusEl, this._client));
        navBarInner.append(networkStatusEl).append(separator.clone());

        notificationEl = widgetPlaceHolder.clone();
        this._widgets.push(new NotificationWidget(notificationEl, this._client));
        navBarInner.append(notificationEl).append(separator.clone());

        branchStatusEl = widgetPlaceHolder.clone();
        this._widgets.push(new BranchStatusWidget(branchStatusEl, this._client));
        navBarInner.append(branchStatusEl).append(separator.clone());
    };

    FooterControlsPanel.prototype.clear = function () {
        this._widgets.forEach(function (widget) {
            if (typeof widget.destroy === 'function') {
                widget.destroy();
            }
        });

        this._widgets = [];
    };

    FooterControlsPanel.prototype._loadExtraWidget = function (widgetId, container, navBarInner) {
        var self = this;

        requirejs([this._config.extraWidgets[widgetId].path],
            function (Widget) {
                // Ensure that the container is still part of the DOM
                // https://api.jquery.com/jQuery.contains/
                if ($.contains(navBarInner[0], container[0])) {
                    self._widgets.push(new Widget(container, self._client));
                } else {
                    self._logger.error('FooterPanel destroyed before widget loaded.');
                }
            },
            function (err) {
                self._logger.error(err);
            }
        );
    };

    FooterControlsPanel.getDefaultConfig = function () {
        return {
            extraWidgets: {
                // UIRecorder: {
                //     path: 'UIRecorder/UIRecorderWidget'
                // }
            }
        };
    };

    FooterControlsPanel.getComponentId = function () {
        return 'GenericUIFooterControlsPanel';
    };

    return FooterControlsPanel;
});
