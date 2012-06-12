"use strict";

define(['./../../../../common/LogManager.js',
    './../../../../common/EventDispatcher.js',
    './../../util.js',
    './WidgetBase2.js',
    './../../NotificationManager.js',
    'text!ModelEditorHTML/ModelPortLeftTmpl.html',
    'text!ModelEditorHTML/ModelPortRightTmpl.html'], function (logManager,
                                              EventDispatcher,
                                              util,
                                              WidgetBase,
                                              notificationManager,
                                              modelPortLeftTmpl,
                                              modelPortRightTmpl) {

    //load its own CSS file (css/ModelEditorSVGWidget.css)
    util.loadCSS('css/ModelEditorPortWidget.css');

    var ModelEditorPortWidget2 = function (id, proj, options) {
        var logger,
            self = this,
            territoryId,
            skinContent = {},
            refresh,
            editNodeTitle,
            initialize,
            orientation = options.orientation || "W";

        $.extend(this, new WidgetBase(id, proj));

        //get logger instance for this component
        logger = logManager.create("ModelEditorPortWidget2_" + id);

        initialize = function () {
            var newPattern,
                node = self.project.getNode(self.getId()),
                concretePortTemplate = orientation === "W" ? modelPortLeftTmpl : modelPortRightTmpl,
                portDomString,
                data = {};

            data.name = node.getAttribute(self.nodeAttrNames.name);
            data.pid = node.getId();
            portDomString = _.template(concretePortTemplate, data);

            self.el = $(portDomString);
            self.skinParts.connectionPoint = self.el.find(".dot");
            self.skinParts.portTitle = self.el.find(".title");

            //hook up mouse events
            self.el.bind("mouseover", function () {
                self.el.addClass("activePort");
            });

            self.el.bind("mouseout", function () {
                self.el.removeClass("activePort");
            });

            self.el.draggable({
                helper: function () {
                    return $("<div class='ui-widget-drag-helper'></div>").data("id", self.getId());
                },
                scroll: true,
                cursor: 'pointer',
                cursorAt: {
                    left: 0,
                    top: 0
                },
                start: function (event, ui) {
                    self.el.addClass("connectionSource");
                    self.parentWidget.startPortConnection(self.getId());
                    event.stopPropagation();
                },
                stop: function (event, ui) {
                    self.parentWidget.endPortConnection(self.getId());
                    self.el.removeClass("connectionSource");
                    event.stopPropagation();
                },
                drag: function (event, ui) {
                }
            });

            self.el.droppable({
                accept: ".connectionSource",
                activeClass: "ui-state-active",
                hoverClass: "ui-state-hover",
                drop: function (event, ui) {
                    var srdId = ui.helper.data("id"),
                        trgtId = self.getId();

                    self.parentWidget.parentWidget.createConnection(srdId, trgtId);
                    event.stopPropagation();
                }
            });
        };

        this.addedToParent = function () {
            /*if (self.parentWidget) {
                self.parentWidget.childBBoxChanged(self);
            }*/
        };

        this.getConnectionPointCoordinate = function () {
            var pos = self.skinParts.connectionPoint.position(),
                w = self.skinParts.connectionPoint.width(),
                h = self.skinParts.connectionPoint.height(),
                mLeft = parseInt(self.skinParts.connectionPoint.css("margin-left"), 10),
                returnPos = {};

            returnPos.x = pos.left + mLeft + 2 + Math.floor(w / 2);
            returnPos.y = pos.top + 2 + Math.floor(h / 2);

            return returnPos;
        };

        this.getOrientation = function () {
            return orientation;
        };

        this.update = function (node) {
            self.skinParts.portTitle.html(node.getAttribute(self.nodeAttrNames.name));
        };

        initialize();
    };

    return ModelEditorPortWidget2;
});