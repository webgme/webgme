/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['logManager',
    './ToolbarButton',
    './ToolbarSeparator',
    './ToolbarRadioButtonGroup',
    './ToolbarToggleButton',
    'css!/css/Toolbar/Toolbar'], function (logManager,
                                           ToolbarButton,
                                           ToolbarSeparator,
                                           ToolbarRadioButtonGroup,
                                           ToolbarToggleButton) {

    var TOOLBAR_CLASS = 'webgme-toolbar',
        _toolBar;

    var _createToolbar = function (el) {
        if (!_toolBar) {
            _toolBar = new Toolbar(el);
        }

        return _toolBar;
    };

    var Toolbar = function (el) {
        this._el = $('<div/>', {'class': TOOLBAR_CLASS});

        this._items = [];

        this._logger = logManager.create("Toolbar");
        el.append(this._el);
    };

    Toolbar.prototype.add = function (toolbarItem) {
        if (toolbarItem.el) {
            this._el.append(toolbarItem.el);
            this._items.push(toolbarItem);
        } else {
            this._logger.error('The given toolbarItem does not have an "el" to append to the toolbar...');
        }
    };

    Toolbar.prototype.addButton = function (params) {
        var btn = new ToolbarButton(params);
        this.add(btn);
        return btn;
    };

    Toolbar.prototype.addSeparator = function () {
        var separator = new ToolbarSeparator();
        this.add(separator);
        return separator;
    };

    Toolbar.prototype.addRadioButtonGroup = function (clickFn) {
        var tbg = new ToolbarRadioButtonGroup(clickFn);
        this.add(tbg);
        return tbg;
    };

    Toolbar.prototype.addToggleButton = function (params) {
        var tbg = new ToolbarToggleButton(params);
        this.add(tbg);
        return tbg;
    };

    return { createToolbar: _createToolbar };
});