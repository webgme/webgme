"use strict";

define(['js/Controls/PropertyGrid/Widgets/WidgetBase'],
    function (WidgetBase) {

        var DialogWidget,
            LABEL_BASE = $('<span/>', {}),
            BTN_DIALOG_OPEN_BASE = $('<a class="btn btn-mini btn-dialog-open">...</a>');

        DialogWidget = function (propertyDesc) {
            DialogWidget.superclass.call(this, propertyDesc);

            var self = this;

            this.__label = LABEL_BASE.clone();
            this.el.append(this.__label);

            if (propertyDesc.dialog) {
                this.__btnDialogOpen = BTN_DIALOG_OPEN_BASE.clone();
                this.el.append(this.__btnDialogOpen);

                this.__btnDialogOpen.on('click', function (e) {
                    e.stopPropagation();
                    e.preventDefault();

                    var D = propertyDesc.dialog,
                        dialog = new D();

                    dialog.show(function (newValue) {
                        self.setValue(newValue);
                        self.fireFinishChange();
                    });
                });
            }

            this.updateDisplay();
        };

        DialogWidget.superclass = WidgetBase;

        _.extend(
            DialogWidget.prototype,
            WidgetBase.prototype
        );

        DialogWidget.prototype.updateDisplay = function () {
            this.__label.text(this.propertyValue);
            this.__label.attr('title', this.propertyValue);
            return DialogWidget.superclass.prototype.updateDisplay.call(this);
        };

        DialogWidget.prototype.setReadOnly = function (isReadOnly) {
            DialogWidget.superclass.prototype.setReadOnly.call(this, isReadOnly);

            if (this.__btnDialogOpen) {
                if (isReadOnly === true) {
                    this.__btnDialogOpen.addClass('disabled');
                } else {
                    this.__btnDialogOpen.removeClass('disabled');
                }
            }
        };

        return DialogWidget;

    });