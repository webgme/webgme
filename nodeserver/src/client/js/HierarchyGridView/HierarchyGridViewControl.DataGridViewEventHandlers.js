"use strict";

define(['js/NodePropertyNames'], function (nodePropertyNames) {

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

        this._myHierarchyGridView.onRowDelete = function (id, aData) {
            self._onRowDelete(id, aData);
        };

        this._myHierarchyGridView.onRowEdit = function (id, oData, nData) {
            self._onRowEdit(id, oData, nData);
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

    HierarchyGridViewControlDataGridViewEventHandlers.prototype._onRowDelete = function (id, aData) {
        this._client.delMoreNodes([id]);
    };

    HierarchyGridViewControlDataGridViewEventHandlers.prototype._onRowEdit = function (id, oData, nData) {
        var cNode = this._client.getNode(id),
            attrVal;

        if (cNode) {
            this._client.startTransaction();

            attrVal = this._fetchData(nData, "Attributes.name");
            if (attrVal !== null && attrVal !== undefined) {
                this._client.setAttributes(id, nodePropertyNames.Attributes.name, attrVal);
            }

            attrVal = this._fetchData(nData, "Registry.decorator");
            if (attrVal !== null && attrVal !== undefined) {
                this._client.setRegistry(id, nodePropertyNames.Registry.decorator, attrVal);
            }

            attrVal = this._fetchData(nData, "Registry.position");
            if (attrVal !== null && attrVal !== undefined) {
                attrVal.x = parseInt(attrVal.x, 10) || 0;
                attrVal.y = parseInt(attrVal.y, 10) || 0;
                this._client.setRegistry(id, nodePropertyNames.Registry.position, attrVal);
            }

            this._client.completeTransaction();
        }
    };

    HierarchyGridViewControlDataGridViewEventHandlers.prototype._fetchData = function (object, data) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1 ) {
            a.splice(0,1);

            return this._fetchData(object[k], a.join('.'));
        } else {
            return object[k];
        }
    };

    return HierarchyGridViewControlDataGridViewEventHandlers;
});
