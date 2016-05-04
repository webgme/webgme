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
    'js/Toolbar/ToolbarDropDownButton',
    'js/Toolbar/ToolbarRadioButtonGroup',
    'css!./styles/PartBrowserWidget.css'
], function (Logger, CONSTANTS, dragSource, ToolbarDropDownButton, ToolbarRadioButtonGroup) {

    'use strict';

    var PartBrowserWidget,
        ALL_NSP = 'ALL',
        NO_LIBS = 'Exclude Libraries',
        PART_BROWSER_CLASS = 'part-browser',
        PART_CLASS = 'part',
        NAME_PART_CLASS = 'name-part';

    PartBrowserWidget = function (container /*, params*/) {
        this._logger = Logger.create('gme:Widgets:PartBrowser:PartBrowserWidget.DecoratorBase',
            WebGMEGlobal.gmeConfig.client.log);

        this._el = container;

        this._initialize();

        this._logger.debug('PartBrowserWidget ctor finished');
    };

    PartBrowserWidget.prototype._initialize = function () {
        var self = this;
        //set Widget title
        //this._el.addClass(PART_BROWSER_CLASS);
        this._showNamesOnly = true;
        this._container = $('<div/>');
        this._container.css({width: '100%', height: '100%'});
        this._toolbar = $('<div/>');
        this._partsContainer = $('<div/>');
        this._partsContainer.css({width: '100%', height: '100%'});
        this._partsContainer.addClass(PART_BROWSER_CLASS);
        this._list = $('<ul/>');
        this._list.addClass(PART_CLASS);
        this._namelist = $('<ul/>');
        this._namelist.addClass(NAME_PART_CLASS);
        //this._list.addClass(PART_BROWSER_CLASS);
        this._listSwitcher = new ToolbarRadioButtonGroup(function (data) {
            if (data.isList) {
                self._showNamesOnly = true;
                self._list.hide();
                self._namelist.show();
            } else {
                self._showNamesOnly = false;
                self._list.show();
                self._namelist.hide();
            }
        });

        this._listSwitcher.addButton({
            title: 'Decorated part list',
            icon: 'glyphicon glyphicon-th-large',
            data: {isList: false}
        });

        this._listSwitcher.addButton({
            title: 'Only part name list',
            icon: 'glyphicon glyphicon-list',
            data: {isList: true}
        });

        this._selector = new ToolbarDropDownButton({
            title: 'Namespace selector',
            showSelected: true,
            limitTxtLength: 8
        });

        this._toolbar.append(this._listSwitcher.el);
        this._toolbar.append(this._selector.el);
        this._partsContainer.append(this._list);
        this._partsContainer.append(this._namelist);
        this._parts = {};

        this._partDraggableEl = {};

        this._container.append(this._toolbar);
        this._container.append(this._partsContainer);
        this._el.append(this._container);

        // By default only names are listed.
        this._list.show();
        this._namelist.hide();
    };

    PartBrowserWidget.prototype.clear = function () {
        //remove the parts first to safely detach jQueryUI draggable
        for (var partId in this._parts) {
            if (this._parts.hasOwnProperty(partId)) {
                this.removePart(partId);
            }
        }

        this._list.empty();
        this._namelist.empty();
    };

    //jshint camelcase: false
    PartBrowserWidget.prototype.$_DOMBase = $('<div/>').attr({class: PART_CLASS});
    PartBrowserWidget.prototype.$_DOMBaseForName = $('<div/>').attr({class: NAME_PART_CLASS});

    PartBrowserWidget.prototype.addPart = function (partId, partDesc) {
        var partContainerDiv = this._getPartDiv(partId),
            partContainerLi = {
                decorated: $('<li />', {class: 'decorated-list-item'}),
                onlyName: $('<li />', {class: 'name-list-item'})
            },
            DecoratorClass = partDesc.decoratorClass,
            decoratorInstance;

        if (partContainerDiv.decorated.length > 0) {
            return this.updatePart(partId, partDesc);
        } else {
            partContainerDiv = {
                decorated: null,
                onlyName: null
            };

            decoratorInstance = new DecoratorClass({
                'preferencesHelper': partDesc.preferencesHelper,
                'aspect': partDesc.aspect
            });
            decoratorInstance.setControl(partDesc.control);
            decoratorInstance.setMetaInfo(partDesc.metaInfo);

            partContainerDiv.decorated = this.$_DOMBase.clone();
            partContainerDiv.decorated.attr({id: partId});

            partContainerDiv.onlyName = this.$_DOMBaseForName.clone();
            partContainerDiv.onlyName.attr({id: partId, title: partDesc.name});
            partContainerDiv.onlyName.append(partDesc.name);

            //render the part inside 'partContainerDiv'
            decoratorInstance.beforeAppend();
            partContainerDiv.decorated.append(decoratorInstance.$el);

            //store draggable DIV in list
            this._partDraggableEl[partId] = partContainerDiv;

            //add part's GUI
            this._list.append(partContainerLi.decorated.append(partContainerDiv.decorated));
            this._namelist.append(partContainerLi.onlyName.append(partContainerDiv.onlyName));

            decoratorInstance.afterAppend();

            this._makeDraggable({
                el: partContainerDiv.decorated,
                partDesc: partDesc,
                partId: partId
            });
            this._makeDraggable({
                el: partContainerDiv.onlyName,
                partDesc: partDesc,
                partId: partId,
                realDragTarget: partContainerDiv.decorated
            });

            this._parts[partId] = {
                decoratorInstance: decoratorInstance,
                decoratorClass: partDesc.decoratorClass,
                filtered: false
            };

            return decoratorInstance;
        }
    };

    PartBrowserWidget.prototype._makeDraggable = function (params) {
        var el = params.el,
            self = this,
            dragParams = {
                dragItems: function (el) {
                    return self.getDragItems(el);
                },
                dragEffects: function (el) {
                    return self.getDragEffects(el);
                },
                dragParams: function (el) {
                    return self.getDragParams(el);
                }
            };

        if (params.realDragTarget) {
            dragParams.helper = function (/*el, event, dragInfo*/) {
                return params.realDragTarget.clone();
            };
        }

        dragSource.makeDraggable(el, dragParams);
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
        var parts = {decorated: null, onlyName: null};
        parts.decorated = this._list.find('div.' + PART_CLASS + '[id="' + partId + '"]');
        parts.onlyName = this._namelist.find('div.' + NAME_PART_CLASS + '[id="' + partId + '"]');

        return parts;
    };

    PartBrowserWidget.prototype.removePart = function (partId) {
        var partContainer = this._getPartDiv(partId);

        if (partContainer && partContainer.decorated.length > 0) {
            dragSource.destroyDraggable(partContainer.decorated);
            dragSource.destroyDraggable(partContainer.onlyName);
            partContainer.decorated = partContainer.decorated.parent(); //this is the <li> contains the part
            partContainer.decorated.remove();
            partContainer.decorated.empty();
            partContainer.onlyName = partContainer.onlyName.parent(); //this is the <li> contains the part
            partContainer.onlyName.remove();
            partContainer.onlyName.empty();

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
                partContainerDiv.decorated.append(partDecoratorInstance.$el);
                partDecoratorInstance.afterAppend();
                partContainerDiv.onlyName.empty();
                partContainerDiv.onlyName.append(partDesc.name);

                //update in partList
                this._parts[partId].decoratorInstance = partDecoratorInstance;
                this._parts[partId].decoratorClass = partDesc.decoratorClass;

                this._logger.debug('DesignerItem\'s ["' + this.id + '"] decorator  has been updated.');

                return partDecoratorInstance;
            } else {
                //if decorator instance not changed
                //let the decorator instance know about the update
                partDecoratorInstance.update();

                //update name part
                partContainerDiv.onlyName.empty();
                partContainerDiv.onlyName.append(partDesc.name);
                //return undefined;

                return partDecoratorInstance;

            }
        } else {
            //not present in the list yet
            if (partContainerDiv.decorated.length === 0) {
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
            dragSource.enableDraggable(partContainerDiv.decorated, enabled);
            dragSource.enableDraggable(partContainerDiv.onlyName, enabled);
            if (enabled) {
                partContainerDiv.decorated.fadeTo(1, 1);
                partContainerDiv.onlyName.fadeTo(1, 1);
            } else {
                partContainerDiv.decorated.fadeTo(1, 0.3);
                partContainerDiv.onlyName.fadeTo(1, 0.3);
            }
        }
    };

    PartBrowserWidget.prototype.hidePart = function (partId, becauseFilter) {
        var partDiv = this._getPartDiv(partId);

        if (partDiv && partDiv.decorated && partDiv.onlyName) {
            if (becauseFilter) {

            }
            partDiv.decorated.hide();
            partDiv.onlyName.hide();
        } else {
            this._logger.warn('Unknown partId [' + partId + '] to hide.');
        }
    };

    PartBrowserWidget.prototype.showPart = function (partId/*, becauseFilter*/) {
        var partDiv = this._getPartDiv(partId);

        if (partDiv && partDiv.decorated && partDiv.onlyName) {
            partDiv.decorated.show();
            partDiv.onlyName.show();
        } else {
            this._logger.warn('Unknown partId [' + partId + '] to show.');
        }
    };

    PartBrowserWidget.prototype.getCurrentSelectorValue = function () {
        if (this._selector.el.is(':hidden')) {
            return '';
        }

        return this._selector.dropDownText() || '';
    };

    PartBrowserWidget.prototype.updateSelectorInfo = function (valueList) {
        var i,
            self = this,
            title,
            currentSelection = self.getCurrentSelectorValue(),
            selection = function (selectionData) {
                if (self._selector.dropDownText() !== selectionData.value) {
                    self._selector.dropDownText(selectionData.value);
                    self.onSelectorChanged(selectionData.value);
                }
            };

        self._selector.clear();

        for (i = 0; i < valueList.length; i += 1) {
            if (valueList[i] === '-') {
                self._selector.addDivider();
            } else {
                if (valueList[i] === ALL_NSP) {
                    title = 'Show all available meta nodes.';
                } else if (valueList[i] === NO_LIBS) {
                    title = 'Exclude meta nodes defined in attached libraries.';
                } else {
                    title = 'Show meta nodes from the library/namespace "' + valueList[i] + '".';
                }
                self._selector.addButton({
                    title: title,
                    text: valueList[i],
                    clickFn: selection,
                    data: {value: valueList[i]}
                });
            }
        }

        if (valueList.length === 0) {
            self._selector.hide();
        } else {
            self._selector.show();
            if (valueList.indexOf(currentSelection) === -1) {
                self._selector.dropDownText(valueList[0]);
                self.onSelectorChanged(valueList[0]);
            }
        }

    };

    PartBrowserWidget.prototype.onSelectorChanged = function (newValue) {
        this._logger.error('onSelectorChanged function should be overwritten for proper usage!', newValue);
    };

    return PartBrowserWidget;
});
