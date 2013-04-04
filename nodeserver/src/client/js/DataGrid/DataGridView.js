"use strict";

define(['clientUtil',
    'js/WidgetBase/WidgetBaseWithHeader',
    'js/Constants',
    'text!js/DataGrid/DataGridViewTemplate.html',
    'text!js/DataGrid/DataTableTemplate.html',
    'css!DataGridCSS/DataGridView.css'], function (util,
                                                   WidgetBaseWithHeader,
                                                          CONSTANTS,
                                                          dataGridViewTemplate,
                                                          dataTableTemplate) {

    var DataGridView,
        DEFAULT_DATAMEMBER_ID = "ID",
        DEFAULT_NON_EXISTING_VALUE = '__undefined__',
        UNDEFINED_VALUE_CLASS = "undefined-value",
        ROW_COMMAND_DELETE = "delete",
        ROW_COMMAND_EDIT = "edit",
        ROW_COMMAND_DELETE_TITLE = "Delete row",
        ROW_COMMAND_EDIT_TITLE = "Edit row",
        __parent__ = WidgetBaseWithHeader,
        __parent_proto__ = __parent__.prototype;

    DataGridView = function (options) {
        //set properties from options
        options[WidgetBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = options[WidgetBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] || "DataGridView";
        //options[WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE] = WidgetBaseWithHeader.OPTIONS.HEADER_TOOLBAR_SIZE_OPTIONS.MINI;

        //call parent's constructor
        __parent__.apply(this, [options]);

        //initialize UI
        this.initializeUI();

        //set instance specific variables
        this._groupColumns = true;
        this._rowDelete = true;
        this._rowEdit = true;

        this.clear();

        this.logger.debug("DataGridView ctor finished");
    };
    //inherit from WidgetBase
    DataGridView.OPTIONS = _.extend(WidgetBaseWithHeader.OPTIONS,
        {});
    _.extend(DataGridView.prototype, __parent__.prototype);

    DataGridView.prototype.initializeUI = function () {
        var self = this;

        //get container first
        this.$el.append(this.$_DOMBase);

        //add extra visual piece
        this.$btnGroupItemAutoOptions = this.toolBar.addButtonGroup(function (event, data) {

        });


        this.toolBar.addButton({ "title": "Grid layout",
            "icon": "icon-th",
            "data": { "mode": "grid" }}, this.$btnGroupItemAutoOptions );


        this.toolBar.addButton({ "title": "Diagonal",
            "icon": "icon-signal",
            "data": { "mode": "diagonal" }}, this.$btnGroupItemAutoOptions );

    };

    DataGridView.prototype.$_DOMBase = $(dataGridViewTemplate);

    DataGridView.prototype.$_dataTableBase = $(dataTableTemplate);

    DataGridView.prototype.clear = function () {
        this.dataMemberID = DEFAULT_DATAMEMBER_ID;
        this._columns = [];
        this._dataMap = {};

        if (this._oTable) {
            this._oTable.fnClearTable();
            this._oTable.fnDestroy(false);
        }

        if (this.$table) {
            this.$table.empty();
            this.$table.remove();
            this.$table = undefined;
        }
    };

    DataGridView.prototype.destroy = function () {
        __parent_proto__.destroy.call(this);
    };

    DataGridView.prototype._initializeTable = function (columns) {
        var self = this,
            _columns,
            _editorColumns = [],
            maxRowSpan = 1,
            tHeadFirstRow,
            defaultSortCol = 0,
            actionButtonsEnabled = false,
            actionBtnColContent = "";

        this.$table = this.$_dataTableBase.clone();
        this.$el.append(this.$table);

        //if column grouping is needed, we need to manually build the table's header
        //DataTable can not generate the grouped header but can use it
        if (this._groupColumns === true) {
            maxRowSpan = this._buildGroupedHeader(columns);
        }

        //check if any action is enabled for the rows
        if (this._rowEdit === true) {
            actionBtnColContent = '<i class="icon-edit pointer rowCommandBtn" data-action="' + ROW_COMMAND_EDIT + '" title="' + ROW_COMMAND_EDIT_TITLE + '"></i>';
            actionButtonsEnabled = true;
        }

        if (this._rowDelete === true) {
            if (actionBtnColContent !== "") {
                actionBtnColContent += " ";
            }
            actionBtnColContent += '<i class="icon-trash pointer rowCommandBtn" data-action="' + ROW_COMMAND_DELETE  + '" title="' + ROW_COMMAND_DELETE_TITLE + '">';
            actionButtonsEnabled = true;
        }

        //if there is any action enabled
        if (actionButtonsEnabled === true) {
            //extend header with an extra column for the action buttons
            tHeadFirstRow = $(this.$table.find("> thead > tr")[0]);
            tHeadFirstRow.prepend('<th rowspan="' + maxRowSpan + '"></th>');

            //add command buttons' cell to the beginning
            _editorColumns.push({
                "mData": null,
                "sDefaultContent": actionBtnColContent,
                "bSearchable": false,
                "bSortable": false,
                "sClass": "center nowrap"
            });
            defaultSortCol = 1;
        }

        //add the (autodetected/given) columns to the list
        _columns = _editorColumns.concat(columns);

        this._oTable = this.$table.dataTable( {
             "bPaginate": false,
             "bLengthChange": false,
             "bFilter": true,
             "bAutoWidth": false,
             "bDestroy": true,
             "bRetrieve": false,
                "fnRowCallback": function( nRow, aData, iDisplayIndex, iDisplayIndexFull ) {
                    self._fnRowCallback(nRow, aData, iDisplayIndex, iDisplayIndexFull);
                },
            "aoColumns": _columns,
            "aaSorting": [[defaultSortCol,'asc']]});

        /* IN PLACE EDIT ON CELL DOUBLECLICK */
        /*this.$table.on('dblclick', 'td', function (event) {
            if (!self._readOnlyMode) {
                self._editCell(this);
            }
            event.stopPropagation();
            event.preventDefault();
        });*/

        if (actionButtonsEnabled === true) {
            this.$table.on('click', '.rowCommandBtn', function (event) {
                var btn = $(this),
                    command = btn.attr("data-action"),
                    td = btn.parent()[0];

                if (!self._readOnlyMode) {
                    self._onRowCommand(command, td);
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }
    };

    DataGridView.prototype._buildGroupedHeader = function (columns) {
        var len = columns.length,
            layout = [[]],
            i,
            buildLayout,
            processLayout,
            generateHeader,
            tHead = this.$table.find("> thead"),
            maxRowSpan = 0;

        buildLayout = function (level, col) {
            var cName = col.sTitle,
                layoutRow = layout[level],
                len = layoutRow.length,
                inserted = false,
                groupCol = cName.indexOf('.') !== -1,
                sName,
                rName,
                cCol;

            if (groupCol === true) {
                sName = cName.split('.')[0];
                rName = cName.substring(cName.indexOf('.') + 1 );
                while (len--) {
                    cCol = layoutRow[len];
                    if (cCol.sName === sName) {
                        cCol.colspan += 1;
                        cCol.subCols.push(rName);
                        inserted = true;
                        break;
                    }
                }

                if (inserted === false) {
                    layoutRow.push({"sName": sName,
                        "rowspan": 1,
                        "colspan": 1,
                        "subCols": [rName]});
                }
            } else {
                layoutRow.push({"sName": cName,
                             "rowspan": 1,
                             "colspan": 1,
                             "subCols": []});
            }
        };

        processLayout = function (level) {
            var layoutRow = layout[level],
                len = layoutRow.length,
                subColLen,
                cCol,
                i,
                j;

            //insert a next row, we might need it
            layout.push([]);

            for (i = 0; i < len; i += 1) {
                cCol = layoutRow[i];
                subColLen = cCol.subCols.length;
                for (j = 0; j <  subColLen; j += 1) {
                    buildLayout(level + 1, {"sTitle": cCol.subCols[j] });
                }
            }

            if (layout[level + 1].length > 0) {
                //increase rowspan value in the rows 'current and up'
                for (j = 0; j <= level; j+= 1) {
                    len = layout[j].length;
                    for (i = 0; i < len; i += 1) {
                        //if it has exactly 1 subelement, no neet to rowspan
                        if (layout[j][i].subCols.length !== 1) {
                            layout[j][i].rowspan += 1;
                        }
                    }
                }

                processLayout(level + 1);
            }
        };

        generateHeader = function () {
            var row = layout[0],
                len = row.length,
                i,
                rowHtml = '',
                cellHtml,
                rowSpan,
                colSpan;

            for (i = 0; i < len ; i += 1) {
                colSpan = row[i].colspan;
                rowSpan = colSpan === 1 ? row[i].rowspan : 1;
                cellHtml = '<th rowspan="' + rowSpan + '" colspan="' + colSpan + '">' + row[i].sName + '</th>';
                rowHtml += cellHtml;

                if (rowSpan > maxRowSpan) {
                    maxRowSpan = rowSpan;
                }
            }

            if (rowHtml !== '') {
                tHead.append($( '<tr>' + rowHtml + '</tr>'));
            }

            layout.splice(0, 1);
            if (layout.length > 0) {
                generateHeader();
            }
        };

        for (i = 0; i <  len; i++) {
            buildLayout(0, columns[i]);
            if (columns[i].sTitle.indexOf('.') !== 1) {
                columns[i].sTitle = columns[i].sTitle.substring(columns[i].sTitle.lastIndexOf('.') + 1);
            }
        }
        processLayout(0);

        generateHeader();

        return maxRowSpan;
    };

    DataGridView.prototype.beginUpdate = function () {

    };

    DataGridView.prototype.endUpdate = function () {

    };

    DataGridView.prototype.insertObjects = function (objects) {
        var result,
            len,
            rowIdx,
            key;

        if (objects.length > 0) {
            //check if the columns are defined already
            //if so, just load the data
            if (this._columns.length === 0) {
                this._autoDetectColumns(objects);
            }

            result = this._oTable.fnAddData(objects);
            if (this.dataMemberID) {
                len = result.length;
                while (len--) {
                    rowIdx = result[len];
                    key = this._getDataMemberID(objects[len]);
                    this._dataMap[key] = rowIdx;
                }
            }
        }
    };

    DataGridView.prototype.updateObjects = function (objects) {
        var len = objects.length,
            key;

        if (len > 0) {
            //TODO: check if there are additional columns in the updated object compared to whatever is displayed in the grid rightnow!!!
            if (this.dataMemberID) {
                while (len--) {
                    key = this._getDataMemberID(objects[len]);
                    if (this._dataMap.hasOwnProperty(key)) {
                        if( 1 === this._oTable.fnUpdate( objects[len], this._dataMap[key]) ) {
                            this.logger.warning("Updating object with dataMemberID '" + key + "' was unsuccessful");
                        }
                    } else {
                        this.logger.warning("Can not update object with dataMemberID '" + key + "'. Object with this ID is not present in grid...");
                    }
                }
            } else {
                this.logger.warning("Cannot update grid since dataMemberID is not set. Can not match elements...");
            }
        }
    };

    DataGridView.prototype.deleteObjects = function (objectIDs) {
        var len = objectIDs.length,
            key,
            rowIdx,
            i;

        if (len > 0) {
            if (this.dataMemberID) {
                while (len--) {
                    key = objectIDs[len];
                    if (this._dataMap.hasOwnProperty(key)) {
                        rowIdx = this._dataMap[key];
                        this._oTable.fnDeleteRow(rowIdx);
                        delete this._dataMap[key];

                        //fix indexes
                        for (i in this._dataMap) {
                            if (this._dataMap.hasOwnProperty(i)) {
                                if (this._dataMap[i] > rowIdx) {
                                    this._dataMap[i] -= 1;
                                }
                            }
                        }
                    } else {
                        this.logger.warning("Can not delete object with dataMemberID '" + key + "'. Object with this dataMemberID is not present in grid...");
                    }
                }
            } else {
                this.logger.warning("Cannot delete objects from grid since dataMemberID is not set. Can not match elements...");
            }
        }
    };

    DataGridView.prototype._autoDetectColumns = function (objects) {
        var len = objects.length,
            columns = {},
            columnNames = [],
            flattenedObj,
            prop,
            n,
            i;

        while (len--) {
            flattenedObj = util.flattenObject( objects[len]);

            for (prop in flattenedObj) {
               if (flattenedObj.hasOwnProperty(prop)) {
                   if (columnNames.indexOf(prop) === -1) {
                       columnNames.push(prop);

                       columns[prop] = {"title": prop,
                                        "data": prop};
                   }
               }
            }
        }

        columnNames = columnNames.sort();
        len = columnNames.length;
        
        //if dataMemberID is set and is present in the columns
        //let it be the first column
        if (this.dataMemberID && this.dataMemberID !== "") {
            if (columnNames.indexOf(this.dataMemberID) !== -1) {
                this._addColumnDef(this.dataMemberID, this.dataMemberID, false);
            }
        }

        for (i = 0; i < len; i += 1) {
            n = columnNames[i];
            if (this.dataMemberID !== n) {
                this._addColumnDef(columns[n].title, columns[n].data, true);
            }
        }

        this.onColumnsAutoDetected(this._columns);

        this._extendColumnDefs();

        this._initializeTable(this._columns);
    };

    DataGridView.prototype._addColumnDef = function (title, data, editable) {
        this._columns.push({"sTitle": title,
                            "mData": data,
                            "bEditable": editable,
                            "bSearchable": true,
                            "bSortable": true,
                            "sClass": ""
           });
    };

    DataGridView.prototype._extendColumnDefs = function () {
        var len = this._columns.length,
            self = this;

        while (len--) {
            $.extend(this._columns[len], {
                "mRender": function (data , type, full) {
                    return self._mRender(data, type, full);
                },
                "sDefaultContent" : DEFAULT_NON_EXISTING_VALUE
            });
        }
    };

    DataGridView.prototype._mRender = function (data , type, full) {
        if (data === DEFAULT_NON_EXISTING_VALUE ) {
            return '';
        }

        if (_.isArray(data) && type === 'display') {
            return data.join('<br/>');
        }

        return data;
    };

    DataGridView.prototype._fnRowCallback = function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
        var len = nRow.cells.length,
            d,
            $td,
            aPos;

        while (len--) {
            aPos = this._oTable.fnGetPosition( nRow.cells[len] );
            d = this._oTable.fnGetData( aPos[0], aPos[2] );
            $td = $(nRow.cells[len]);
            if (d === DEFAULT_NON_EXISTING_VALUE) {
                $td.addClass(UNDEFINED_VALUE_CLASS);
            } else {
                $td.removeClass(UNDEFINED_VALUE_CLASS);
            }
        }
    };

    DataGridView.prototype._getDataMemberID = function (dataObject) {
        return this._fetchData(dataObject, this.dataMemberID);
    };

    DataGridView.prototype._fetchData = function (object, data) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1 ) {
            a.splice(0,1);

            return this._fetchData(object[k], a.join('.'));
        } else {
            return object[k];
        }
    };

    /*DataGridView.prototype._editCell = function (td) {
        var $td = $(td),
            aPos = this._oTable.fnGetPosition(td),
            aData = this._oTable.fnGetData( aPos[0]),
            id = this._fetchData(aData, this.dataMemberID),
            colSettings = this._oTable.fnSettings().aoColumns[aPos[2]],
            oldVal = colSettings.fnGetData(aData),
            mData = colSettings.mData,
            sType = colSettings.sType,
            self = this;


        if (this.dataMemberID && this.dataMemberID !== '') {
            if (this._columns[aPos[2]].bEditable) {
                $td.editInPlace({"enableEmpty": true,
                                 "onChange": function (oldValue, newValue) {
                    var typeSafeOldValue = self._typeSafeValue(oldValue, oldValue),
                        typeSafeNewValue = self._typeSafeValue(newValue, oldValue);

                    if (typeSafeNewValue !== typeSafeOldValue) {
                        self._onCellEdit(id, mData, oldValue, newValue);
                    } else {
                        $td.html(oldValue);
                    }
                }});
            }
        } else {
            this.logger.warning("Cell edit is not possible since dataMemberID is not set...");
        }
    };*/

    /*DataGridView.prototype._typeSafeValue = function (val, defaultValue) {
        //TODO:
        return val;
    };*/

    DataGridView.prototype._onCellEdit = function (id, prop, oldValue, newValue) {
        this.onCellEdit({"id": id,
                         "prop": prop,
                         "oldValue": oldValue,
                         "newValue": newValue });
    };

    DataGridView.prototype._onRowCommand = function (command, td) {
        var aPos = this._oTable.fnGetPosition(td),
            aRow = aPos[0],
            aData = this._oTable.fnGetData(aRow),
            id = this._fetchData(aData, this.dataMemberID);

        switch(command) {
            case ROW_COMMAND_DELETE:
                this._onRowDelete(id, aData);
                break;
            case ROW_COMMAND_EDIT:
                this._onRowEdit(aRow, id, aData);
                break;
        }
    };

    DataGridView.prototype._onRowDelete = function (id, aData) {
        this.deleteObjects([id]);
        this.onRowDelete(id, aData);
    };

    DataGridView.prototype.$_editSaveCancel = $('<i class="icon-ok editSave"></i> <i class="icon-remove editCancel"></i>');

    DataGridView.prototype._onRowEdit = function (rowIndex, id, aData) {
        var nRow = this._oTable.fnGetNodes(rowIndex),
            len = nRow.cells.length,
            d,
            $td,
            aPos,
            $tdCommand = $(nRow.cells[0]),
            aoColumns = this._oTable.fnSettings().aoColumns,
            col,
            row,
            editCtrl,
            editCtrlClass = "edit",
            endEdit,
            self = this;

        while (len--) {
            $td = $(nRow.cells[len]);

            if (len > 0) {
                aPos = this._oTable.fnGetPosition( nRow.cells[len] );
                row = aPos[0];
                col = aPos[2];
                if (this._columns[col - 1].bEditable === true) {
                    //figure out the data value from the bound object
                    d = this._oTable.fnGetData( row, col );
                    //TODO: figure out the edit control / type

                    //set up edit controls in the cell
                    editCtrl = $('<input type="text" class="' + editCtrlClass + '"/>');

                    if (d !== DEFAULT_NON_EXISTING_VALUE) {
                        editCtrl.val(d);
                    }

                    $td.html(editCtrl);
                }
            }
        }

        $tdCommand.html(this.$_editSaveCancel.clone());
        $tdCommand.off('click');
        $tdCommand.on('click', ".editSave", function (event) {
            endEdit(true);
            event.stopPropagation();
            event.preventDefault();
        });
        $tdCommand.on('click', ".editCancel", function (event) {
            endEdit(false);
            event.stopPropagation();
            event.preventDefault();
        });

        endEdit = function (doSave) {
            var oData,
                nData;

            $tdCommand.off('click');

            aPos = self._oTable.fnGetPosition( $tdCommand[0] );
            row = aPos[0];

            oData = $.extend(true, {}, self._oTable.fnGetData(row));
            self._cleanData(oData);
            nData = $.extend(true, {}, oData);

            if (doSave === true) {
                //iterate through all the cells, get the new value from the edit control
                //and save it back to nData
                len = nRow.cells.length;

                while (len--) {
                    $td = $(nRow.cells[len]);

                    if (len > 0) {
                        aPos = self._oTable.fnGetPosition( nRow.cells[len] );
                        row = aPos[0];
                        col = aPos[2];
                        if (self._columns[col - 1].bEditable === true) {
                            //find the editor control and read out value
                            editCtrl = $td.find('.' + editCtrlClass);

                            if (editCtrl) {
                                d = editCtrl.val();
                                self._saveData(nData, aoColumns[col].mData, d );
                            }
                        }
                    }
                }
            }

            //finally update row in table with the new data object
            self._oTable.fnUpdate(nData, row);

            if (doSave === true) {
                //call onEdit callback if oData and nData is different
                if (!_.isEqual(oData, nData)) {
                    self.onRowEdit(id, oData, nData);
                }
            }
        };
    };

    DataGridView.prototype._cleanData = function (data) {
        var it;

        for (it in data) {
            if (data.hasOwnProperty(it)) {
                if (data[it] === DEFAULT_NON_EXISTING_VALUE) {
                    delete data[it];
                } else if (_.isObject(data[it])) {
                    this._cleanData(data[it]);
                }
            }
        }
    };

    DataGridView.prototype._saveData = function (object, data, value) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1 ) {
            a.splice(0,1);

            object[k] = object[k] || {};
            this._saveData(object[k], a.join('.'), value);
        } else {
            object[k] = value;
        }
    };

    /************** PUBLIC API OVERRIDABLES **************************/

    DataGridView.prototype.onCellEdit = function (params) {
        this.logger.warning("onCellEdit is not overridden... " + JSON.stringify(params));
    };

    DataGridView.prototype.onColumnsAutoDetected = function (columnDefs) {
        this.logger.warning("onColumnsAutoDetected is not overridden... " + JSON.stringify(columnDefs));
    };

    DataGridView.prototype.onRowDelete = function (id, aData) {
        this.logger.warning("onRowDelete is not overridden... ID:'" + id + "'\r\naData:" + JSON.stringify(aData));
    };

    DataGridView.prototype.onRowEdit = function (id, oData, nData) {
        this.logger.warning("onRowEdit is not overridden... ID:'" + id + "'\r\noldData:" + JSON.stringify(oData) + ",\r\nnewData: " + JSON.stringify(nData));
    };

    return DataGridView;
});