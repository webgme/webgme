"use strict";

define(['jquery'], function () {

    var DropDownList,
        DISABLED_CLASS = 'disabled';

    DropDownList = function (params) {
        var self = this;

        //by default don't sort items, they will appear in the order they added
        this._sorted = false;

        //create control UI
        this._el = this._DOMBase.clone();

        this._btnSelected = this._el.find('.btn').first();
        this._btnDropDownToggle = this._el.find('.dropdown-toggle').first();
        this._ul = this._el.find('ul.dropdown-menu');

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

        this._selectedValue = undefined;

        this._ul.on('click', 'li', function (/*event*/) {
            self._onSelectItem($(this));
        });

        this._btnSelected.on('click', '', function (event) {
            self._btnDropDownToggle.trigger('click');
            event.stopPropagation();
        });

        this._btnDropDownToggle.on('click', '', function (/*event*/) {
            self.dropDownMenuOpen();
        });
    };

    DropDownList.prototype.selectedValueChanged = function (value) {
        //TODO: override this to get notified about new value selection
    };

    DropDownList.prototype.dropDownMenuOpen = function () {
        //TODO: override this to get notified about new value selection
    };

    DropDownList.prototype.appendTo = function (el) {
        this._el.appendTo(el);
    };

    DropDownList.prototype.getEl = function () {
        return this._el;
    };

    DropDownList.prototype.addItem = function (item) {
        var li = $('<li data-val="' + item.value +'"><a href="#">' + item.text + '</a></li>'),
            firstItem = this._ul.children().length === 0;

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

        if (firstItem === true) {
            this._selectedValue = item.value;
            this._setSelectedItem(li);
        }
    };

    DropDownList.prototype.clear = function () {
        this._ul.empty();
    };

    DropDownList.prototype._DOMBase = $('<div class="btn-group"><button class="btn"></button><button class="btn dropdown-toggle" data-toggle="dropdown"><span class="caret"></span></button><ul class="dropdown-menu"></ul></div>');

    /********************** PRIVATE API *****************************/

    DropDownList.prototype._onSelectItem = function (li) {
        this._setSelectedItem(li);
    };

    DropDownList.prototype.setSelectedValue = function (val) {
        var li = this._ul.find('li[data-val="' + val + '"]');

        if (li.length !== 0) {
            this._setSelectedItem(li.first());
        }
    };

    DropDownList.prototype._setSelectedItem = function (li) {
        var val = li.data('val'),
            a = li.find('> a'),
            text = a.text();

        if (val !== this._selectedValue) {
            this._selectedValue = val;
            this._btnSelected.text(text);

            if (this._icon) {
                this._btnSelected.prepend(this._icon);
            }

            this._applySelectedIcon(li);

            this.selectedValueChanged(this._selectedValue);
        }
    };

    DropDownList.prototype._applySelectedIcon = function (li) {
        var a = li.find('> a'),
            selectedIcon = $('<i class="icon-ok"></i>');

        selectedIcon.css({"margin-left": "-16px",
            "margin-right": "2px"});

        //first remove existing
        this._ul.find('i.icon-ok').remove();

        a.prepend(selectedIcon);
    };

    DropDownList.prototype.setEnabled = function (isEnabled) {
        if (isEnabled) {
            this._btnSelected.removeClass(DISABLED_CLASS);
            this._btnDropDownToggle.removeClass(DISABLED_CLASS);
        } else {
            this._btnSelected.addClass(DISABLED_CLASS);
            this._btnDropDownToggle.addClass(DISABLED_CLASS);
        }
    };

    return DropDownList;
});