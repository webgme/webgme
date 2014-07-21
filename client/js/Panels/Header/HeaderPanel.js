/*globals define, WebGMEGlobal, alert, angular, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define(['js/PanelBase/PanelBase',
    'js/Widgets/ProjectTitle/ProjectTitleWidget',
    'js/Widgets/UserProfile/UserProfileWidget',
    'js/Toolbar/Toolbar',
    './DefaultToolbar',
    'ui-components/DropDownNavigator/DropDownNavigator',
    './ProjectNavigatorController'
], function (PanelBase, ProjectTitleWidget, UserProfileWidget, toolbar, DefaultToolbar, DropDownNavigator, ProjectNavigatorController) {

    "use strict";

    var HeaderPanel,
        __parent__ = PanelBase;

    angular.module('headerPanel', ['isis.ui.dropDownNavigator']).run(function() {

    });

    HeaderPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = "HeaderPanel";

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("HeaderPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(HeaderPanel.prototype, __parent__.prototype);

    HeaderPanel.prototype._initialize = function () {
        //main container
        var navBar = $('<div/>', {'class': "navbar navbar-inverse navbar-fixed-top"});
        var navBarInner = $('<div/>', {'class': "navbar-inner"});

        navBar.append(navBarInner);
        this.$el.append(navBar);

        // TODO: would be nice to get the app as a parameter
        var app = angular.module('gmeApp');

        app.controller('ProjectNavigatorController', ProjectNavigatorController);

        //project title
        var projectTitleEl = $(
            '<div data-ng-controller="ProjectNavigatorController"><drop-down-navigator navigator="navigator"></drop-down-navigator></div>', {'class': "inline"}
        );
        //new ProjectTitleWidget(projectTitleEl, this._client);
        navBarInner.append(projectTitleEl);

        //user info
        navBarInner.append($('<div class="spacer pull-right"></div>'));
        var userProfileEl = $('<div/>', {'class': "inline pull-right"});
        new UserProfileWidget(userProfileEl, this._client);
        navBarInner.append(userProfileEl);

        //toolbar
        var toolBarEl = $('<div/>', {'class': "toolbar-container"});
        this.$el.append(toolBarEl);
        WebGMEGlobal.Toolbar = toolbar.createToolbar(toolBarEl);
        new DefaultToolbar(this._client);
    };

    return HeaderPanel;
});
