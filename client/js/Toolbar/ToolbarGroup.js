/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ToolbarGroup.ButtonGroup',
        './ToolbarGroup.Button',
        './ToolbarGroup.Separator'], function (ToolbarGroupButtonGroup,
                                            ToolbarGroupButton,
                                            ToolbarGroupSeparator) {

    var ToolbarGroup,
        TOOLBAR_GROUP_CLASS = 'toolbar-group',
        TOOLBAR_GROUP_DOM_BASE = $('<div/>', {'class': TOOLBAR_GROUP_CLASS});

    ToolbarGroup = function () {
        this.$el = TOOLBAR_GROUP_DOM_BASE.clone();
    };

    _.extend(ToolbarGroup.prototype, ToolbarGroupButtonGroup.prototype);
    _.extend(ToolbarGroup.prototype, ToolbarGroupButton.prototype);
    _.extend(ToolbarGroup.prototype, ToolbarGroupSeparator.prototype);

    return ToolbarGroup;
});