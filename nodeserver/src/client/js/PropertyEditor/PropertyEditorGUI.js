"use strict";

define(['logManager',
    'clientUtil',
    'js/PropertyEditor/WidgetManager',
    'css!PropertyEditorCSS/PropertyEditorGUI.css'], function (logManager,
                                                               util,
                                                               WidgetManager) {

    /** Outer-most className for GUI's */
    var CSS_NAMESPACE = 'dg',
        PropertyEditorGUI;

    PropertyEditorGUI = function (params) {
        if (params.el) {
            this._containerElement = params.el;
        }

        this._widgetManager = PropertyEditorGUI.WIDGETMANAGER;

        this._el = $('<div/>', {
            "class": CSS_NAMESPACE
        });

        this.__ul = $('<ul/>', {});
        this._el.append(this.__ul);

        this.__folders = {};
        this.__widgets = {};

        this._closed = false;

        this.__onChange = undefined;
        this.__onFinishChange = undefined;

        this._name = params.name || undefined;

        this._parent = params.parent;

        // Are we a root level GUI?
        if (params.parent === undefined) {
            this._el.addClass(PropertyEditorGUI.CLASS_MAIN);
            this._containerElement.append(this._el);

            // Oh, you're a nested GUI!
        } else {
            this._addNestedGUI(params);
        }
    };

    PropertyEditorGUI.CLASS_MAIN = 'main';
    PropertyEditorGUI.CLASS_CONTROLLER_ROW = 'cr';
    PropertyEditorGUI.CLASS_CLOSED = 'closed';

    PropertyEditorGUI.DEFAULT_WIDTH = 245;

    PropertyEditorGUI.WIDGETMANAGER = new WidgetManager();

    PropertyEditorGUI.prototype._addNestedGUI = function (params) {
        var title_row = this._addRow(this, $(document.createTextNode(params.name))),
            on_click_title,
            self = this;

        on_click_title = function (e) {
            e.preventDefault();
            e.stopPropagation();
            self._toggleClosed();
            return false;
        };

        title_row.addClass('title');
        title_row.on('click', on_click_title);
    };


    /*************** PRIVATE API *************************/

    PropertyEditorGUI.prototype._toggleClosed = function () {
        if (this._closed === true) {
            this.open();
        } else {
            this.close();
        }
    };

    /**
     * Add a row to the end of the GUI or before another row.
     *
     * @param gui
     * @param [dom] If specified, inserts the dom content in the new row
     * @param [liBefore] If specified, places the new row before another row
     */
    PropertyEditorGUI.prototype._addRow = function (gui, dom, liBefore) {
        var li = $('<li/>');
        if (dom) {
            li.append(dom);
        }
        if (liBefore) {
            li.insertBefore(liBefore);
        } else {
            this.__ul.append(li);
        }
        return li;
    };

    PropertyEditorGUI.prototype._change = function (args) {
        if (this.__onChange) {
            this.__onChange.call(this,  args);
        }
    };

    PropertyEditorGUI.prototype._finishChange = function (args) {
        if (this.__onFinishChange) {
            this.__onFinishChange.call(this, args);
        }
    };

    PropertyEditorGUI.prototype._getAccumulatedName = function () {
        var parentName = this._parent ? this._parent._getAccumulatedName() : undefined;

        return parentName ? parentName + "." + this._name : this._name;
    };

    /*************** END OF - PRIVATE API *************************/


    /*************** PUBLIC API **************************/

    PropertyEditorGUI.prototype.open = function () {
        this._closed = false;
        this.__ul.removeClass(PropertyEditorGUI.CLASS_CLOSED);
    };

    PropertyEditorGUI.prototype.close = function () {
        this._closed = true;
        this.__ul.addClass(PropertyEditorGUI.CLASS_CLOSED);
    };

    PropertyEditorGUI.prototype.add = function (propertyDesc) {
        var widget,
            container = $('<div/>'),
            spnName = $('<span/>', {"class": "property-name"}),
            li,
            self = this,
            extraCss = {};

        if (this.__widgets[propertyDesc.name] !== undefined) {
            throw new Error('You already have a widget with the name "' + propertyDesc.name + '"');
        }

        if (!propertyDesc.id) {
            propertyDesc.id = this._getAccumulatedName() + "." + propertyDesc.name;
        }

        widget = this._widgetManager.getWidgetForProperty(propertyDesc);

        this.__widgets[propertyDesc.name] = widget;

        widget.el.addClass('c');

        widget.onChange(function (args) {
            self._change(args);
        });

        widget.onFinishChange(function (args) {
            self._finishChange(args);
        });

        spnName.text(widget.propertyName);

        if (propertyDesc.options) {
            if (propertyDesc.options.textColor) {
                extraCss.color = propertyDesc.options.textColor;
            }

            if (propertyDesc.options.textItalic) {
                extraCss["font-style"] = "italic";
            }

            if (propertyDesc.options.textBold) {
                extraCss["font-weight"] = "bold";
            }

            spnName.css(extraCss);
        }

        container.append(spnName).append(widget.el);

        li = this._addRow(null, container, null);

        li.addClass(PropertyEditorGUI.CLASS_CONTROLLER_ROW);
        if (propertyDesc.valueType) {
            li.addClass(propertyDesc.valueType);
        } else {
            li.addClass(typeof propertyDesc.value);
        }


        //augmentController(gui, li, controller);

        //this.__controllers.push(widget);

        return widget;
    };

    PropertyEditorGUI.prototype.addFolder = function (name) {
        if (this.__folders[name] !== undefined) {
            throw new Error('You already have a folder with the name "' + name + '"');
        }

        var new_gui_params = { name: name, parent: this },
            gui,
            li,
            self = this;

        gui = new PropertyEditorGUI(new_gui_params);
        this.__folders[name] = gui;

        gui.onChange(function (args) {
            self._change(args);
        });

        gui.onFinishChange(function (args) {
            self._finishChange(args);
        });

        li = this._addRow(this, gui._el);
        li.addClass('folder');
        return gui;

    };



    PropertyEditorGUI.prototype.onChange = function (fnc) {
        this.__onChange = fnc;
        return this;
    };

    PropertyEditorGUI.prototype.onFinishChange = function (fnc) {
        this.__onFinishChange = fnc;
        return this;
    };



    PropertyEditorGUI.prototype.clear = function () {
        var i;

        if (this._parent) {
            this.__onChange = undefined;
            this.__onFinishChange = undefined;
        }

        for (i in this.__widgets) {
            if (this.__widgets.hasOwnProperty(i)) {
                this.__widgets[i].remove();
                delete this.__widgets[i];
            }
        }

        for (i in this.__folders) {
            if (this.__folders.hasOwnProperty(i)) {
                this.__folders[i].clear();
                delete this.__folders[i];
            }
        }

        this.__ul.empty();

    };
    /*************** END OF - PUBLIC API **************************/


    return PropertyEditorGUI;
});