"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Constants',
    './PartBrowserPanelControl',
    'css!/css/Panels/PartBrowser/PartBrowserPanel'], function (PanelBaseWithHeader,
                                                            CONSTANTS,
                                                            PartBrowserPanelControl) {

    var PartBrowserPanel,
        __parent__ = PanelBaseWithHeader,
        PART_CLASS = "part";

    PartBrowserPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "PartBrowserPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        var cControl = new PartBrowserPanelControl(this._client, this);
        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            cControl.selectedObjectChanged(nodeId);
        });

        this.logger.debug("PartBrowserPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(PartBrowserPanel.prototype, __parent__.prototype);

    PartBrowserPanel.prototype._initialize = function () {
        //set Widget title
        this.setTitle("Part Browser");

        this.$el.addClass("partBrowser");

        this._list = $("<ul/>");

        this._parts = {};

        this.$el.append(this._list);
    };

    PartBrowserPanel.prototype.clear = function () {
        this._list.empty();
    };

    PartBrowserPanel.prototype.$_DOMBase = $('<div/>').attr({ "class": PART_CLASS });

    PartBrowserPanel.prototype.addPart = function (partId, partDesc) {
        var partContainerDiv = this._list.find("div[id='" + partId + "']"),
            partContainerLi = $("<li/>"),
            DecoratorClass = partDesc.decoratorClass,
            decoratorInstance;

        if (partContainerDiv.length > 0) {
            this.updatePart(partId, partDesc);
        } else {
            decoratorInstance = new DecoratorClass();
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
                "partDesc": partDesc,
                "partId": partId});

            this._parts[partId] = {"decoratorInstance": decoratorInstance,
                                   "decoratorClass": partDesc.decoratorClass} ;
        }
    };

    PartBrowserPanel.prototype._makeDraggable = function (params) {
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
                decoratorInstance.on_addToPartBrowser();
                draggedEl.append(decoratorInstance.$el);

                //add part's GUI
                self._list.append(partContainerLi.append(draggedEl));

                decoratorInstance.onRenderGetLayoutInfo();
                decoratorInstance.onRenderSetLayoutInfo();

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

    PartBrowserPanel.prototype.removePart = function (partId) {
        var partContainer = this._list.find("div[id='" + partId + "']");

        if (partContainer.length > 0) {
            partContainer.draggable( "destroy" );
            partContainer = partContainer.parent(); //this is the <li> contains the part
            partContainer.remove();
            partContainer.empty();

            delete this._parts[partId];
        }
    };

    PartBrowserPanel.prototype.updatePart = function (partId, partDesc) {
        var partDecoratorInstance = this._parts[partId].decoratorInstance,
            DecoratorClass = partDesc.decoratorClass,
            partContainerDiv = this._list.find("div[id='" + partId + "']");

        if (partDecoratorInstance) {
            if (partDesc.decoratorClass && partDecoratorInstance.DECORATORID !== partDesc.decoratorClass.prototype.DECORATORID) {

                this.logger.debug("decorator update: '" + partDecoratorInstance.DECORATORID + "' --> '" + partDesc.decoratorClass.prototype.DECORATORID + "'...");

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
                partDecoratorInstance.on_addToPartBrowser();
                partContainerDiv.append(partDecoratorInstance.$el);

                partDecoratorInstance.onRenderGetLayoutInfo();
                partDecoratorInstance.onRenderSetLayoutInfo();

                //update in partList
                this._parts[partId].decoratorInstance = partDecoratorInstance;
                this._parts[partId].decoratorClass = partDesc.decoratorClass;

                this.logger.debug("DesignerItem's ['" + this.id + "'] decorator  has been updated.");
            } else {
                //if decorator instance not changed
                //let the decorator instance know about the update
                partDecoratorInstance.update();
            }
        }
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PartBrowserPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        //apply parent's onReadOnlyChanged
        __parent__.prototype.onReadOnlyChanged.call(this, isReadOnly);

        if (isReadOnly === true) {
            this._list.find('.' + PART_CLASS).draggable('disable');
        } else {
            this._list.find('.' + PART_CLASS).draggable('enable');
        }
    };

    return PartBrowserPanel;
});
