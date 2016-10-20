/*globals define, DEBUG*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/NodePropertyNames',
    'js/RegistryKeys',
    'js/DragDrop/DragHelper'
], function (nodePropertyNames,
             REGISTRY_KEYS,
             DragHelper) {

    'use strict';

    var GridPanelContainmentControlEventHandlers,
        KEY_ATTRIBUTES = 'Attributes',
    //KEY_POINTERS = 'Pointers',
        KEY_REGISTRY = 'Registry';

    GridPanelContainmentControlEventHandlers = function () {
    };

    GridPanelContainmentControlEventHandlers.prototype.attachDataGridWidgetEventHandlers = function () {
        var self = this;

        /*OVERRIDE DATAGRIDVIEW METHODS*/
        this._dataGridWidget.onCellEdit = function (params) {
            self._onCellEdit(params);
        };

        this._dataGridWidget.onColumnsAutoDetected = function (columnDefs) {
            self._onColumnsAutoDetected(columnDefs);
        };

        this._dataGridWidget.onRowDelete = function (id, aData) {
            self._onRowDelete(id, aData);
        };

        this._dataGridWidget.onRowEdit = function (id, oData, nData) {
            self._onRowEdit(id, oData, nData);
        };

        this._dataGridWidget.onGridDroppableAccept = function (gridCellDesc, draggedData) {
            return self._onGridDroppableAccept(gridCellDesc, draggedData);
        };

        this._dataGridWidget.onGridDrop = function (gridCellDesc, draggedData) {
            self._onGridDrop(gridCellDesc, draggedData);
        };

        this._logger.debug('attachDataGridWidgetEventHandlers finished');
    };

    GridPanelContainmentControlEventHandlers.prototype._onCellEdit = function (params) {
        var gmeID = params.id,
            prop = params.prop,
            newValue = params.newValue,
            keyArr,
            setterFn,
            getterFn,
            path,
            propObject,
            propPointer;

        this._client.startTransaction();

        keyArr = prop.split('.');
        if (keyArr[0] === 'Attributes') {
            setterFn = 'setAttributes';
            getterFn = 'getAttribute';
        } else {
            setterFn = 'setRegistry';
            getterFn = 'getRegistry';
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

    GridPanelContainmentControlEventHandlers.prototype._onColumnsAutoDetected = function (columnDefs) {
        var len = columnDefs.length,
            cDef;

        while (len--) {
            cDef = columnDefs[len];
            if (cDef.mData === 'ID' ||
                cDef.mData === 'ParentID' ||
                cDef.mData === 'GUID' ||
                cDef.mData === 'Registry.' + REGISTRY_KEYS.META_SHEETS ||
                cDef.mData === 'Registry.' + REGISTRY_KEYS.CROSSCUTS ||
                cDef.mData.indexOf('Sets.') === 0 ||
                cDef.mData.indexOf('Pointers.') === 0) {
                cDef.bEditable = false;
            }
        }
    };

    GridPanelContainmentControlEventHandlers.prototype._onRowDelete = function (id /*, aData */) {
        this._client.deleteNodes([id]);
    };

    GridPanelContainmentControlEventHandlers.prototype._onRowEdit = function (/*id, oData, nData */) {
        //var cNode = this._client.getNode(id),
        //    attrVal;

        /*if (cNode) {
         this._client.startTransaction();

         attrVal = this._fetchData(nData, "Attributes.name");
         if (attrVal !== null && attrVal !== undefined) {
         this._client.setAttributes(id, nodePropertyNames.Attributes.name, attrVal);
         }

         attrVal = this._fetchData(nData, "Registry.decorator");
         if (attrVal !== null && attrVal !== undefined) {
         this._client.setRegistry(id, REGISTRY_KEYS.DECORATOR, attrVal);
         }

         attrVal = this._fetchData(nData, "Registry.position");
         if (attrVal !== null && attrVal !== undefined) {
         attrVal.x = parseInt(attrVal.x, 10) || 0;
         attrVal.y = parseInt(attrVal.y, 10) || 0;
         this._client.setRegistry(id, REGISTRY_KEYS.POSITION, attrVal);
         }

         this._client.completeTransaction();
         }*/
    };

    GridPanelContainmentControlEventHandlers.prototype._fetchData = function (object, data) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1) {
            a.splice(0, 1);

            return this._fetchData(object[k], a.join('.'));
        } else {
            return object[k];
        }
    };

    GridPanelContainmentControlEventHandlers.prototype._onGridDroppableAccept = function (/* cellDesc, draggedData */) {
        if (DEBUG) {
            return true;
        }
    };


    GridPanelContainmentControlEventHandlers.prototype._onGridDrop = function (gridCellDesc, draggedData) {
        var idList = DragHelper.getDragItems(draggedData),
            gmeID = gridCellDesc.data.ID,
            key = gridCellDesc.mData,
            setterFn, getterFn,
            keyArr,
            path,
            propObject,
            client = this._client,
            propPointer,
            newVal;

        if (DEBUG) {
            keyArr = key.split('.');
            setterFn = undefined;
            getterFn = undefined;
            if (keyArr[0] === KEY_ATTRIBUTES) {
                setterFn = 'setAttributes';
                getterFn = 'getEditableAttribute';
            } else if (keyArr[0] === KEY_REGISTRY) {
                setterFn = 'setRegistry';
                getterFn = 'getEditableRegistry';
            }

            if (idList && idList.length === 1 && setterFn) {
                newVal = idList[0];
                if (setterFn && getterFn) {
                    keyArr.splice(0, 1);

                    //get property object from node
                    path = keyArr[0];
                    propObject = client.getNode(gmeID)[getterFn](path);

                    //get root object
                    propPointer = propObject;
                    keyArr.splice(0, 1);

                    if (keyArr.length < 1) {
                        //simple value so just set it
                        propObject = newVal;
                    } else {
                        //dig down to leaf property
                        while (keyArr.length > 1) {
                            propPointer = propPointer[keyArr[0]];
                            keyArr.splice(0, 1);
                        }

                        //set value
                        propPointer[keyArr[0]] = newVal;
                    }

                    //save back object
                    client[setterFn](gmeID, path, propObject);
                }
            }
        }
    };

    return GridPanelContainmentControlEventHandlers;
});
