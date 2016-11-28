/*globals define, WebGMEGlobal, angular, _, console, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    'js/PanelBase/PanelBase',
    'js/Widgets/ProjectTitle/ProjectTitleWidget',
    'js/Widgets/UserProfile/UserProfileWidget',
    'js/Widgets/ConnectedUsers/ConnectedUsersWidget',
    'js/Toolbar/Toolbar',
    './ProjectNavigatorController',
    './DefaultToolbar',
    'js/Utils/WebGMEUrlManager',
    'js/Utils/ComponentSettings'
], function (PanelBase,
             ProjectTitleWidget,
             UserProfileWidget,
             ConnectedUsersWidget,
             toolbar,
             ProjectNavigatorController,
             DefaultToolbar,
             WebGMEUrlManager,
             ComponentSettings) {
    'use strict';

    var HeaderPanel,
        __parent__ = PanelBase;

    angular.module(
        'gme.ui.headerPanel', [
            'isis.ui.dropdownNavigator',
            'gme.ui.ProjectNavigator'
        ]).run(['$rootScope', '$location', function ($rootScope, $location) {
            // FIXME: this might not be the best place to put it...
            var prevQuery;
            if (WebGMEGlobal && WebGMEGlobal.State) {
                WebGMEGlobal.State.on('change', function (model, opts) {
                    var searchQuery = WebGMEUrlManager.serializeStateToUrl();
                    if (!opts.suppressHistoryUpdate && prevQuery !== searchQuery) {
                        // set the state that gets pushed into the history
                        $location.state(WebGMEGlobal.State.toJSON());

                        // setting the search query based on the state
                        $location.search(searchQuery);

                        // store the previous for next update
                        prevQuery = searchQuery;

                        // forcing the update
                        if (!$rootScope.$$phase) {
                            $rootScope.$apply();
                        }
                    }
                });
            } else {
                // FIXME: this should be a hard error, we do not have a logger here.
                console.error('WebGMEGlobal.State does not exist, cannot update url based on state changes.');
            }
        }]);

    HeaderPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = 'HeaderPanel';

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        this._config = HeaderPanel.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(this._config, HeaderPanel.getComponentId());

        //initialize UI
        this._initialize();

        this.logger.debug('HeaderPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(HeaderPanel.prototype, __parent__.prototype);

    HeaderPanel.prototype._initialize = function () {
        //main container
        var navBar = $('<div/>', {class: 'navbar navbar-inverse navbar-fixed-top'}),
            navBarInner = $('<div/>', {class: 'navbar-inner'}),
            app, projectTitleEl, userProfileEl, toolBarEl, connectedUsersEl;

        navBar.append(navBarInner);
        this.$el.append(navBar);

        // TODO: would be nice to get the app as a parameter
        app = angular.module('gmeApp');

        app.controller('ProjectNavigatorController', ['$scope', 'gmeClient', '$timeout', '$window', '$http',
            ProjectNavigatorController]);

        //project title
        projectTitleEl = $(
            '<div style="display: inline;" data-ng-controller="ProjectNavigatorController">' +
            '<dropdown-navigator style="display: inline-block;" navigator="navigator"></dropdown-navigator></div>',
            {class: 'inline'}
        );
        //new ProjectTitleWidget(projectTitleEl, this._client);
        navBarInner.append(projectTitleEl);
        navBarInner.append($('<div class="spacer pull-right"></div>'));

        //user info
        if (this._config.disableUserProfile === false && WebGMEGlobal.gmeConfig.authentication.enable === true) {
            userProfileEl = $('<div/>', {class: 'inline pull-right', style: 'padding: 6px 0px;'});
            this.defaultUserProfileWidget = new UserProfileWidget(userProfileEl, this._client);
            navBarInner.append(userProfileEl);
        }

        //connected users
        connectedUsersEl = $('<div/>', {class: 'inline pull-right', style: 'padding: 6px 0px;'});
        this.connectedUsersWidget = new ConnectedUsersWidget(connectedUsersEl, this._client);
        navBarInner.append(connectedUsersEl);

        //toolbar
        toolBarEl = $('<div/>', {class: 'toolbar-container'});
        this.$el.append(toolBarEl);
        WebGMEGlobal.Toolbar = toolbar.createToolbar(toolBarEl);
        new DefaultToolbar(this._client);
    };

    HeaderPanel.getDefaultConfig = function () {
        return {
            disableUserProfile: false
        };
    };

    HeaderPanel.getComponentId = function () {
        return 'GenericUIPanelHeader';
    };

    return HeaderPanel;
});
