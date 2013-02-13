"use strict";

define(['logManager',
    'css!PartBrowserCSS/PartBrowserView.css'], function (logManager) {

    var PartBrowserView,
        PART_CLASS = "part";

    PartBrowserView = function (containerElement) {
        this._logger = logManager.create("PartBrowserView_" + containerElement);

        //Step 1: initialize object variables
        this._partDecoratorInstances = {};

        //default view size

        //STEP 2: initialize UI
        this._initializeUI(containerElement);

        this._logger.debug("Created");
    };

    PartBrowserView.prototype._initializeUI = function (containerElement) {
        //get container first
        this._el = $("#" + containerElement);
        if (this._el.length === 0) {
            this._logger.warning("PartBrowserView's container control with id:'" + containerElement + "' could not be found");
            throw "PartBrowserView's container control with id:'" + containerElement + "' could not be found";
        }

        this._el.addClass("partBrowser");

        this._list = $("<ul/>");

        this._el.append(this._list);
    };

    PartBrowserView.prototype.clear = function () {
        this._list.empty();
        this._partDecoratorInstances = {};
    };

    PartBrowserView.prototype.$_DOMBase = $('<div/>').attr({ "class": PART_CLASS });

    PartBrowserView.prototype.addPart = function (partId, partDesc) {
        var partContainerDiv = this._list.find("div[id='" + partId + "']"),
            partContainerLi = $("<li/>"),
            DecoratorClass = partDesc.decoratorClass,
            decoratorInstance;

        if (partContainerDiv.length > 0) {
            this.updatePart(partId, partDesc);
        } else {
            this._partDecoratorInstances[partId] = decoratorInstance = new DecoratorClass();
            decoratorInstance.setControl(partDesc.control);
            decoratorInstance.setMetaInfo(partDesc.metaInfo);

            partContainerDiv = this.$_DOMBase.clone();
            partContainerDiv.attr({"id": partId});

            //render the part inside 'partContainerDiv'
            decoratorInstance.on_addToPartBrowser();
            partContainerDiv.append(decoratorInstance.$el);

            //add part's GUI
            this._list.append(partContainerLi.append(partContainerDiv));

            decoratorInstance.onRenderGetLayoutInfo();
            decoratorInstance.onRenderSetLayoutInfo();

            this._makeDraggable({ "el": partContainerDiv,
                                  "partDesc": partDesc });
        }
    };

    PartBrowserView.prototype._makeDraggable = function (params) {
        var el = params.el,
            DecoratorClass,
            self = this;

        //hook up draggable
        el.draggable({
            helper: function () {
                var draggedEl = self.$_DOMBase.clone(),
                    decoratorInstance,
                    partContainerLi = $("<li/>");

                DecoratorClass = params.partDesc.decoratorClass;
                decoratorInstance = new DecoratorClass();
                decoratorInstance.setControl(params.partDesc.control);
                decoratorInstance.setMetaInfo(params.partDesc.metaInfo);

                //render the part inside 'draggedEl'
                decoratorInstance.on_addToPartBrowser();
                draggedEl.append(decoratorInstance.$el);

                //add part's GUI
                self._list.append(partContainerLi.append(draggedEl));

                decoratorInstance.onRenderGetLayoutInfo();
                decoratorInstance.onRenderSetLayoutInfo();

                draggedEl.remove();
                partContainerLi.remove();

                //set it up with GME related info
                draggedEl.data("metaInfo", params.partDesc.metaInfo);

                return draggedEl;
            },
            zIndex: 200000,
            cursorAt: {
                left: 0,
                top: 0
            }
        });
    };

    PartBrowserView.prototype.removePart = function (partId) {
        var partContainer = this._list.find("div[id='" + partId + "']");

        if (partContainer.length > 0) {
            partContainer.draggable( "destroy" );
            partContainer = partContainer.parent(); //this is the <li> contains the part
            partContainer.remove();
            partContainer.empty();
            delete this._partDecoratorInstances[partId];
        }
    };

    PartBrowserView.prototype.updatePart = function (partId, partDesc) {
        var decoratorInstance = this._partDecoratorInstances[partId],
            partContainer = this._list.find("div[id='" + partId + "']"),
            DecoratorClass;

        if (decoratorInstance) {
            if (partDesc.decoratorClass.prototype.DECORATORID !== decoratorInstance.DECORATORID) {
                //decorator change
                partContainer.draggable( "destroy" );

                decoratorInstance.destroy();

                partContainer.empty();

                DecoratorClass = partDesc.decoratorClass;
                this._partDecoratorInstances[partId] = decoratorInstance = new DecoratorClass();
                decoratorInstance.setControl(partDesc.control);
                decoratorInstance.setMetaInfo(partDesc.metaInfo);

                decoratorInstance.on_addToPartBrowser();
                partContainer.append(decoratorInstance.$el);

                this._makeDraggable({ "el": partContainer,
                    "partDesc": partDesc });
            } else {
                decoratorInstance.update();
            }

            decoratorInstance.onRenderGetLayoutInfo();
            decoratorInstance.onRenderSetLayoutInfo();
        }
    };

    return PartBrowserView;
});