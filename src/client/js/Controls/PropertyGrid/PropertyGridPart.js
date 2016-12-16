/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Controls/PropertyGrid/PropertyGridWidgetManager',
    'js/Constants',
    'css!./styles/PropertyGridPart.css'
], function (PropertyGridWidgetManager, CONSTANTS) {

    'use strict';

    /** Outer-most className for GUI's */
    var PropertyGridPart,
        CSS_NAMESPACE = 'pgp',
        CLASS_CLOSED = 'closed',
        CLASS_CONTROLLER_ROW = 'cr',
        RESET_BUTTON_BASE = $('<i class="glyphicon glyphicon-remove-circle reset-badge btn-reset" title="Reset value"/>'),
        INVALID_BASE_VALUE_BASE = $('<i class="fa fa-exclamation-triangle reset-badge" ' +
            'title="Inherits META-invalid property"/>'),
        INVALID_BUTTON_BASE = $('<i class="glyphicon glyphicon-exclamation-sign reset-badge btn-reset" ' +
            'title="Remove META-invalid property"/>');

    PropertyGridPart = function (params) {
        if (params.el) {
            this._containerElement = params.el;
        }

        this._el = $('<div/>', {
            class: CSS_NAMESPACE
        });

        this.__ul = $('<ul/>', {});
        this._el.append(this.__ul);

        this.__folders = {};
        this.__widgets = {};

        this._closed = false;

        this.__onChange = undefined;
        this.__onFinishChange = undefined;
        this.__onReset = undefined;

        this._name = params.name || undefined;

        //if (this._name === CONSTANTS.PROPERTY_GROUP_META) {
        //    this._toggleClosed();
        //}

        this._parent = params.parent;

        // Are we a root level GUI?
        if (params.parent === undefined) {
            this._widgetManager = new PropertyGridWidgetManager();
            this._containerElement.append(this._el);
            // Oh, you're a nested GUI!
        } else {
            this._addNestedGUI(params);
            this._widgetManager = params.parent._widgetManager;
        }
    };

    PropertyGridPart.prototype._addNestedGUI = function (params) {
        var titleRow = this._addRow(this, $(document.createTextNode(params.text || params.name))),
            onClickTitle,
            self = this;

        onClickTitle = function (e) {
            e.preventDefault();
            e.stopPropagation();
            self._toggleClosed();
            return false;
        };

        titleRow.addClass('title');
        titleRow.on('click', onClickTitle);
    };

    /*************** PRIVATE API *************************/

    PropertyGridPart.prototype._toggleClosed = function () {
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
    PropertyGridPart.prototype._addRow = function (gui, dom, liBefore) {
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

    PropertyGridPart.prototype._change = function (args) {
        if (this.__onChange) {
            this.__onChange.call(this, args);
        }
    };

    PropertyGridPart.prototype._finishChange = function (args) {
        if (this.__onFinishChange) {
            this.__onFinishChange.call(this, args);
        }
    };

    PropertyGridPart.prototype._reset = function (propertyName) {
        if (this.__onReset) {
            this.__onReset.call(this, propertyName);
        }
    };

    PropertyGridPart.prototype._getAccumulatedName = function () {
        var parentName = this._parent ? this._parent._getAccumulatedName() : undefined;

        return parentName ? parentName + '.' + this._name : this._name;
    };

    /*************** END OF - PRIVATE API *************************/

    /*************** PUBLIC API **************************/

    PropertyGridPart.prototype.open = function () {
        this._closed = false;
        this.__ul.removeClass(CLASS_CLOSED);
    };

    PropertyGridPart.prototype.close = function () {
        this._closed = true;
        this.__ul.addClass(CLASS_CLOSED);
    };

    PropertyGridPart.prototype.add = function (propertyDesc) {
        var widget,
            container = $('<div/>'),
            spnName = $('<span/>', {class: 'property-name'}),
            divAction = $('<div/>', {class: 'p-reset'}),
            li,
            self = this,
            extraCss = {},
            actionBtn;

        if (this.__widgets[propertyDesc.name] !== undefined) {
            throw new Error('You already have a widget with the name "' + propertyDesc.name + '"');
        }

        if (!propertyDesc.id) {
            propertyDesc.id = this._getAccumulatedName() + '.' + propertyDesc.name;
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

        spnName.text(widget.propertyText || widget.propertyName);
        spnName.attr('title', widget.propertyText || widget.propertyName);

        if (propertyDesc.options) {
            if (propertyDesc.options.textColor) {
                extraCss.color = propertyDesc.options.textColor;
            }

            if (propertyDesc.options.textItalic) {
                extraCss['font-style'] = 'italic';
            }

            if (propertyDesc.options.textBold) {
                extraCss['font-weight'] = 'bold';
            }

            spnName.css(extraCss);

            // invalid value
            if (propertyDesc.options.invalidValue === true) {
                widget.el.addClass('has-invalid-value');
            }

            // resettable and invalid in terms of not having a definition.
            if (propertyDesc.options.invalid === true && propertyDesc.options.resetable === true) {
                actionBtn = INVALID_BUTTON_BASE.clone();
            } else if (propertyDesc.options.resetable === true) {
                actionBtn = RESET_BUTTON_BASE.clone();
            } else if (propertyDesc.options.invalid === true) {
                divAction.append(INVALID_BASE_VALUE_BASE.clone());
                spnName.addClass('p-reset');
            }

            if (actionBtn) {
                divAction.append(actionBtn);

                spnName.addClass('p-reset');

                actionBtn.on('click', function (event) {
                    if (self.__widgets[propertyDesc.name]._isReadOnly === false) {
                        self._reset(propertyDesc.id);
                    }
                    event.stopPropagation();
                    event.preventDefault();
                });

            }
        }

        container.append(spnName).append(divAction).append(widget.el);

        li = this._addRow(undefined, container, undefined);

        li.addClass(CLASS_CONTROLLER_ROW);
        if (propertyDesc.valueType) {
            li.addClass(propertyDesc.valueType);
        } else {
            li.addClass(typeof propertyDesc.value);
        }

        return widget;
    };

    PropertyGridPart.prototype.addFolder = function (name, text) {
        var newGuiParams = {name: name, text: text, parent: this},
            gui,
            li,
            self = this;

        if (this.__folders[name] !== undefined) {
            throw new Error('You already have a folder with the name "' + name + '"');
        }

        gui = new PropertyGridPart(newGuiParams);
        this.__folders[name] = gui;

        gui.onChange(function (args) {
            self._change(args);
        });

        gui.onFinishChange(function (args) {
            self._finishChange(args);
        });

        gui.onReset(function (propertyName) {
            self._reset(propertyName);
        });

        li = this._addRow(this, gui._el);
        li.addClass('folder');
        return gui;
    };

    PropertyGridPart.prototype.onChange = function (fnc) {
        this.__onChange = fnc;
        return this;
    };

    PropertyGridPart.prototype.onFinishChange = function (fnc) {
        this.__onFinishChange = fnc;
        return this;
    };

    PropertyGridPart.prototype.onReset = function (fnc) {
        this.__onReset = fnc;
        return this;
    };

    PropertyGridPart.prototype.clear = function () {
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

    PropertyGridPart.prototype.setReadOnly = function (isReadOnly) {
        var i;

        //set all its widget to isReadOnly
        for (i in this.__widgets) {
            if (this.__widgets.hasOwnProperty(i)) {
                this.__widgets[i].setReadOnly(isReadOnly);
            }
        }

        //set all its sub-folders to isReadOnly
        for (i in this.__folders) {
            if (this.__folders.hasOwnProperty(i)) {
                this.__folders[i].setReadOnly(isReadOnly);
            }
        }
    };

    PropertyGridPart.prototype.registerWidgetForType = function (type, widget) {
        this._widgetManager.registerWidgetForType(type, widget);
    };
    /*************** END OF - PUBLIC API **************************/

    return PropertyGridPart;
});