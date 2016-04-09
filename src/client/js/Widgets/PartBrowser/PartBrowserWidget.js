/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([
    'js/logger',
    'js/Constants',
    'js/DragDrop/DragSource',
    'css!./styles/PartBrowserWidget.css'
], function (Logger, CONSTANTS, dragSource) {

    'use strict';

    var PartBrowserWidget,
        PART_BROWSER_CLASS = 'part-browser',
        PART_CLASS = 'part';

    PartBrowserWidget = function (container /*, params*/) {
        this._logger = Logger.create('gme:Widgets:PartBrowser:PartBrowserWidget.DecoratorBase',
            WebGMEGlobal.gmeConfig.client.log);

        this._el = container;

        this._initialize();

        this._logger.debug('PartBrowserWidget ctor finished');
    };

    PartBrowserWidget.prototype._initialize = function () {
        //set Widget title
        this._el.addClass(PART_BROWSER_CLASS);

        this._list = $('<ul/>');

        this._parts = {};

        this._partDraggableEl = {};

        this._el.append(this._list);
    };

    PartBrowserWidget.prototype.clear = function () {
        //remove the parts first to safely detach jQueryUI draggable
        for (var partId in this._parts) {
            if (this._parts.hasOwnProperty(partId)) {
                this.removePart(partId);
            }
        }

        this._list.empty();
    };

    //jshint camelcase: false
    PartBrowserWidget.prototype.$_DOMBase = $('<div/>').attr({class: PART_CLASS});

    PartBrowserWidget.prototype.addPart = function (partId, partDesc) {
        var partContainerDiv = this._getPartDiv(partId),
            partContainerLi = $('<li/>'),
            DecoratorClass = partDesc.decoratorClass,
            decoratorInstance;

        if (partContainerDiv.length > 0) {
            return this.updatePart(partId, partDesc);
        } else {
            decoratorInstance = new DecoratorClass({
                'preferencesHelper': partDesc.preferencesHelper,
                'aspect': partDesc.aspect
            });
            decoratorInstance.setControl(partDesc.control);
            decoratorInstance.setMetaInfo(partDesc.metaInfo);

            partContainerDiv = this.$_DOMBase.clone();
            partContainerDiv.attr({id: partId});

            //render the part inside 'partContainerDiv'
            decoratorInstance.beforeAppend();
            partContainerDiv.append(decoratorInstance.$el);

            //store draggable DIV in list
            this._partDraggableEl[partId] = partContainerDiv;

            //add part's GUI
            this._list.append(partContainerLi.append(partContainerDiv));

            decoratorInstance.afterAppend();

            this._makeDraggable({
                el: partContainerDiv,
                partDesc: partDesc,
                partId: partId
            });

            this._parts[partId] = {
                decoratorInstance: decoratorInstance,
                decoratorClass: partDesc.decoratorClass
            };

            return decoratorInstance;
        }
    };

    PartBrowserWidget.prototype._makeDraggable = function (params) {
        var el = params.el,
            self = this;

        dragSource.makeDraggable(el, {
            dragItems: function (el) {
                return self.getDragItems(el);
            },
            dragEffects: function (el) {
                return self.getDragEffects(el);
            },
            dragParams: function (el) {
                return self.getDragParams(el);
            }
        });
    };

    PartBrowserWidget.prototype.getDragItems = function (/*el*/) {
        this._logger.warn('PartBrowserWidget.getDragItems is not overridden in the controller!!!');
        return [];
    };

    PartBrowserWidget.prototype.getDragEffects = function (/*el*/) {
        this._logger.warn('PartBrowserWidget.getDragEffects is not overridden in the controller!!!');
        return [];
    };

    PartBrowserWidget.prototype.getDragParams = function (/*el*/) {
        this._logger.debug('PartBrowserWidget.getDragParams is not overridden in the controller!!!');
        return undefined;
    };

    PartBrowserWidget.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;

    /* OVERWRITE DragSource.prototype.dragHelper */
    //TODO: check if really necessary and clone is really not an option
    /*PartBrowserWidget.prototype.dragHelper = function (el, event) {
     var draggedEl = self.$_DOMBase.clone(),
     DecoratorClass = self._parts[partId].decoratorClass,
     existingDecoratorInstance =  self._parts[partId].decoratorInstance,
     decoratorInstance,
     partContainerLi = $('<li/>'),
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

     return draggedEl;
     };*/

    PartBrowserWidget.prototype._getPartDiv = function (partId) {
        return this._list.find('div.' + PART_CLASS + '[id="' + partId + '"]');
    };

    PartBrowserWidget.prototype.removePart = function (partId) {
        var partContainer = this._getPartDiv(partId);

        if (partContainer.length > 0) {
            dragSource.destroyDraggable(partContainer);
            partContainer = partContainer.parent(); //this is the <li> contains the part
            partContainer.remove();
            partContainer.empty();

            delete this._parts[partId];
            delete this._partDraggableEl[partId];
        }
    };

    PartBrowserWidget.prototype.updatePart = function (partId, partDesc) {
        var partDecoratorInstance = this._parts[partId] ? this._parts[partId].decoratorInstance : undefined,
            DecoratorClass = partDesc.decoratorClass,
            partContainerDiv = this._getPartDiv(partId);

        if (partDecoratorInstance) {
            if (partDesc.decoratorClass &&
                partDecoratorInstance.DECORATORID !== partDesc.decoratorClass.prototype.DECORATORID) {

                this._logger.debug('decorator update: "' + partDecoratorInstance.DECORATORID + '" --> "' +
                    partDesc.decoratorClass.prototype.DECORATORID + '"...');

                var oldControl = partDecoratorInstance.getControl();
                var oldMetaInfo = partDecoratorInstance.getMetaInfo();

                //remove old one
                partDecoratorInstance.$el.remove();
                partDecoratorInstance.destroy();

                //instantiate new one
                partDecoratorInstance = new DecoratorClass({
                    'preferencesHelper': partDesc.preferencesHelper,
                    'aspect': partDesc.aspect
                });
                partDecoratorInstance.setControl(oldControl);
                partDecoratorInstance.setMetaInfo(oldMetaInfo);

                //attach new one
                partDecoratorInstance.beforeAppend();
                partContainerDiv.append(partDecoratorInstance.$el);
                partDecoratorInstance.afterAppend();

                //update in partList
                this._parts[partId].decoratorInstance = partDecoratorInstance;
                this._parts[partId].decoratorClass = partDesc.decoratorClass;

                this._logger.debug('DesignerItem\'s ["' + this.id + '"] decorator  has been updated.');

                return partDecoratorInstance;
            } else {
                //if decorator instance not changed
                //let the decorator instance know about the update
                partDecoratorInstance.update();

                //return undefined;

                return partDecoratorInstance;

            }
        } else {
            //not present in the list yet
            if (partContainerDiv.length === 0) {
                return this.addPart(partId, partDesc);
            }
        }

        //return undefined;
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    PartBrowserWidget.prototype.setReadOnly = function (isReadOnly) {
        var items = this._list.find('.' + PART_CLASS),
            i = items.length;

        while (i--) {
            dragSource.enableDraggable($(items[i]), !isReadOnly);
        }
    };

    PartBrowserWidget.prototype.notifyPart = function (partId, componentList) {
        var partDecoratorInstance = this._parts[partId] ? this._parts[partId].decoratorInstance : undefined;

        if (partDecoratorInstance) {
            partDecoratorInstance.notifyComponentEvent(componentList);
        }
    };

    PartBrowserWidget.prototype.setEnabled = function (partId, enabled) {
        var partContainerDiv = this._partDraggableEl[partId] ? this._partDraggableEl[partId] : undefined;

        if (partContainerDiv) {
            dragSource.enableDraggable(partContainerDiv, enabled);
            if (enabled) {
                partContainerDiv.fadeTo(1, 1);
            } else {
                partContainerDiv.fadeTo(1, 0.3);
            }
        }
    };

    return PartBrowserWidget;
});
