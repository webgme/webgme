/*globals define, window, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['jquery', 'css!./styles/ContextMenu.css'], function () {

    'use strict';

    var ContextMenu,
        ID_MENU = 'context-menu',
        ID_LAYER = 'context-menu-layer',
        DOM_BASE = $('<div id="' + ID_MENU + '"><div class="dropdown"><ul class="dropdown-menu"></ul></div></div>'),
        BACKGROUND_DOM_BASE = $('<div id="' + ID_LAYER + '"></div>'),
        body = $('body'),
        LI_BASE = $('<li><a tabindex="-1" href="#"></a></li>'),
        DATA_KEY = 'key',
        DO_NOT_HIDE = 'doNotHide',
        minWidth = 200,
        minHeight = 100;

    ContextMenu = function (params) {
        this._menuDiv = DOM_BASE.clone();
        this._backgroundDiv = BACKGROUND_DOM_BASE.clone();
        this._menuUL = this._menuDiv.find('ul').first();

        if (params && params.hasOwnProperty('items')) {
            this.createMenu(params.items);
        }

        if (params && params.callback) {
            this._callback = params.callback;
        }
    };

    ContextMenu.prototype.show = function (position) {
        var self = this,
            callback = this._callback,
            windowHeight = $(window).height(),
            windowWidth = $(window).width(),
            availableHeight,
            availableWidth;

        this.hide();

        body.append(this._backgroundDiv).append(this._menuDiv);

        if (!position) {
            position = {x: 100, y: 100};
        }

        availableHeight = windowHeight - position.y;
        availableWidth = windowWidth - position.x;

        this._menuUL.css({
            'max-height': availableHeight > minHeight ? availableHeight : minHeight,
            'max-width': availableWidth > minWidth ? availableWidth : minWidth
        });

        this._menuDiv.css({
            display: 'block',
            left: availableWidth > minWidth ? position.x : windowWidth - minWidth,
            top: availableHeight > minHeight ? position.y : windowHeight - minHeight
        });

        if (callback) {
            this._menuUL.off('click');
            this._menuUL.on('click', 'li', function (event) {
                var el = $(this),
                    key = el.data(DATA_KEY);
                event.stopPropagation();
                event.preventDefault();
                if (el.attr(DO_NOT_HIDE) !== 'true') {
                    self.hide();
                }

                callback(key);
            });
        }

        this._backgroundDiv.off('mousedown');
        this._backgroundDiv.on('mousedown', function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.hide();
        });
    };

    ContextMenu.prototype.createMenu = function (items) {
        var li,
            icon;

        this._menuUL.empty();

        for (var i in items) {
            if (items.hasOwnProperty(i)) {
                li = LI_BASE.clone();
                li.data(DATA_KEY, i);
                li.find('a').text(items[i].name);
                if (items[i].icon) {
                    li.find('a').prepend(' ');
                    if (typeof items[i].icon === 'string') {
                        icon = $('<i/>', {class: items[i].icon});
                        li.find('a').prepend(icon);
                    } else {
                        li.find('a').prepend($(items[i].icon));
                    }
                }

                if (items[i].doNotHide) {
                    li.attr(DO_NOT_HIDE, 'true');
                }

                this._menuUL.append(li);
            }
        }
    };

    ContextMenu.prototype.destroy = function () {
        this.hide();
        this._menuUL.empty();
    };

    ContextMenu.prototype.hide = function () {
        this._backgroundDiv.detach();
        this._menuDiv.detach();
    };

    return ContextMenu;
});