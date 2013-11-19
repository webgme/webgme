/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./ToolbarGroup',
    'css!/css/Toolbar/Toolbar'], function (ToolbarGroup) {

    var _el,
        TOOLBAR_CLASS = 'webgme-toolbar';

    var _createToolbar = function (el) {
        if (_el) {
            return;
        }

        _el = $('<div/>', {'class': TOOLBAR_CLASS});
        el.append(_el);
    };

    var _addToolbarGroup = function () {
        var g = new ToolbarGroup();
        _el.append(g.$el);
        return g;
    };

    return { createToolbar: _createToolbar,
             addToolbarGroup: _addToolbarGroup };
});