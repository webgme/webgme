"use strict";

define(['logManager',
    'clientUtil',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    'css!/css/Widgets/AspectDesigner/AspectDesignerWidget'], function (logManager,
                                                             clientUtil,
                                                             DiagramDesignerWidget,
                                                             iCheckBox) {

    var AspectDesignerWidget,
        __parent__ = DiagramDesignerWidget,
        __parent_proto__ = DiagramDesignerWidget.prototype;

    AspectDesignerWidget = function (container, params) {
        params = params || {};
        params.loggerName = "AspectDesignerWidget";

        __parent__.call(this, container, params);

        this.logger.debug("AspectDesignerWidget ctor");
    };

    _.extend(AspectDesignerWidget.prototype, DiagramDesignerWidget.prototype);

    AspectDesignerWidget.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("AspectDesignerWidget.initializeUI");

        this._num = 0;
        this._aspectBuilderCanvasBackGroundText();

        this._initializeFilterPanel();
    };

    AspectDesignerWidget.prototype._aspectBuilderCanvasBackGroundText = function () {
        var text;

        if (this._num === 0) {
            text = "Your aspect is empty... Drag & drop objects from the tree...";
        } else {
            text = "Your aspect contains: " + this._num + " elements";
        }

        this.setBackgroundText(text, {"color": "#DEDEDE",
            "font-size": "40"});
    };

    AspectDesignerWidget.prototype.setAspectMemberNum = function (num) {
        if (this._num !== num) {
            this._num = num;
            this._aspectBuilderCanvasBackGroundText();
        }
    };

    AspectDesignerWidget.prototype._initializeFilterPanel = function () {
        /**** create FILTER PANEL ****/
        this.$filterPanel = $('<div/>', {
            'class': 'filterPanel'
        });

        this.$filterPanel.html('<div class="header">FILTER</div><ul class="body"></ul>');

        this.$filterHeader = this.$filterPanel.find('.header');
        this.$filterUl = this.$filterPanel.find('ul.body');

        this.$el.parent().append(this.$filterPanel);
    };

    AspectDesignerWidget.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug("CheckBox checkChanged: " + value + ", checked: " + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    AspectDesignerWidget.prototype.onCheckChanged = function (value, isChecked) {
        this.logger.warning('AspectDesignerWidget.onCheckChanged(value, isChecked) is not overridden!');
    };

    AspectDesignerWidget.prototype.addFilterItem = function (text, value, iconEl) {
        var item = $('<li/>', {
                'class': 'filterItem'
            }),
            checkBox,
            self = this;

        checkBox = new iCheckBox({
            "checkChangedFn": function (isChecked) {
                self._checkChanged(value, isChecked);
            }});

        item.append(iconEl.addClass('inline'));
        item.append(text);
        item.append(checkBox.el);

        this.$filterUl.append(item);

        this._refreshHeaderText();

        return item;
    };

    AspectDesignerWidget.prototype._refreshHeaderText = function () {
        var all = this.$filterUl.find('.iCheckBox').length,
            on = this.$filterUl.find('.iCheckBox.checked').length;

        this.$filterHeader.html('FILTER (' + on + '/' + all + ')');
    };

    return AspectDesignerWidget;
});