"use strict";

define(['js/NodePropertyNames'], function (nodePropertyNames) {

    var ModelEditorControlDEBUG;

    ModelEditorControlDEBUG = function () {
    };

    ModelEditorControlDEBUG.prototype._addDebugModeExtensions = function () {
        var self = this,
            $btnGroupAutoRename,
            $btnGroupPrintNodeData,
            $ddlCreate;

        this.logger.warning("ModelEditorControlDEBUG _addDebugModeExtensions activated...");

        /************** AUTO RENAME GME NODES *****************/
        $btnGroupAutoRename = this.designerCanvas.toolBar.addButtonGroup(function (/*event, data*/) {
            self._autoRenameGMEObjects();
        });
        this.designerCanvas.toolBar.addButton({ "title": "Auto rename",
            "icon": "icon-th-list"}, $btnGroupAutoRename);

        /************** END OF - AUTO RENAME GME NODES *****************/

        /************** AUTO CREATE NEW NODES *****************/
        $ddlCreate = this.designerCanvas.toolBar.addDropDownMenu({ "text": "Create..." });
        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 1 item",
            "icon": "icon-plus-sign",
            "text": "1 item",
            "clickFn": function (/*event, data*/) {
                self._createGMEModels(1);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 5 items",
            "icon": "icon-plus-sign",
            "text": "5 items",
            "clickFn": function (/*event, data*/) {
                self._createGMEModels(5);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 10 items",
            "icon": "icon-plus-sign",
            "text": "10 items",
            "clickFn": function (/*event, data*/) {
                self._createGMEModels(10);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 50 items",
            "icon": "icon-plus-sign",
            "text": "50 items",
            "clickFn": function (/*event, data*/) {
                self._createGMEModels(50);
            }}, $ddlCreate);

        /************** END OF - AUTO CREATE NEW NODES *****************/

        this.designerCanvas.toolBar.addMenuItemDivider($ddlCreate);

        /************** AUTO CREATE NEW CONNECTIONS *****************/
        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 1 connection",
            "icon": "icon-resize-horizontal",
            "text": "1 connection",
            "clickFn": function (/*event, data*/) {
                self._createGMEConnections(1);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 5 connections",
            "icon": "icon-resize-horizontal",
            "text": "5 connections",
            "clickFn": function (/*event, data*/) {
                self._createGMEConnections(5);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 10 connections",
            "icon": "icon-resize-horizontal",
            "text": "10 connections",
            "clickFn": function (/*event, data*/) {
                self._createGMEConnections(10);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 50 connections",
            "icon": "icon-resize-horizontal",
            "text": "50 connections",
            "clickFn": function (/*event, data*/) {
                self._createGMEConnections(50);
            }}, $ddlCreate);

        this.designerCanvas.toolBar.addButtonMenuItem({ "title": "Create 100 connections",
            "icon": "icon-resize-horizontal",
            "text": "100 connections",
            "clickFn": function (/*event, data*/) {
                self._createGMEConnections(100);
            }}, $ddlCreate);

        /************** END OF - AUTO CREATE NEW CONNECTIONS *****************/

        /************** PRINT NODE DATA *****************/
        $btnGroupPrintNodeData = this.designerCanvas.toolBar.addButtonGroup(function (/*event, data*/) {
            self._printNodeData();
        });

        this.designerCanvas.toolBar.addButton({ "title": "Print node data",
            "icon": "icon-share"}, $btnGroupPrintNodeData);


        this.designerCanvas.toolBar.addLabel().text('SLOW:');

        this.designerCanvas.toolBar.addCheckBox({ "title": "SLOW CONNECTION",
                                                  "checked": false,
            "checkChangedFn": function(data, checked){
                self.___SLOW_CONN = checked;
            }
        });

        /************** END OF - PRINT NODE DATA *****************/

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
