"use strict";

define(['js/NodePropertyNames'], function (nodePropertyNames) {

    var ModelEditorControlDEBUG;

    ModelEditorControlDEBUG = function () {
    };

    ModelEditorControlDEBUG.prototype._addDebugModeExtensions = function () {
        var self = this,
            toolBar = WebGMEGlobal.Toolbar;

        this.logger.warning("ModelEditorControlDEBUG _addDebugModeExtensions activated...");

        this._debugToolbarItems = [];

        /************** AUTO RENAME GME NODES *****************/
        /*this.debugbtnAutoRename = toolBar.addButton(
            { "title": "Auto rename",
            "icon": "icon-th-list",
            "clickFn": function (data) {
                self._autoRenameGMEObjects();
            }}
        );

        this._debugToolbarItems.push(this.debugbtnAutoRename);*/

        /************** END OF - AUTO RENAME GME NODES *****************/

        /************** AUTO CREATE NEW NODES *****************/
        /*this.debugddlCreate = toolBar.addDropDownButton({ "text": "Create..." });
        this._debugToolbarItems.push(this.debugddlCreate);

        this.debugddlCreate.addButton({
            "title": "Create 1 item",
            "icon": "icon-plus-sign",
            "text": "1 item",
            "clickFn": function (data) {
                self._createGMEModels(1);
            }});

        this.debugddlCreate.addButton({ "title": "Create 5 items",
            "icon": "icon-plus-sign",
            "text": "5 items",
            "clickFn": function (data) {
                self._createGMEModels(5);
            }});

        this.debugddlCreate.addButton({ "title": "Create 10 items",
            "icon": "icon-plus-sign",
            "text": "10 items",
            "clickFn": function (data) {
                self._createGMEModels(10);
            }});

        this.debugddlCreate.addButton({ "title": "Create 50 items",
            "icon": "icon-plus-sign",
            "text": "50 items",
            "clickFn": function (data) {
                self._createGMEModels(50);
            }});*/

        /************** END OF - AUTO CREATE NEW NODES *****************/

        //this.debugddlCreate.addDivider();

        /************** AUTO CREATE NEW CONNECTIONS *****************/
        /*this.debugddlCreate.addButton({ "title": "Create 1 connection",
            "icon": "icon-resize-horizontal",
            "text": "1 connection",
            "clickFn": function (data) {
                self._createGMEConnections(1);
            }});

        this.debugddlCreate.addButton({ "title": "Create 5 connections",
            "icon": "icon-resize-horizontal",
            "text": "5 connections",
            "clickFn": function (data) {
                self._createGMEConnections(5);
            }});

        this.debugddlCreate.addButton({ "title": "Create 10 connections",
            "icon": "icon-resize-horizontal",
            "text": "10 connections",
            "clickFn": function (data) {
                self._createGMEConnections(10);
            }});

        this.debugddlCreate.addButton({ "title": "Create 50 connections",
            "icon": "icon-resize-horizontal",
            "text": "50 connections",
            "clickFn": function (data) {
                self._createGMEConnections(50);
            }});

        this.debugddlCreate.addButton({ "title": "Create 100 connections",
            "icon": "icon-resize-horizontal",
            "text": "100 connections",
            "clickFn": function (data) {
                self._createGMEConnections(100);
            }});*/

        /************** END OF - AUTO CREATE NEW CONNECTIONS *****************/

        /************** PRINT NODE DATA *****************/

        this.debugbtnPrintNodeData = toolBar.addButton({ "title": "Print node data",
            "icon": "icon-share",
            "clickFn": function (/*data*/){
                self._printNodeData();
            }});
        this._debugToolbarItems.push(this.debugbtnPrintNodeData);
        /************** END OF - PRINT NODE DATA *****************/

    };

    ModelEditorControlDEBUG.prototype._showDebugModeExtensions = function () {
        for (var i = 0; i < this._debugToolbarItems.length; i++) {
            this._debugToolbarItems[i].show();
        }
    };

    ModelEditorControlDEBUG.prototype._hideDebugModeExtensions = function () {
        for (var i = 0; i < this._debugToolbarItems.length; i++) {
            this._debugToolbarItems[i].hide();
        }
    };

    ModelEditorControlDEBUG.prototype._removeDebugModeExtensions = function () {
        for (var i = 0; i < this._debugToolbarItems.length; i++) {
            this._debugToolbarItems[i].destroy();
        }
    };

    ModelEditorControlDEBUG.prototype._autoRenameGMEObjects = function () {
        var i = this._GMEModels.length,
            counter = i,
            prefix = "MODEL_";

        this._client.startTransaction();
        while (i--) {
            this._client.setAttributes(this._GMEModels[i], nodePropertyNames.Attributes.name, prefix + (counter - i));
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDEBUG.prototype._createGMEModels = function (num) {
        var counter = this._GMEModels.length,
            prefix = "MODEL_",
            newID,
            newNode;

        this._client.startTransaction();

        while (num--) {
            newID = this._client.createChild({ "parentId": this.currentNodeInfo.id});

            if (newID) {
                newNode = this._client.getNode(newID);

                if (newNode) {
                    this._client.setAttributes(newID, nodePropertyNames.Attributes.name, prefix + counter);
                    this._client.setRegistry(newID, nodePropertyNames.Registry.decorator, "");
                    this._client.setRegistry(newID, nodePropertyNames.Registry.isPort, true);
                }
            }

            counter += 1;
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDEBUG.prototype._createGMEConnections = function (num) {
        var counter = this._GMEConnections.length,
            allGMEID = [],
            i,
            sourceId,
            targetId,
            connDesc;

        for (i in this._GmeID2ComponentID) {
            if (this._GmeID2ComponentID.hasOwnProperty(i)) {
                if (this._GMEModels.indexOf(i) !== -1) {
                    allGMEID.pushUnique(i);
                }
            }
        }

        for (i in this._GMEID2Subcomponent) {
            if (this._GMEID2Subcomponent.hasOwnProperty(i)) {
                allGMEID.pushUnique(i);
            }
        }

        i = allGMEID.length;

        this._client.startTransaction();

        while (num--) {
            targetId = sourceId = Math.floor((Math.random()*( i / 2 )));
            while (targetId === sourceId) {
                targetId = Math.floor((Math.random()*(i / 2 ) + (i / 2)));
            }

            var registry = {};
            registry[nodePropertyNames.Registry.lineStyle] = {};
            _.extend(registry[nodePropertyNames.Registry.lineStyle], this._DEFAULT_LINE_STYLE);

            connDesc = {   "parentId": this.currentNodeInfo.id,
                "sourceId": allGMEID[sourceId],
                "targetId": allGMEID[targetId],
                "registry": registry };

            this._client.makeConnection(connDesc);

            counter += 1;
        }
        this._client.completeTransaction();
    };

    ModelEditorControlDEBUG.prototype._printNodeData = function () {
        var idList = this.designerCanvas.selectionManager.getSelectedElements(),
            len = idList.length,
            node;

        while (len--) {
            node = this._client.getNode(this._ComponentID2GmeID[idList[len]]);

            if (node) {
                node.printData();
            }
        }
    };

    return ModelEditorControlDEBUG;
});
