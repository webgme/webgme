/*globals define, WebGMEGlobal, _, $ */
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Controls/PropertyGrid/Widgets/WidgetBase',
    'js/Utils/DisplayFormat',
    'js/Constants',
    'js/DragDrop/DropTarget',
    'js/DragDrop/DragConstants',
    'css!./styles/PointerWidget.css'
], function (WidgetBase,
             displayFormat,
             CONSTANTS,
             dropTarget,
             DROP_CONSTANTS) {

    'use strict';

    var PointerWidget;

    PointerWidget = function (propertyDesc) {
        var self = this,
            activeNode,
            activeSelection;
        this._gmeNodeId = null;
        this.USE_ACTUAL_POINTER_NAME = false;

        WidgetBase.call(this, propertyDesc);

        activeSelection = WebGMEGlobal.State.getActiveSelection();
        activeNode = WebGMEGlobal.State.getActiveObject();
        if (activeSelection && activeSelection.length > 0) {
            if (activeSelection.length === 1) {
                this._gmeNodeId = activeSelection[0];
            }
        } else if (activeNode) {
            this._gmeNodeId = activeNode;
        }

        this._client = propertyDesc.client;

        this._div = $('<div/>', {class: 'ptr-widget'});
        this.el.append(this._div);

        this.__label = $('<span/>', {class: 'user-select-on'});
        this._div.append(this.__label);

        this.__iconAssignNullPointer = $('<i/>', {class: 'glyphicon glyphicon-minus-sign'});
        this.__iconAssignNullPointer.attr('title', 'Assign null-pointer');

        this.__iconAssignNullPointer.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self.setValue(null);
            self.fireFinishChange();
        });

        this.__label.on('click', function (e) {
            e.stopPropagation();
            e.preventDefault();

            self._followPointer();
        });

        this.__nodeDropTarget = this._div;
        this._makeDroppable();

        this.updateDisplay();
    };

    _.extend(PointerWidget.prototype, WidgetBase.prototype);

    PointerWidget.prototype._makeDroppable = function () {
        var self = this;

        if (this.propertyName === 'base' || !this._gmeNodeId) {
            return;
        }

        self._div.addClass('drop-area');
        self._div.append(this.__iconAssignNullPointer);

        dropTarget.makeDroppable(self.__nodeDropTarget, {
            over: function (event, dragInfo) {
                if (self._isValidPointerDrop(dragInfo)) {
                    self._div.addClass('accept-drop');
                } else {
                    self._div.addClass('reject-drop');
                }
            },
            out: function (/*event, dragInfo*/) {
                self._div.removeClass('accept-drop reject-drop');
            },
            drop: function (event, dragInfo) {
                if (self._isValidPointerDrop(dragInfo)) {
                    self.setValue(dragInfo[DROP_CONSTANTS.DRAG_ITEMS][0]);
                    self.fireFinishChange();
                }
                self._div.removeClass('accept-drop reject-drop');
            }
        });
    };

    PointerWidget.prototype._destroyDroppable = function () {
        if (this.propertyName === 'base' || !this._gmeNodeId) {
            return;
        }

        this._div.removeClass('drop-area');

        dropTarget.destroyDroppable(this.__nodeDropTarget);
        this.__iconAssignNullPointer.detach();
    };

    PointerWidget.prototype._isValidPointerDrop = function (dragInfo) {
        var self = this,
            result = false,
            draggedNodePath;

        if (dragInfo[DROP_CONSTANTS.DRAG_ITEMS].length === 1 && this._gmeNodeId) {
            draggedNodePath = dragInfo[DROP_CONSTANTS.DRAG_ITEMS][0];
            result = self._client.isValidTarget(this._gmeNodeId, this.propertyName, draggedNodePath);
        }

        return result;
    };

    PointerWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);
        this._destroyDroppable();
        if (this._isReadOnly !== true) {
            this._makeDroppable();
        }
    };

    PointerWidget.prototype.updateDisplay = function () {
        var ptrTo = this.propertyValue,
            self = this,
            patterns;

        this._updatePointerName();

        if (ptrTo && ptrTo !== '_nullptr') {

            this._removeTerritory();

            this._territoryId = this._client.addUI(this, function (/*events*/) {
                self._updatePointerName();
            });

            patterns = {};
            patterns[ptrTo] = {children: 0};
            this._client.updateTerritory(this._territoryId, patterns);
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    PointerWidget.prototype.destroy = function () {
        this._removeTerritory();
    };

    PointerWidget.prototype._removeTerritory = function () {
        if (this._territoryId) {
            this._client.removeUI(this._territoryId);
        }
    };

    PointerWidget.prototype._updatePointerName = function () {
        var ptrTo = this.propertyValue,
            ptrToName,
            ptrToObj;

        if (ptrTo === '_nullptr') {
            ptrToName = 'NULL';
            ptrTo = 'Null-pointer';
            this.__label.removeClass('btn btn-micro btn-follow-pointer');
        } else if (ptrTo) {
            ptrToObj = this._client.getNode(ptrTo);
            if (ptrToObj) {
                ptrToName = displayFormat.resolve(ptrToObj);
                if (ptrToName === '' || this.USE_ACTUAL_POINTER_NAME === true) {
                    ptrToName = ptrToObj.getFullyQualifiedName();
                }

                ptrTo = 'Follow Pointer: [' + ptrTo + ']';
            }
            this.__label.addClass('btn btn-micro btn-follow-pointer');
        } else {
            this.__label.removeClass('btn btn-micro btn-follow-pointer');
        }

        this.__label.text(ptrToName);
        this.__label.attr('title', ptrTo);
    };

    PointerWidget.prototype._followPointer = function () {
        var ptrTo = this.propertyValue,
            client = this._client,
            targetNodeObj;

        if (ptrTo && ptrTo !== '_nullptr') {
            targetNodeObj = client.getNode(ptrTo);
            if (targetNodeObj) {
                WebGMEGlobal.State.registerActiveObject(ptrTo);
                WebGMEGlobal.State.registerActiveSelection([]);
                // Opening the parent and setting activeSelection does not makes sense for all visualizers.
                //if (targetNodeObj.getParentId() || targetNodeObj.getParentId() === CONSTANTS.PROJECT_ROOT_ID) {
                //    WebGMEGlobal.State.registerActiveObject(targetNodeObj.getParentId());
                //    WebGMEGlobal.State.registerActiveSelection([ptrTo]);
                //} else {
                //    WebGMEGlobal.State.registerActiveObject(CONSTANTS.PROJECT_ROOT_ID);
                //    WebGMEGlobal.State.registerActiveSelection([ptrTo]);
                //}
            } else {
                // The targetNode should be loaded by the territory.
            }
        }
    };

    PointerWidget.prototype.destroy = function () {
        this._removeTerritory();
        //this._destroyDroppable();
        if (this.__iconAssignNullPointer) {
            this.__iconAssignNullPointer.off('click');
        }
        this.__label.off('click');

        WidgetBase.prototype.destroy.call(this);
    };

    return PointerWidget;

});
