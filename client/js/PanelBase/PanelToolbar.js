"use strict";

define(['js/Controls/iCheckBox'], function (iCheckBox) {

    var PanelToolbar;

    PanelToolbar = function ($el, size) {
        this.$el = $el;
        this._size = size;
    };

    /***************** BUTTON GROUP ****************************/

    PanelToolbar.prototype.addButtonGroup = function (clickFn) {
        var $btnGroup = $('<div/>', {
            "class": "btn-group inline toolbar-group"
        });

        this.$el.append($btnGroup);

        if (clickFn) {
            $btnGroup.on("click", ".btn", function (event) {
                if (!$(this).hasClass("disabled")) {
                    clickFn.call(this, event, $(this).data());
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        $btnGroup.enabled = function (enabled) {
            if (enabled === true) {
                $btnGroup.find('.btn').removeClass("disabled");
            } else {
                $btnGroup.find('.btn').addClass("disabled");
            }
        };

        return $btnGroup;
    };

    /***************** END OF - BUTTON GROUP ****************************/


    /***************** RADIO-BUTTON GROUP ****************************/

    PanelToolbar.prototype.addRadioButtonGroup = function (clickFn) {
        var $btnGroup;

        $btnGroup = this.addButtonGroup(function (event, data) {
            $btnGroup.find('.btn.active').removeClass('active');
            $(this).addClass('active');
            clickFn.call(this, event, data);
        });

        $btnGroup.setButtonsInactive = function () {
            $btnGroup.find('.btn.active').removeClass('active');
        };

        return $btnGroup;
    };

    /***************** END OF - RADIO-BUTTON GROUP ****************************/


    /***************** BUTTON ****************************/

    PanelToolbar.prototype._createButton = function (params) {
        var $btn,
            i,
            btnClass = "btn ";

        if (this._size.toLowerCase() !== "normal") {
            btnClass += "btn-" + this._size.toLowerCase();
        }

        $btn = $('<a/>', {
            "class": btnClass + (params.class || ""),
            "href": "#",
            "title": params.title
        });

        if (params.data) {
            $btn.data(params.data);
        }

        if (params.selected === true) {
            $btn.addClass("active");
        }

        if (params.icon) {
            if (typeof params.icon === 'string') {
                $btn.append($('<i class="' + params.icon + '"></i>'));
            } else {
                $btn.append(params.icon);
            }
        }

        if (params.text) {
            if (params.icon) {
                $btn.append(' ');
            }
            $btn.append(params.text);
        }

        if (params.clickFn) {
            $btn.on("click", function (event) {
                if (!$btn.hasClass("disabled")) {
                    params.clickFn.call(this, event, $(this).data());
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        $btn.enabled = function (enabled) {
            if (enabled === true) {
                $btn.removeClass("disabled");
            } else {
                $btn.addClass("disabled");
            }
        };

        return $btn;
    };

    PanelToolbar.prototype.addButton = function (params, btnGroup) {
        var $btn = this._createButton(params);

        //if this guy is selected then unselect the currently selected before adding it to the same group
        if (params.selected === true) {
            btnGroup.find('.btn.active').removeClass('active');
        }

        btnGroup.append($btn);

        return $btn;
    };

    /***************** END OF - BUTTON ****************************/


    /***************** TOGGLE-BUTTON GROUP ****************************/

    PanelToolbar.prototype.addToggleButton = function (params, btnGroup) {
        var oClickFn = params.clickFn,
            toggleClickFn,
            btn;

        toggleClickFn = function (event, data) {
            $(this).toggleClass('active');
            if (oClickFn) {
                oClickFn.call(this, event, data, $(this).hasClass('active'));
            }
        };

        params.clickFn = toggleClickFn;
        btn = this._createButton(params);

        //add setToggle method
        btn.setToggled = function (toggled) {
            btn.removeClass('active');
            if (toggled === true) {
                btn.addClass('active');
            }
        };

        btnGroup.append(btn);

        return btn;
    };

    /***************** END OF - TOGGLE-BUTTON GROUP ****************************/


    /***************** TEXTBOX ****************************/

    PanelToolbar.prototype.addTextBox = function (params, textChangedFn) {
        var $txtGroup = $('<div/>', {
                "class": "input-prepend inline toolbar-group"
            }),
            $label,
            $textBox = $('<input/>', {
                "class": "input-medium",
                "type" :"text"
            });

        if (params && params.label) {
            $label = $('<span/>', {"class":"add-on"});
            $label.text(params.label + ": ");
        }

        if (params && params.prependContent) {
            $label = $('<span/>', {"class":"add-on"});
            $label.html(params.prependContent);
        }

        if (params && params.collapse) {
            $textBox.addClass('no-focus-collapse');
        }

        if ($label) {
            $txtGroup.append($label);
        }

        if (params && params.placeholder) {
            $textBox.attr('placeholder', params.placeholder);
        }

        $txtGroup.append($textBox);

        this.$el.append($txtGroup);

        if (textChangedFn) {
            var oldVal;
            $textBox.on('keyup.PanelToolbar', function(/*e*/) {
                var val = $(this).val();

                if (val !== oldVal) {
                    textChangedFn.call(this, oldVal, val);
                    oldVal = val;
                }
            } );
        }

        $textBox.on('keypress.PanelToolbar', function(e) {
                /* Prevent form submission */
                if ( e.keyCode == 13 )
                {
                    return false;
                }
            }
        );

        return $textBox;
    };

    /***************** END OF - TEXTBOX ****************************/


    /***************** DROPDOWN MENU ****************************/

    PanelToolbar.prototype.addDropDownMenu = function (params) {
        var $ddMenu = this.addButtonGroup(),
            $btn = this.addButton(params, $ddMenu),
            $caret = $('<span class="caret"></span>');/*,
            $menuUl = $('<ul class="dropdown-menu"></ul>');*/

        $btn.append(' ').append($caret);

        $btn.addClass("dropdown-toggle");
        $btn.attr('data-toggle', "dropdown");

        /*$ddMenu.append($menuUl);*/

        $ddMenu.clear = function () {
            $ddMenu.find('ul').first().empty();
        };

        return $ddMenu;
    };

    PanelToolbar.prototype._addItemToParentMenu = function (menuItem, parentMenu) {
        var ul = parentMenu.find('ul').first();

        if (ul.length === 0) {
            ul = $('<ul class="dropdown-menu"></ul>');
            parentMenu.append(ul);
        }

        ul.append(menuItem);
    };

    PanelToolbar.prototype.addMenuItemDivider = function (parentMenu) {
        var divider = $('<li class="divider"></li>');

        this._addItemToParentMenu(divider, parentMenu);
    };

    PanelToolbar.prototype.addButtonMenuItem = function (params, parentMenu) {
        var btn = this._createButton(params),
            li = $('<li></li>');

        li.append(btn.removeClass("btn"));

        this._addItemToParentMenu(li, parentMenu);
    };

    PanelToolbar.prototype.addCheckBoxMenuItem = function (params, parentMenu) {
        var chkLi = $('<li/>', {'class': 'chkbox'}),
            a = $('<a href="#"></a>'),
            onCheckChanged,
            chkFieldEpx;

        onCheckChanged = function (checked) {
            var data = chkLi.data();

            if (params.checkChangedFn) {
                params.checkChangedFn.call(this, data, checked);
            }
        };

        chkFieldEpx = new iCheckBox({"checkChangedFn": onCheckChanged});

        chkFieldEpx.el.addClass('pull-right');

        if (params.text) {
            a.append(params.text);
        }

        a.append(chkFieldEpx.el);
        chkLi.append(a);

        if (params.data) {
            chkLi.data(params.data);
        }

        this._addItemToParentMenu(chkLi, parentMenu);

        chkLi.setEnabled = function (enabled) {
            if (enabled) {
                chkLi.removeClass('disabled');
            } else {
                chkLi.addClass('disabled');
            }

            chkFieldEpx.setEnabled(enabled);
        };

        chkLi.setChecked = function (checked) {
            chkFieldEpx.setChecked(checked);
        };

        return chkLi;
    };

    /***************** END OF - DROPDOWN MENU ****************************/


    /***************** LABEL ****************************/

    PanelToolbar.prototype.addLabel = function () {
        var label = $('<span/>', {
            "class": "toolbar-group"
        });

        this.$el.append(label);

        return label;
    };

    /***************** END OF - LABEL ****************************/

    /***************** CHECKBOX ****************************/

    PanelToolbar.prototype.addCheckBox = function (params) {
        var onCheckChanged,
            chkFieldEpx,
            p = {};

        onCheckChanged = function (checked) {
            var data = chkFieldEpx.el.data();

            if (params.checkChangedFn) {
                params.checkChangedFn.call(this, data, checked);
            }
        };

        p = {"checkChangedFn": onCheckChanged,
                  "checked": true};

        if (params.hasOwnProperty("checked")) {
            p.checked = params.checked;
        }

        chkFieldEpx = new iCheckBox(p);

        if (params.data) {
            chkFieldEpx.el.data(params.data);
        }

        this.$el.append(chkFieldEpx.el);

        return chkFieldEpx;
    };

    /***************** END OF - CHECKBOX ****************************/


    return PanelToolbar;
});