"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'text!./SetEditorViewTemplate.html',
    'text!./SetTemplate.html',
    'text!./SetItemTemplate.html',
    './SetEditorPanelControl',
    'js/Constants',
    'css!/css/Panels/SetEditor/SetEditorPanel'], function (PanelBaseWithHeader,
                                                   setEditorViewTemplate,
                                                   setTemplate,
                                                   setItemTemplate,
                                                   SetEditorPanelControl,
                                                   CONSTANTS) {

    var SetEditorPanel,
        __parent__ = PanelBaseWithHeader,
        EMPTY_SET_STRING = "Empty now... Drag items here to add...";

    SetEditorPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "SetEditorPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        var setEditorControl = new SetEditorPanelControl(this._client, this);
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            setEditorControl.selectedObjectChanged(nodeId);
        });

        this.logger.debug("SetEditorPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(SetEditorPanel.prototype, __parent__.prototype);

    SetEditorPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("Set Editor");

        this.$el.addClass("setEditor");

        this.$el.html(setEditorViewTemplate);

        this._title = this.$el.find(".set-editor-title");
        this._ulSetList = this.$el.find(".set-list");
        this._setListContainer = this.$el.find(".set-list-container");

        this._btnRefresh = this.$el.find(".btn-group > .btnRefresh");

        this._btnRefresh.on("click", function (event) {
            self.onRefresh();
            event.stopPropagation();
            event.preventDefault();
        });

        this._setListContainer.hide();
    };

    SetEditorPanel.prototype.clear = function () {
        this._ulSetList.empty();
        this._setListContainer.hide();
    };

    SetEditorPanel.prototype.setModelTitle = function (title) {
        this._title.text(title);
    };

    SetEditorPanel.prototype.addSet = function (setDescriptor) {
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

    SetEditorPanel.prototype.addSetMember = function (setId, memberDesc) {
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

    SetEditorPanel.prototype.removeSetMember = function (setId, memberId) {
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

    SetEditorPanel.prototype._onDropOver = function (setLi, event, ui) {
        //ui.helper contains information about the dragging
        var dragParams = ui.helper.data(CONSTANTS.META_INFO);

        if (this._isAcceptableDrag(dragParams)) {
            this._highlightItemArea(setLi, true);
        }
    };

    SetEditorPanel.prototype._onDrop = function (setLi, event, ui) {
        //ui.helper contains information about the dragging
        var dragParams = ui.helper.data(CONSTANTS.META_INFO);

        if (this._isAcceptableDrag(dragParams)) {

            this.onSetMemberAdd({"id": dragParams[CONSTANTS.GME_ID],
                "setId": setLi.attr("data-setid")});

            this._highlightItemArea(setLi, false);
        }
    };

    SetEditorPanel.prototype._onDropOut = function (setLi) {
        this._highlightItemArea(setLi, false);
    };

    SetEditorPanel.prototype._isAcceptableDrag = function (dragParams) {
        return dragParams.hasOwnProperty(CONSTANTS.GME_ID);
    };

    SetEditorPanel.prototype._highlightItemArea = function (setLi, enabled) {
        if (enabled) {
            setLi.addClass('highlight');
        } else {
            setLi.removeClass('highlight');
        }
    };

    SetEditorPanel.prototype.onRefresh = function () {
        this.logger.warning("onRefresh is not overridden!!!");
    };

    SetEditorPanel.prototype.onSetMemberAdd = function (params) {
        this.logger.warning("onSetMemberAdd is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    SetEditorPanel.prototype.onSetMemberRemove = function (params) {
        this.logger.warning("onSetMemberRemove is not overridden!!! params: '" + JSON.stringify(params) + "'");
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    SetEditorPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        //TODO: NOT YET IMPLEMENTED
        this.logger.warning("SetEditorView.prototype.setReadOnly NOT YET IMPLEMENTED!!!");
    };

    return SetEditorPanel;
});
