"use strict";

define(['js/PropertyGrid/Widgets/WidgetBase',
        'js/Controls/iCheckBox'],
    function (WidgetBase,
              iCheckBox) {

        var iCheckBoxWidget;

        iCheckBoxWidget  = function (propertyDesc) {
            var self = this;

            iCheckBoxWidget.superclass.call(this, propertyDesc);

            this.__checkbox = new iCheckBox({"checkedText": 'YES',
                                             "uncheckedText": 'NO',
                                             "checkChangedFn": function (isChecked) {
                                                 self.setValue(isChecked);
                                                 self.fireFinishChange();
                                             }});

            /*$('<input/>', {
                "type": "checkbox",
                "checked": this.propertyValue
            });*/

            /*this.__checkbox.on('change', function (e) {
                self.setValue($(this).is(':checked'));
                self.fireFinishChange();
            });*/

            this.updateDisplay();

            this.el.append(this.__checkbox.el);
        };

        iCheckBoxWidget.superclass = WidgetBase;

        _.extend(
            iCheckBoxWidget.prototype,
            WidgetBase.prototype
        );

        iCheckBoxWidget.prototype.updateDisplay =  function () {
            this.__checkbox.setChecked(this.getValue());
            /*if (this.getValue() === true) {
                this.__checkbox.attr('checked', true);
            } else {
                this.__checkbox.attr('checked', false);
            }*/

            return iCheckBoxWidget.superclass.prototype.updateDisplay.call(this);
        };

        return iCheckBoxWidget;

    });