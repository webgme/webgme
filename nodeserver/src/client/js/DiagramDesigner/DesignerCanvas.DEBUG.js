"use strict";

define([], function () {

    var DesignerCanvasDEBUG,
        AutoUpdaterFreq = 1000;

    DesignerCanvasDEBUG = function () {
    };

    DesignerCanvasDEBUG.prototype._addDebugModeExtensions = function () {
        var debugBtn = $('<div class="btn-group"><a class="btn btn-danger dropdown-toggle" data-toggle="dropdown" href="#">DEBUG <span class="caret"></span></a><ul class="dropdown-menu"></ul></div>');

        this.logger.warning("DesignerCanvasDEBUG _addDebugModeExtensions activated...");

        this.skinParts.$_debugBtnDropDown = debugBtn.find(".dropdown-menu");
        this.skinParts.$designerCanvasHeader.append(debugBtn);

        this._debugAddAutoUpdater();

        this._debugAddCreateButtons();

        this._debugAddUpdateButtons();

        this._debugAddDeleteButtons();
    };

    DesignerCanvasDEBUG.prototype._debugAddAutoUpdater = function () {
        var self = this,
            debugAutoUpdater;

        this._debugAddAutoUpdaterEnabled = false;

        debugAutoUpdater = $('<li><div style="display: inline-block">AutoUpdater&nbsp;<div class="toggle-switch"></div></div></li>');
        debugAutoUpdater.on("click", ".toggle-switch", function(event) {
            var btn = $(this),
                checked = false;

            if (self.itemIds.length > 0) {
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
            }

            event.stopPropagation();
            event.preventDefault();
        });

        this.skinParts.$_debugBtnDropDown.append(debugAutoUpdater);
    };

    DesignerCanvasDEBUG.prototype._debugAddAutoUpdaterTick = function () {
        var self = this,
            items = this.items,
            itemIds = this.itemIds,
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

            /*this._debugAddAutoUpdaterParams.itemCounter += 1;
            this._debugAddAutoUpdaterParams.itemCounter %= itemIds.length;
            shiftParams = this._debugAddAutoUpdaterParams.actions[this._debugAddAutoUpdaterParams.actionCounter];

            this._debugAddAutoUpdaterParams.actionCounter += 1;
            this._debugAddAutoUpdaterParams.actionCounter %= this._debugAddAutoUpdaterParams.actions.length;

            concreteItem = items[itemIds[this._debugAddAutoUpdaterParams.itemCounter]];

            newX = concreteItem.positionX + this.gridSize * 2 * shiftParams[0];
            newY = concreteItem.positionY + this.gridSize * 2 * shiftParams[1];

            newPositions[concreteItem.id] = { "x": newX, "y": newY };

            this.onReposition(newPositions);*/

            setTimeout(function () {
                self._debugAddAutoUpdaterTick();
            }, AutoUpdaterFreq);
        } else {
            delete this._debugAddAutoUpdaterParams;
        }
    };

    DesignerCanvasDEBUG.prototype._debugAddCreateButtons = function () {
        var self = this,
            debugCreateButtonSubMenu = $('<li class="dropdown-submenu"><a tabindex="-1" href="#">Create Items</a><ul class="dropdown-menu"></ul></li>'),
            debugCreateItemsButtons = debugCreateButtonSubMenu.find(".dropdown-menu") ;

        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="1_0">Create 1 Item</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="50_0">Create 50 Item</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="100_0">Create 100 Item</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="300_0">Create 300 Item</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="500_0">Create 500 Item</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="1000_0">Create 1000 Item</a></li>');

        debugCreateItemsButtons.append('<li class="divider"></li>');

        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_1">Create 1 Connection</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_50">Create 50 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_100">Create 100 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_300">Create 300 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_500">Create 500 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="0_1000">Create 1000 Connections</a></li>');

        debugCreateItemsButtons.append('<li class="divider"></li>');

        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="100_500">Create 100 Items + 500 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="300_1500">Create 300 Items + 1500 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="1000_5000">Create 1000 Items + 5000 Connections</a></li>');
        debugCreateItemsButtons.append('<li><a tabindex="-1" href="#" data-num="1000_10000">Create 1000 Items + 10000 Connections</a></li>');

        this.skinParts.$_debugBtnDropDown.append(debugCreateButtonSubMenu);

        debugCreateItemsButtons.on("click", "> li > a", function () {
            var data = $(this).attr("data-num"),
                itemNum = parseInt(data.split("_")[0], 10),
                connNum = parseInt(data.split("_")[1], 10);

            self.onDebugCreateItems({"items": itemNum,
                                     "connections": connNum });
        });
    };

    DesignerCanvasDEBUG.prototype._debugAddUpdateButtons = function () {
        var self = this,
            debugUpdateButtonSubMenu = $('<li class="dropdown-submenu"><a tabindex="-1" href="#">Update Items</a><ul class="dropdown-menu"></ul></li>'),
            debugUpdateItemsButtons = debugUpdateButtonSubMenu.find(".dropdown-menu") ;

        /* ITEM UPDATES */
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="moveitems">Reposition selected items</a></li>');
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="renameitems">Rename selected items</a></li>');
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="updateitemsdecorator">Update selected items\'s decorator</a></li>');

        debugUpdateItemsButtons.append('<li class="divider"></li>');

        /* CONNECTION UPDATES */
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="connections">Update selected connections</a></li>');
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="connectionsreconnect">Reconnect selected connections</a></li>');

        debugUpdateItemsButtons.append('<li class="divider"></li>');

        /* BOTH */
        debugUpdateItemsButtons.append('<li><a tabindex="-1" href="#" data-type="delete">Delete selected</a></li>');

        this.skinParts.$_debugBtnDropDown.append(debugUpdateButtonSubMenu);

        debugUpdateItemsButtons.on("click", "> li > a", function () {
            var data = $(this).attr("data-type");

            self.onDebugUpdateItems(data, self.selectionManager.selectedItemIdList);
        });
    };

    DesignerCanvasDEBUG.prototype._debugAddDeleteButtons = function () {
        var self = this,
            debugDeleteButtonSubMenu = $('<li class="dropdown-submenu"><a tabindex="-1" href="#">Delete Items</a><ul class="dropdown-menu"></ul></li>'),
            debugDeleteItemsButtons = debugDeleteButtonSubMenu.find(".dropdown-menu") ;

        debugDeleteItemsButtons.append('<li><a tabindex="-1" href="#" data-type="items">Delete selected items</a></li>');
        debugDeleteItemsButtons.append('<li><a tabindex="-1" href="#" data-type="connections">Delete selected connections</a></li>');
        debugDeleteItemsButtons.append('<li><a tabindex="-1" href="#" data-type="all">Delete all</a></li>');

        this.skinParts.$_debugBtnDropDown.append(debugDeleteButtonSubMenu);

        debugDeleteItemsButtons.on("click", "> li > a", function () {
            var data = $(this).attr("data-type");

            self.onDebugDeleteItems(data, self.selectionManager.selectedItemIdList);
        });
    };

    return DesignerCanvasDEBUG;
});