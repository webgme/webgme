"use strict";

define([], function () {

    var HierarchyGridViewControlDataGridViewEventHandlers;

    HierarchyGridViewControlDataGridViewEventHandlers = function () {
    };

    HierarchyGridViewControlDataGridViewEventHandlers.prototype.attachDataGridViewEventHandlers = function () {
        var self = this;

        /*OVERRIDE DATAGRIDVIEW METHODS*/
        this._myHierarchyGridView.onCellEdit = function (params) {
            self._onCellEdit(params);
        };

        this._myHierarchyGridView.onColumnsAutoDetected = function (columnDefs) {
            self._onColumnsAutoDetected(columnDefs);
        };

        this._logger.debug("attachDataGridViewEventHandlers finished");
    };

    HierarchyGridViewControlDataGridViewEventHandlers.prototype._onCellEdit = function (params) {
        var gmeID = params.id,
            prop = params.prop,
            /*oldValue = params.oldValue,*/
            newValue = params.newValue,
            keyArr,
            setterFn,
            getterFn,
            path,
            propObject,
            propPointer;

        this._client.startTransaction();

        keyArr = prop.split(".");
        if (keyArr[0] === "Attributes") {
            setterFn = "setAttributes";
            getterFn = "getAttribute";
        } else {
            setterFn = "setRegistry";
            getterFn = "getRegistry";
        }

        keyArr.splice(0, 1);

        //get property object from node
        path = keyArr[0];
        propObject = this._client.getNode(gmeID)[getterFn](path);

        keyArr.splice(0, 1);

        if (keyArr.length > 0) {
            //get root object
            propPointer = propObject;


            //dig down to leaf property
            while (keyArr.length > 1) {
                propPointer = propPointer[keyArr[0]];
                keyArr.splice(0, 1);
            }

            //set value
            propPointer[keyArr[0]] = newValue;
        } else {
            propObject = newValue;
        }

        //save back object
        this._client[setterFn](gmeID, path, propObject);

        this._client.completeTransaction();
    };

    HierarchyGridViewControlDataGridViewEventHandlers.prototype._onColumnsAutoDetected = function (columnDefs) {
        var len = columnDefs.length,
            cDef;

        while(len--) {
            cDef = columnDefs[len];
            if (cDef.mData === 'ID' ||
                cDef.mData === 'ParentID' ||
                cDef.mData.indexOf('Sets.') === 0 ||
                cDef.mData.indexOf('Pointers.') === 0) {
                cDef.bEditable = false;
            }
        }
    };

    return HierarchyGridViewControlDataGridViewEventHandlers;
});
