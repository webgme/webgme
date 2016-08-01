/*globals define, $*/
/**
 * This widget shows a check-box drop-down based on valueItems.
 * The selected values are stored as a space-separated string.
 * Values present in the string, but not part as valueItems are put in a separate option group.
 *
 * Widget is based of off:
 * http://davidstutz.github.io/bootstrap-multiselect/
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'bootstrap-multiselect',
    'css!./styles/MultiSelectWidget.css'
], function (WidgetBase) {

    'use strict';

    var SELECT = $('<select/>', {multiple: 'multiple'});

    function MultiSelectWidget(propertyDesc) {
        var self = this,
            initSelection,
            item,
            container,
            i;

        WidgetBase.call(this, propertyDesc);

        this.el.addClass('multiselect-widget');
        this._select = SELECT.clone();
        this._wasChanged = false;


        initSelection = propertyDesc.value.split(' ');

        // Check if there are invalid selected elements
        for (i = 0; i < initSelection.length; i += 1) {
            item = initSelection[i];

            if (item && propertyDesc.valueItems.indexOf(item) === -1) {
                if (!container) {
                    container = $('<optgroup/>', {label: 'Unavailable'});
                    self._select.append(container);
                }

                container.append($('<option/>', {text: item, value: item, selected: 'selected'}));
            }
        }

        if (container) {
            // There were unavailable choices selected, create an other group
            container = $('<optgroup/>', {label: 'Available'});
            self._select.append(container);
        } else {
            // when not append directly to select.
            container = self._select;
        }

        // Add available options
        for (i = 0; i < propertyDesc.valueItems.length; i += 1) {
            item = propertyDesc.valueItems[i];

            if (initSelection.indexOf(item) === -1) {
                container.append($('<option/>', {text: item, value: item}));
            } else {
                container.append($('<option/>', {text: item, value: item, selected: 'selected'}));
            }
        }

        this.el.append(this._select);
        this._select.multiselect({
            onDropdownHide: function () {
                self._onBlur();
            },
            onChange: function () {
                self._onChange();
            },
            buttonClass: 'btn btn-link',
            disableIfEmpty: true,
            disabledText: 'None available ...'
        });

        // This is not the perfect solution, but the drop-down menu onDropdownHide is not triggered
        // before a new object is selected and on the destroy event - the fireFinishChange handler is cleared in
        // the PropertyEditor (so it doesn't persist to the wrong node).
        // Only cases where there is a change will the dropdown menu persist and be refreshed on mouse leave.
        this._dropDownMenu = this.el.find('.multiselect-container.dropdown-menu');
        this._dropDownMenu.on('mouseleave', function () {
            self._onBlur();
        });
    }

    MultiSelectWidget.prototype = Object.create(WidgetBase.prototype);

    MultiSelectWidget.prototype.constructor = MultiSelectWidget;

    MultiSelectWidget.prototype._onChange = function () {
        this._wasChanged = true;
    };

    MultiSelectWidget.prototype._onBlur = function () {
        var newValue;
        if (this._wasChanged === true) {
            this._wasChanged = false;
            newValue = this._select.val() ? this._select.val().join(' ') : '';
            this.setValue(newValue);
            this.fireFinishChange();
        }
    };

    MultiSelectWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (this._isReadOnly === true) {
            this._select.multiselect('disable');
        } else {
            this._select.multiselect('enable');
        }
    };

    MultiSelectWidget.prototype.destroy = function () {
        this._dropDownMenu.off('mouseleave');
        WidgetBase.prototype.destroy.call(this);
    };

    return MultiSelectWidget;

});