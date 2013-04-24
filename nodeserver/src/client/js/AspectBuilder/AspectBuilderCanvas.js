"use strict";

define(['logManager',
    'clientUtil',
    'js/DiagramDesigner/DesignerCanvas',
    'css!/css/AspectBuilder/AspectBuilderCanvas'], function (logManager,
                                                    clientUtil,
                                                    DesignerCanvas) {

    var AspectBuilderCanvas,
        __parent__ = DesignerCanvas,
        __parent_proto__ = DesignerCanvas.prototype;

    AspectBuilderCanvas = function (options) {
        options[DesignerCanvas.OPTIONS.LOGGER_INSTANCE_NAME] = options[DesignerCanvas.OPTIONS.LOGGER_INSTANCE_NAME] || "AspectBuilderCanvas";
        __parent__.apply(this, [options]);

        this.logger.debug("AspectBuilderCanvas ctor");
    };

    _.extend(AspectBuilderCanvas.prototype, DesignerCanvas.prototype);

    AspectBuilderCanvas.prototype.initializeUI = function (containerElement) {
        __parent_proto__.initializeUI.apply(this, arguments);
        this.logger.debug("AspectBuilderCanvas.initializeUI");

        this._num = 0;
        this._aspectBuilderCanvasBackGroundText();

        this._initializeFilterPanel();
    };

    AspectBuilderCanvas.prototype._aspectBuilderCanvasBackGroundText = function () {
        var text;

        if (this._num === 0) {
            text = "Your aspect is empty... Drag & drop objects from the tree...";
        } else {
            text = "Your aspect contains: " + this._num + " elements";
        }

        this.setBackgroundText(text, {"color": "#DEDEDE",
                                                "font-size": "40"});
    };

    AspectBuilderCanvas.prototype.setAspectMemberNum = function (num) {
        if (this._num !== num) {
            this._num = num;
            this._aspectBuilderCanvasBackGroundText();
        }
    };

    AspectBuilderCanvas.prototype._initializeFilterPanel = function () {
        var self = this;

        /**** create FILTER PANEL ****/
        this.$filterPanel = $('<div/>', {
            'class': 'filterPanel'
        });

        this.$filterPanel.html('<div class="header">FILTER</div><ul class="body"></ul>');

        this.$filterHeader = this.$filterPanel.find('.header');
        this.$filterUl = this.$filterPanel.find('ul.body');

        this.$el.append(this.$filterPanel);

        this.$filterUl.on('click', '.toggle-switch', function (event) {
            var checkBox = $(this),
                value = checkBox.attr('data-v');

            checkBox.toggleClass('on');

            self._checkChanged(value, checkBox.hasClass('on'));
        });
    };

    AspectBuilderCanvas.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug("CheckBox checkChanged: " + value + ", checked: " + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    AspectBuilderCanvas.prototype.onCheckChanged = function (value, isChecked) {
        this.logger.warning('AspectBuilderCanvas.onCheckChanged(value, isChecked) is not overridden!');
    };

    AspectBuilderCanvas.prototype.addFilterItem = function (text, value, iconEl) {
        var item = $('<li/>', {
                'class': 'filterItem'
            }),
            checkBox = $('<div/>', {
                'class': 'toggle-switch on pull-right',
                'data-v': value
            }),
            text;

        item.append(iconEl.addClass('inline'));
        item.append(text);
        item.append(checkBox);

        this.$filterUl.append(item);

        this._refreshHeaderText();

        return item;
    };

    AspectBuilderCanvas.prototype._refreshHeaderText = function () {
        var all = this.$filterUl.find('.toggle-switch').length,
            on = this.$filterUl.find('.toggle-switch.on').length;

        this.$filterHeader.html('FILTER (' + on + '/' + all + ')');
    };

    return AspectBuilderCanvas;
});