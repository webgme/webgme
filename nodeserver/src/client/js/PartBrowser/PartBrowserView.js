"use strict";

var __decoratorDir = 'ModelEditor2',
    __decoratorPath = './js/' + __decoratorDir + '/';

define(['logManager',
    'clientUtil',
    './../' + __decoratorDir + '/DefaultDecorator.js',
    'css!PartBrowserCSS/PartBrowserView.css'], function (logManager,
                                                         util,
                                                         DefaultDecorator) {

    var PartBrowserView;

    PartBrowserView = function (containerElement) {
        this._logger = logManager.create("PartBrowserView_" + containerElement);

        //Step 1: initialize object variables

        //default view size

        //STEP 2: initialize UI
        this._initializeUI(containerElement);
        if (this._el.length === 0) {
            this._logger.error("PartBrowserView can not be created");
            return undefined;
        }
        this._logger.debug("Created");
    };

    PartBrowserView.prototype._initializeUI = function (containerElement) {
        var self = this;

        //get container first
        this._el = $("#" + containerElement);
        if (this._el.length === 0) {
            this._logger.warning("PartBrowserView's container control with id:'" + containerElement + "' could not be found");
            return undefined;
        }

        this._el.addClass("partBrowser");

        this._list = $("<ul/>");

        this._el.append(this._list);
    };

    PartBrowserView.prototype.clear = function () {
        this._list.empty();
    };

    PartBrowserView.prototype.addPart = function (partDescriptor) {
        this._initializeDecorator(partDescriptor);
    };

    PartBrowserView.prototype._initializeDecorator = function (partDescriptor) {
        var decoratorName = partDescriptor.decorator,
            self = this;

        if (_.isString(decoratorName)) {
            //TODO: delete
            decoratorName = "ModelWithPortsDecorator";
            //TODO: enddelete
            decoratorName = __decoratorPath + decoratorName + '.js';

            this._logger.debug("require(['" + decoratorName + "'] - phase1");
            require([ decoratorName ],
                function (DecoratorClass) {
                    self._logger.debug("require(['" + decoratorName + "'] - phase3");
                    self._decoratorDownloaded(partDescriptor, DecoratorClass);
                },
                function (err) {
                    self._logger.error("Failed to load decorator because of '" + err.requireType + "' with module" + err.requireModules[0] + "'. Fallback to DefaultDecorator...");
                    //for any error use the default decorator, does not know anything, just displays a box and writes title
                    self._decoratorDownloaded(partDescriptor, DefaultDecorator);
                });
            this._logger.debug("require(['" + decoratorName + "'] - phase2");
        } else {
            this._logger.error("Invalid decorator name '" + decoratorName + "'");
        }
    };

    PartBrowserView.prototype._decoratorDownloaded = function (partDescriptor, DecoratorClass) {
        var partContainerLi = $("<li/>"),
            partContainerDiv,
            self = this,
            decoratorInstance = new DecoratorClass(partDescriptor, "PartBrowser");

        partContainerDiv = $("<div/>", { "id": partDescriptor.id,
            "class": "part",
            "data-kind": partDescriptor.kind,
            "data-name": partDescriptor.name});

        //render the part inside 'partContainerDiv'
        partContainerDiv.append(decoratorInstance.renderPartBrowserItem());

        //add part's GUI
        this._list.append(partContainerLi.append(partContainerDiv));

        //hook up draggable
        partContainerDiv.draggable({
            helper: function () {
                return $(this).clone();
            },
            zIndex: 200000,
            cursorAt: {
                left: 0,
                top: 0
            }
        });
    };

    return PartBrowserView;
});