/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([
    'js/logger',
    'js/util',
    'js/Constants',
    'js/Widgets/DataGrid/DataGridWidget.Droppable',
    'text!./templates/DataTableTemplate.html',
    'jquery-dataTables-bootstrapped',
    'css!./styles/DataGridWidget.css'
], function (Logger, util, CONSTANTS, DataGridWidgetDroppable, dataTableTemplate) {
    'use strict';

    var DataGridWidget,
        DEFAULT_DATAMEMBER_ID = 'ID',
        DEFAULT_NON_EXISTING_VALUE = '__undefined__',
        UNDEFINED_VALUE_CLASS = 'undefined-value',
        ROW_COMMAND_DELETE = 'delete',
        ROW_COMMAND_EDIT = 'edit',
        ROW_COMMAND_DELETE_TITLE = 'Delete row',
        ROW_COMMAND_EDIT_TITLE = 'edit row';

    DataGridWidget = function (container /*, params*/) {
        this.logger = Logger.create('gme:Widgets:DataGridWidget', WebGMEGlobal.gmeConfig.client.log);

        this.$el = container;

        //initialize UI
        this.initializeUI();

        //set instance specific variables
        this._groupColumns = true;
        this._rowDelete = true;
        this._rowEdit = true;
        this._droppable = true;
        this._noWrapColumns = [];

        this._displayCommonColumnsOnly = false;

        this.clear();

        this.logger.debug('DataGridWidget ctor finished');
    };

    //implement DataGridWidgetDroppable as well
    _.extend(DataGridWidget.prototype, DataGridWidgetDroppable.prototype);

    DataGridWidget.prototype.initializeUI = function () {
    };

    //jshint camelcase: false
    DataGridWidget.prototype.$_dataTableBase = $(dataTableTemplate);

    DataGridWidget.prototype.clear = function () {
        this._isClearing = true;
        this.dataMemberID = DEFAULT_DATAMEMBER_ID;
        this._columns = [];
        this._dataMap = {};
        this._commonColumns = [];

        if (this._oTable) {
            try {
                this._oTable.fnClearTable();
                this._oTable.fnDestroy(false);
            } catch (exx) {

            }
        }

        if (this.$table) {
            this._detachDroppable(this.$table);
            this.$table.empty();
            this.$table.remove();
            this.$table = undefined;
        }

        if (this.toolbarItems && this.toolbarItems.ddColumnVisibility) {
            this.toolbarItems.ddColumnVisibility.clear();
        }
        this._isClearing = false;
    };

    DataGridWidget.prototype.destroy = function () {
    };

    DataGridWidget.prototype._initializeTable = function (columns) {
        var self = this,
            _columns,
            _editorColumns = [],
            maxRowSpan = 1,
            tHeadFirstRow,
            defaultSortCol = 0,
            actionBtnColContent = '';

        this._isInitializing = true;

        this._actionButtonsInFirstColumn = false;

        this.$table = this.$_dataTableBase.clone();
        this.$el.append(this.$table);

        //if column grouping is needed, we need to manually build the table's header
        //DataTable can not generate the grouped header but can use it
        if (this._groupColumns === true) {
            maxRowSpan = this._buildGroupedHeader(columns);
        }

        //check if any action is enabled for the rows
        if (this._rowEdit === true) {
            actionBtnColContent = '<i class="glyphicon glyphicon-edit pointer rowCommandBtn" data-action="' +
            ROW_COMMAND_EDIT + '" title="' + ROW_COMMAND_EDIT_TITLE + '"></i>';
            this._actionButtonsInFirstColumn = true;
        }

        if (this._rowDelete === true) {
            if (actionBtnColContent !== '') {
                actionBtnColContent += ' ';
            }
            actionBtnColContent += '<i class="glyphicon glyphicon-trash pointer rowCommandBtn" data-action="' +
            ROW_COMMAND_DELETE + '" title="' + ROW_COMMAND_DELETE_TITLE + '">';
            this._actionButtonsInFirstColumn = true;
        }

        //if there is any action enabled
        if (this._actionButtonsInFirstColumn === true) {
            //extend header with an extra column for the action buttons
            tHeadFirstRow = $(this.$table.find('> thead > tr')[0]);
            tHeadFirstRow.prepend('<th rowspan="' + maxRowSpan + '"></th>');

            //add command buttons' cell to the beginning
            _editorColumns.push({
                mData: null,
                sDefaultContent: actionBtnColContent,
                bSearchable: false,
                bSortable: false,
                sClass: 'center nowrap'
            });
            defaultSortCol = 1;
        }

        //add the (autodetected/given) columns to the list
        _columns = _editorColumns.concat(columns);

        this._oTable = this.$table.dataTable({
            bPaginate: false,
            bInfo: false,
            bLengthChange: false,
            bSortClasses: false,
            bFilter: true,
            bAutoWidth: false,
            bDestroy: true,
            bRetrieve: false,
            fnRowCallback: function (nRow, aData, iDisplayIndex, iDisplayIndexFull) {
                self._fnRowCallback(nRow, aData, iDisplayIndex, iDisplayIndexFull);
            },
            aoColumns: _columns,
            sDom: 'lrtip',
            aaSorting: [[defaultSortCol, 'asc']],
            fnDrawCallback: function (oSettings) {
                self._fnDrawCallback(oSettings);
            }
        });

        /* IN PLACE EDIT ON CELL DOUBLECLICK */
        /*this.$table.on('dblclick', 'td', function (event) {
         if (!self._readOnlyMode) {
         self._editCell(this);
         }
         event.stopPropagation();
         event.preventDefault();
         });*/

        if (this._actionButtonsInFirstColumn === true) {
            this.$table.on('click', '.rowCommandBtn', function (event) {
                var btn = $(this),
                    command = btn.attr('data-action'),
                    td = btn.parent()[0];

                if (self._readOnly !== true) {
                    self._onRowCommand(command, td);
                }
                event.stopPropagation();
                event.preventDefault();
            });
        }

        this.createColumnShowHideControl(_columns, this._groupColumns, this._actionButtonsInFirstColumn === true);

        this._attachDroppable(this.$el, this.$table);

        this._isInitializing = false;
    };

    DataGridWidget.prototype._buildGroupedHeader = function (columns) {
        var len = columns.length,
            layout = [[]],
            i,
            buildLayout,
            processLayout,
            generateHeader,
            tHead = this.$table.find('> thead'),
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
                rName = cName.substring(cName.indexOf('.') + 1);
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
                    layoutRow.push({
                        sName: sName,
                        rowspan: 1,
                        colspan: 1,
                        subCols: [rName]
                    });
                }
            } else {
                layoutRow.push({
                    sName: cName,
                    rowspan: 1,
                    colspan: 1,
                    subCols: []
                });
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
                for (j = 0; j < subColLen; j += 1) {
                    buildLayout(level + 1, {sTitle: cCol.subCols[j]});
                }
            }

            if (layout[level + 1].length > 0) {
                //increase rowspan value in the rows 'current and up'
                for (j = 0; j <= level; j += 1) {
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

            for (i = 0; i < len; i += 1) {
                colSpan = row[i].colspan;
                rowSpan = colSpan === 1 ? row[i].rowspan : 1;
                cellHtml = '<th rowspan="' + rowSpan + '" colspan="' + colSpan + '">' + row[i].sName + '</th>';
                rowHtml += cellHtml;

                if (rowSpan > maxRowSpan) {
                    maxRowSpan = rowSpan;
                }
            }

            if (rowHtml !== '') {
                tHead.append($('<tr>' + rowHtml + '</tr>'));
            }

            layout.splice(0, 1);
            if (layout.length > 0) {
                generateHeader();
            }
        };

        for (i = 0; i < len; i++) {
            buildLayout(0, columns[i]);
            if (columns[i].sTitle.indexOf('.') !== 1) {
                columns[i].sTitle = columns[i].sTitle.substring(columns[i].sTitle.lastIndexOf('.') + 1);
            }
        }
        processLayout(0);

        generateHeader();

        return maxRowSpan;
    };

    DataGridWidget.prototype.beginUpdate = function () {

    };

    DataGridWidget.prototype.endUpdate = function () {

    };

    DataGridWidget.prototype.insertObjects = function (objects) {
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

    DataGridWidget.prototype.updateObjects = function (objects) {
        var len = objects.length,
            key;

        if (len > 0) {
            //TODO: check if there are additional columns in the updated object compared
            //TODO: to whatever is displayed in the grid rightnow!!!
            if (this.dataMemberID) {
                while (len--) {
                    key = this._getDataMemberID(objects[len]);
                    if (this._dataMap.hasOwnProperty(key)) {
                        if (1 === this._oTable.fnUpdate(objects[len], this._dataMap[key])) {
                            this.logger.warn('Updating object with dataMemberID "' + key + '" was unsuccessful');
                        }
                    } else {
                        this.logger.warn('Can not update object with dataMemberID "' + key +
                        '". Object with this ID is not present in grid...');
                    }
                }
            } else {
                this.logger.warn('Cannot update grid since dataMemberID is not set. Can not match elements...');
            }
        }
    };

    DataGridWidget.prototype.deleteObjects = function (objectIDs) {
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
                        this.logger.warn('Can not delete object with dataMemberID "' + key +
                        '". Object with this dataMemberID is not present in grid...');
                    }
                }
            } else {
                this.logger.warn('Cannot delete objects from grid since dataMemberID is not set. ' +
                'Can not match elements...');
            }
        }
    };

    DataGridWidget.prototype._autoDetectColumns = function (objects) {
        var len = objects.length,
            columns = {},
            columnNames = [],
            flattenedObj,
            prop,
            n,
            i,
            idx;

        while (len--) {
            flattenedObj = util.flattenObject(objects[len]);

            for (prop in flattenedObj) {
                if (flattenedObj.hasOwnProperty(prop)) {
                    if (columnNames.indexOf(prop) === -1) {
                        columnNames.push(prop);

                        columns[prop] = {
                            title: prop,
                            data: prop
                        };
                    }
                }
            }
        }

        columnNames = columnNames.sort();
        len = columnNames.length;

        //if dataMemberID is set and is present in the columns
        //let it be the first column
        if (this.dataMemberID && this.dataMemberID !== '') {
            idx = columnNames.indexOf(this.dataMemberID);
            if (idx !== -1) {
                columnNames.splice(idx, 1);
            }
            columnNames.splice(0, 0, this.dataMemberID);
        }

        for (i = 0; i < len; i += 1) {
            n = columnNames[i];

            this._addColumnDef(columns[n].title, columns[n].data, true);
        }

        this.onColumnsAutoDetected(this._columns);

        this._extendColumnDefs();

        this._initializeTable(this._columns);
    };

    DataGridWidget.prototype._addColumnDef = function (title, data, editable) {
        this._columns.push({
            sTitle: title,
            mData: data,
            bEditable: editable,
            bSearchable: true,
            bSortable: true,
            sClass: ''
        });
    };

    DataGridWidget.prototype._extendColumnDefs = function () {
        var len = this._columns.length,
            self = this,
            sClass;

        while (len--) {
            $.extend(this._columns[len], {
                mRender: function (data, type, full) {
                    return self._mRender(data, type, full);
                },
                sDefaultContent: DEFAULT_NON_EXISTING_VALUE
            });
            if (this._noWrapColumns && this._noWrapColumns.indexOf(this._columns[len].mData) !== -1) {
                sClass = this._columns[len].sClass || '';
                sClass = sClass.split(' ');
                if (sClass.indexOf('nowrap') === -1) {
                    sClass.push('nowrap');
                    sClass = sClass.join(' ');
                }
                this._columns[len].sClass = sClass;
            }
        }
    };

    DataGridWidget.prototype._mRender = function (data, type /*, full*/) {
        if (data === DEFAULT_NON_EXISTING_VALUE) {
            return '';
        }

        if (_.isArray(data) && type === 'display') {
            return JSON.stringify(data);
        }

        return data;
    };

    DataGridWidget.prototype._fnRowCallback = function (nRow, aData/*, iDisplayIndex, iDisplayIndexFull*/) {
        var len = nRow.cells.length,
            d,
            $td,
            aPos,
            aoColumn = this._oTable.fnSettings().aoColumns;

        while (len--) {
            aPos = this._oTable.fnGetPosition(nRow.cells[len]);
            if (aPos[2] && aPos[2] !== -1) {
                //d = this._oTable.fnGetData( aPos[0], aPos[2] );
                d = this._fetchData(aData, aoColumn[len].mData);
                $td = $(nRow.cells[len]);
                if (d === DEFAULT_NON_EXISTING_VALUE) {
                    $td.addClass(UNDEFINED_VALUE_CLASS);
                } else {
                    $td.removeClass(UNDEFINED_VALUE_CLASS);
                }
            }
        }
    };

    DataGridWidget.prototype._getDataMemberID = function (dataObject) {
        return this._fetchData(dataObject, this.dataMemberID);
    };

    DataGridWidget.prototype._fetchData = function (object, data) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1) {
            a.splice(0, 1);

            return this._fetchData(object[k], a.join('.'));
        } else {
            return object[k];
        }
    };

    DataGridWidget.prototype._onCellEdit = function (id, prop, oldValue, newValue) {
        this.onCellEdit({
            id: id,
            prop: prop,
            oldValue: oldValue,
            newValue: newValue
        });
    };

    DataGridWidget.prototype._onRowCommand = function (command, td) {
        var aPos = this._oTable.fnGetPosition(td),
            aRow = aPos[0],
            aData = this._oTable.fnGetData(aRow),
            id = this._fetchData(aData, this.dataMemberID);

        switch (command) {
            case ROW_COMMAND_DELETE:
                this._onRowDelete(id, aData);
                break;
            case ROW_COMMAND_EDIT:
                this._onRowEdit(aRow, id, aData);
                break;
        }
    };

    DataGridWidget.prototype._onRowDelete = function (id, aData) {
        this.deleteObjects([id]);
        this.onRowDelete(id, aData);
    };

    DataGridWidget.prototype.$_editSaveCancel = $('<i class="glyphicon glyphicon-ok editSave">' +
    '</i> <i class="glyphicon glyphicon-remove editCancel"></i>');

    DataGridWidget.prototype._onRowEdit = function (rowIndex, id /*, aData*/) {
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
            editCtrlClass = 'glyphicon glyphicon-edit',
            endEdit,
            self = this;

        while (len--) {
            $td = $(nRow.cells[len]);

            if (len > 0) {
                aPos = this._oTable.fnGetPosition(nRow.cells[len]);
                row = aPos[0];
                col = aPos[2];
                if (this._columns[col - 1].bEditable === true) {
                    //figure out the data value from the bound object
                    d = this._oTable.fnGetData(row, col);
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
        $tdCommand.on('click', '.editSave', function (event) {
            endEdit(true);
            event.stopPropagation();
            event.preventDefault();
        });
        $tdCommand.on('click', '.editCancel', function (event) {
            endEdit(false);
            event.stopPropagation();
            event.preventDefault();
        });

        endEdit = function (doSave) {
            var oData,
                nData;

            $tdCommand.off('click');

            aPos = self._oTable.fnGetPosition($tdCommand[0]);
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
                        aPos = self._oTable.fnGetPosition(nRow.cells[len]);
                        row = aPos[0];
                        col = aPos[2];
                        if (self._columns[col - 1].bEditable === true) {
                            //find the editor control and read out value
                            editCtrl = $td.find('.' + editCtrlClass);

                            if (editCtrl) {
                                d = editCtrl.val();
                                self._saveData(nData, aoColumns[col].mData, d);
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

    DataGridWidget.prototype._cleanData = function (data) {
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

    DataGridWidget.prototype._extractOriginalData = function (data) {
        var result = {},
            i,
            len,
            j;

        for (i in data) {
            if (data.hasOwnProperty(i)) {
                if (_.isObject(data[i])) {
                    if (_.isArray(data[i])) {
                        result[i] = [];
                        len = data[i].length;
                        for (j = 0; j < len; j += 1) {
                            result[i].push(data[i][j]);
                        }
                    } else {
                        result[i] = this._extractOriginalData(data[i]);
                    }
                } else {
                    if (data[i] !== DEFAULT_NON_EXISTING_VALUE) {
                        result[i] = data[i];
                    }
                }
            }
        }

        return result;
    };

    DataGridWidget.prototype._saveData = function (object, data, value) {
        var a = data.split('.'),
            k = a[0];

        if (a.length > 1) {
            a.splice(0, 1);

            object[k] = object[k] || {};
            this._saveData(object[k], a.join('.'), value);
        } else {
            object[k] = value;
        }
    };

    DataGridWidget.prototype._filterDataTable = function (text) {
        if (this._oTable) {
            this._oTable.fnFilter(text);
            this._prevFilter = text;
        }
    };

    DataGridWidget.prototype._refilterDataTable = function () {
        if (this._prevFilter && this._prevFilter !== '') {
            this._filterDataTable(this._prevFilter);
        }
    };


    /******************* CREATE COLUMN SHOW/HIDE UI CONTROL *******************/

    DataGridWidget.prototype._createColumnShowHideControlInToolBar = function (columns, isColumnsGrouped,
                                                                               isActionButtonsInFirstColumn) {
        var i,
            len = columns.length,
            self = this;

        //clear dropdown menu
        this.toolbarItems.ddColumnVisibility.clear();
        this._columnVisibilityCheckboxList = [];
        for (i = isActionButtonsInFirstColumn ? 1 : 0; i < len; i += 1) {

            if (this.dataMemberID !== columns[i].mData) {
                var chkBtn = this.toolbarItems.ddColumnVisibility.addCheckBox({
                    text: columns[i].mData,
                    data: {idx: i},
                    checkChangedFn: function (data, isChecked) {
                        self.setColumnVisibility(data.idx, isChecked);
                        self._refilterDataTable();
                    }
                });

                this._columnVisibilityCheckboxList.push(chkBtn);
            }
        }
    };

    /************** END OF --- CREATE COLUMN SHOW/HIDE UI CONTROL *************/


    /************* PUBLIC API / COLUMN VISIBILITY ***********************/

    DataGridWidget.prototype.toggleColumnVisibility = function (index) {
        if (this._oTable) {
            var bVis = this._oTable.fnSettings().aoColumns[index].bVisible;
            this.showColumn(index, !bVis);
        }
    };

    DataGridWidget.prototype.setColumnVisibility = function (index, visible) {
        //var bVis = oTable.fnSettings().aoColumns[iCol].bVisible;
        if (this._oTable) {
            //disable 'searchable' for the non visible columns
            this._oTable.fnSettings().aoColumns[index].bSearchable = visible;
            //DO NOT REDRAW the table
            this._oTable.fnSetColumnVis(index, visible, false);
        }
    };

    /************* END OF --- PUBLIC API / COLUMN VISIBILITY ***********************/


    /****************** PUBLIC API / COMMON COLUMNS ONLY *************************/

    DataGridWidget.prototype.displayCommonColumnsOnly = function (commonColumnOnly) {
        this._displayCommonColumnsOnly = commonColumnOnly === true;
        this.logger.debug('setting displayCommonColumnsOnly to: ' + this._displayCommonColumnsOnly);
        this._applyCommonColumnFilter();
    };

    /****************** END OF --- PUBLIC API / COMMON COLUMNS ONLY *************************/

    DataGridWidget.prototype._fnDrawCallback = function (oSettings) {
        //no interest when currently clearing or initializing the DataTable
        //or when redraw happens because of applying CommonColumnFilter
        if (this._isInitializing === true || this._isClearing === true || this._isApplyingCommonColumnFilter === true) {
            return;
        }

        this._applyCommonColumnFilter();

        this._updateInfo(oSettings);
    };

    DataGridWidget.prototype._enableColumnFilterCheckBox = function (index, enabled) {
        if (this._actionButtonsInFirstColumn) {
            index -= 1;
        }

        if (this.dataMemberID && this.dataMemberID !== '') {
            index -= 1;
        }

        if (index >= 0) {
            this._columnVisibilityCheckboxList[index].setEnabled(enabled);
        }
    };

    DataGridWidget.prototype._setCheckedColumnFilterCheckBox = function (index, enabled) {
        if (this._actionButtonsInFirstColumn) {
            index -= 1;
        }

        if (this.dataMemberID && this.dataMemberID !== '') {
            index -= 1;
        }

        if (index >= 0) {
            this._columnVisibilityCheckboxList[index].setChecked(enabled);
        }
    };


    DataGridWidget.prototype._applyCommonColumnFilter = function () {
        var displayedData,
            len,
            flattenedObj,
            prop,
            columnCount = {},
            maxColumnCount = 0,
            i,
            aoColumns,
            getColumnIndexInDataTable,
            cColumns = [],
            diff;

        this.logger.debug('_applyCommonColumnFilter called');
        this._isApplyingCommonColumnFilter = true;

        if (this._oTable) {
            aoColumns = this._oTable.fnSettings().aoColumns;

            if (this._displayCommonColumnsOnly === true) {
                displayedData = this._oTable._('tr', {filter: 'applied'});
                /*displayedRows = this._oTable.$('tr', {'filter': 'applied'});*/

                len = displayedData.length;

                //flatten the data and get the count the columns that are present in each object
                while (len--) {
                    flattenedObj = util.flattenObject(displayedData[len]);

                    for (prop in flattenedObj) {
                        if (flattenedObj.hasOwnProperty(prop) && flattenedObj[prop] !== DEFAULT_NON_EXISTING_VALUE) {

                            columnCount[prop] = columnCount[prop] || 0;
                            columnCount[prop] += 1;

                            if (columnCount[prop] > maxColumnCount) {
                                maxColumnCount = columnCount[prop];
                            }
                        }
                    }
                }

                //where columnCount[column] < maxColumnCount that column is not COMMON amongst the displayed data
                getColumnIndexInDataTable = function (colData) {
                    var colLen = aoColumns.length,
                        result = -1;

                    while (colLen--) {
                        if (aoColumns[colLen].mData === colData) {
                            result = colLen;
                            break;
                        }
                    }

                    return result;
                };

                /*get the index of the common columns*/
                for (i in columnCount) {
                    if (columnCount.hasOwnProperty(i)) {
                        if (columnCount[i] === maxColumnCount) {
                            cColumns.push(getColumnIndexInDataTable(i));
                        }
                    }
                }

                if (this._commonColumns.length === 0) {
                    len = aoColumns.length;
                    while (len--) {
                        if (this._actionButtonsInFirstColumn === false ||
                            (this._actionButtonsInFirstColumn === true && len !== 0)) {
                            this.setColumnVisibility(len, false);

                            this._enableColumnFilterCheckBox(len, false);
                            this._setCheckedColumnFilterCheckBox(len, false);
                        }
                    }
                }

                //new common columns have not been 'common' before
                diff = _.difference(cColumns, this._commonColumns);
                len = diff.length;
                while (len--) {
                    this.setColumnVisibility(diff[len], true);
                    this._setCheckedColumnFilterCheckBox(diff[len], true);

                }

                //removed common columns --> not any more common
                diff = _.difference(this._commonColumns, cColumns);
                len = diff.length;
                while (len--) {
                    this.setColumnVisibility(diff[len], false);
                    this._setCheckedColumnFilterCheckBox(diff[len], false);

                }

                this._commonColumns = cColumns;
            } else {
                //re-enable all columns that were filtered out because of not being common
                if (this._commonColumns.length !== 0) {
                    len = aoColumns.length;
                    while (len--) {
                        this.setColumnVisibility(len, true);
                        this._enableColumnFilterCheckBox(len, true);
                        this._setCheckedColumnFilterCheckBox(len, true);
                    }
                    this._commonColumns = [];
                }
            }
        }

        this._isApplyingCommonColumnFilter = false;
    };

    DataGridWidget.prototype._updateInfo = function (oSettings) {
        var iMax = oSettings.fnRecordsTotal(),
            iTotal = oSettings.fnRecordsDisplay(),
            sOut;

        if (iTotal === iMax) {
            sOut = 'Displaying ' + iTotal + ' entries';
        } else {
            /* Record set after filtering */
            sOut = 'Displaying ' + iTotal + '/' + iMax + ' entries';
        }

        this.toolbarItems.infoLabel.text(sOut);
    };

    /******* END OF --- CALCULATE ROW HEIGHT AND COLUMN WIDTHS ****************/

    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    DataGridWidget.prototype.setReadOnly = function (isReadOnly) {
        if (this._readOnly !== isReadOnly) {
            this._readOnly = isReadOnly;
            if (isReadOnly === true) {
                //if already editing rows --> cancel edit mode
                this.$el.find('.editCancel').trigger('click');
            }
        }
    };

    /************** PUBLIC API OVERRIDABLES **************************/

    DataGridWidget.prototype.onCellEdit = function (params) {
        this.logger.warn('onCellEdit is not overridden... ' + JSON.stringify(params));
    };

    DataGridWidget.prototype.onColumnsAutoDetected = function (columnDefs) {
        this.logger.warn('onColumnsAutoDetected is not overridden... ' + JSON.stringify(columnDefs));
    };

    DataGridWidget.prototype.onRowDelete = function (id, aData) {
        this.logger.warn('onRowDelete is not overridden... ID:"' + id + '"\r\naData:' + JSON.stringify(aData));
    };

    DataGridWidget.prototype.onRowEdit = function (id, oData, nData) {
        this.logger.warn('onRowEdit is not overridden... ID:"' + id + '"\r\noldData:' + JSON.stringify(oData) +
        ',\r\nnewData: ' + JSON.stringify(nData));
    };

    DataGridWidget.prototype.createColumnShowHideControl = function (columns, isColumnsGrouped,
                                                                     isActionButtonsInFirstColumn) {
        this._createColumnShowHideControlInToolBar(columns, isColumnsGrouped, isActionButtonsInFirstColumn);
    };


    DataGridWidget.prototype.onActivate = function () {
        this._displayToolbarItems();
    };

    DataGridWidget.prototype.onDeactivate = function () {
        this._hideToolbarItems();
    };

    DataGridWidget.prototype._initializeToolbar = function () {
        var toolBar = WebGMEGlobal.Toolbar,
            self = this;

        this.toolbarItems = {};

        //if and external toolbar exist for the component

        this.toolbarItems.beginSeparator = toolBar.addSeparator();


        //add FILTER box to toolbar
        this.toolbarItems.filterBox = toolBar.addTextBox({
            label: 'Filter',
            textChangedFn: function (oldVal, newVal) {
                self._filterDataTable(newVal);
            }
        });

        this.toolbarItems.infoLabel = toolBar.addLabel();

        //add DROPDOWN MENU to toolbar for column hide/show
        this.toolbarItems.ddColumnVisibility = toolBar.addDropDownButton({text: 'Columns'});

        this.toolbarItems.toggleButtonAllColumns = toolBar.addToggleButton(
            {
                text: 'Show common columns only',
                clickFn: function (data, isPressed) {
                    self.displayCommonColumnsOnly(isPressed);
                }
            }
        );


        this._toolbarInitialized = true;
    };

    DataGridWidget.prototype._displayToolbarItems = function () {
        if (this._toolbarInitialized !== true) {
            this._initializeToolbar();
        } else {
            for (var i in this.toolbarItems) {
                if (this.toolbarItems.hasOwnProperty(i)) {
                    this.toolbarItems[i].show();
                }
            }
        }
    };

    DataGridWidget.prototype._hideToolbarItems = function () {
        for (var i in this.toolbarItems) {
            if (this.toolbarItems.hasOwnProperty(i)) {
                this.toolbarItems[i].hide();
            }
        }
    };

    DataGridWidget.prototype._removeToolbarItems = function () {
        for (var i in this.toolbarItems) {
            if (this.toolbarItems.hasOwnProperty(i)) {
                this.toolbarItems[i].destroy();
            }
        }
    };

    DataGridWidget.prototype.setNoWrapColumns = function (c) {
        this._noWrapColumns = c.slice(0);
    };


    return DataGridWidget;
});