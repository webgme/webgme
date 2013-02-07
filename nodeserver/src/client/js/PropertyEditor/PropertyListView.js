"use strict";

define(['logManager',
    'clientUtil',
    'js/PropertyEditor/PropertyEditorGUI',
    'css!PropertyEditorCSS/PropertyListView'], function (logManager,
                                                      util,
                                                      PropertyEditorGUI) {

    var PropertyListView,
        useDatGUI = true;

    PropertyListView = function (containerElement, customWidgetList) {
        var self = this;

        this._containerElement = containerElement;

        this._propertyList = {};

        this._widgetList = {};
        this._initDefaultWidgets();

        this._folders = {};
        this._widgets = {};

        this.__onChange = null;
        this.__onFinishChange = null;

        this._gui = new PropertyEditorGUI({"el": this._containerElement});
        this._gui.onChange(function (args) {
            self._logger.warning("onChange: " + JSON.stringify(args));
            if (self.__onChange) {
                self.__onChange.call(self, args);
            }
        });

        this._gui.onFinishChange(function (args) {
            self._logger.warning("onFinishChange: " + JSON.stringify(args));
            if (self.__onFinishChange) {
                self.__onFinishChange.call(self, args);
            }
        });

        //generate fake data
        //this._initDummyPropertyData();

        this._logger = logManager.create("PropertyListView_" + containerElement);
        this._logger.debug("Created");
    };

    PropertyListView.prototype._initDefaultWidgets = function () {
        //this._widgetList["default"] = new TextWidget();
    };

    PropertyListView.prototype._initDummyPropertyData = function () {
        var dummyData = '{"Attributes.isPort":{"name":"isPort","value":true,"valueType":"boolean"},"Attributes.name":{"name":"name","value":"Model_27","valueType":"string"},"Registry.position.x":{"name":"x","value":920,"valueType":"number","options":{"textItalic":true,"textBold":true}},"Registry.position.y":{"name":"y","value":200,"valueType":"number"},"Registry.isConnection":{"name":"isConnection","value":false,"valueType":"boolean"}}';
        this.setPropertyList(JSON.parse(dummyData));
    };

    PropertyListView.prototype._render = function () {
        var i;

        this._folders = {};
        this._widgets = {};

        this._gui.clear();

        for (i in this._propertyList) {
            if (this._propertyList.hasOwnProperty(i)) {
                this._propertyList[i].id = i;
                this._addPropertyItem(i.split("."), "", this._propertyList[i], this._gui);
            }
        }
    };

    PropertyListView.prototype._addPropertyItem = function (arrID, prefix, propDesc, guiObj) {
        var parentFolderKey,
            parentFolderName;

        if (arrID.length > 1) {
            parentFolderName = arrID[0];
            parentFolderKey = prefix !== "" ? prefix + parentFolderName : parentFolderName;
            this._folders[parentFolderKey] = this._folders[parentFolderKey] || guiObj.addFolder(parentFolderName);
            arrID.splice(0, 1);
            this._addPropertyItem(arrID, parentFolderKey + ".", propDesc, this._folders[parentFolderKey]);
        } else {
            this._widgets[propDesc.id] = guiObj.add(propDesc);
        }
    };

    /****************** PUBLIC FUNCTIONS ***********************************/

    PropertyListView.prototype.setPropertyList = function (pList) {
        this._propertyList = pList || {};
        this._render();
    };

    PropertyListView.prototype.onChange = function (fnc) {
        this.__onChange = fnc;
    };

    PropertyListView.prototype.onFinishChange = function (fnc) {
        this.__onFinishChange = fnc;
    };

    PropertyListView.prototype.destroy = function () {
        this._gui.clear();
    };

    return PropertyListView;
});
