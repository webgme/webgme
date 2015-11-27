/*globals define, _, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define(['jquery', './DropDownMenu'], function (_jquery, DropDownMenu) {

    'use strict';

    var DropDownList,
        __parent__ = DropDownMenu,
        DEFAULT_UNDEFINED_TEXT = 'N/A';

    DropDownList = function (params) {
        //apply parent constructor
        __parent__.apply(this, [params]);

        //DropDownList own attributes
        this._selectedValue = undefined;
        this._undefinedValueText = DEFAULT_UNDEFINED_TEXT;
        this.setTitle(this._undefinedValueText);
    };

    //inherit DropDownMenu's stuff
    _.extend(DropDownList.prototype, DropDownMenu.prototype);

    DropDownList.prototype.setUndefinedValueText = function (text) {
        this._undefinedValueText = text;
    };

    //define DropDownList's own
    DropDownList.prototype.onItemClicked = function (value) {
        this._setSelectedValue(value, false);
    };

    DropDownList.prototype.selectedValueChanged = function (/* value */) {
        //TODO: override this to get notified about new value selection
    };

    /*DropDownList.prototype.addItem = function (item) {
     var firstItem = this._ul.children().length === 0;

     //call parent's addItem
     __parent_proto__.addItem.apply(this, arguments);

     //do List related part
     if (firstItem === true) {
     this._setSelectedValue(item.value, true);
     }
     };*/

    //clear in DropDownMenu removes the popup menu
    //here it should never happen
    //only the ListItems need to be cleared out
    DropDownList.prototype.clear = function () {
        this._ul.empty();
        this._selectedValue = undefined;
    };

    /********************** PRIVATE API *****************************/

    DropDownList.prototype.setSelectedValue = function (val) {
        this._setSelectedValue(val, false);
    };

    DropDownList.prototype._setSelectedValue = function (val, noEvent) {
        var li,
            text;

        if (this._selectedValue !== val) {
            if (val === null || val === undefined) {
                this._selectedValue = undefined;
                this.setTitle(this._undefinedValueText);
                this._applySelectedIcon();
            } else {
                li = this._ul.find('li[data-val="' + val + '"]');

                //if that value exist at all in the DropDownList
                if (li.length !== 0) {
                    this._selectedValue = val;

                    text = li.find('> a').text();
                    this.setTitle(text);

                    this._applySelectedIcon(li);

                    if (noEvent !== true) {
                        this.selectedValueChanged(this._selectedValue);
                    }
                }
            }
        }
    };

    DropDownList.prototype._applySelectedIcon = function (li) {
        var a,
            selectedIcon;

        //first remove existing
        this._ul.find('i.icon-ok').remove(); // FIXME: MAGIC CLASS COMING FROM DiagramDesignerWidget.Tabs

        if (li) {
            a = li.find('> a');
            selectedIcon = $('<i class="icon-ok glyphicon glyphicon-ok"></i>'); // FIXME: MAGIC CLASS COMING FROM DiagramDesignerWidget.Tabs

            selectedIcon.css({
                'margin-left': '-16px',
                'margin-right': '2px'
            });

            a.prepend(selectedIcon);
        }
    };

    return DropDownList;
});