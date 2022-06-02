/*globals define, WebGMEGlobal, DEBUG, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */


define([
    './DiagramDesignerWidget.OperatingModes',
    './DiagramDesignerWidget.Constants'
], function (DiagramDesignerWidgetOperatingModes,
             DiagramDesignerWidgetConstants) {

    'use strict';

    var DiagramDesignerWidgetToolbar;

    DiagramDesignerWidgetToolbar = function () {
    };

    DiagramDesignerWidgetToolbar.prototype._initializeToolbar = function () {
        var toolbar = WebGMEGlobal.Toolbar,
            self = this,
            btnIconBase = $('<i/>');

        this.toolbarItems = {};

        //if an external toolbar exist for the component
        if (toolbar) {
            this.toolbarItems.beginSeparator = toolbar.addSeparator();

            this.toolbarItems.btnGridLayouts = toolbar.addDropDownButton({
                title: 'Arrange items',
                icon: 'glyphicon glyphicon-th',
                //menuClass: 'split-panel-dropdown-list',
                clickFn: function () {
                    self.toolbarItems.btnGridLayouts.clear();

                    self.toolbarItems.btnGridLayouts.addButton({
                        text: 'Arrange items on canvas compactly',
                        title: 'Compact Grid Layout',
                        //icon: 'glyphicon glyphicon-th',
                        data: {mode: 'grid'},
                        clickFn: function (data) {
                            self.itemAutoLayout(data.mode);
                        }
                    });

                    self.toolbarItems.btnGridLayouts.addButton({
                        text: 'Arrange items on canvas sparsely',
                        title: 'Sparse Grid Layout',
                        //icon: 'glyphicon glyphicon-th-large',
                        data: {mode: 'cozygrid'},
                        clickFn: function (data) {
                            self.itemAutoLayout(data.mode);
                        }
                    });
                }
            });

            if (this._enableGrid) {
                this.toolbarItems.btnToggleGrid = toolbar.addButton({
                    title: 'Toggle Grid',
                    icon: 'fa fa-hashtag',
                    clickFn: function () {
                        self._toggleGrid(true);
                    }
                });

                if (this._displayGrid) {
                    this._displayGrid = false;
                    self._toggleGrid();
                }
            }

            WebGMEGlobal.State.on('change', (model, options) => {
                console.log(model, options);
                if (model.changed[DiagramDesignerWidgetConstants.__CONSTANTS.STATE_SHOW_HIDDEN]) {
                    console.log('showhidden changed', model);
                }
            });
            this.toolbarItems.btnToggleShowHidden = toolbar.addButton({
                title: 'Only show non-hidden elements',
                icon: 'glyphicon glyphicon-eye-close',
                clickFn: function () {
                    // $($(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).children('i')[0]).css('background-color','#A5AFBE');
                    if($(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).attr('style')) {
                        $(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).removeAttr('style');
                        $(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).attr('title', 'Only show non-hidden elements');
                    } else {
                        $(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).attr('style', 'background-color:#A5AFBE;');
                        $(self.toolbarItems.btnToggleShowHidden.el.children('a')[0]).attr('title', 'Show hidden elements as well');
                    }
                    WebGMEGlobal.State.toggleShowHiddenElements();
                }
            });
            WebGMEGlobal.State.setShowHiddenElements(true);

            if (DEBUG === true) {
                //progress text in toolbar for debug only
                this.toolbarItems.progressText = toolbar.addLabel();
            }

            this.toolbarItems.gridSeparator = toolbar.addSeparator();

            /************** ROUTING MANAGER SELECTION **************************/
            if (!this._disableConnectionRendering) {
                this.toolbarItems.radioButtonGroupRouteManager = toolbar.addRadioButtonGroup(function (data) {
                    self._onConnectionRouteManagerChanged(data.type);
                });


                this.toolbarItems.radioButtonGroupRouteManager.addButton({
                    title: 'Basic route manager',
                    icon: btnIconBase.clone().addClass('gme icon-gme_diagonal-arrow'),
                    selected: this._defaultConnectionRouteManagerType === 'basic',
                    data: {type: 'basic'}
                });

                this.toolbarItems.radioButtonGroupRouteManager.addButton({
                    title: 'Basic+ route manager',
                    icon: btnIconBase.clone().addClass('gme icon-gme_broken-arow'),
                    selected: this._defaultConnectionRouteManagerType === 'basic2',
                    data: {type: 'basic2'}
                });

                if (!this._disableAutoRouterOption) {
                    this.toolbarItems.radioButtonGroupRouteManager.addButton({
                        title: 'AutoRouter',
                        icon: btnIconBase.clone().addClass('gme icon-gme_broken-arrow-with-box'),
                        selected: this._defaultConnectionRouteManagerType === 'basic3',
                        data: {type: 'basic3'}
                    });
                }

                this.toolbarItems.routingManagerSeparator = toolbar.addSeparator();
            }
            /************** END OF - ROUTING MANAGER SELECTION **************************/

            this.toolbarItems.radioButtonGroupOperatingMode = toolbar.addRadioButtonGroup(function (data) {
                self.setOperatingMode(data.mode);
            });

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {
                    icon: 'glyphicon glyphicon-lock',
                    title: 'Read-only mode',
                    data: {mode: DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.READ_ONLY}
                }
            );

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {
                    icon: 'glyphicon glyphicon-move',
                    title: 'Design mode',
                    selected: true,
                    data: {mode: DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.DESIGN}
                }
            );

            this.toolbarItems.radioButtonGroupOperatingMode.addButton(
                {
                    icon: 'glyphicon glyphicon-eye-open',
                    title: 'Highlight mode',
                    data: {mode: DiagramDesignerWidgetOperatingModes.prototype.OPERATING_MODES.HIGHLIGHT}
                }
            );

            this.toolbarItems.modeSeparator = toolbar.addSeparator();

            if (DEBUG === true) {
                this.toolbarItems.btnXing = toolbar.addToggleButton({
                        icon: btnIconBase.clone().addClass('gme icon-gme_crossing-lines'),
                        title: 'Connection crossing bumps ON/OFF',
                        clickFn: function (data, isPressed) {
                            self._setConnectionXingJumpMode(isPressed);
                        }
                    }
                );

                this.toolbarItems.crossingLinesSeparator = toolbar.addSeparator();
            }

            if (this._lineStyleControls === true) {
                /************** START - VISUAL STYLE ARROWS *****************/
                this.toolbarItems.ddbtnConnectionArrowStart = toolbar.addDropDownButton({
                    title: 'Line start marker',
                    icon: 'glyphicon glyphicon-arrow-left',
                    menuClass: 'no-min-width'
                });
                this.toolbarItems.ddbtnConnectionPattern = toolbar.addDropDownButton({
                    title: 'Line pattern',
                    icon: 'glyphicon glyphicon-minus',
                    menuClass: 'no-min-width'
                });
                this.toolbarItems.ddbtnConnectionArrowEnd = toolbar.addDropDownButton({
                    title: 'Line end marker',
                    icon: 'glyphicon glyphicon-arrow-right',
                    menuClass: 'no-min-width'
                });
                this.toolbarItems.ddbtnConnectionLabelPlacement = toolbar.addDropDownButton({
                    title: 'Line label placement',
                    icon: 'fa fa-sliders fa-rotate-90',
                    menuClass: 'no-min-width'
                });

                this.toolbarItems.ddbtnConnectionLineWidth = toolbar.addDropDownButton({
                    title: 'Line width',
                    icon: btnIconBase.clone().addClass('gme icon-gme_lines'),
                    menuClass: 'no-min-width'
                });

                this.toolbarItems.ddbtnConnectionLineType = toolbar.addDropDownButton({
                    title: 'Line type',
                    icon: btnIconBase.clone().addClass('gme  icon-gme_curvy-line'),
                    menuClass: 'no-min-width'
                });

                var createArrowMenuItem = function (arrowType, isEnd) {
                    var size = arrowType === DiagramDesignerWidgetConstants.LINE_ARROWS.NONE ? '' : '-xwide-xlong',
                        startArrow = isEnd ? null : arrowType + size,
                        endArrow = isEnd ? arrowType + size : null;

                    return {
                        title: arrowType,
                        icon: self._createLineStyleMenuItem(null, null, null, startArrow, endArrow),
                        data: {
                            endArrow: endArrow,
                            startArrow: startArrow
                        },
                        clickFn: function (data) {
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
                    return {
                        title: pattern,
                        icon: self._createLineStyleMenuItem(null, null,
                            DiagramDesignerWidgetConstants.LINE_PATTERNS[pattern], null, null),
                        data: {pattern: pattern},
                        clickFn: function (data) {
                            var p = {};
                            p[DiagramDesignerWidgetConstants.LINE_PATTERN] =
                                DiagramDesignerWidgetConstants.LINE_PATTERNS[data.pattern];
                            self._setConnectionProperty(p);
                        }
                    };
                };

                var it;
                for (it in DiagramDesignerWidgetConstants.LINE_ARROWS) {
                    if (DiagramDesignerWidgetConstants.LINE_ARROWS.hasOwnProperty(it)) {
                        this.toolbarItems.ddbtnConnectionArrowStart.addButton(
                            createArrowMenuItem(DiagramDesignerWidgetConstants.LINE_ARROWS[it], false));

                        this.toolbarItems.ddbtnConnectionArrowEnd.addButton(
                            createArrowMenuItem(DiagramDesignerWidgetConstants.LINE_ARROWS[it], true));
                    }
                }

                for (it in DiagramDesignerWidgetConstants.LINE_PATTERNS) {
                    if (DiagramDesignerWidgetConstants.LINE_PATTERNS.hasOwnProperty(it)) {
                        this.toolbarItems.ddbtnConnectionPattern.addButton(createPatternMenuItem(it));
                    }
                }

                // Connection Label Placement
                this.toolbarItems.ddbtnConnectionLabelPlacement.addButton({
                    title: 'In the middle',
                    icon: self._createLineStyleMenuItem(null, null, null, null, null, null,
                        DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.MIDDLE),
                    clickFn: function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENT] =
                            DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.MIDDLE;
                        self._setConnectionProperty(p);
                    }
                });

                this.toolbarItems.ddbtnConnectionLabelPlacement.addButton({
                    title: 'Next to source',
                    icon: self._createLineStyleMenuItem(null, null, null, null, null, null,
                        DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.SRC),
                    clickFn: function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENT] =
                            DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.SRC;
                        self._setConnectionProperty(p);
                    }
                });

                this.toolbarItems.ddbtnConnectionLabelPlacement.addButton({
                    title: 'Next to destination',
                    icon: self._createLineStyleMenuItem(null, null, null, null, null, null,
                        DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.DST),
                    clickFn: function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENT] =
                            DiagramDesignerWidgetConstants.LINE_LABEL_PLACEMENTS.DST;
                        self._setConnectionProperty(p);
                    }
                });

                //fill linetype dropdown
                this.toolbarItems.ddbtnConnectionLineType.addButton({
                    title: 'Straight',
                    icon: self._createLineStyleMenuItem(),
                    clickFn: function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_TYPE] = DiagramDesignerWidgetConstants.LINE_TYPES.NONE;
                        self._setConnectionProperty(p);
                    }
                });

                this.toolbarItems.ddbtnConnectionLineType.addButton({
                    title: 'Bezier',
                    icon: self._createLineStyleMenuItem(null, null, null, null, null,
                        DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER),
                    clickFn: function (/*data*/) {
                        var p = {};
                        p[DiagramDesignerWidgetConstants.LINE_TYPE] = DiagramDesignerWidgetConstants.LINE_TYPES.BEZIER;
                        self._setConnectionProperty(p);
                    }
                });

                //fill linewidth dropdown
                var createWidthMenuItem = function (width) {
                    return {
                        title: width,
                        icon: self._createLineStyleMenuItem(width, null,
                            DiagramDesignerWidgetConstants.LINE_PATTERNS.SOLID, null, null),
                        data: {width: width},
                        clickFn: function (data) {
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
                this.toolbarItems.ddbtnConnectionLabelPlacement.enabled(false);
                /************** END OF - VISUAL STYLE ARROWS *****************/
            }

            //add fill color, text color, border color controls
            this.toolbarItems.cpFillColor = toolbar.addColorPicker({
                    icon: 'glyphicon glyphicon-tint',
                    title: 'Fill color',
                    colorChangedFn: function (color) {
                        self.onSelectionFillColorChanged(self.selectionManager.getSelectedElements(), color);
                    }
                }
            );

            this.toolbarItems.cpBorderColor = toolbar.addColorPicker({
                    icon: btnIconBase.clone().addClass('gme icon-gme_pen'),
                    title: 'Border color',
                    colorChangedFn: function (color) {
                        self.onSelectionBorderColorChanged(self.selectionManager.getSelectedElements(), color);
                    }
                }
            );

            this.toolbarItems.cpTextColor = toolbar.addColorPicker({
                    icon: 'glyphicon glyphicon-font',
                    title: 'Text color',
                    colorChangedFn: function (color) {
                        self.onSelectionTextColorChanged(self.selectionManager.getSelectedElements(), color);
                    }
                }
            );

            this.toolbarItems.cpFillColor.enabled(false);
            this.toolbarItems.cpBorderColor.enabled(false);
            this.toolbarItems.cpTextColor.enabled(false);

            if (this._defaultSearchUI === true) {
                this.toolbarItems.filterBox = toolbar.addTextBox(
                    {
                        prependContent: '<i class="glyphicon glyphicon-search"></i>&nbsp;',
                        placeholder: 'Find...',
                        textChangedFn: function (oldVal, newVal) {
                            self.searchManager.filterItems(newVal);
                        }
                    });
            }

            this.toolbarItems.printDiagram = toolbar.addButton({
                title: 'Print',
                icon: 'fa fa-print',
                clickFn: function () {
                    self.prepAndPrintCanvas();
                }
            });
        }

        this._toolbarInitialized = true;
    };

    DiagramDesignerWidgetToolbar.prototype._displayToolbarItems = function (options) {
        if (this._toolbarInitialized !== true) {
            this._initializeToolbar(options);
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
