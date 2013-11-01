/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/PanelBase/PanelBase',
        'js/Widgets/ProjectTitle/ProjectTitleWidget',
        'js/Widgets/UserProfile/UserProfileWidget'], function (PanelBase,
                                                                 ProjectTitleWidget,
                                                                 UserProfileWidget) {

    var HeaderPanel,
        __parent__ = PanelBase;

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

        //project title
        var projectTitleEl = $('<div/>', {'class': "inline"});
        new ProjectTitleWidget(projectTitleEl, this._client);
        navBarInner.append(projectTitleEl);

        //user info
        navBarInner.append($('<div class="spacer pull-right"></div>'));
        var userProfileEl = $('<div/>', {'class': "inline pull-right"});
        new UserProfileWidget(userProfileEl, this._client);
        navBarInner.append(userProfileEl);
    };

    return HeaderPanel;
});
