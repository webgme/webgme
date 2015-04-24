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
    'js/Toolbar/Toolbar',
    './ProjectNavigatorController',
    './DefaultToolbar',
    'js/Utils/WebGMEUrlManager'
], function (PanelBase,
             ProjectTitleWidget,
             UserProfileWidget,
             toolbar,
             ProjectNavigatorController,
             DefaultToolbar,
             WebGMEUrlManager) {
    'use strict';

    var HeaderPanel,
        __parent__ = PanelBase;

    angular.module(
        'gme.ui.headerPanel', [
            'isis.ui.dropdownNavigator',
            'gme.ui.ProjectNavigator'
        ]).run(function ($rootScope, $location) {
            // FIXME: this might not be the best place to put it...
            if (WebGMEGlobal && WebGMEGlobal.State) {
                WebGMEGlobal.State.on('change', function () {
                    var searchQuery = WebGMEUrlManager.serializeStateToUrl();

                    // set the state that gets pushed into the history
                    $location.state(WebGMEGlobal.State.toJSON());

                    // setting the search query based on the state
                    $location.search(searchQuery);

                    // forcing the update
                    if (!$rootScope.$$phase) {
                        $rootScope.$apply();
                    }
                });
            } else {
                // FIXME: this should be a hard error, we do not have a logger here.
                console.error('WebGMEGlobal.State does not exist, cannot update url based on state changes.');
            }
        });

    HeaderPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = 'HeaderPanel';

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

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
            app, projectTitleEl, userProfileEl, toolBarEl;

        navBar.append(navBarInner);
        this.$el.append(navBar);

        // TODO: would be nice to get the app as a parameter
        app = angular.module('gmeApp');

        app.controller('ProjectNavigatorController', ProjectNavigatorController);

        //project title
        projectTitleEl = $(
            '<div style="display: inline;" data-ng-controller="ProjectNavigatorController">' +
            '<dropdown-navigator style="display: inline-block;" navigator="navigator"></dropdown-navigator></div>',
            {class: 'inline'}
        );
        //new ProjectTitleWidget(projectTitleEl, this._client);
        navBarInner.append(projectTitleEl);

        //user info
        navBarInner.append($('<div class="spacer pull-right"></div>'));
        userProfileEl = $('<div/>', {class: 'inline pull-right', style: 'padding: 6px 0px;'});
        this.defaultUserProfileWidget = new UserProfileWidget(userProfileEl, this._client);
        navBarInner.append(userProfileEl);

        //toolbar
        toolBarEl = $('<div/>', {class: 'toolbar-container'});
        this.$el.append(toolBarEl);
        WebGMEGlobal.Toolbar = toolbar.createToolbar(toolBarEl);
        new DefaultToolbar(this._client);
    };

    return HeaderPanel;
});
