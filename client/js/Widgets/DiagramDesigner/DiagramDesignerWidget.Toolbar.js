/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define(['./DiagramDesignerWidget.OperatingModes',
        './DiagramDesignerWidget.Constants'], function (DiagramDesignerWidgetOperatingModes,
                                                        DiagramDesignerWidgetConstants) {

    var DiagramDesignerWidgetToolbar;

    DiagramDesignerWidgetToolbar = function () {
    };

    DiagramDesignerWidgetToolbar.prototype._initializeToolbar = function () {
        var toolbar = WebGMEGlobal.Toolbar,
            self = this,
            btnIconBase = $('<i style="display: inline-block;width: 14px;height: 14px;line-height: 14px;vertical-align: text-top;background-repeat: no-repeat;"></i>');

        this.toolbarItems = {};

        //if and external toolbar exist for the component
        if (toolbar) {
            this.toolbarItems.beginSeparator = toolbar.addSeparator();

            if (DEBUG === true) {
                this.toolbarItems.btnGridLayout = toolbar.addButton({ "title": "Grid layout",
                     "icon": "icon-th",
                     "data": { "mode": "grid" },
                     "clickFn": function (data) {
                         self.itemAutoLayout(data.mode);
                     }
                });

                this.toolbarItems.btnCozyGridLayout = toolbar.addButton({ "title": "Cozy Grid layout",
                    "icon": "icon-th-large",
                    "data": { "mode": "cozygrid" },
                    "clickFn": function (data) {
                        self.itemAutoLayout(data.mode);
                    }
                });

                //progress text in toolbar for debug only
                this.toolbarItems.progressText = toolbar.addLabel();
            }

            /************** ROUTING MANAGER SELECTION **************************/
            this.toolbarItems.radioButtonGroupRouteManager = toolbar.addRadioButtonGroup(function (data) {
                self._onConnectionRouteManagerChanged(data.type);
            });

            this.toolbarItems.radioButtonGroupRouteManager.addButton({ "title": "Basic route manager",
                "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAIAAACQKrqGAAAALHRFWHRDcmVhdGlvbiBUaW1lAFdlZCAyMCBOb3YgMjAxMyAwODo0Mjo0MSAtMDYwMAuDmbEAAAAHdElNRQfdCxQPAB9Mix5AAAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAAAZ0Uk5TAOUANwAB2LGMvQAAAL9JREFUeNpjfGrOyEAcYIJQtzr2EaX0euvugoICIElYqWa1a3d3d3Fx8dXmnYQdoF3r3tnZWVJScrlxOwGlQKBb79nR0VFWVnaxfisBpUCg3+jd1tZWXl5+vnYzAaVAYNjs29raWllZebZ6I5C70L8VLsWINVxPV66vqamJiIi4cuVK7/2V2E2FANP2wPDw8BUrVgCV7s6cj0/pHK+Gy5cv/weDw4cP43MABOxIm3Ps2LETJ07s4rlGQCmBEMADAKRqUMky2DsIAAAAAElFTkSuQmCC)'),
                "data": { "type": "basic"}
            });

            this.toolbarItems.radioButtonGroupRouteManager.addButton({ "title": "Basic+ route manager",
                "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAIAAACQKrqGAAAALHRFWHRDcmVhdGlvbiBUaW1lAFdlZCAyMCBOb3YgMjAxMyAwODozMDoyNyAtMDYwMIPyYLIAAAAHdElNRQfdCxQOHybfFvLhAAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAAAZ0Uk5TAP8A/wD/N1gbfQAAAHpJREFUeNpj/P//PwNxgIlIdUDAAsQGBgbIQhcuXMCu9j8q0NfX/48DMGHqpIJb6W9qa2vrxo0bcYaAjo4OMhsIcnNzIVxGNMcB5eBsTk5OIPn9+/ewsLC6ujqG/7iBNhhkZWVBuCx4/BEcHKylpRUeHg7hMv4nOrkAAEbVjF45QyssAAAAAElFTkSuQmCC)'),
                "data": { "type": "basic2"}
            });

            this.toolbarItems.radioButtonGroupRouteManager.addButton({ "title": "AutoRouter",
                "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAIAAACQKrqGAAAALHRFWHRDcmVhdGlvbiBUaW1lAFdlZCAyMCBOb3YgMjAxMyAwODozMDoyNyAtMDYwMIPyYLIAAAAHdElNRQfdCxQOKAp9yT42AAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAAAZ0Uk5TAOUANwAB2LGMvQAAAIxJREFUeNpjfGrOyEAcYEHje/3Qw6puG8clFmRpIB9OYupngshhSmMCJiIdSppSFkwhXD5DV4rH0fgcMN+3+XTlenwOgIMVK1YASUfHnIpTU4AMRnhsQZz4588fuFJOTk4g+f3797CwsJRtDYx4ItbtixaQtLe3rz47nYADgoODtbS0bPsjIVxG4pMLAGzALHONeXRYAAAAAElFTkSuQmCC)'),
                "selected": true,
                "data": { "type": "basic3"}
            });
            /************** END OF - ROUTING MANAGER SELECTION **************************/

            this.toolbarItems.radioButtonGroupOperatingMode = toolbar.addRadioButtonGroup(function (data) {
                self.setOperatingMode(data.mode);
            });

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {"icon": "icon-lock",
                    "title": "Read-only mode",
                    "data": {"mode": DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.READ_ONLY}
                }
            );

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {"icon": "icon-move",
                    "title": "Design mode",
                    "selected": true,
                    "data": {"mode": DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN}
                }
            );

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {"icon": "icon-eye-open",
                    "title": "Highlight mode",
                    "data": {"mode": DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.HIGHLIGHT}
                }
            );


            this.toolbarItems.btnXing = toolbar.addToggleButton({
                    "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAIAAACQKrqGAAAALHRFWHRDcmVhdGlvbiBUaW1lAFdlZCAyMCBOb3YgMjAxMyAwOToxMDozMyAtMDYwMD7tJHsAAAAHdElNRQfdCxQPCi+QvcZmAAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAAAZ0Uk5TAP8A/wD/N1gbfQAAAJlJREFUeNpj+I8KjI2N/+MATAyo4N+/fww4ACNQOTI/OztbQEBAW1s7KiqKgFIgePz48apVq8TExGJjY1EkcLls6tSpixYtwudWOPD29r5x4waKA4BeZiAS4HLA/fv3a2pqiHLApk2b1NXVkUVYMBU9ePBg7dq1kpKSaOGFrjQ3N5efn19HRyciIoKAW0mIWDwAXamRkREupQApjcB/krw8sAAAAABJRU5ErkJggg==)'),
                    "title": "Connection crossing bumps ON/OFF",
                    "clickFn": function (data, isPressed) {
                        self._setConnectionXingJumpMode(isPressed);
                    }}
            );

            if (this._lineStyleControls === true) {
                /************** END OF - VISUAL STYLE ARROWS *****************/
                this.toolbarItems.ddbtnConnectionArrowStart = toolbar.addDropDownButton({ "title": "Line start marker", "icon": "icon-arrow-left", "menuClass": "no-min-width" });
                this.toolbarItems.ddbtnConnectionPattern = toolbar.addDropDownButton({ "title": "Line pattern", "icon": "icon-minus", "menuClass": "no-min-width" });
                this.toolbarItems.ddbtnConnectionArrowEnd = toolbar.addDropDownButton({ "title": "Line end marker","icon": "icon-arrow-right", "menuClass": "no-min-width" });

                this.toolbarItems.ddbtnConnectionLineWidth = toolbar.addDropDownButton({
                    "title": "Line width",
                    "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAAK3RFWHRDcmVhdGlvbiBUaW1lAFdlZCA1IEZlYiAyMDE0IDE1OjE0OjQ2IC0wNjAw56MnmwAAAAd0SU1FB94CBRURAg7EVwoAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAEZ0FNQQAAsY8L/GEFAAAAKUlEQVR42mP8z0AeYCJTHwMLiGBkYCDJYqBiRsah41SybRwJfhxCgQMAmmIKGzUyxp0AAAAASUVORK5CYII=)'),
                    "menuClass": "no-min-width" });

                this.toolbarItems.ddbtnConnectionLineType = toolbar.addDropDownButton({
                    "title": "Line type",
                    "icon": btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAIAAACQKrqGAAAAK3RFWHRDcmVhdGlvbiBUaW1lAEZyaSA2IERlYyAyMDEzIDE1OjE1OjUyIC0wNjAwvQqmVQAAAAd0SU1FB90MBhURF0gI0MAAAAAJcEhZcwAACxIAAAsSAdLdfvwAAAAEZ0FNQQAAsY8L/GEFAAAABnRSTlMA/wD/AP83WBt9AAAAuUlEQVR42mP8//8/A3GAiUh1KEp//fqFXykLhCorK3v+/LmkpGRXVxdOtUC35ufnb9myBcjYuHEjkP0fB2AGYhsbGx8fH6A2dXX1P3/+LFu2zMHBAYtbP3365OvrC+cD9Xz+/Pno0aPYHYAGTpw4gekMoAiWwDI3NxcQENiwYQNcZNOmTYKCggy4PFFYWAhUAfFrQUEBkMGIJ7bKy8ufPn0qLS3d2dkJ5OJTCgTAAGFhgYY9AaVkpgEAIAumySCHw2MAAAAASUVORK5CYII=)'),
                    "menuClass": "no-min-width" });

                var createArrowMenuItem = function (arrowType, isEnd) {
                    var size = arrowType === DiagramDesignerWidgetConstants.LINE_ARROWS.NONE ? "" : "-xwide-xlong",
                        startArrow = isEnd ? null : arrowType + size,
                        endArrow = isEnd ? arrowType + size : null;

                    return { "title": arrowType,
                        "icon": self._createLineStyleMenuItem(null, null, null, startArrow, endArrow),
                        "data": {'endArrow': endArrow,
                                 'startArrow': startArrow},
                        "clickFn": function (data) {
                            var p = {};
                            if (data.endArrow) {
                                p[DiagramDesignerWidgetConstants.LINE_END_ARROW] = data.endArrow;
                            }
                            if (data.startArrow) {
                                p[DiagramDesignerWidgetConstants.LINE_START_ARROW] = data.startArrow;
                            }
                            self._setConnectionProperty(p);
                        }
                    };
                };

                var createPatternMenuItem = function (pattern) {
                    return { "title": pattern,
                        "icon": self._createLineStyleMenuItem(null, null, DiagramDesignerWidgetConstants.LINE_PATTERNS[pattern], null, null),
                        "data": {'pattern': pattern},
                        "clickFn": function (data) {
                            var p = {};
                            p[DiagramDesignerWidgetConstants.LINE_PATTERN] = DiagramDesignerWidgetConstants.LINE_PATTERNS[data.pattern];
                            self._setConnectionProperty(p);
                        }
                    };
                };

                var it;
                for (it in DiagramDesignerWidgetConstants.LINE_ARROWS) {
                    if (DiagramDesignerWidgetConstants.LINE_ARROWS.hasOwnProperty(it)) {
                        this.toolbarItems.ddbtnConnectionArrowStart.addButton(createArrowMenuItem(DiagramDesignerWidgetConstants.LINE_ARROWS[it], false));
                        this.toolbarItems.ddbtnConnectionArrowEnd.addButton(createArrowMenuItem(DiagramDesignerWidgetConstants.LINE_ARROWS[it], true));
                    }
                }

                for (it in DiagramDesignerWidgetConstants.LINE_PATTERNS) {
                    if (DiagramDesignerWidgetConstants.LINE_PATTERNS.hasOwnProperty(it)) {
                        this.toolbarItems.ddbtnConnectionPattern.addButton(createPatternMenuItem(it));
                    }
                }

                //fill linetype dropdown
                this.toolbarItems.ddbtnConnectionLineType.addButton({ "title": 'Straight',
                    "icon": self._createLineStyleMenuItem(),
                    "clickFn": function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_TYPE] = DiagramDesignerWidgetConstants.LINE_TYPES.NONE;
                        self._setConnectionProperty(p);
                    }
                });

                this.toolbarItems.ddbtnConnectionLineType.addButton({ "title": 'Bezier',
                    "icon": self._createLineStyleMenuItem(null, null, null, null, null, DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER),
                    "clickFn": function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_TYPE] = DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER;
                        self._setConnectionProperty(p);
                    }
                });

                //fill linewidth dropdown
                var createWidthMenuItem = function (width) {
                    return { "title": width,
                        "icon": self._createLineStyleMenuItem(width, null, DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID, null, null),
                        "data": {'width': width},
                        "clickFn": function (data) {
                            var p = {};
                            p[DiagramDesignerWidgetConstants.LINE_WIDTH] = data.width;
                            self._setConnectionProperty(p);
                        }
                    };
                };

                for (it = 1; it < 10; it += 1) {
                    this.toolbarItems.ddbtnConnectionLineWidth.addButton(createWidthMenuItem(it));
                }

                this.toolbarItems.ddbtnConnectionArrowStart.enabled(false);
                this.toolbarItems.ddbtnConnectionPattern.enabled(false);
                this.toolbarItems.ddbtnConnectionArrowEnd.enabled(false);
                this.toolbarItems.ddbtnConnectionLineType.enabled(false);
                this.toolbarItems.ddbtnConnectionLineWidth.enabled(false);
                /************** END OF - VISUAL STYLE ARROWS *****************/
            }

            //add fill color, text color, border color controls
            this.toolbarItems.cpFillColor = toolbar.addColorPicker({'icon': 'icon-tint',
                'title': 'Fill color',
                'colorChangedFn': function (color) {
                    self.onSelectionFillColorChanged(self.selectionManager.getSelectedElements(), color);
                }}
            );

            this.toolbarItems.cpBorderColor = toolbar.addColorPicker({
                'icon':  btnIconBase.clone().css('background-image', 'url(data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAA4AAAAOCAYAAAAfSC3RAAAALHRFWHRDcmVhdGlvbiBUaW1lAFdlZCAxOSBGZWIgMjAxNCAxMzo1MjowNiAtMDYwMLm/hBUAAAAHdElNRQfeAhMTNg6sSN21AAAACXBIWXMAAAsSAAALEgHS3X78AAAABGdBTUEAALGPC/xhBQAAADNJREFUeNpjNDY2/s9AIjhz5gwjA0gjEDCgY0LiTKTaBgNDSCPjaKjSQCPZocoICiFyAADhMVpX3ZZoCgAAAABJRU5ErkJggg==)'),
                'title': 'Border color',
                'colorChangedFn': function (color) {
                    self.onSelectionBorderColorChanged(self.selectionManager.getSelectedElements(), color);
                }}
            );

            this.toolbarItems.cpTextColor = toolbar.addColorPicker({'icon': 'icon-font',
                'title': 'Text color',
                'colorChangedFn': function (color) {
                    self.onSelectionTextColorChanged(self.selectionManager.getSelectedElements(), color);
                }}
            );

            this.toolbarItems.cpFillColor.enabled(false);
            this.toolbarItems.cpBorderColor.enabled(false);
            this.toolbarItems.cpTextColor.enabled(false);

            if (this._defaultSearchUI === true) {
                this.toolbarItems.filterBox = toolbar.addTextBox(
                    {"prependContent": '<i class="icon-search"></i>',
                    "placeholder": "Find...",
                    "textChangedFn": function (oldVal, newVal) {
                        self.searchManager.filterItems(newVal);
                    }});
            }
        }

        this._toolbarInitialized = true;
    };

    DiagramDesignerWidgetToolbar.prototype._displayToolbarItems = function () {
        if (this._toolbarInitialized !== true) {
            this._initializeToolbar();
        } else {
            for (var i in this.toolbarItems) {
                if (this.toolbarItems.hasOwnProperty(i)) {
                    this.toolbarItems[i].show();
                }
            }
        }
    };

    DiagramDesignerWidgetToolbar.prototype._hideToolbarItems = function () {
        for (var i in this.toolbarItems) {
            if (this.toolbarItems.hasOwnProperty(i)) {
                this.toolbarItems[i].hide();
            }
        }
    };

    DiagramDesignerWidgetToolbar.prototype._removeToolbarItems = function () {
        for (var i in this.toolbarItems) {
            if (this.toolbarItems.hasOwnProperty(i)) {
                this.toolbarItems[i].destroy();
            }
        }
    };


    return DiagramDesignerWidgetToolbar;
});
