"use strict";

define(['logManager',
    'clientUtil',
    'text!./SetDropDownTmpl.html',
    'css!SetEditorCSS/SetEditorView.css'], function (logManager,
                                                     util,
                                                     setDropDownTmpl) {

    var SetEditorView;

    SetEditorView = function (containerElement) {
        this._logger = logManager.create("SetEditorView_" + containerElement);

        //Step 1: initialize object variables
        this._selectedSetId = null;

        //default view size

        //STEP 2: initialize UI
        this._initializeUI(containerElement);
        if (this._el.length === 0) {
            this._logger.error("SetEditorView can not be created");
            return undefined;
        }
        this._logger.debug("Created");
    };

    SetEditorView.prototype._btnTemplate = ' <span class="caret"></span>';

    SetEditorView.prototype._initializeUI = function (containerElement) {
        var self = this;

        //get container first
        this._el = $("#" + containerElement);
        if (this._el.length === 0) {
            this._logger.warning("SetEditorView's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._el.addClass("setEditor");

        this._el.html(setDropDownTmpl);

        this._btnCurrent = this._el.find(".btn-group > .btnDropDown");
        this._btnRefresh = this._el.find(".btn-group > .btnRefresh");
        this._ulDropDown = this._el.find(".btn-group > .dropdown-menu");
        this._divItems = this._el.find(".items");

        this._ulDropDown.on("click", "li", function (event) {
            var li = $(this),
                setId = li.attr("data-id"),
                setName = li.find("> a").text();

            self.selectSet({ "id": setId,
                                  "name": setName} );
        });

        this._divItems.on("click", "li > button.close", function (event) {
            var btn = $(this),
                itemId = btn.parent().attr("data-id");

            self.onSetMemberRemove({"id": itemId,
                "setId": self._selectedSetId });

            event.preventDefault();
            event.stopPropagation();

            self._refreshItemList();
        });

        this._divItems.droppable({
            over: function( event, ui ) {
                self._onDropOver(event, ui);
            },
            out: function( event, ui ) {
                self._onDropOut(event, ui);
            },
            drop: function (event, ui) {
                self._onDrop(event, ui);
                event.stopPropagation();
            }
        });

        this._btnRefresh.on("click", function (event) {
            self._refreshItemList();
            event.stopPropagation();
            event.preventDefault();
        });
    };

    SetEditorView.prototype.clear = function () {
        this._divItems.empty();
        this._divItems.hide();
        this._ulDropDown.empty();
        this._btnCurrent.html(this._btnTemplate);
        this._selectedSetId = null;
    };

    SetEditorView.prototype.selectSet = function (setDescriptor) {
        if (this._selectedSetId !== setDescriptor.id) {
            this._btnCurrent.html(setDescriptor.name + this._btnTemplate);
            this._selectedSetId = setDescriptor.id;
            this._selectedSetName = setDescriptor.name;
            this._refreshItemList();
        }
    };

    SetEditorView.prototype.addSet = function (setDescriptor) {
        var setLi = $('<li data-id="' + setDescriptor.id + '"><a href="#">' + setDescriptor.name + '</a></li>');
        this._ulDropDown.append(setLi);

        if (this._selectedSetId === null) {
            this.selectSet(setDescriptor);
        }
    };

    SetEditorView.prototype._refreshItemList = function () {
        var items = this.onGetSetMembers(this._selectedSetId),
            len = items.length;

        this._divItems.empty();
        this._divItems.show();

        this._btnCurrent.html(this._selectedSetName + ' (' + len + ')' + this._btnTemplate);

        if (len === 0) {
            this._divItems.html('Drag items here to add to the set...');
            this._divItems.addClass('empty');
        } else {
            this._divItems.removeClass('empty');
            this._divItems.html('<ul class="unstyled"></ul>');
            this._ulItems = this._divItems.find('> ul');

            while (--len >= 0) {
                this._addItemToList(items[len]);
            }
        }
    };

    SetEditorView.prototype._addItemToList = function (objDescriptor) {
        if (objDescriptor) {
            this._ulItems.append($('<li data-id="' +objDescriptor.id + '"><b>' + objDescriptor.name + '</b><button type="button" class="close">×</button><br/><span class="muted">' + objDescriptor.id + '</span></li>'));
        }
    };

    SetEditorView.prototype.onGetSetMembers = function (setId) {
        this._logger.warning("onGetSetMembers is not overridden!!! id: '" + setId + "'");
        return [];
    };

    SetEditorView.prototype._onDropOver = function (event, ui) {
        //ui.helper contains information about the concrete dragging (ui.helper[0].GMEDragData)
        var dragParams = ui.helper[0].GMEDragData || "";

        if (this._isAcceptableDrag(dragParams)) {
            this._highlightItemArea(true);
        }
    };

    SetEditorView.prototype._onDrop = function (event, ui) {
        //ui.helper contains information about the concrete dragging (ui.helper[0].GMEDragData)
        var dragParams = ui.helper[0].GMEDragData || "";

        if (this._isAcceptableDrag(dragParams)) {

            this.onSetMemberAdd({"id": dragParams.id,
                                 "setId": this._selectedSetId });

            this._highlightItemArea(false);

            this._refreshItemList();
        }
    };

    SetEditorView.prototype._onDropOut = function (event, ui) {
        this._highlightItemArea(false);
    };

    SetEditorView.prototype._isAcceptableDrag = function (dragParams) {
        return dragParams.id;
    };

    SetEditorView.prototype._highlightItemArea = function (enabled) {
        if (enabled) {
            this._divItems.addClass('highlight')
        } else {
            this._divItems.removeClass('highlight');
        }
    };

    SetEditorView.prototype.onSetMemberAdd = function (params) {
        this._logger.warning("onSetMemberAdd is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    SetEditorView.prototype.onSetMemberRemove = function (params) {
        this._logger.warning("onSetMemberRemove is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    return SetEditorView;
});