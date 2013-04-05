"use strict";

define([], function () {

    var WidgetToolbar;

    WidgetToolbar = function ($el, size) {
        this.$el = $el;
        this._size = size;
    };

    WidgetToolbar.prototype.addButtonGroup = function (clickFn) {
        var $btnGroup = $('<div/>', {
            "class": "btn-group inline toolbar-group"
        });

        this.$el.append($btnGroup);

        if (clickFn) {
            $btnGroup.on("click", ".btn", function (event) {
                clickFn.call(this, event, $(this).data());
                event.stopPropagation();
                event.preventDefault();
            });
        }

        return $btnGroup;
    };

    WidgetToolbar.prototype.addRadioButtonGroup = function (clickFn) {
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

    WidgetToolbar.prototype.addButton = function (params, btnGroup) {
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
            btnGroup.find('.btn.active').removeClass('active');
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
            $btn.append(params.text);
        }

        if (params.clickFn) {
            $btn.on("click", function (event) {
                params.clickFn.call(this, event, $(this).data());
                event.stopPropagation();
                event.preventDefault();
            });
        }

        btnGroup.append($btn);

        return $btn;
    };

    WidgetToolbar.prototype.addTextBox = function (params, textChangedFn) {
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

        if ($label) {
            $txtGroup.append($label);
        }

        $txtGroup.append($textBox);

        this.$el.append($txtGroup);

        if (textChangedFn) {
            var oldVal;
            $textBox.on('keyup.WidgetToolbar', function(e) {
                var val = $(this).val();

                if (val !== oldVal) {
                    textChangedFn.call(this, oldVal, val);
                    oldVal = val;
                }
            } );
        }

        $textBox.on('keypress.WidgetToolbar', function(e) {
                /* Prevent form submission */
                if ( e.keyCode == 13 )
                {
                    return false;
                }
            }
        );

        return $textBox;
    };

    return WidgetToolbar;
});