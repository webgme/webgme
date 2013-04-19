"use strict";

define(['jquery'], function () {

    var DropDownMenu,
        DISABLED_CLASS = 'disabled';

    DropDownMenu = function (params) {
        this._initialize(params);
    };

    DropDownMenu.prototype.onItemClicked = function (value) {
        //TODO: override this to get notified about new value selection
    };

    DropDownMenu.prototype.appendTo = function (el) {
        this._el.appendTo(el);
    };

    DropDownMenu.prototype.getEl = function () {
        return this._el;
    };

    DropDownMenu.prototype.addItem = function (item) {
       this._addItem(item);
    };

    DropDownMenu.prototype.clear = function () {
        this._clear();
    };

    /****************** PRIVATE API *************************/

    DropDownMenu.prototype._DOMBase = $('<div class="btn-group"><button class="btn"></button><button class="btn dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"></ul></div>');

    DropDownMenu.prototype._initialize = function (params) {
        var self = this;

        //create control UI
        this._el = this._DOMBase.clone();

        this._btnSelected = this._el.find('.btn').first();
        this._btnDropDownToggle = this._el.find('.dropdown-toggle').first();
        this._ul = this._el.find('ul.dropdown-menu');

        this.clear();

        if (params) {
            if (params.dropUp === true) {
                this._el.addClass('dropup');
            }
            if (params.pullRight === true) {
                this._el.addClass('pull-right');
            }
            if (params.size) {
                switch (params.size) {
                    case 'large':
                    case 'mini':
                    case 'micro':
                        this._btnSelected.addClass('btn-' + params.size);
                        this._btnDropDownToggle.addClass('btn-' + params.size);
                        break;
                    default:
                        break;
                }
            }
            if (params.sort === true) {
                this._sorted = true;
            }
            if (params.icon && (typeof params.icon === 'string') && params.icon !== '') {
                this._icon = $('<i class="' + params.icon + '"></i>');
            }
        }

        this._ul.on('click', 'li', function (/*event*/) {
            self._onItemClick($(this));
        });

        this._btnSelected.on('click', '', function (event) {
            self._btnDropDownToggle.trigger('click');
            event.stopPropagation();
        });
    };

    DropDownMenu.prototype._addItem = function (item) {
        var li = $('<li data-val="' + item.value +'"><a href="#">' + item.text + '</a></li>');

        if (this._sorted === false) {
            this._ul.append(li);
        } else {
            //find it's place based on text order
            var insertBefore = undefined;
            var liList = this._ul.children();
            var len = liList.length;
            while (len--) {
                var liBefore = $(liList[len]);
                if (item.text >= liBefore.find('> a').text()) {
                    insertBefore = liBefore;
                    break;
                }
            }
            if (insertBefore) {
                li.insertAfter(insertBefore);
            } else {
                this._ul.prepend(li);
            }
        }

        if (this._ul.parent().length === 0) {
            this._el.append(this._btnDropDownToggle);
            this._el.append(this._ul);
        }
    };

    DropDownMenu.prototype._clear = function () {
        this._el.removeClass('open');
        this._ul.empty();
        this._ul.detach();
        this._btnDropDownToggle.detach();
    };

    DropDownMenu.prototype._onItemClick = function (li) {
        var val = li.data('val');

        this.onItemClicked(val);
    };

    DropDownMenu.prototype.setTitle = function (title) {
        this._btnSelected.text(title);

        if (this._icon) {
            this._btnSelected.prepend(this._icon);
        }
    };

    DropDownMenu.prototype.setEnabled = function (isEnabled) {
        if (isEnabled) {
            this._btnSelected.removeClass(DISABLED_CLASS);
            this._btnDropDownToggle.removeClass(DISABLED_CLASS);
        } else {
            this._btnSelected.addClass(DISABLED_CLASS);
            this._btnDropDownToggle.addClass(DISABLED_CLASS);
        }
    };

    DropDownMenu.prototype.COLORS = {'BLUE': 0,
                                    'LIGHT_BLUE': 1,
                                    'GREEN': 2,
                                    'ORANGE': 3,
                                    'RED': 4,
                                    'BLACK': 5,
                                    'GRAY': 6};

    DropDownMenu.prototype._colorClasses = ['btn-primary',
        'btn-info',
        'btn-success',
        'btn-warning',
        'btn-danger',
        'btn-inverse',
        'btn-gray'
    ];

    DropDownMenu.prototype.setColor = function (color) {
        var len = this._colorClasses.length;

        while (len--) {
            this._btnSelected.removeClass(this._colorClasses[len]);
            this._btnDropDownToggle.removeClass(this._colorClasses[len]);
        }

        this._btnSelected.addClass(this._colorClasses[color]);
        this._btnDropDownToggle.addClass(this._colorClasses[color]);
    };

    return DropDownMenu;
});