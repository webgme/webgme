/*globals define, _*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/KeyboardManager/IKeyTarget'], function (IKeyTarget) {

    'use strict';

    var DiagramDesignerWidgetKeyboard;

    DiagramDesignerWidgetKeyboard = function () {
    };

    _.extend(DiagramDesignerWidgetKeyboard.prototype, IKeyTarget.prototype);

    DiagramDesignerWidgetKeyboard.prototype.onKeyDown = function (eventArgs) {
        var ret = true;

        switch (eventArgs.combo) {
            case 'del':
                this.onSelectionDelete(this.selectionManager.getSelectedElements());
                ret = false;
                break;
            case 'ctrl+a':
                this.selectAll();
                ret = false;
                break;
            case 'ctrl+q':
                this.selectNone();
                ret = false;
                break;
            case 'ctrl+i':
                this.selectItems();
                ret = false;
                break;
            case 'ctrl+u':
                this.selectConnections();
                ret = false;
                break;
            case 'ctrl+l':
                this.selectInvert();
                ret = false;
                break;
            case 'up':
                this._moveSelection(0, -this.gridSize);
                ret = false;
                break;
            case 'down':
                this._moveSelection(0, this.gridSize);
                ret = false;
                break;
            case 'left':
                this._moveSelection(-this.gridSize, 0);
                ret = false;
                break;
            case 'right':
                this._moveSelection(this.gridSize, 0);
                ret = false;
                break;
            case this.CONSTANTS.KEY_SHORT_CUT_MOVE_TO_TOP:
                this.onAlignSelection(this.selectionManager.getSelectedElements(), this.CONSTANTS.MOVE_TO_TOP);
                ret = false;
                break;
            case this.CONSTANTS.KEY_SHORT_CUT_MOVE_TO_BOTTOM:
                this.onAlignSelection(this.selectionManager.getSelectedElements(), this.CONSTANTS.MOVE_TO_BOTTOM);
                ret = false;
                break;
            case this.CONSTANTS.KEY_SHORT_CUT_MOVE_TO_LEFT:
                this.onAlignSelection(this.selectionManager.getSelectedElements(), this.CONSTANTS.MOVE_TO_LEFT);
                ret = false;
                break;
            case this.CONSTANTS.KEY_SHORT_CUT_MOVE_TO_RIGHT:
                this.onAlignSelection(this.selectionManager.getSelectedElements(), this.CONSTANTS.MOVE_TO_RIGHT);
                ret = false;
                break;
            default:
                break;
            /*case 'ctrl+c':
             this.onClipboardCopy(this.selectionManager.getSelectedElements());
             ret = false;
             break;
             case 'ctrl+v':
             this.onClipboardPaste();
             ret = false;
             break;*/
        }

        return ret;
    };

    DiagramDesignerWidgetKeyboard.prototype.onKeyUp = function (eventArgs) {
        var ret = true;

        switch (eventArgs.combo) {
            case 'up':
                this._endMoveSelection();
                ret = false;
                break;
            case 'down':
                this._endMoveSelection();
                ret = false;
                break;
            case 'left':
                this._endMoveSelection();
                ret = false;
                break;
            case 'right':
                this._endMoveSelection();
                ret = false;
                break;
        }

        return ret;
    };

    DiagramDesignerWidgetKeyboard.prototype._moveSelection = function (dX, dY) {
        if (!this._keyMoveDelta) {
            this._keyMoveDelta = {x: 0, y: 0};
            this.dragManager._initDrag(0, 0);
            this.dragManager._startDrag(undefined);
        }

        this._keyMoveDelta.x += dX;
        this._keyMoveDelta.y += dY;

        this.dragManager._updateDraggedItemPositions(this._keyMoveDelta.x, this._keyMoveDelta.y);
    };

    DiagramDesignerWidgetKeyboard.prototype._endMoveSelection = function () {
        if (this._keyMoveDelta) {
            // reinitialize keyMove data
            this._keyMoveDelta = undefined;

            this.dragManager._endDragAction();
        }
    };

    return DiagramDesignerWidgetKeyboard;
});
