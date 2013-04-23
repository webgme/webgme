"use strict";

define(['logManager',
    'clientUtil',
    'text!./SetEditorViewTemplate.html',
    'text!./SetTemplate.html',
    'text!./SetItemTemplate.html',
    'css!SetEditorCSS/SetEditorView.css'], function (logManager,
                                                     util,
                                                     setEditorViewTemplate,
                                                     setTemplate,
                                                     setItemTemplate) {

    var SetEditorView,
        EMPTY_SET_STRING = "Empty now... Drag items here to add...";

    SetEditorView = function (containerElement) {
        this._logger = logManager.create("SetEditorView_" + containerElement);

        //Step 1: initialize object variables

        //STEP 2: initialize UI
        this._initializeUI(containerElement);
        if (this._el.length === 0) {
            this._logger.error("SetEditorView can not be created");
            throw "SetEditorView can not be created";
        }
        this._logger.debug("Created");

        return this;
    };

    SetEditorView.prototype._initializeUI = function (containerElement) {
        var self = this;

        //get container first
        this._el = $("#" + containerElement);
        if (this._el.length === 0) {
            this._logger.warning("SetEditorView's container control with id:'" + containerElement + "' could not be found");
            throw "SetEditorView's container control with id:'" + containerElement + "' could not be found";
        }

        this._el.addClass("setEditor");

        this._el.html(setEditorViewTemplate);

        this._title = this._el.find(".set-editor-title");
        this._ulSetList = this._el.find(".set-list");
        this._setListContainer = this._el.find(".set-list-container");

        this._btnRefresh = this._el.find(".btn-group > .btnRefresh");

        this._btnRefresh.on("click", function (event) {
            self.onRefresh();
            event.stopPropagation();
            event.preventDefault();
        });

        this._setListContainer.hide();
    };

    SetEditorView.prototype.clear = function () {
        this._ulSetList.empty();
        this._setListContainer.hide();
    };

    SetEditorView.prototype.setTitle = function (title) {
        this._title.text(title);
        this._title.attr("title", title);
    };

    SetEditorView.prototype.addSet = function (setDescriptor) {
        var setLi = $('<li data-id="' + setDescriptor.id + '"><a href="#">' + setDescriptor.name + '</a></li>'),
            self = this;

        setLi = $(setTemplate);
        setLi.attr("data-setid", setDescriptor.id);
        setLi.find(".set-title > .title").text(setDescriptor.name);
        setLi.find(".set-title > .counter").text("(0)");

        this._ulSetList.append(setLi);

        setLi.droppable({
            over: function (event, ui) {
                self._onDropOver(setLi, event, ui);
            },
            out: function (/*event, ui*/) {
                self._onDropOut(setLi/*, event, ui*/);
            },
            drop: function (event, ui) {
                self._onDrop(setLi, event, ui);
                event.stopPropagation();
            }
        });

        setLi.on("click", "button.close.delete", function (event) {
            var btn = $(this),
                itemId = btn.parent().parent().attr("data-id"),
                setId = btn.parent().parent().parent().parent().parent().attr("data-setid");

            btn.remove();

            self.onSetMemberRemove({"id": itemId,
                "setId": setId });

            event.preventDefault();
            event.stopPropagation();
        });

        setLi.on("click", "button.close.openclose", function (event) {
            var btn = $(this),
                setItems = btn.parent().next(),
                action = btn.attr("data-action"),
                i = btn.find("> i");

            if (action === "open") {
                setItems.show();
                btn.attr("data-action", "close");
                i.attr("class", "icon-chevron-up");
            } else {
                setItems.hide();
                btn.attr("data-action", "open");
                i.attr("class", "icon-chevron-down");
            }

            event.preventDefault();
            event.stopPropagation();
        });

        this._setListContainer.show();
    };

    SetEditorView.prototype.addSetMember = function (setId, memberDesc) {
        var setLi = this._ulSetList.find("li.set[data-setid='"+setId+"']"),
            setItems,
            setMembersUl = setLi.find(".set-members"),
            setItemLi;

        if (setLi.length > 0) {
            if (setMembersUl.length === 0) {
                //it was an empty collection

                setItems = setLi.find(".set-items");
                setItems.empty();
                setItems.removeClass('empty');
                setMembersUl = $('<ul class="set-members unstyled"></ul>');
                setItems.append(setMembersUl);
            }

            //already has a UL
            setItemLi = $(setItemTemplate);
            setItemLi.attr("data-id", memberDesc.id);
            setItemLi.find(".title").text(memberDesc.name);
            setItemLi.find(".muted").text(memberDesc.id);

            setMembersUl.append(setItemLi);

            setLi.find(".set-title > .counter").text("(" + setMembersUl.find("li").length + ")");
        }
    };

    SetEditorView.prototype.removeSetMember = function (setId, memberId) {
        var setLi = this._ulSetList.find("li.set[data-setid='"+setId+"']"),
            setMembersUl,
            setItemLi,
            counter,
            setItems;

        if (setLi.length > 0) {
            setMembersUl = setLi.find(".set-members");
            if (setMembersUl.length > 0) {
                //it was an empty collection
                setItemLi = setMembersUl.find("li[data-id='" + memberId + "']");
                setItemLi.remove();
            }

            counter =  setMembersUl.find("li").length;
            setLi.find(".set-title > .counter").text("(" + counter + ")");

            //check if the set become empty
            if (counter === 0) {
                setItems = setLi.find(".set-items");
                setItems.empty();
                setItems.addClass('empty');
                setItems.html(EMPTY_SET_STRING);
            }
        }
    };

    SetEditorView.prototype._onDropOver = function (setLi, event, ui) {
        //ui.helper contains information about the concrete dragging (ui.helper[0].GMEDragData)
        var dragParams = ui.helper[0].GMEDragData || "";

        if (this._isAcceptableDrag(dragParams)) {
            this._highlightItemArea(setLi, true);
        }
    };

    SetEditorView.prototype._onDrop = function (setLi, event, ui) {
        //ui.helper contains information about the concrete dragging (ui.helper[0].GMEDragData)
        var dragParams = ui.helper[0].GMEDragData || "";

        if (this._isAcceptableDrag(dragParams)) {

            this.onSetMemberAdd({"id": dragParams.id,
                                 "setId": setLi.attr("data-setid")});

            this._highlightItemArea(setLi, false);
        }
    };

    SetEditorView.prototype._onDropOut = function (setLi) {
        this._highlightItemArea(setLi, false);
    };

    SetEditorView.prototype._isAcceptableDrag = function (dragParams) {
        return dragParams.id;
    };

    SetEditorView.prototype._highlightItemArea = function (setLi, enabled) {
        if (enabled) {
            setLi.addClass('highlight');
        } else {
            setLi.removeClass('highlight');
        }
    };

    SetEditorView.prototype.onRefresh = function () {
        this._logger.warning("onRefresh is not overridden!!!");
    };

    SetEditorView.prototype.onSetMemberAdd = function (params) {
        this._logger.warning("onSetMemberAdd is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    SetEditorView.prototype.onSetMemberRemove = function (params) {
        this._logger.warning("onSetMemberRemove is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    SetEditorView.prototype.setReadOnly = function (isReadOnly) {
        //TODO: NOT YET IMPLEMENTED
        this._logger.warning("SetEditorView.prototype.setReadOnly NOT YET IMPLEMENTED!!!");
    };

    return SetEditorView;
});