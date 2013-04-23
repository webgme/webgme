"use strict";

define([], function () {

    var DataGridViewDroppable,
        MOUSE_EVENT_POSTFIX = 'DataGridViewDroppable',
        ACCEPT_DROP_CLASS = 'accept-drop',
        NOACCEPT_DROP_CLASS = 'noaccept-drop',
        ON_HEADER_CELL = 'HEADER';

    DataGridViewDroppable = function () {

    };

    DataGridViewDroppable.prototype._attachDroppable = function (container, table) {
        var self = this;

        this._droppableTable = table;

        this._oTDAcceptDrop = false;

        table.droppable({
            over: function( event, ui ) {
                //self._onBackgroundDroppableOver(ui);
            },
            out: function( event, ui ) {
                //self._onBackgroundDroppableOut(ui);
            },
            drop: function (/*event, ui*/) {
                self._onTableDrop();
            },
            activate: function( event, ui ) {
                self._activateDroppable(ui);
            },
            deactivate: function( /*event, ui*/ ) {
                self._deactivateDroppable();
            }
        });
    };

    DataGridViewDroppable.prototype._detachDroppable = function (table) {
        table.droppable( "destroy" );
    };

    DataGridViewDroppable.prototype._activateDroppable = function (ui) {
        var self = this;

        if (this.isReadOnly() !== true && this._droppable === true) {

            this._draggedData = ui.helper.data();

            this._droppableTable.on('mousemove.' + MOUSE_EVENT_POSTFIX, 'td', function (/*event*/) {
                self._onCellMouseMove($(this));
            });
            this._droppableTable.on('mousemove.' + MOUSE_EVENT_POSTFIX, 'th', function (/*event*/) {
                self._onCellMouseMove($(this));
            });
        }
    };

    DataGridViewDroppable.prototype._deactivateDroppable = function () {
        this._droppableTable.off('mousemove.' + MOUSE_EVENT_POSTFIX);
        this._removeDroppableStyle(this._oTD);
        this._oTD = undefined;
        this._draggedData = undefined;
        this._oTDAcceptDrop = false;
    };

    DataGridViewDroppable.prototype._onCellMouseMove = function (td) {
        var cellPos;

        if (!this._oTD || (this._oTD[0] !== td[0])) {
            if (this._oTD && (this._oTD[0] !== td[0])) {
                this._removeDroppableStyle(this._oTD);
            }

            this._oTD = td;
            if (td[0].tagName === "TD" ||
                td[0].tagName === "TH") {

                if (td[0].tagName === "TD") {
                    cellPos = this._getCellPos(this._oTD);
                } else {
                    //check if it is a real column header
                    if (td.attr('role') === 'columnheader') {
                        cellPos = this._getHeaderCellPos(this._oTD);
                    } else {
                        //no drop accepted on GROUP column headers
                        cellPos = -1;
                    }
                }

                //NODE: cellPos is the visible column's position, which if fine here
                //since we only need to know if the first column (i.e. column #0) is the command button column or not
                if (cellPos > 0 ||
                    (cellPos === 0 && this._actionButtonsInFirstColumn === false)) {
                    //check if the dragged data should be accepted for drop over this cell
                    this._oTDAcceptDrop = this.onGridDroppableAccept(this._getCellDataDesc(this._oTD), this._draggedData);
                } else {
                    //no drop accepted on first column if it has the 'edit' buttons
                    this._oTDAcceptDrop = false;
                }
            } else {
                //no drop accepted on this whatever
                this._oTDAcceptDrop = false;
            }

            this._addDroppableStyle(this._oTD);
        }
    };

    DataGridViewDroppable.prototype._removeDroppableStyle = function (el) {
        if (el) {
            el.removeClass(ACCEPT_DROP_CLASS + ' ' + NOACCEPT_DROP_CLASS);
        }
    };

    DataGridViewDroppable.prototype._addDroppableStyle = function (el) {
        if (el) {
            el.addClass(this._oTDAcceptDrop === true ? ACCEPT_DROP_CLASS : NOACCEPT_DROP_CLASS);
        }
    };

    DataGridViewDroppable.prototype._getCellDataDesc = function (el) {
        var aPos,
            rIdx,
            cIdxAll,
            result = {"data": undefined,
                      "mData": undefined};

        if (el[0].tagName === "TD") {
            aPos = this._droppableTable.fnGetPosition( el[0] );
            rIdx = aPos[0];
            cIdxAll = aPos[2];
            result.data = this._extractOriginalData(this._oTable.fnGetData( rIdx ));
            result.mData = this._droppableTable.fnSettings().aoColumns[cIdxAll].mData;
        } else if (el[0].tagName === "TH") {
            //header cell
            cIdxAll = this._getHeaderCellPos(el);
            result.data = ON_HEADER_CELL;
            result.mData = this._droppableTable.fnSettings().aoColumns[cIdxAll].mData;
        }

        return result;
    };

    DataGridViewDroppable.prototype._getCellPos = function (el) {
        var tagName = el[0].tagName,
            pos = -1;

        if (tagName === "TH") {
            pos = this._getHeaderCellPos(el);
        } else if (tagName === "TD") {
            pos = this._getTableCellPos(el);
        }

        return pos;
    };

    DataGridViewDroppable.prototype._getTableCellPos = function (el) {
        var parent = el.parent(),
            result = -1,
            len;

        len = parent[0].cells.length;
        while (len--) {
            if (parent[0].cells[len] === el[0]) {
                result = len;
                break;
            }
        }

        this.logger.debug('_getTableCellPos: ' + result);
        return result;
    };

    DataGridViewDroppable.prototype._getHeaderCellPos = function (el) {
        var aoColumns = this._droppableTable.fnSettings().aoColumns,
            len = aoColumns.length,
            result = -1;

        while (len--) {
            if (aoColumns[len].nTh === el[0]) {
                result = len;
                break;
            }
        }

        this.logger.debug('_getHeaderCellPos: ' + result);
        return result;
    };


    DataGridViewDroppable.prototype._onTableDrop = function () {
        if (this._oTDAcceptDrop === true) {
            this.onGridDrop(this._getCellDataDesc(this._oTD), this._draggedData);
        }
    };


    DataGridViewDroppable.prototype.onGridDroppableAccept = function (gridCellDesc, draggedData) {
        this.logger.warning('default onGridDroppableAccept (gridCellDesc, draggedData) called... returning true');
        return true;
    };

    DataGridViewDroppable.prototype.onGridDrop = function (gridCellDesc, draggedData) {
        this.logger.warning('onGridDrop --->\ngridCellDesc: ' + JSON.stringify(gridCellDesc) + "\ndraggedData: " + JSON.stringify(draggedData));
    };

    return DataGridViewDroppable;
});