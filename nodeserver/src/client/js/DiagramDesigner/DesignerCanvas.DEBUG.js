"use strict";

define([], function () {

    var DesignerCanvasDEBUG,
        AutoUpdaterFreq = 100;

    DesignerCanvasDEBUG = function () {
    };

    DesignerCanvasDEBUG.prototype._addDebugModeExtensions = function () {
        this.logger.warning("DesignerCanvasDEBUG _addDebugModeExtensions activated...");

        this._debugAddAutoUpdater();
    };

    DesignerCanvasDEBUG.prototype._debugAddAutoUpdater = function () {
        var self = this;

        this._debugAddAutoUpdaterEnabled = false;

        this.skinParts.$_debugAutoUpdater = $('<div style="display: inline-block">AutoUpdater&nbsp;<div class="toggle-switch"></div></div>');
        this.skinParts.$_debugAutoUpdater.on("click", ".toggle-switch", function(event) {
            var btn = $(this),
                checked = false;

            btn.toggleClass('on');
            checked = btn.hasClass('on');
            self._debugAddAutoUpdaterEnabled = checked;

            if (checked) {
                setTimeout(function () {
                    self._debugAddAutoUpdaterTick();
                }, AutoUpdaterFreq);
                self.logger.warning('$DEBUG_AutoUpdater switched on.');
            } else {
                self.logger.warning('$DEBUG_AutoUpdater switched off.');
            }
        });

        this.skinParts.$designerCanvasHeader.append(this.skinParts.$_debugAutoUpdater);
    };

    DesignerCanvasDEBUG.prototype._debugAddAutoUpdaterTick = function () {
        var self = this,
            items = this.items,
            itemIds = this.itemIds,
            connectionIds = this.connectionIds,
            shiftParams,
            newX,
            newY,
            concreteItem,
            newPositions = {};

        if (this._debugAddAutoUpdaterEnabled ) {
            this.logger.warning('_debugAddAutoUpdaterTick...');

            this._debugAddAutoUpdaterParams = this._debugAddAutoUpdaterParams || { "itemCounter": 0,
                                                                                   "actionCounter": 0,
                                                                                   actions: [[1,1], [-1,1], [-1,-1], [1,-1]] };

            this._debugAddAutoUpdaterParams.itemCounter += 1;
            this._debugAddAutoUpdaterParams.itemCounter %= itemIds.length;
            shiftParams = this._debugAddAutoUpdaterParams.actions[this._debugAddAutoUpdaterParams.actionCounter];

            this._debugAddAutoUpdaterParams.actionCounter += 1;
            this._debugAddAutoUpdaterParams.actionCounter %= this._debugAddAutoUpdaterParams.actions.length;

            concreteItem = items[itemIds[this._debugAddAutoUpdaterParams.itemCounter]];

            newX = concreteItem.positionX + this.gridSize * 2 * shiftParams[0];
            newY = concreteItem.positionY + this.gridSize * 2 * shiftParams[1];

            newPositions[concreteItem.id] = { "x": newX, "y": newY };

            this.onReposition(newPositions);

            setTimeout(function () {
                self._debugAddAutoUpdaterTick();
            }, AutoUpdaterFreq);
        } else {
            delete this._debugAddAutoUpdaterParams;
        }
    };

    return DesignerCanvasDEBUG;
});
