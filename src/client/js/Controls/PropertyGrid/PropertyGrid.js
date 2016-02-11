/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger',
    'js/Controls/PropertyGrid/PropertyGridPart'
], function (Logger,
             PropertyGridPart) {

    'use strict';

    var PropertyGrid;

    PropertyGrid = function () {
        var self = this;

        this._logger = Logger.create('gme:Controls:PropertyGrid:PropertyGrid', WebGMEGlobal.gmeConfig.client.log);

        this.$el = $('<div/>', {class: 'property-list'});

        this._propertyList = {};

        //this._widgetList = {};
        this._initDefaultWidgets();

        this._isReadOnly = false;

        this._ordered = false;

        this.__onChange = null;
        this.__onFinishChange = null;
        this.__onReset = null;

        this._gui = new PropertyGridPart({el: this.$el});
        this._gui.onChange(function (args) {
            self._logger.debug('onChange: ' + JSON.stringify(args));
            if (self.__onChange) {
                self.__onChange.call(self, args);
            }
        });

        this._gui.onFinishChange(function (args) {
            self._logger.debug('onFinishChange: ' + JSON.stringify(args));
            if (self.__onFinishChange) {
                self.__onFinishChange.call(self, args);
            }
        });

        this._gui.onReset(function (propertyName) {
            self._logger.debug('onReset: ' + propertyName);
            if (self.__onReset) {
                self.__onReset.call(self, propertyName);
            }
        });

        this._logger.debug('Created');
    };

    PropertyGrid.prototype._initDefaultWidgets = function () {
        //this._widgetList['default'] = new TextWidget();
    };

    PropertyGrid.prototype.registerWidgetForType = function (type, widget) {
        this._gui.registerWidgetForType(type, widget);
    };

    PropertyGrid.prototype._render = function () {
        var i,
            orderedPropNames = [];

        this._folders = {};
        this._widgets = {};

        this._gui.clear();

        if (this._ordered === true) {
            for (i in this._propertyList) {
                if (this._propertyList.hasOwnProperty(i)) {
                    this._propertyList[i].id = i;
                    orderedPropNames.push(i);
                }
            }

            orderedPropNames.sort();

            for (i = 0; i < orderedPropNames.length; i += 1) {
                this._addPropertyItem(orderedPropNames[i].split('.'),
                    '',
                    this._propertyList[orderedPropNames[i]],
                    this._gui);
            }
        } else {
            for (i in this._propertyList) {
                if (this._propertyList.hasOwnProperty(i)) {
                    this._propertyList[i].id = i;
                    this._addPropertyItem(i.split('.'), '', this._propertyList[i], this._gui);
                }
            }
        }
    };

    PropertyGrid.prototype._addPropertyItem = function (attrID, prefix, propDesc, guiObj) {
        var parentFolderKey,
            parentFolderName;

        if (attrID.length > 1) {
            parentFolderName = attrID[0];
            parentFolderKey = prefix === '' ? parentFolderName : prefix + parentFolderName;
            this._folders[parentFolderKey] = this._folders[parentFolderKey] || guiObj.addFolder(parentFolderName);
            attrID.splice(0, 1);
            this._addPropertyItem(attrID, parentFolderKey + '.', propDesc, this._folders[parentFolderKey]);
        } else {
            if (propDesc.isFolder === true) {
                this._folders[propDesc.name] = guiObj.addFolder(propDesc.name, propDesc.text);
            } else {
                this._widgets[propDesc.id] = guiObj.add(propDesc);
            }
        }
    };

    /****************** PUBLIC FUNCTIONS ***********************************/

    PropertyGrid.prototype.setPropertyList = function (pList) {
        this._propertyList = pList || {};
        this._render();
        this.setReadOnly(this._isReadOnly);
    };

    PropertyGrid.prototype.onChange = function (fnc) {
        this.__onChange = fnc;
    };

    PropertyGrid.prototype.onFinishChange = function (fnc) {
        this.__onFinishChange = fnc;
    };

    PropertyGrid.prototype.onReset = function (fnc) {
        this.__onReset = fnc;
    };

    PropertyGrid.prototype.destroy = function () {
        this._gui.clear();
    };

    PropertyGrid.prototype.setOrdered = function (isOrdered) {
        if (this._ordered !== isOrdered) {
            this._ordered = isOrdered;
            this._render();
        }
    };

    PropertyGrid.prototype.setReadOnly = function (isReadOnly) {
        this._isReadOnly = isReadOnly;
        this._gui.setReadOnly(isReadOnly);
    };

    return PropertyGrid;
});
