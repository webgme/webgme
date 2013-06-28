"use strict";

define(['logManager',
    'js/Constants',
    'css!/css/Widgets/PartBrowser/PartBrowserWidget'], function (logManager,
                                                                 CONSTANTS) {

    var PartBrowserWidget,
        PART_BROWSER_CLASS = "part-browser",
        PART_CLASS = "part";

    PartBrowserWidget = function (container, params) {
        this._logger = logManager.create("PartBrowserWidget");

        this._el = container;

        this._initialize();

        this._logger.debug("PartBrowserWidget ctor finished");
    };

    PartBrowserWidget.prototype._initialize = function () {
        //set Widget title
        this._el.addClass(PART_BROWSER_CLASS);

        this._list = $("<ul/>");

        this._parts = {};

        this._el.append(this._list);
    };

    PartBrowserWidget.prototype.clear = function () {
        this._list.empty();
    };

    PartBrowserWidget.prototype.$_DOMBase = $('<div/>').attr({ "class": PART_CLASS });

    PartBrowserWidget.prototype.addPart = function (partId, partDesc) {
        var partContainerDiv = this._list.find("div[id='" + partId + "']"),
            partContainerLi = $("<li/>"),
            DecoratorClass = partDesc.decoratorClass,
            decoratorInstance;

        if (partContainerDiv.length > 0) {
            return this.updatePart(partId, partDesc);
        } else {
            decoratorInstance = new DecoratorClass();
            decoratorInstance.setControl(partDesc.control);
            decoratorInstance.setMetaInfo(partDesc.metaInfo);

            partContainerDiv = this.$_DOMBase.clone();
            partContainerDiv.attr({"id": partId});

            //render the part inside 'partContainerDiv'
            decoratorInstance.beforeAppend();
            partContainerDiv.append(decoratorInstance.$el);


            //add part's GUI
            this._list.append(partContainerLi.append(partContainerDiv));

            decoratorInstance.afterAppend();

            this._makeDraggable({ "el": partContainerDiv,
                "partDesc": partDesc,
                "partId": partId});

            this._parts[partId] = {"decoratorInstance": decoratorInstance,
                "decoratorClass": partDesc.decoratorClass} ;

            return decoratorInstance;
        }
    };

    PartBrowserWidget.prototype._makeDraggable = function (params) {
        var el = params.el,
            self = this,
            partId = params.partId;

        //hook up draggable
        el.draggable({
            helper: function () {
                var draggedEl = self.$_DOMBase.clone(),
                    DecoratorClass = self._parts[partId].decoratorClass,
                    existingDecoratorInstance =  self._parts[partId].decoratorInstance,
                    decoratorInstance,
                    partContainerLi = $("<li/>"),
                    metaInfo = existingDecoratorInstance.getMetaInfo();

                decoratorInstance = new DecoratorClass();
                decoratorInstance.setControl(existingDecoratorInstance.getControl());
                decoratorInstance.setMetaInfo(metaInfo);

                //render the part inside 'draggedEl'
                decoratorInstance.beforeAppend();
                draggedEl.append(decoratorInstance.$el);

                //add part's GUI
                self._list.append(partContainerLi.append(draggedEl));

                decoratorInstance.afterAppend();

                draggedEl.remove();
                partContainerLi.remove();

                //set it up with GME related info
                draggedEl.data("metaInfo", metaInfo);

                return draggedEl;
            },
            zIndex: 200000,
            cursorAt: {
                left: 0,
                top: 0
            },
            appendTo: $(CONSTANTS.ALL_OVER_THE_SCREEN_DRAGGABLE_PARENT_ID).first()
        });
    };

    PartBrowserWidget.prototype.removePart = function (partId) {
        var partContainer = this._list.find("div[id='" + partId + "']");

        if (partContainer.length > 0) {
            partContainer.draggable( "destroy" );
            partContainer = partContainer.parent(); //this is the <li> contains the part
            partContainer.remove();
            partContainer.empty();

            delete this._parts[partId];
        }
    };

    PartBrowserWidget.prototype.updatePart = function (partId, partDesc) {
        var partDecoratorInstance = this._parts[partId] ? this._parts[partId].decoratorInstance : undefined,
            DecoratorClass = partDesc.decoratorClass,
            partContainerDiv = this._list.find("div[id='" + partId + "']");

        if (partDecoratorInstance) {
            if (partDesc.decoratorClass && partDecoratorInstance.DECORATORID !== partDesc.decoratorClass.prototype.DECORATORID) {

                this._logger.debug("decorator update: '" + partDecoratorInstance.DECORATORID + "' --> '" + partDesc.decoratorClass.prototype.DECORATORID + "'...");

                var oldControl = partDecoratorInstance.getControl();
                var oldMetaInfo = partDecoratorInstance.getMetaInfo();

                //remove old one
                partDecoratorInstance.$el.remove();
                partDecoratorInstance.destroy();

                //instantiate new one
                partDecoratorInstance = new DecoratorClass();
                partDecoratorInstance.setControl(oldControl);
                partDecoratorInstance.setMetaInfo(oldMetaInfo);

                //attach new one
                partDecoratorInstance.beforeAppend();
                partContainerDiv.append(partDecoratorInstance.$el);
                partDecoratorInstance.afterAppend();

                //update in partList
                this._parts[partId].decoratorInstance = partDecoratorInstance;
                this._parts[partId].decoratorClass = partDesc.decoratorClass;

                this._logger.debug("DesignerItem's ['" + this.id + "'] decorator  has been updated.");

                return partDecoratorInstance;
            } else {
                //if decorator instance not changed
                //let the decorator instance know about the update
                partDecoratorInstance.update();

                return undefined;
            }
        }

        return undefined;
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PartBrowserWidget.prototype.setReadOnly = function (isReadOnly) {
        if (isReadOnly === true) {
            this._list.find('.' + PART_CLASS).draggable('disable');
        } else {
            this._list.find('.' + PART_CLASS).draggable('enable');
        }
    };


    PartBrowserWidget.prototype.notifyPart = function (partId, componentList) {
        var partDecoratorInstance = this._parts[partId] ? this._parts[partId].decoratorInstance : undefined;

        if (partDecoratorInstance) {
            partDecoratorInstance.notifyComponentEvent(componentList);
        }
    };

    return PartBrowserWidget;
});
