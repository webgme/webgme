/*globals define, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/DragDrop/DropTarget'], function (dropTarget) {

    'use strict';

    var DataGridWidgetDroppable,
        MOUSE_EVENT_POSTFIX = 'DataGridWidgetDroppable',
        ACCEPT_DROP_CLASS = 'accept-drop',
        NOACCEPT_DROP_CLASS = 'noaccept-drop',
        ON_HEADER_CELL = 'HEADER';

    DataGridWidgetDroppable = function () {

    };

    DataGridWidgetDroppable.prototype._attachDroppable = function (container, table) {
        var self = this;

        this._droppableTable = table;

        this._oTDAcceptDrop = false;

        dropTarget.makeDroppable(table, {
            over: function (/*event, dragInfo*/) {
                //self._onBackgroundDroppableOver(event, dragInfo);
            },
            out: function (/*event, dragInfo*/) {
                //self._onBackgroundDroppableOut(event, dragInfo);
            },
            drop: function (event, dragInfo) {
                self._onTableDrop(event, dragInfo);
            },
            activate: function (event, dragInfo) {
                self._activateDroppable(event, dragInfo);
            },
            deactivate: function (event, dragInfo) {
                self._deactivateDroppable(event, dragInfo);
            }
        });
    };

    DataGridWidgetDroppable.prototype._detachDroppable = function (table) {
        dropTarget.destroyDroppable(table);
    };

    DataGridWidgetDroppable.prototype._activateDroppable = function (event, dragInfo) {
        var self = this;

        if (this._readOnly !== true && this._droppable === true) {

            this._draggedData = dragInfo;

            this._droppableTable.on('mousemove.' + MOUSE_EVENT_POSTFIX, 'td', function (/*event*/) {
                self._onCellMouseMove($(this));
            });
            this._droppableTable.on('mousemove.' + MOUSE_EVENT_POSTFIX, 'th', function (/*event*/) {
                self._onCellMouseMove($(this));
            });
        }
    };

    DataGridWidgetDroppable.prototype._deactivateDroppable = function () {
        this._droppableTable.off('mousemove.' + MOUSE_EVENT_POSTFIX);
        this._removeDroppableStyle(this._oTD);
        this._oTD = undefined;
        this._draggedData = undefined;
        this._oTDAcceptDrop = false;
    };

    DataGridWidgetDroppable.prototype._onCellMouseMove = function (td) {
        var cellPos;

        if (!this._oTD || (this._oTD[0] !== td[0])) {
            if (this._oTD && (this._oTD[0] !== td[0])) {
                this._removeDroppableStyle(this._oTD);
            }

            this._oTD = td;
            if (td[0].tagName === 'TD' ||
                td[0].tagName === 'TH') {

                if (td[0].tagName === 'TD') {
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
                    this._oTDAcceptDrop = this.onGridDroppableAccept(this._getCellDataDesc(this._oTD),
                        this._draggedData);
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

    DataGridWidgetDroppable.prototype._removeDroppableStyle = function (el) {
        if (el) {
            el.removeClass(ACCEPT_DROP_CLASS + ' ' + NOACCEPT_DROP_CLASS);
        }
    };

    DataGridWidgetDroppable.prototype._addDroppableStyle = function (el) {
        if (el) {
            el.addClass(this._oTDAcceptDrop === true ? ACCEPT_DROP_CLASS : NOACCEPT_DROP_CLASS);
        }
    };

    DataGridWidgetDroppable.prototype._getCellDataDesc = function (el) {
        var aPos,
            rIdx,
            cIdxAll,
            result = {
                data: undefined,
                mData: undefined
            };

        if (el[0].tagName === 'TD') {
            aPos = this._droppableTable.fnGetPosition(el[0]);
            rIdx = aPos[0];
            cIdxAll = aPos[2];
            result.data = this._extractOriginalData(this._oTable.fnGetData(rIdx));
            result.mData = this._droppableTable.fnSettings().aoColumns[cIdxAll].mData;
        } else if (el[0].tagName === 'TH') {
            //header cell
            cIdxAll = this._getHeaderCellPos(el);
            result.data = ON_HEADER_CELL;
            result.mData = this._droppableTable.fnSettings().aoColumns[cIdxAll].mData;
        }

        return result;
    };

    DataGridWidgetDroppable.prototype._getCellPos = function (el) {
        var tagName = el[0].tagName,
            pos = -1;

        if (tagName === 'TH') {
            pos = this._getHeaderCellPos(el);
        } else if (tagName === 'TD') {
            pos = this._getTableCellPos(el);
        }

        return pos;
    };

    DataGridWidgetDroppable.prototype._getTableCellPos = function (el) {
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

    DataGridWidgetDroppable.prototype._getHeaderCellPos = function (el) {
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


    DataGridWidgetDroppable.prototype._onTableDrop = function () {
        if (this._oTDAcceptDrop === true) {
            this.onGridDrop(this._getCellDataDesc(this._oTD), this._draggedData);
        }
    };


    DataGridWidgetDroppable.prototype.onGridDroppableAccept = function (/*gridCellDesc, draggedData*/) {
        this.logger.warn('default onGridDroppableAccept (gridCellDesc, draggedData) called... returning true');
        return true;
    };

    DataGridWidgetDroppable.prototype.onGridDrop = function (gridCellDesc, draggedData) {
        this.logger.warn('onGridDrop --->\ngridCellDesc: ' + JSON.stringify(gridCellDesc) + '\ndraggedData: ' +
        JSON.stringify(draggedData));
    };

    return DataGridWidgetDroppable;
});