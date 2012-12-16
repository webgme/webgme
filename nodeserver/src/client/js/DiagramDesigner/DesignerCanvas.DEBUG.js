"use strict";

define([], function () {

    var DesignerCanvasDEBUG,
        AutoUpdaterFreq = 1000;

    DesignerCanvasDEBUG = function () {
    };

    DesignerCanvasDEBUG.prototype._addDebugModeExtensions = function () {
        this.logger.warning("DesignerCanvasDEBUG _addDebugModeExtensions activated...");

        this._debugAddAutoUpdater();

        this._debugAddCreateButtons();
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

    DesignerCanvasDEBUG.prototype._debugAddCreateButtons = function () {
        var self = this;

        this.skinParts.$debugCreateButtons =  $('<div class="btn-group inline"></div>', {});

        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 1 Item, 0 connection" data-num="1_0"><i class="icon-plus-sign"></i>1/0</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 50 Item, 0 connection" data-num="50_0"><i class="icon-plus-sign"></i>50/0</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 100 Item, 0 connection" data-num="100_0"><i class="icon-plus-sign"></i>100/0</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 300 Item, 0 connection" data-num="300_0"><i class="icon-plus-sign"></i>300/0</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 500 Item, 0 connection" data-num="500_0"><i class="icon-plus-sign"></i>500/0</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 1000 Item, 0 connection" data-num="1000_0"><i class="icon-plus-sign"></i>1000/0</a>'));

        this.skinParts.$debugCreateButtons.append($('<a class="btn disabled" href="#" title="" ><i class="icon-separator"></i></a>'));

        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 0 Item, 1 connection" data-num="0_1"><i class="icon-plus-sign"></i>0/1</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 0 Item, 10 connection" data-num="0_10"><i class="icon-plus-sign"></i>0/10</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 0 Item, 50 connection" data-num="0_50"><i class="icon-plus-sign"></i>0/50</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 0 Item, 100 connection" data-num="0_100"><i class="icon-plus-sign"></i>0/100</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 0 Item, 1000 connection" data-num="0_1000"><i class="icon-plus-sign"></i>0/1000</a>'));

        this.skinParts.$debugCreateButtons.append($('<a class="btn disabled" href="#" title="" ><i class="icon-separator"></i></a>'));

        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 100 Item, 500 connection" data-num="100_500"><i class="icon-plus-sign"></i>100/500</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 300 Item, 1000 connection" data-num="300_1000"><i class="icon-plus-sign"></i>300/1000</a>'));
        this.skinParts.$debugCreateButtons.append($('<a class="btn btnCreate" href="#" title="Create 1000 Item, 10000 connection" data-num="1000_10000"><i class="icon-plus-sign"></i>1000/10000</a>'));


        this.skinParts.$designerCanvasHeader.append(this.skinParts.$debugCreateButtons );

        this.skinParts.$debugCreateButtons.on("click", ".btnCreate", function (event) {
            var data = $(this).attr("data-num"),
                itemNum = parseInt(data.split("_")[0], 10),
                connNum = parseInt(data.split("_")[1], 10);

            event.stopPropagation();
            event.preventDefault();

            self.onDebugCreateItems({"items": itemNum,
                                     "connections": connNum });
        });


        this.skinParts.$designerCanvasHeader.append(this.skinParts.$_debugAutoUpdater);
    };

    return DesignerCanvasDEBUG;
});
