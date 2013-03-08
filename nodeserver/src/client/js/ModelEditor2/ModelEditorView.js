"use strict";

define(['logManager',
    'clientUtil',
    'commonUtil',
    'js/Constants',
    'raphaeljs',
    'notificationManager',
    './ModelComponent.js',
    './ConnectionComponent.js',
    './ConnectionPointManager.js',
    'js/PropertyEditor/PropertyListView',
    'css!ModelEditor2CSS/ModelEditorView'], function (logManager,
                                                        util,
                                                        commonUtil,
                                                        CONSTANTS,
                                                        raphaeljs,
                                                        notificationManager,
                                                        ModelComponent,
                                                        ConnectionComponent,
                                                        ConnectionPointManager,
                                                        PropertyListView) {

    var ModelEditorView,
        CONTAINMENT_TYPE_LINE_END = "diamond-wide-long",
        INHERITANCE_TYPE_LINE_END = "block-wide-long";

    ModelEditorView = function (params) {
        this._logger = logManager.create("ModelEditorView_" + params.containerElement.attr("id"));

        this._connectionPointManager = new ConnectionPointManager();

        //Step 1: initialize object variables

        //default view size
        this._defaultSize = { "w": 10, "h": 10 };

        this._actualSize = { "w": 0, "h": 0 };

        this._dragModes = {"copy": 0,
            "reposition": 1};

        this._gridSize = 10;

        this._name = null;

        this._connectionInDraw = { "strokeWidth" : 2,
            "strokeColor" : "#FF7800",
            "lineType": "-" };

        //initialize all the required collections with empty value
        this._initializeCollections();

        //STEP 2: initialize UI
        this._initializeUI(params.containerElement);
        this._logger.debug("Created");
    };

    /****************** PUBLIC FUNCTIONS ***********************************/

        //Called when the browser window is resized
    ModelEditorView.prototype.parentContainerSizeChanged = function (nW, nH) {
        this._defaultSize = { "w": nW,
            "h": nH };

        if (this._actualSize.w < this._defaultSize.w || this._actualSize.h < this._defaultSize.h) {
            this._actualSize = {"w": this._defaultSize.w,
                "h": this._defaultSize.h};

            this._skinParts.childrenContainer.css({"width": this._actualSize.w,
                "height": this._actualSize.h});

            this._el.css({"width": this._actualSize.w});

            this._skinParts.svgPaper.setSize(this._actualSize.w, this._actualSize.h);
            this._skinParts.svgPaper.setViewBox(0, 0, this._actualSize.w, this._actualSize.h, false);
        }
    };

    ModelEditorView.prototype.clear = function () {
        var i;

        this._hideSelectionOutline();

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                this.deleteComponent(i);
            }
        }

        //initialize all the required collections with empty value
        this._initializeCollections();
    };

    ModelEditorView.prototype.updateCanvas = function (desc) {
        //apply content to controls based on desc
        if (this._name !== desc.name) {
            this._name = desc.name;
            this._skinParts.title.text(desc.name);
        }

        if (desc.parentId) {
            this._skinParts.btnGotoParent.show();
        } else {
            this._skinParts.btnGotoParent.hide();
            this._skinParts.btnGotoParent.hide();
        }
    };

    ModelEditorView.prototype.startLongUpdate = function () {
        this._longUpdating = true;
        this._longUpdateQueue = [];
        this._longUpdateList = { "insertedModels": [],
                                 "updatedModels": [],
                                 "deletedModels": [],
                                 "insertedConnections": [],
                                 "updatedConnections": [],
                                 "deletedConnections": [] };

        //this._skinParts.childrenContainer.remove();

        this._newDOMElements = [];
    };

    ModelEditorView.prototype.finishLongUpdate = function () {
        if (this._longUpdating === true) {

            this._longUpdating = false;

            this._refreshScreen();
        }
    };

    /*************** MODEL CREATE / UPDATE / DELETE ***********************/

    ModelEditorView.prototype.createModelComponent = function (objDescriptor) {
        var componentId = objDescriptor.id,
            newComponent,
            alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

        this._logger.debug("Creating model component with parameters: " + objDescriptor);

        objDescriptor.modelEditorView = this;
        objDescriptor.position.x = alignedPosition.x;
        objDescriptor.position.y = alignedPosition.y;

        this._checkPositionOverlap(objDescriptor);

        objDescriptor.client = this._client;

        this._longUpdateQueue.push(componentId);
        this._longUpdateList.insertedModels.push(componentId);
        this._modelComponents.push(componentId);

        newComponent = this._childComponents[componentId] = new ModelComponent(objDescriptor.id);
        newComponent._initialize(objDescriptor);

        return newComponent;
    };

    ModelEditorView.prototype.modelInitializationCompleted = function (componentId) {
        var self = this;

        //hook up reposition handler
        this._childComponents[componentId].el.css("cursor", "move");

        this._childComponents[componentId].el.draggable({
            zIndex: 100000,
            grid: [self._gridSize, self._gridSize],
            helper: function (event) {
                return self._onDraggableHelper(event);
            },
            start: function (event, ui) {
                return self._onDraggableStart(event, ui.helper, componentId);
            },
            stop: function (event, ui) {
                return self._onDraggableStop(event, ui.helper);
            },
            drag: function (event, ui) {
                return self._onDraggableDrag(event, ui.helper);
            }
        });

        this._displayedComponentIDs[componentId] = componentId;

        this._newDOMElements.push(this._childComponents[componentId].el);

        this._componentUpdated(componentId);
    };

    ModelEditorView.prototype.modelUpdated = function (componentId) {

        this._componentUpdated(componentId);
    };

    ModelEditorView.prototype.updateModelComponent = function (componentId, objDescriptor) {
        var alignedPosition;

        if (this._modelComponents.indexOf(componentId) !== -1) {
            this._logger.debug("Updating model component with parameters: " + objDescriptor);
            //if (this._connectionInDraw && this._connectionInDraw.source === componentId) {
                //manually trigger drag-end
              //  this._cancelDrag(componentId);
            //}

            if (this._childComponents[componentId].el) {
                this._childComponents[componentId].el.removeClass("connection-end-state-hover");
            }


            if (this._dragOptions && this._dragOptions.mode === this._dragModes.reposition && this._selectedComponentIds.indexOf(componentId) !== -1) {
                //if we are currently dragging this guy, don't update its position
            } else {
                //otherwise reposition it
                alignedPosition = this._alignPositionToGrid(objDescriptor.position.x, objDescriptor.position.y);

                objDescriptor.position.x = alignedPosition.x;
                objDescriptor.position.y = alignedPosition.y;

                this._checkPositionOverlap(objDescriptor);

                //set new position
                this._childComponents[componentId].position = {"x": objDescriptor.position.x,
                    "y": objDescriptor.position.y};

                this._childComponents[componentId].el.css({ "left": objDescriptor.position.x,
                    "top": objDescriptor.position.y });
            }

            this._longUpdateQueue.push(componentId);
            this._longUpdateList.updatedModels.push(componentId);

            this._childComponents[componentId].update(objDescriptor);
        }
    };

    ModelEditorView.prototype._deleteModelComponent = function (componentId) {
        var idx = this._modelComponents.indexOf(componentId);


        this._modelComponents.splice(idx, 1);


        //this._longUpdateQueue.push(componentId);
        this._longUpdateList.deletedModels.push(componentId);

        this._childComponents[componentId].destroy();

        //get rid of the deleted models
        this._childComponents[componentId].el.remove();
        this._childComponents[componentId].el.empty();


        delete this._childComponents[componentId];
    };

    /*************** END OF --- MODEL CREATE / UPDATE / DELETE ***********************/

    ModelEditorView.prototype.deleteComponent = function (componentId) {
        //if there is dragging and the item-to-be-deleted is part of the current selection
        if (this._dragOptions && this._selectedComponentIds.indexOf(componentId) !== -1) {
            this._dragOptions.revert = true;
            this._dragOptions.revertCallback = { "fn": this.deleteComponent,
                "arg": componentId };
            //manually trigger drag-end
            $('.ui-draggable-dragging').trigger('mouseup');
        } else {
            if (this._connectionInDraw && this._connectionInDraw.source === componentId) {
                //manually trigger drag-end
                this._cancelDrag(componentId);
            }

            //remove it from the selection (if in there)
            if (this._selectedComponentIds.indexOf(componentId) !== -1) {
                this._deselect(componentId, true);
                this._refreshSelectionOutline();
            }

            if (this._modelComponents.indexOf(componentId) !== -1) {
                this._deleteModelComponent(componentId);
            } else if (this._connectionComponents.indexOf(componentId) !== -1) {
                this._deleteConnectionComponent(componentId);
            }
        }
    };

    ModelEditorView.prototype._cancelDrag = function (dataId) {
        $('.connection-source[data-id="' + dataId + '"]').removeClass("connection-source");
        $('.connection-end-state-hover').removeClass("connection-end-state-hover");
        $('.ui-draggable-dragging').trigger('mouseup');
    };



    /*************** CONNECTION CREATE / UPDATE / DELETE ***********************/

    ModelEditorView.prototype.createConnectionComponent = function (objDescriptor) {
        var componentId = objDescriptor.id,
            newComponent;

        this._logger.debug("Creating connection component with parameters: " + objDescriptor);

        objDescriptor.modelEditorView = this;
        objDescriptor.svgPaper = this._skinParts.svgPaper;

        if (objDescriptor.connectionType === "inheritance") {
            objDescriptor.arrowStart = INHERITANCE_TYPE_LINE_END;
            objDescriptor.endPointReconnectable = false;
        } else if (objDescriptor.connectionType === "containment") {
            objDescriptor.arrowStart = CONTAINMENT_TYPE_LINE_END;
            objDescriptor.endPointReconnectable = false;
        }

        this._longUpdateQueue.push(componentId);
        this._longUpdateList.insertedConnections.push(componentId);
        this._connectionComponents.push(componentId);

        newComponent = this._childComponents[componentId] = new ConnectionComponent(objDescriptor.id);
        newComponent._initialize(objDescriptor);

        return newComponent;
    };

    ModelEditorView.prototype.connectionInitializationCompleted = function (componentId) {
        this._displayedComponentIDs[componentId] = componentId;

        //this._skinParts.childrenContainer.append(this._childComponents[componentId].el);
        this._newDOMElements.push(this._childComponents[componentId].el);

        this._componentUpdated(componentId);
    };

    ModelEditorView.prototype.updateConnectionComponent = function (componentId, objDescriptor) {
        if (this._connectionComponents.indexOf(componentId) !== -1) {
            /*if (this._connectionInDraw && this._connectionInDraw.source === componentId) {
             //manually trigger drag-end
             this._cancelDrag(componentId);
             }*/

            /*if (this._childComponents[componentId].el) {
             this._childComponents[componentId].el.removeClass("connection-end-state-hover");
             }*/

            this._longUpdateQueue.push(componentId);
            this._longUpdateList.updatedConnections.push(componentId);

            this._childComponents[componentId].update(objDescriptor);



             //this._refreshSelectionOutline();
        }
    };

    ModelEditorView.prototype._deleteConnectionComponent = function (componentId) {
        var idx = this._connectionComponents.indexOf(componentId),
            affectedIdx = this._longUpdateList.affectedConnections ? this._longUpdateList.affectedConnections.indexOf(componentId) : -1;

        this._connectionComponents.splice(idx, 1);

        if (affectedIdx > -1) {
            this._longUpdateList.affectedConnections.splice(affectedIdx, 1);
        }

        this._connectionPointManager.unregisterConnection(componentId);

        //this._longUpdateQueue.push(componentId);
        this._longUpdateList.deletedConnections.push(componentId);

        this._childComponents[componentId].destroy();

        //get rid of the deleted models
        this._childComponents[componentId].el.remove();
        this._childComponents[componentId].el.empty();

        delete this._childComponents[componentId];
    };

    /*************** END OF --- MODEL CREATE / UPDATE / DELETE ***********************/




    /*
     * SUBCOMPONENTS REGISTERED BY THE DECORATORS
     */
    ModelEditorView.prototype.registerSubcomponents = function (list) {
        var i;

        this._longUpdateList.affectedConnections = this._longUpdateList.affectedConnections || [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                this._displayedComponentIDs[i] = list[i];
                this._longUpdateList.affectedConnections.mergeUnique(this._getConnectionsForModel(i));
            }
        }
    };

    ModelEditorView.prototype.unregisterSubcomponents = function (list) {
        var i;

        this._longUpdateList.affectedConnections = this._longUpdateList.affectedConnections || [];

        for (i in list) {
            if (list.hasOwnProperty(i)) {
                if (this._displayedComponentIDs.hasOwnProperty(i)) {
                    this._longUpdateList.affectedConnections.mergeUnique(this._getConnectionsForModel(i));
                    delete this._displayedComponentIDs[i];
                }
            }
        }
    };
    /*
     * END OF - SUBCOMPONENTS REGISTERED BY THE DECORATORS
     */








    /****************** END OF - PUBLIC FUNCTIONS ***********************************/

    ModelEditorView.prototype._componentUpdated = function (componentId) {
        var cIndexInQueue =  this._longUpdateQueue.indexOf(componentId);

        if (cIndexInQueue === -1) {
            //we did not expect this component to be updated
            //update is coming from the Decorator (decorator territory update)
            //this._logger.warning("unexpected update from: " + componentId);
            this._refreshScreen();
        } else {
            this._longUpdateQueue.splice(cIndexInQueue, 1);
            this._refreshScreen();
        }
    };

    ModelEditorView.prototype._refreshScreen = function () {
        var connectionsToUpdate = [];

        if (this._longUpdating === true) {
            return;
        }

        if (this._longUpdateQueue) {
            if (this._longUpdateQueue.length > 0) {
                this._logger.debug("RefreshScreen is still waiting for " + this._longUpdateQueue.length + " pending components...");
                return;
            }
        }

        this._logger.debug("RefreshScreen is refreshing now...");

        //we have to refresh now

        //finally put back the container into the DOM
        //because we need rendering for correct object position and dimension info
        this._skinParts.childrenContainer.append(this._newDOMElements);
        delete this._newDOMElements;
        //this._skinParts.childrenContainer.appendTo(this._el);

        this._adjustChildrenContainerSize();

        //find out what connections have to be updated
        // - #1) connections in the this._longUpdateList.insertedConnections
        // - #2) connections in the this._longUpdateList.updatedConnections
        // - #3) connections affected by modelComponent update / delete
        //TODO: might not needed because the endpoint handling takes care of accounting all the affected connections
        // - #4) connections with endpoint in this._longUpdateList.insertedModels
        // - #5) connections with endpoint in this._longUpdateList.updatedModels
        // - #6) connections with endpoint in this._longUpdateList.deletedModels

        // #1)
        connectionsToUpdate.mergeUnique(this._longUpdateList.insertedConnections);

        // #2)
        connectionsToUpdate.mergeUnique(this._longUpdateList.updatedConnections);

        // #3)
        connectionsToUpdate.mergeUnique(this._longUpdateList.affectedConnections);

        // #4
        /*for (i = 0; i < this._longUpdateList.insertedModels.length; i += 1) {
            connectionsToUpdate.mergeUnique(this._getConnectionsForModel(this._longUpdateList.insertedModels[i]));
        }*/

        // #5
        /*for (i = 0; i < this._longUpdateList.updatedModels.length; i += 1) {
            connectionsToUpdate.mergeUnique(this._getConnectionsForModel(this._longUpdateList.updatedModels[i]));
        }*/

        // #6
        /*for (i = 0; i < this._longUpdateList.deletedModels.length; i += 1) {
            connectionsToUpdate.mergeUnique(this._getConnectionsForModel(this._longUpdateList.deletedModels[i]));
        }*/

        //at this point we have all the connections that needs to be updated in 'connectionsToUpdate'
        //$(this._skinParts.svgPaper.canvas).remove();

        this._logger.debug("Redrawing affected connections");

        this._updateConnections(connectionsToUpdate);

        this._logger.debug("Redrawing affected connections - DONE");

        //$(this._skinParts.svgPaper.canvas).insertBefore(this._skinParts.childrenContainer.children().first());

        this._longUpdateList.affectedConnections = [];

        this._refreshSelectionOutline();

        if (this._connectionInDraw.lastPosition) {
            this._drawConnectionTo({"x": this._connectionInDraw.lastPosition.x, "y": this._connectionInDraw.lastPosition.y});
        }
    };

    ModelEditorView.prototype._getConnectionsForModel = function (componentId) {
        var connectionEndPointIds = [componentId],
            i,
            connections = [];

        for (i in this._displayedComponentIDs) {
            if (this._displayedComponentIDs.hasOwnProperty(i)) {
                if (this._displayedComponentIDs[i] === componentId) {
                    connectionEndPointIds.insertUnique(i);
                }
            }
        }

        for (i in this._connectionComponents) {
            if (this._connectionComponents.hasOwnProperty(i)) {
                if (connections.indexOf(i) === -1) {
                    if (connectionEndPointIds.indexOf(this._childComponents[this._connectionComponents[i]]._sourceComponentId) > -1 ||
                            connectionEndPointIds.indexOf(this._childComponents[this._connectionComponents[i]]._targetComponentId) > -1) {
                        connections.push(this._connectionComponents[i]);
                    }
                }
            }
        }

        return connections;
    };

    ModelEditorView.prototype._adjustChildrenContainerSize = function () {
        var i,
            cW = 0,
            cH = 0,
            componentBBox,
            safeMargin = 100;
            //elParent;

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                componentBBox = this._childComponents[i].getBoundingBox();

                if (componentBBox) {
                    if (componentBBox.x2) {
                        if (cW < componentBBox.x2) {
                            cW = componentBBox.x2;
                        }
                    }

                    if (componentBBox.y2) {
                        if (cH < componentBBox.y2) {
                            cH = componentBBox.y2;
                        }
                    }
                }
            }
        }

        //add safe margin
        cW += safeMargin;
        cH += safeMargin;

        if ((cW !== this._actualSize.w) || (cH !== this._actualSize.h)) {
            if (cW < this._defaultSize.w) {
                cW = this._defaultSize.w;
            }
            if (cH < this._defaultSize.h) {
                cH = this._defaultSize.h;
            }
            this._actualSize = {"w": cW,
                                "h": cH};

            /*elParent = this._el.parent();

            this._el.remove();*/

            this._skinParts.childrenContainer.css({"width": this._actualSize.w,
                "height": this._actualSize.h});

            this._el.css({"width": this._actualSize.w});

            this._skinParts.svgPaper.setSize(this._actualSize.w, this._actualSize.h);
            this._skinParts.svgPaper.setViewBox(0, 0, this._actualSize.w, this._actualSize.h, false);

            //this._el.appendTo(elParent);
        }
    };



    /****************** PRIVATE FUNCTIONS ***********************************/

    ModelEditorView.prototype._initializeCollections = function () {
        this._childComponents = {};

        this._modelComponents = [];
        this._connectionComponents = [];

        this._selectedComponentIds = [];

        this._displayedComponentIDs = {};

        this._connectionPointManager.clear();

        this._longUpdating = false;

        this._connectionType = "connection";
    };

    ModelEditorView.prototype._initializeUI = function (containerElement) {
        var self = this;

        //get container first
        this._el = containerElement;
        if (this._el.length === 0) {
            this._logger.warning("ModelEditorView's container does not exist");
            throw("ModelEditorView's container does not exist");
        }

        this._defaultSize = { "w": parseInt(this._el.parent().css("width"), 10),
                              "h": parseInt(this._el.parent().css("height"), 10) };

        this._el.addClass("modelEditorView");

        //TITLE bar
        this._skinParts = {};
        this._skinParts.modelEditorTop = $('<div/>', {
            "class" : "modelEditorTop"
        });
        this._el.append(this._skinParts.modelEditorTop);


        this._skinParts.title = $('<div/>', {
            "class" : "modelEditorViewTitle"
        });
        this._skinParts.modelEditorTop.append(this._skinParts.title);

        this._skinParts.layoutBtn = $('<div class="btn-group inline"><a class="btn btnAutoLayout" href="#" title="Auto layout"><i class="icon-th"></i></a></div>', {});
        this._skinParts.modelEditorTop.append(this._skinParts.layoutBtn);

        this._skinParts.layoutBtn.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._autoLayoutModels();
        });

        this._skinParts.renameBtn = $('<div class="btn-group inline"><a class="btn btnAutoRename" href="#" title="Auto rename"><i class="icon-th-list"></i></a></div>', {});
        this._skinParts.modelEditorTop.append(this._skinParts.renameBtn);

        this._skinParts.renameBtn.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._autoRenameComponents();
        });

        this._skinParts.modelEditorTop.append($('<div class="btn-group inline"><a class="btn btnCreateModel" href="#" title="Create" data-num="1"><i class="icon-plus-sign"></i></a><a class="btn btnCreateModel" href="#" title="Create 5x" data-num="5">5<i class="icon-plus-sign"></i></a><a class="btn btnCreateModel" href="#" title="Create 10x" data-num="10">10<i class="icon-plus-sign"></i></a><a class="btn btnCreateModel" href="#" title="Create 25x" data-num="25">25<i class="icon-plus-sign"></i></a><a class="btn btnCreateModel" href="#" title="Create 50x" data-num="50">50<i class="icon-plus-sign"></i></a><a class="btn btnCreateModel" href="#" title="Create 100x" data-num="100">100<i class="icon-plus-sign"></i></a></div>', {}));

        this._skinParts.modelEditorTop.find('.btnCreateModel').on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._createModel(parseInt($(this).attr("data-num"), 10));
        });

        this._skinParts.btnGotoParent = $('<div class="btn-group inline"><a class="btn btnGotoParent" href="#" title="Go to Parent" data-num="1"><i class="icon-circle-arrow-up"></i></a></div>');
        this._skinParts.modelEditorTop.prepend(this._skinParts.btnGotoParent);
        this._skinParts.btnGotoParent.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self.onGotoParent();
        });

        this._skinParts.btnProperties = $('<div class="btn-group inline"><a class="btn btnProperties" href="#" title="Properties"><i class="icon-list-alt"></i></a></div>', {});
        this._skinParts.modelEditorTop.append(this._skinParts.btnProperties);

        this._skinParts.btnProperties.on("click", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._showProperties();
        });

        /***** MODE SELECTION  *********/

        /*this._skinParts.btnModeSwitch = $('<div class="btn-group mode-selector inline"><a class="btn active" href="#" title="Read-only" data-mode="readonly"><i class="icon-lock"></i></a><a class="btn" href="#" title="Build model" data-mode="model"><i class="icon-pencil"></i></a><a class="btn" href="#" title="Edit sets" data-mode="set"><i class="icon-th-large"></i></a></div>', {});
        this._skinParts.modelEditorTop.append(this._skinParts.btnModeSwitch);

        this._skinParts.btnModeSwitch.on("click", ".btn", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._setMode($(this).attr("data-mode"));
        });*/

        /***** END OF - MODE SELECTION ******/

        //CHILDREN container
        this._skinParts.childrenContainer = $('<div/>', {
            "class" : "children",
            "id": commonUtil.guid(),
            "tabindex": 0
        });
        this._skinParts.childrenContainer.css({"position": "absolute",
            "width": this._defaultSize.w,
            "height": this._defaultSize.h });
        this._el.append(this._skinParts.childrenContainer);

        //hook up mousedown on background
        this._skinParts.childrenContainer.on('mousedown', function (event) {
            self._onBackgroundMouseDown.call(self, event);
        });

        this._skinParts.rubberBand = $('<div/>', {
            "class" : "rubberBand"
        });
        this._skinParts.childrenContainer.append(this._skinParts.rubberBand);
        this._skinParts.rubberBand.hide();

        //initialize Raphael paper from children container and set it to be full size of the HTML container
        this._skinParts.svgPaper = Raphael(this._skinParts.childrenContainer.attr("id"));
        this._skinParts.svgPaper.canvas.style.pointerEvents = "visiblePainted";
        //this._skinParts.svgPaper.setSize("100%", "100%");
        this._skinParts.svgPaper.setSize(this._defaultSize.w, this._defaultSize.h);
        this._skinParts.svgPaper.setViewBox(0, 0, this._defaultSize.w, this._defaultSize.h, false);

        this._actualSize = {"w": this._defaultSize.w,
            "h": this._defaultSize.h};

        //create connection line instance
        this._connectionInDraw.path = this._skinParts.svgPaper.path("M0,0").attr(
            {   "stroke-width": this._connectionInDraw.strokeWidth,
                "stroke": this._connectionInDraw.strokeColor,
                "stroke-dasharray": this._connectionInDraw.lineType}
        ).hide();

        this._skinParts.selectionOutline = $('<div/>', {
            "class" : "selectionOutline"
        });
        this._skinParts.childrenContainer.append(this._skinParts.selectionOutline);
        this._skinParts.selectionOutline.hide();

        //hook up drop event handler on children container
        this._skinParts.childrenContainer.droppable({
            accept: ".part",
            drop: function (event, ui) {
                self._onBackgroundDrop(ui);
            }
        });

        this._childrenContainerOffset = this._skinParts.childrenContainer.offset();

        /***** META RELATIONSHIP TYPES AS CONNECTION *********/

        this._skinParts.btnMetaConnectionTypeSelector = $('<div class="btn-group meta-connection-type-selector inline"><a class="btn active" href="#" title="Containment" data-mode="containment"><i class="icon-meta-containment"></i></a><a class="btn" href="#" title="Inheritance" data-mode="inheritance"><i class="icon-meta-inheritance"></i></a></div>', {});
        this._skinParts.modelEditorTop.append(this._skinParts.btnMetaConnectionTypeSelector);

        this._skinParts.btnMetaConnectionTypeSelector.on("click", ".btn", function (event) {
            event.stopPropagation();
            event.preventDefault();
            self._setMetaConnectionType($(this).attr("data-mode"));
        });

        this._skinParts.btnMetaConnectionTypeSelector.hide();

        /***** END OF - META RELATIONSHIP TYPES AS CONNECTION ******/
        /*var styles = ['classic', 'block', 'open', 'oval', 'diamond', 'none'];
        var w = ['wide', 'narrow', 'midium'];
        var l = ['long', 'short', 'midium'];
        var iStlyes = styles.length;
        var iw = w.length;
        var il = l.length;
        var xx = 101;
        var yy = 101;

       while (il--) {
            while (iw--) {
                while (iStlyes--) {
                    this._skinParts.svgPaper.path("M" + xx + "," + yy + ", L" + (xx + 50) + ", " + yy).attr({"stroke-width": 2,
                        "stroke": "#000000",
                        "arrow-start": styles[iStlyes] + "-" + w[iw] + "-" + l[il]});

                    this._skinParts.svgPaper.text(xx, yy + 20, styles[iStlyes] + "-" + w[iw] + "-" + l[il] );

                    yy += 100;
                }

                xx += 150;
                yy = 101;
                iStlyes = styles.length;
            }
           iw = w.length;
        }*/


    };

    ModelEditorView.prototype._alignPositionToGrid = function (pX, pY) {
        var posXDelta,
            posYDelta;

        if (this._gridSize > 1) {
            posXDelta = pX % this._gridSize;
            posYDelta = pY % this._gridSize;

            if ((posXDelta !== 0) || (posYDelta !== 0)) {
                pX += (posXDelta < Math.floor(this._gridSize / 2) + 1 ? -1 * posXDelta : this._gridSize - posXDelta);
                pY += (posYDelta < Math.floor(this._gridSize / 2) + 1 ? -1 * posYDelta : this._gridSize - posYDelta);
            }
        }

        return { "x": pX,
                 "y": pY };
    };

    ModelEditorView.prototype._checkPositionOverlap = function (objDescriptor) {
        var i,
            posChanged = true;

        //check if position has to be adjusted to not to put it on some other model
        while (posChanged === true) {
            posChanged = false;
            for (i in this._childComponents) {
                if (this._childComponents.hasOwnProperty(i)) {
                    if (i !== objDescriptor.id) {
                        if (this._childComponents[i].hasOwnProperty("position")) {
                            if (objDescriptor.position.x === this._childComponents[i].position.x &&
                                    objDescriptor.position.y === this._childComponents[i].position.y) {
                                objDescriptor.position.x += this._gridSize * 2;
                                objDescriptor.position.y += this._gridSize * 2;
                                posChanged = true;
                            }
                        }
                    }
                }
            }
        }
    };

    ModelEditorView.prototype._updateConnections = function (connectionsToUpdate) {
        var i,
            selfOffset = this._childrenContainerOffset, //this._skinParts.childrenContainer.offset(),
            allConnEndpoints = [],
            objectConnectionPoints = {};

        //this._childrenContainerOffset = selfOffset;

        //get all the connection endpoints and update those location info
        for (i = 0; i < connectionsToUpdate.length; i += 1) {
            if (this._childComponents[connectionsToUpdate[i]]._sourceComponentId) {
                allConnEndpoints.insertUnique(this._childComponents[connectionsToUpdate[i]]._sourceComponentId);
            }

            if (this._childComponents[connectionsToUpdate[i]]._targetComponentId) {
                allConnEndpoints.insertUnique(this._childComponents[connectionsToUpdate[i]]._targetComponentId);
            }
        }

        for (i = 0; i < allConnEndpoints.length; i += 1) {
            objectConnectionPoints[allConnEndpoints[i]] = this._updateConnectionPointsByComponentId(allConnEndpoints[i]);
        }

        this._connectionsToUpdateCollection = {};

        //update the connections
        for (i = 0; i < connectionsToUpdate.length; i += 1) {
            this._updateConnectionCoordinates(connectionsToUpdate[i], objectConnectionPoints);
        }

        //we have all the connection endpoints here
        for (i in this._connectionsToUpdateCollection) {
            if (this._connectionsToUpdateCollection.hasOwnProperty(i)) {
                if (this._childComponents.hasOwnProperty(i)) {
                    if (this._connectionsToUpdateCollection[i].src) {
                        this._connectionsToUpdateCollection[i].src.x -= selfOffset.left;
                        this._connectionsToUpdateCollection[i].src.y -= selfOffset.top;
                    }

                    if (this._connectionsToUpdateCollection[i].tgt) {
                        this._connectionsToUpdateCollection[i].tgt.x -= selfOffset.left;
                        this._connectionsToUpdateCollection[i].tgt.y -= selfOffset.top;
                    }

                    if ((this._connectionsToUpdateCollection[i].src && this._connectionsToUpdateCollection[i].tgt) || (this._connectionsToUpdateCollection[i].src === null && this._connectionsToUpdateCollection[i].tgt === null)) {
                        this._childComponents[i].setEndpointCoordinates(this._connectionsToUpdateCollection[i].src, this._connectionsToUpdateCollection[i].tgt);
                    } else if (this._connectionsToUpdateCollection[i].src) {
                        this._childComponents[i].setSourceCoordinates(this._connectionsToUpdateCollection[i].src);
                    } else if (this._connectionsToUpdateCollection[i].tgt) {
                        this._childComponents[i].setTargetCoordinates(this._connectionsToUpdateCollection[i].tgt);
                    }
                }
            }
        }

        this._connectionsToUpdateCollection = {};
    };

    ModelEditorView.prototype._updateConnectionPointsByComponentId = function (objectId) {
        var selfOffset = this._childrenContainerOffset,
            objectConnectionPointAreas = [],
            objectConnectionPoints = [],
            self = this;

        if (this._displayedComponentIDs.hasOwnProperty(objectId)) {
            objectConnectionPointAreas = this._childComponents[this._displayedComponentIDs[objectId]].el.find(".connEndPoint[data-id='" + objectId + "']");
        }

        if (objectConnectionPointAreas.length > 0) {
            objectConnectionPointAreas.each(function () {
                var pointOffset = $(this).offset(),
                    w = $(this).width(),
                    h = $(this).height(),
                    connData = $(this).attr("data-or").split(","),
                    i,
                    cOrientation,
                    cConnectorLength,
                    connAreaId = self._connectionPointManager.registerConnectionArea($(this));

                //TODO only the first connector counts for now...
                if (connData && connData.length > 0) {
                    i = 0;
                    cOrientation = connData[i].substring(0, 1);
                    cConnectorLength = parseInt(connData[i].substring(1), 10);

                    objectConnectionPoints.push({ "dir": cOrientation, x: pointOffset.left - selfOffset.left + w / 2, y: pointOffset.top - selfOffset.top + h / 2, connectorLength: cConnectorLength, id: connAreaId});
                }
            });
        }

        return objectConnectionPoints;
    };

    ModelEditorView.prototype._updateConnectionCoordinates = function (connectionId, objectConnectionPoints) {
        var sourceId = this._childComponents[connectionId]._sourceComponentId,
            targetId = this._childComponents[connectionId]._targetComponentId,
            segmentPoints = this._childComponents[connectionId]._segmentPoints,
            sourceConnectionPoints = sourceId ? (objectConnectionPoints ? objectConnectionPoints[sourceId] : this._updateConnectionPointsByComponentId(sourceId)) : [],
            targetConnectionPoints = targetId ? (objectConnectionPoints ? objectConnectionPoints[targetId] : this._updateConnectionPointsByComponentId(targetId)) : [],
            sourceCoordinates,
            targetCoordinates,
            closestConnPoints,
            connUpdateInfo,
            i;

        if (sourceConnectionPoints.length > 0 && targetConnectionPoints.length > 0) {

            closestConnPoints = this._getClosestPoints(sourceConnectionPoints, targetConnectionPoints, segmentPoints);
            sourceCoordinates = sourceConnectionPoints[closestConnPoints[0]];
            targetCoordinates = targetConnectionPoints[closestConnPoints[1]];

            connUpdateInfo = this._connectionPointManager.registerConnection(connectionId, sourceCoordinates.id, targetCoordinates.id);
        } else {
            connUpdateInfo = this._connectionPointManager.unregisterConnection(connectionId);
        }

        for (i in connUpdateInfo) {
            if (connUpdateInfo.hasOwnProperty(i)) {
                this._connectionsToUpdateCollection[i] = this._connectionsToUpdateCollection[i] || {};

                if (connUpdateInfo[i].hasOwnProperty("src")) {
                    this._connectionsToUpdateCollection[i].src = connUpdateInfo[i].src;
                }

                if (connUpdateInfo[i].hasOwnProperty("tgt")) {
                    this._connectionsToUpdateCollection[i].tgt = connUpdateInfo[i].tgt;
                }
            }
        }
    };

    //figure out the shortest side to choose between the two
    ModelEditorView.prototype._getClosestPoints = function (srcConnectionPoints, tgtConnectionPoints, segmentPoints) {
        var i,
            j,
            dx,
            dy,
            srcP,
            tgtP,
            minLength = -1,
            cLength;

        if (segmentPoints && segmentPoints.length > 0) {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < tgtConnectionPoints.length; j += 1) {
                    dx = { "src": Math.abs(srcConnectionPoints[i].x - segmentPoints[0].x),
                            "tgt": Math.abs(tgtConnectionPoints[j].x - segmentPoints[segmentPoints.length - 1].x)};

                    dy =  { "src": Math.abs(srcConnectionPoints[i].y - segmentPoints[0].y),
                        "tgt": Math.abs(tgtConnectionPoints[j].y - segmentPoints[segmentPoints.length - 1].y)};

                    cLength = Math.sqrt(dx.src * dx.src + dy.src * dy.src) + Math.sqrt(dx.tgt * dx.tgt + dy.tgt * dy.tgt);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        tgtP = j;
                    }
                }
            }
        } else {
            for (i = 0; i < srcConnectionPoints.length; i += 1) {
                for (j = 0; j < tgtConnectionPoints.length; j += 1) {
                    dx = Math.abs(srcConnectionPoints[i].x - tgtConnectionPoints[j].x);
                    dy = Math.abs(srcConnectionPoints[i].y - tgtConnectionPoints[j].y);

                    cLength = Math.sqrt(dx * dx + dy * dy);

                    if (minLength === -1 || minLength > cLength) {
                        minLength = cLength;
                        srcP = i;
                        tgtP = j;
                    }
                }
            }
        }

        return [srcP, tgtP];
    };

    /*********************************** EXPERIMENT event handlers - LAYOUT, RENAME, CREATE */
    ModelEditorView.prototype._autoLayoutModels = function () {
        var i,
            x = this._gridSize,
            y = this._gridSize,
            maxWidth = 1500,
            marginW = 50,
            marginH = 50,
            rowH = 0,
            bBox,
            nextPos,
            modelId,
            componentPositions = [];

        for (i = 0; i < this._modelComponents.length; i += 1) {
            modelId = this._modelComponents[i];
            bBox = this._childComponents[modelId].getBoundingBox();

            if (rowH < bBox.height) {
                rowH = bBox.height;
            }

            //set new position
            this._childComponents[modelId].position = {"x": x, "y": y};

            this._childComponents[modelId].el.css({ "left": x, "top": y });

            componentPositions.push({ "id": modelId,
                                      "x": x,
                                      "y": y});

            if (x + bBox.width + marginW > maxWidth) {
                //new row
                nextPos = this._alignPositionToGrid(this._gridSize, y + rowH + marginH);
                rowH = 0;
            } else {
                nextPos = this._alignPositionToGrid(x + bBox.width + marginW, y);
            }

            x = nextPos.x;
            y = nextPos.y;
        }

        this.onAutLayout(componentPositions);
    };

    ModelEditorView.prototype._autoRenameComponents = function () {
        var i,
            componentId,
            componentNames = [];

        for (i = 0; i < this._modelComponents.length; i += 1) {
            componentId = this._modelComponents[i];

            componentNames.push({ "id": componentId, "title": "Model_" + i });
        }

        for (i = 0; i < this._connectionComponents.length; i += 1) {
            componentId = this._connectionComponents[i];

            componentNames.push({ "id": componentId, "title": "Conn_" + i });
        }

        this.onAutRename(componentNames);
    };

    ModelEditorView.prototype._createModel = function (num) {
        var i,
            componentNum = this._modelComponents.length + 1,
            componentNames = [];

        for (i = 0; i < num; i += 1) {
            componentNames.push({ "name": "Model_" + componentNum + i});
        }

        this.onCreateModels(componentNames);
    };

    /********************************** END OF - EXPERIMENT event handlers */

    /********************** CONNECTION DRAWING (CREATING CONNECTION) ********************************/
    ModelEditorView.prototype._getMousePos = function (e) {
        var childrenContainerOffset = this._childrenContainerOffset || { "left": 0, "top": 0 },
            pX = e.pageX - childrenContainerOffset.left,
            pY = e.pageY - childrenContainerOffset.top;
        return { "mX": pX > 0 ? pX : 0,
                 "mY": pY > 0 ? pY : 0 };
    };

    ModelEditorView.prototype.startDrawConnection = function (srcId) {
        this._clearSelection();
        this._connectionInDraw.source = srcId;
        this._connectionInDraw.path.show();
    };

    ModelEditorView.prototype.onDrawConnection = function (event) {
        var mousePos = this._getMousePos(event);

        this._connectionInDraw.lastPosition = {"x": mousePos.mX, "y": mousePos.mY};
        this._drawConnectionTo({"x": mousePos.mX, "y": mousePos.mY});
    };

    ModelEditorView.prototype.endDrawConnection = function () {
        delete this._connectionInDraw.source;
        delete this._connectionInDraw.lastPosition;
        this._connectionInDraw.path.attr({"path": "M0,0"}).hide();
    };

    ModelEditorView.prototype._drawConnectionTo = function (toPosition) {
        var pathDefinition,
            closestConnPoints,
            srcConnectionPoints = this._updateConnectionPointsByComponentId(this._connectionInDraw.source);

        closestConnPoints = this._getClosestPoints(srcConnectionPoints, [toPosition]);
        srcConnectionPoints = srcConnectionPoints[closestConnPoints[0]];

        pathDefinition = "M" + srcConnectionPoints.x + "," + srcConnectionPoints.y + "L" + toPosition.x + "," + toPosition.y;

        this._connectionInDraw.path.attr({ "path": pathDefinition});
    };

    ModelEditorView.prototype.createConnection = function (data) {
        var updateData = {};
        if (data.sourceId && data.targetId) {
            this.onCreateConnection({ "sourceId": data.sourceId,
                "targetId": data.targetId,
                "type": this._connectionType});
        } else if (data.connId) {
            updateData = { "connectionId": data.connId,
                "endType": data.endType,
                "oldValue": data.endType === "source" ? this._childComponents[data.connId]._sourceComponentId : this._childComponents[data.connId]._targetComponentId,
                "newValue": data.targetId };

            if (updateData.oldValue !== updateData.newValue) {
                if (updateData.endType === "source") {
                    this._childComponents[data.connId]._sourceComponentId = updateData.newValue;
                } else {
                    this._childComponents[data.connId]._targetComponentId = updateData.newValue;
                }

                this._updateConnectionCoordinates(updateData.connectionId);

                this.onUpdateConnectionEnd(updateData);
            } else {
                this._updateConnectionCoordinates(updateData.connectionId);
            }
        }
    };

    /********************** END OF --- CONNECTION DRAWING (CREATING CONNECTION) ********************************/


    /*
     * RUBBERBAND SELECTION
     */
    ModelEditorView.prototype._onBackgroundMouseDown = function (event) {
        var mousePos = this._getMousePos(event),
            self = this;

        if (event.ctrlKey || event.metaKey !== true) {
            this._clearSelection();
        }

        //start drawing selection rubberband
        this._selectionRubberBand = { "isDrawing": true,
            "bBox": {   "x": mousePos.mX,
                "y": mousePos.mY,
                "x2": mousePos.mX,
                "y2": mousePos.mY } };

        this._drawSelectionRubberBand();

        //hook up MouseMove and MouseUp
        this._onBackgroundMouseMoveCallBack = function (event) {
            self._onBackgroundMouseMove.call(self, event);
        };

        this._onBackgroundMouseUpCallBack = function (event) {
            self._onBackgroundMouseUp.call(self, event);
        };

        $(document).on('mousemove', this._onBackgroundMouseMoveCallBack);
        $(document).on('mouseup', this._onBackgroundMouseUpCallBack);

        event.stopPropagation();
    };

    ModelEditorView.prototype._onBackgroundMouseMove = function (event) {
        var mousePos = this._getMousePos(event);

        if (this._selectionRubberBand && this._selectionRubberBand.isDrawing === true) {
            this._selectionRubberBand.bBox.x2 = mousePos.mX;
            this._selectionRubberBand.bBox.y2 = mousePos.mY;
            this._drawSelectionRubberBand();
        }
    };

    ModelEditorView.prototype._onBackgroundMouseUp = function (event) {
        var mousePos = this._getMousePos(event);

        if (this._selectionRubberBand && this._selectionRubberBand.isDrawing === true) {
            this._selectionRubberBand.bBox.x2 = mousePos.mX;
            this._selectionRubberBand.bBox.y2 = mousePos.mY;

            this._drawSelectionRubberBand();

            this._selectChildrenByRubberBand(event.ctrlKey || event.metaKey);

            this._skinParts.rubberBand.hide();

            //unbind mousemove and mouseup handlers
            $(document).off('mousemove', this._onBackgroundMouseMoveCallBack);
            $(document).off('mouseup', this._onBackgroundMouseUpCallBack);

            //delete unnecessary instance members
            delete this._selectionRubberBand;
            delete this._onBackgroundMouseMoveCallBack;
            delete this._onBackgroundMouseUpCallBack;
        }
    };



    ModelEditorView.prototype._drawSelectionRubberBand = function () {
        var minEdgeLength = 2,
            tX = Math.min(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
            tX2 = Math.max(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
            tY = Math.min(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2),
            tY2 = Math.max(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2);

        if (tX2 - tX < minEdgeLength || tY2 - tY < minEdgeLength) {
            this._skinParts.rubberBand.hide();
        } else {
            this._skinParts.rubberBand.show();
        }

        this._skinParts.rubberBand.css({"left": tX,
            "top": tY,
            "width": tX2 - tX,
            "height": tY2 - tY});
    };

    ModelEditorView.prototype._selectChildrenByRubberBand = function (ctrlPressed) {
        var i,
            rbBBox = {  "x":  Math.min(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
                "y": Math.min(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2),
                "x2": Math.max(this._selectionRubberBand.bBox.x, this._selectionRubberBand.bBox.x2),
                "y2": Math.max(this._selectionRubberBand.bBox.y, this._selectionRubberBand.bBox.y2) },
            childrenIDs = [],
            selectionContainsBBox;

        this._logger.debug("Select children by rubber band: [" + rbBBox.x + "," + rbBBox.y + "], [" + rbBBox.x2 + "," + rbBBox.y2 + "]");

        selectionContainsBBox = function (childBBox) {
            var interSectionRect,
                acceptRatio = 0.5,
                interSectionRatio;

            if (childBBox) {
                if (util.overlap(rbBBox, childBBox)) {

                    interSectionRect = { "x": Math.max(childBBox.x, rbBBox.x),
                        "y": Math.max(childBBox.y, rbBBox.y),
                        "x2": Math.min(childBBox.x2, rbBBox.x2),
                        "y2": Math.min(childBBox.y2, rbBBox.y2) };

                    interSectionRatio = (interSectionRect.x2 - interSectionRect.x) * (interSectionRect.y2 - interSectionRect.y) / ((childBBox.x2 - childBBox.x) * (childBBox.y2 - childBBox.y));

                    if (interSectionRatio > acceptRatio) {
                        return true;
                    }
                }
            }

            return false;
        };

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                if (selectionContainsBBox(this._childComponents[i].getBoundingBox())) {
                    childrenIDs.push(i);
                }
            }
        }

        if (childrenIDs.length > 0) {
            this._setSelection(childrenIDs, ctrlPressed);
        }
    };
    /*
     * END OF - RUBBERBAND SELECTION
     */

    /*
     * COMPONENT SELECTION BY CLICKING ON THE COMPONENT
     */
    ModelEditorView.prototype.onComponentMouseDown = function (event, componentId) {
        this._logger.debug("onComponentMouseDown: " + componentId);

        //mousedown initiates a component selection
        this._setSelection([componentId], event.ctrlKey || event.metaKey);

        event.stopPropagation();
        event.preventDefault();
    };

    ModelEditorView.prototype.onComponentMouseUp = function (event, componentId) {
        this._logger.debug("onComponentMouseUp: " + componentId);

        //mouseup initiates an already selected component's unselection
        this._deselect(componentId, event.ctrlKey || event.metaKey);

        //event.stopPropagation();
        //event.preventDefault();
    };

    ModelEditorView.prototype.onComponentDblClick = function (componentId) {
        this._logger.debug("onComponentDblClick: " + componentId);

        this.onDoubleClick(componentId);
    };
    /*
     * COMPONENT SELECTION BY CLICKING ON THE COMPONENT
     */

    /*
     *  SELECTION METHODS - IN GENERAL
     */
    ModelEditorView.prototype._deselect = function (componentId, ctrlPressed) {
        var childComponent = this._childComponents[componentId];

        if (ctrlPressed === true) {
            if (this._lastSelected !== componentId) {
                if (this._selectedComponentIds.indexOf(componentId) !== -1) {
                    //child is already part of the selection
                    //remove from selection and deselect it

                    this._selectedComponentIds.splice(this._selectedComponentIds.indexOf(componentId), 1);

                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect();
                    }
                }
            }
        }

        delete this._lastSelected;
    };

    ModelEditorView.prototype._setSelection = function (idList, ctrlPressed) {
        var i,
            childComponent,
            childComponentId;

        this._logger.debug("_setSelection: " + idList + ", ctrlPressed: " + ctrlPressed);

        if (idList.length > 0) {
            if (ctrlPressed === true) {
                //while CTRL key is pressed, add/remove ids to the selection
                //first let the already selected items know that they are participating in a multiple selection from now on
                for (i = 0; i < this._selectedComponentIds.length; i += 1) {
                    childComponentId = this._selectedComponentIds[i];
                    childComponent = this._childComponents[childComponentId];

                    if ($.isFunction(childComponent.onDeselect)) {
                        childComponent.onDeselect();
                    }

                    if ($.isFunction(childComponent.onSelect)) {
                        childComponent.onSelect(true);
                    }
                }

                for (i = 0; i < idList.length; i += 1) {
                    childComponentId = idList[i];
                    childComponent = this._childComponents[childComponentId];

                    if (this._selectedComponentIds.indexOf(childComponentId) === -1) {
                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(idList.length + this._selectedComponentIds.length > 1);
                        }

                        if (idList.length === 1) {
                            this._lastSelected = idList[0];
                        }
                    }
                }
            } else {
                //CTRL key is not pressed
                if (idList.length > 1) {
                    this._clearSelection();

                    for (i = 0; i < idList.length; i += 1) {
                        childComponentId = idList[i];
                        childComponent = this._childComponents[childComponentId];

                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(true);
                        }
                    }
                } else {
                    childComponentId = idList[0];
                    childComponent = this._childComponents[childComponentId];

                    //if not yet in selection
                    if (this._selectedComponentIds.indexOf(childComponentId) === -1) {
                        this._clearSelection();

                        this._selectedComponentIds.push(childComponentId);

                        if ($.isFunction(childComponent.onSelect)) {
                            childComponent.onSelect(false);
                        }
                    }
                }
            }
        }

        this._showSelectionOutline();

        this._logger.debug("selected components: " + this._selectedComponentIds);
    };

    ModelEditorView.prototype._selectAll = function () {
        var childrenIDs = [],
            i;

        for (i in this._childComponents) {
            if (this._childComponents.hasOwnProperty(i)) {
                if (this._childComponents[i].isVisible() === true) {
                    childrenIDs.push(i);
                }
            }
        }

        if (childrenIDs.length > 0) {
            this._setSelection(childrenIDs, false);
        }
    };

    ModelEditorView.prototype._clearSelection = function () {
        var i,
            childId,
            childComponent;

        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            childId = this._selectedComponentIds[i];
            childComponent = this._childComponents[childId];

            if (childComponent) {
                if ($.isFunction(childComponent.onDeselect)) {
                    childComponent.onDeselect();
                }
            }
        }

        this._selectedComponentIds = [];

        this._hideSelectionOutline();
    };

    /*
     *  END OF --- SELECTION METHODS - IN GENERAL
     */

    /*
     * SELECTION OUTLINE
     */

    ModelEditorView.prototype._refreshSelectionOutline = function () {
        if (this._skinParts.selectionOutline.is(":visible")) {
            this._showSelectionOutline();
        }
    };

    ModelEditorView.prototype._showSelectionOutline = function () {
        var bBox = this._getSelectionBoundingBox(),
            margin = 15,
            cW = this._skinParts.childrenContainer.outerWidth(),
            cH = this._skinParts.childrenContainer.outerHeight(),
            self = this,
            selectionSpecificToolBox,
            minBBoxWidth = 100;

        if (bBox.hasOwnProperty("x")) {

            bBox.x -= margin;
            bBox.y -= margin;
            bBox.x2 += margin;
            bBox.y2 += margin;

            if (bBox.x < 0) {
                bBox.x = 0;
            }

            if (bBox.y < 0) {
                bBox.y = 0;
            }

            if (bBox.x2 > cW) {
                bBox.x2 = cW;
            }

            if (bBox.y2 > cH) {
                bBox.y2 = cH;
            }

            bBox.w = bBox.x2 - bBox.x;
            bBox.h = bBox.y2 - bBox.y;
            if (bBox.w < minBBoxWidth) {
                bBox.x -= (minBBoxWidth - bBox.w) / 2;
                bBox.x2 += (minBBoxWidth - bBox.w) / 2;
                bBox.w = bBox.x2 - bBox.x;
            }

            this._skinParts.selectionOutline.empty();

            this._skinParts.selectionOutline.css({ "left": bBox.x,
                "top": bBox.y,
                "width": bBox.w,
                "height": bBox.h });
            this._skinParts.selectionOutline.show();

            /* ADD BUTTONS TO SELECTION OUTLINE */
            this._skinParts.deleteSelection = $('<div/>', {
                "class" : "deleteSelectionBtn selectionBtn"
            });
            this._skinParts.selectionOutline.append(this._skinParts.deleteSelection);

            this._skinParts.copySelection = $('<div/>', {
                "class" : "copySelectionBtn selectionBtn"
            });
            this._skinParts.selectionOutline.append(this._skinParts.copySelection);

            this._skinParts.deleteSelection.on("mousedown", function (event) {
                var deleteParams = {},
                    selectedComponentIds = self._selectedComponentIds,
                    len = selectedComponentIds.length,
                    id,
                    component;

                event.stopPropagation();
                event.preventDefault();

                while (len--) {
                    id = selectedComponentIds[len];
                    deleteParams[id] = { "id": id };
                    if (self._modelComponents.indexOf(id) !== -1) {
                        component = self._modelComponents[id];
                    } else if (self._connectionComponents.indexOf(id) !== -1) {
                        component = self._connectionComponents[id];
                        deleteParams[id].connectionType = component._connectionType;
                        deleteParams[id].sourceId = component._sourceComponentId;
                        deleteParams[id].targetId = self._targetComponentId;
                    }
                }

                self.onDelete(deleteParams);
                self._hideSelectionOutline();
            });

            this._skinParts.copySelection.on("mousedown", function (event) {
                var copyOpts = {},
                    i,
                    cBBox;

                event.stopPropagation();
                event.preventDefault();

                for (i = 0; i < self._selectedComponentIds.length; i += 1) {
                    cBBox = self._childComponents[self._selectedComponentIds[i]].getBoundingBox();
                    if (cBBox) {
                        copyOpts[self._selectedComponentIds[i]] = { "x": cBBox.x,
                            "y": cBBox.y};
                    } else {
                        copyOpts[self._selectedComponentIds[i]] = { "x": 100,
                            "y": 100};
                    }
                }

                self.onDragCopy(copyOpts);
            });

            //advanced options button only when only 1 item is selected
            //TODO:fix it for multiple items of same type / different type

            if (this._selectedComponentIds.length === 1) {
                this._skinParts.advancedSelection = $('<div/>', {
                    "class" : "advancedSelectionBtn selectionBtn"
                });
                this._skinParts.selectionOutline.append(this._skinParts.advancedSelection);

                this._skinParts.advancedSelection.on("mousedown", function (event) {
                    event.stopPropagation();
                    event.preventDefault();
                });

                if ($.isFunction(this._childComponents[this._selectedComponentIds[0]].getComponentSpecificToolBox)) {
                    selectionSpecificToolBox = this._childComponents[this._selectedComponentIds[0]].getComponentSpecificToolBox();

                    if (selectionSpecificToolBox && selectionSpecificToolBox !== "") {
                        this._skinParts.specificActions = $('<div/>', {
                            "class" : "specificActions"
                        });

                        this._skinParts.specificActions.append(selectionSpecificToolBox);

                        this._skinParts.specificActions.on('mousedown mouseup', function (event) {
                            event.stopPropagation();
                        });

                        this._skinParts.selectionOutline.append(this._skinParts.specificActions);
                    }
                }
            }

            //TODO:DEVELOPMENT ONLY
            //dump selection info
            //icon-eye-open
            this._skinParts.dumpSelectionInfo = $('<div/>', {
                "class" : "selectionBtn dumpSelectionBtn"
            });
            this._skinParts.dumpSelectionInfo.html('<i class="icon-eye-open"></i>');
            this._skinParts.selectionOutline.append(this._skinParts.dumpSelectionInfo);

            this._skinParts.dumpSelectionInfo.on("mousedown", function (event) {
                event.stopPropagation();
                event.preventDefault();
                self.onDumpNodeInfo(self._selectedComponentIds);
            });

            /* END OF - ADD BUTTONS TO SELECTION OUTLINE*/
        } else {
            this._hideSelectionOutline();
        }

        this._refreshProperties();
    };

    ModelEditorView.prototype._hideSelectionOutline = function () {
        if (this._skinParts.selectionOutline) {
            this._skinParts.selectionOutline.empty();
            this._skinParts.selectionOutline.hide();
        }
    };

    ModelEditorView.prototype._getSelectionBoundingBox = function () {
        var bBox = {},
            i,
            id,
            childBBox;

        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            id = this._selectedComponentIds[i];

            childBBox = this._childComponents[id].getBoundingBox();

            if (childBBox) {

                if (i === 0) {
                    bBox = $.extend(true, {}, childBBox);
                } else {
                    if (bBox.x > childBBox.x) {
                        bBox.x = childBBox.x;
                    }
                    if (bBox.y > childBBox.y) {
                        bBox.y = childBBox.y;
                    }
                    if (bBox.x2 < childBBox.x2) {
                        bBox.x2 = childBBox.x2;
                    }
                    if (bBox.y2 < childBBox.y2) {
                        bBox.y2 = childBBox.y2;
                    }
                }
            }
        }

        return bBox;
    };

    /*
     * END OF - SELECTION OUTLINE
     */

    /*
     * MODELCOMPONENT REPOSITION HANDLERS
     */
    ModelEditorView.prototype._draggableHelperDOMBase = $("<div class='selected-components-drag-helper'></div>");

    ModelEditorView.prototype._onDraggableHelper = function (event) {
        return this._draggableHelperDOMBase.clone();
    };

    ModelEditorView.prototype._onDraggableStart = function (event, helper, draggedComponentId) {
        var i,
            id,
            draggedComponent = this._childComponents[draggedComponentId];

        this._logger.debug("_onDraggableStart: " + draggedComponentId);

        helper.css({ "position": "absolute",
            "left": draggedComponent.position.x,
            "top": draggedComponent.position.y });

        this._hideSelectionOutline();

        //simple drag means reposition
        //when CTRL key is pressed when drag starts, selected models have to be copy-pasted
        this._dragOptions = { "draggedComponentId": draggedComponentId,
                              "draggedElements": {},
                              "delta": { "x": 0, "y": 0 },
                              "startPos": { "x": 0, "y": 0 },
                              "mode": this._dragModes.reposition
                        };

        //is this drag a SmartCopy????
        if (event.ctrlKey || event.metaKey === true) {
            this._dragOptions.mode = this._dragModes.copy;
        }

        //go throuhg all the selected components and add them (or their clones) to the dragged element list
        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            id = this._selectedComponentIds[i];

            this._dragOptions.draggedElements[id] = {};

            if (this._dragOptions.mode === this._dragModes.copy) {
                this._dragOptions.draggedElements[id].el = this._childComponents[id].getClonedEl();
                if (this._dragOptions.draggedElements[id].el) {
                    this._dragOptions.draggedElements[id].el.css({"opacity": "0.5",
                                                                    "z-index": 100000});
                }
            } else {
                this._dragOptions.draggedElements[id].el = this._childComponents[id].el;
            }

            if (this._childComponents[id].position) {
                this._dragOptions.draggedElements[id].originalPosition = { "x": this._childComponents[id].position.x,
                    "y": this._childComponents[id].position.y };
            }

            if (id === draggedComponentId) {
                this._dragOptions.startPos.x = this._dragOptions.draggedElements[id].originalPosition.x;
                this._dragOptions.startPos.y = this._dragOptions.draggedElements[id].originalPosition.y;
            }
        }

        //append all the cloned 'el's to the childrenContainer
        if (this._dragOptions.mode === this._dragModes.copy) {
            for (i in this._dragOptions.draggedElements) {
                if (this._dragOptions.draggedElements.hasOwnProperty(i)) {
                    if (this._dragOptions.draggedElements[i].el) {
                        this._skinParts.childrenContainer.append(this._dragOptions.draggedElements[i].el);
                    }
                }
            }
        }

        this._logger.debug("Start dragging from original position X: " + this._dragOptions.startPos.x + ", Y: " + this._dragOptions.startPos.y);
    };

    ModelEditorView.prototype._onDraggableDrag = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this._dragOptions.startPos.x,
            dY = dragPos.y - this._dragOptions.startPos.y;


        if ((dX !== this._dragOptions.delta.x) || (dY !== this._dragOptions.delta.y)) {
            this._moveSelectedComponentsBy(dX, dY);

            this._dragOptions.delta = {"x": dX, "y": dY};
        }
    };

    ModelEditorView.prototype._moveSelectedComponentsBy = function (dX, dY) {
        var i,
            id,
            posX,
            posY,
            affectedConnections = [],
            newPositions = {};

        //move all the selected children
        for (i = 0; i < this._selectedComponentIds.length; i += 1) {
            id = this._selectedComponentIds[i];

            newPositions[id] = {};

            if (this._dragOptions.draggedElements[id].originalPosition) {
                posX = this._dragOptions.draggedElements[id].originalPosition.x + dX;
                posX = (posX > 0) ? posX : 0;

                posY = this._dragOptions.draggedElements[id].originalPosition.y + dY;
                posY = (posY > 0) ? posY : 0;

                this._dragOptions.draggedElements[id].el.css({ "left": posX,
                    "top": posY });

                newPositions[id] = { "x": posX, "y": posY };
            }
        }

        //redraw all the connections that are affected by the dragged objects
        //when necessary, because in copy mode, no need to redraw the connections
        if (this._dragOptions.mode === this._dragModes.reposition) {
            for (i = 0; i < this._selectedComponentIds.length; i += 1) {
                affectedConnections.mergeUnique(this._getConnectionsForModel(this._selectedComponentIds[i]));
            }
            this._updateConnections(affectedConnections);
        }

        return newPositions;
    };

    ModelEditorView.prototype._onDraggableStop = function (event, helper) {
        var dragPos = { "x": parseInt(helper.css("left"), 10), "y": parseInt(helper.css("top"), 10) },
            dX = dragPos.x - this._dragOptions.startPos.x,
            dY = dragPos.y - this._dragOptions.startPos.y,
            id,
            newPositions,
            revert = false,
            revertCallbackFn,
            revertCallbackArgs,
            dragMode = this._dragOptions.mode;

        if (this._dragOptions.revert) {
            dX = 0;
            dY = 0;
            revert = true;
            revertCallbackFn = this._dragOptions.revertCallback ? this._dragOptions.revertCallback.fn : null;
            revertCallbackArgs = this._dragOptions.revertCallback ? this._dragOptions.revertCallback.arg : null;
        }

        //move all the selected children
        newPositions = this._moveSelectedComponentsBy(dX, dY);

        for (id in newPositions) {
            if (newPositions.hasOwnProperty(id)) {
                if (this._dragOptions.mode === this._dragModes.copy) {
                    if (this._dragOptions.draggedElements[id].el) {
                        this._dragOptions.draggedElements[id].el.remove();
                    }
                    delete this._dragOptions.draggedElements[id];
                } else {
                    if (newPositions[id].hasOwnProperty("x") && newPositions[id].hasOwnProperty("y")) {
                        this._childComponents[id].position = { "x": newPositions[id].x,
                            "y": newPositions[id].y };
                    } else {
                        //it was a connection
                        delete newPositions[id];
                    }

                }
            }
        }

        //remove UI helpers
        this._showSelectionOutline();

        //delete dragOptions
        delete this._dragOptions;
        this._dragOptions = null;

        if (revert !== true) {

            if (dragMode === this._dragModes.copy) {
                this.onDragCopy(newPositions);
            } else {
                this.onReposition(newPositions);
            }
        } else {
            if (revertCallbackFn) {
                revertCallbackFn.call(this, revertCallbackArgs);
            }
        }
    };

    ModelEditorView.prototype._showProperties = function () {
        var propanel = $("#modeleditorview_properties_panel"),
            propList,
            self = this;

        if (this.propListView === null || this.propListView === undefined) {
            propList = this._getCommonPropertiesForSelection();
            if (propList && !_.isEmpty(propList)) {
                if (propanel.length === 0) {
                    propanel = $("<div/>", {id : "modeleditorview_properties_panel"});
                    this._el.append(propanel);
                } else {
                    propanel.empty();
                }

                propanel.dialog({"title": "Properties",
                    "dialogClass": "PropertyEditorGUI",
                    "close": function (event, ui) {
                        propanel.empty();
                        self.propListView = null;
                    } });

                this.propListView = new PropertyListView(propanel);

                this.propListView.onFinishChange(function (args) {
                    self._onPropertyChanged(args);
                });

                this.propListView.setPropertyList(propList);
            }
        }
    };

    ModelEditorView.prototype._refreshProperties = function () {
        var propList;

        if (this.propListView) {
            propList = this._getCommonPropertiesForSelection();

            this.propListView.setPropertyList(propList);
        }
    };

    ModelEditorView.prototype._getCommonPropertiesForSelection = function () {
        return this.onGetCommonPropertiesForSelection(this._selectedComponentIds);
    };

    ModelEditorView.prototype._onPropertyChanged = function (args) {
        this.onPropertyChanged(this._selectedComponentIds, args);
    };

    /*********  HANDLE COMPONENT DROP ON BACKGROUND ***********/

    ModelEditorView.prototype._onBackgroundDrop = function (ui) {
        var metaInfo = ui.helper.data("metaInfo"),
            posX = ui.offset.left - this._childrenContainerOffset.left,
            posY = ui.offset.top - this._childrenContainerOffset.top,
            newNodeDesc = { "id": undefined,
                            "position": { "x": posX,
                                          "y": posY } };

        if (metaInfo.hasOwnProperty(CONSTANTS.GME_ID)) {
            newNodeDesc.id = metaInfo[CONSTANTS.GME_ID];

            this.onCreateNode(newNodeDesc);
        }
    };

    /********* END OF - HANDLE COMPONENT DROP ON BACKGROUND ***********/

    /*
     * END OF - MODELCOMPONENT REPOSITION HANDLERS
     */

    ModelEditorView.prototype.saveConnectionSegmentPoints = function (connId, segmentPointsToSave) {
        this.onSaveConnectionSegmentPoints(connId, segmentPointsToSave);
    };

    ModelEditorView.prototype.setLineType = function (connId, type) {
        this.onSetLineType(connId, type);
    };

    /* PUBLIC API TO OVERRIDE*/
    ModelEditorView.prototype.onCreateConnection = function (connDesc) {
        this._logger.warning("onCreateConnection is not overridden in Controller...[sourceId: '" + connDesc.sourceId + "', targetId: '" + connDesc.targetId + "']");
    };

    ModelEditorView.prototype.onUpdateConnectionEnd = function (data) {
        this._logger.warning("onUpdateConnectionEnd is not overridden in Controller..." + JSON.stringify(data));
    };

    ModelEditorView.prototype.onGotoParent = function () {
        this._logger.warning("onGotoParent is not overridden in Controller...");
    };

    /* PUBLIC API TO OVERRIDE*/
    ModelEditorView.prototype.onCopy = function (idList) {
        this._logger.warning("onCopy is not overridden in Controller..." + idList);
    };

    ModelEditorView.prototype.onPaste = function () {
        this._logger.warning("onPaste is not overridden in Controller...");
    };

    ModelEditorView.prototype.onDragCopy = function (pasteDesc) {
        this._logger.warning("onDragCopy is not overridden in Controller..." + pasteDesc);
    };

    ModelEditorView.prototype.onReposition = function (repositionDesc) {
        this._logger.warning("onReposition is not overridden in Controller..." + repositionDesc);
    };

    ModelEditorView.prototype.onDelete = function (ids) {
        this._logger.warning("onDelete is not overridden in Controller..." + ids);
    };

    ModelEditorView.prototype.onSaveConnectionSegmentPoints = function (connId, segmentPointsToSave) {
        this._logger.warning("onSaveConnectionSegmentPoints is not overridden in Controller...connection: '" + connId + "', segmentpoints: " + JSON.stringify(segmentPointsToSave));
    };

    ModelEditorView.prototype.onSetLineType = function (connId, type) {
        this._logger.warning("onSetLineType is not overridden in Controller...connId: '" + connId + "', new type: '" + type + "'");
    };

    ModelEditorView.prototype.onDoubleClick = function (componentId) {
        this._logger.warning("onDoubleClick is not overridden in Controller...componentId: '" + componentId + "'");
    };

    ModelEditorView.prototype.onGetCommonPropertiesForSelection = function (nodeIds) {
        this._logger.warning("onGetCommonPropertiesForSelection is not overridden in Controller...");
    };

    ModelEditorView.prototype.onPropertyChanged = function (selectedComponentIds, args) {
        this._logger.warning("onPropertyChanged is not overridden in Controller...");
    };

    ModelEditorView.prototype.onCreateNode = function (newNodeDescriptor) {
        this._logger.warning("onCreateNode is not overridden in Controller...");
    };

    ModelEditorView.prototype.onDumpNodeInfo = function (idList) {
        this._logger.warning("onDumpNodeInfo is not overridden in Controller...");
    };


    /************* END OF --- PUBLIC API TO OVERRIDE --------------------*/

    //TODO: check this here...
    ModelEditorView.prototype.destroy = function () {
        this._el.removeClass("modelEditorView").empty();
    };


    /************** MODE SETTER *****************/
    ModelEditorView.prototype._setMode = function (mode) {
        if (this._modelEditorMode !== mode) {
            this._skinParts.btnModeSwitch.find('.btn.active').removeClass('active');
            this._skinParts.btnModeSwitch.find('.btn[data-mode="' + mode + '"]').addClass('active');
            this._modelEditorMode = mode;
        }
    };

    /************************ DROPHANDLER ON MODELS *************************/
    ModelEditorView.prototype.onModelDropOver = function (modelComponentId, event, ui) {
        //ui.helper contains information about the concrete dragging (ui.helper[0].GMEDragData)
        var dragParams = ui.helper[0].GMEDragData || "";

        /*switch (dragParams.type) {
            case "simple-drag":
                break;
            case "create-connection":
                break;
        }*/

        this._logger.warning("onModelDropOver: '" + modelComponentId + "', helper.GMEDragData: " + JSON.stringify(dragParams));
    };

    /******************* META CONNECTION TYPE ************************/
    ModelEditorView.prototype._setMetaConnectionType = function (mode) {
        if (this._connectionType !== mode) {
            this._skinParts.btnMetaConnectionTypeSelector.find('.btn.active').removeClass('active');
            this._skinParts.btnMetaConnectionTypeSelector.find('.btn[data-mode="' + mode + '"]').addClass('active');
            this._connectionType = mode;
            this._setConnectInDrawProperties(this._connectionType);
        }
    };

    ModelEditorView.prototype.enableMetaComponents = function (enabled) {
        if (enabled === true) {
            this._skinParts.btnMetaConnectionTypeSelector.show();
            this._setMetaConnectionType("containment");
        } else {
            this._skinParts.btnMetaConnectionTypeSelector.hide();
            this._connectionType = "connection";
        }
        this._setConnectInDrawProperties(this._connectionType);
    };

    ModelEditorView.prototype._setConnectInDrawProperties = function (connectionType) {
        switch (connectionType) {
        case "containment":
            this._connectionInDraw.path.attr({"arrow-start": CONTAINMENT_TYPE_LINE_END});
            break;
        case "inheritance":
            this._connectionInDraw.path.attr({"arrow-start": INHERITANCE_TYPE_LINE_END});
            break;
        default:
            this._connectionInDraw.path.attr({"arrow-start": "none"});
            break;
        }
    };

    return ModelEditorView;
});
