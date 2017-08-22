/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'common/util/assert',
    'js/PanelBase/PanelBase',
    './SplitMaximizeButton',
    'css!./styles/SplitPanel.css'
], function (ASSERT, PanelBase, SplitMaximizeButton) {

    'use strict';

    var SPLIT_PANEL_CLASS = 'split-panel',
        PANEL_CONTAINER_CLASS = 'split-panel-panel-container',
        PANEL_ID_DATA_KEY = 'SPLIT_PANEL_ID',
        SPLITTER_ID_DATA_KEY = 'SPLIT_PANEL_SPLITTER_ID',
        SPLITTER_CLASS = 'splitter',
        SPLITTER_SIZE = 4,
        SPLITTER_RESIZE_CLASS = 'resize',
        MINIMUM_PANEL_SIZE = 50,
        SPLITTER_SNAP_FROM_DISTANCE = 0,
        SPLITTER_RESIZE_PADDING = 2,
        MINIMUM_RESCALE_WIDTH = 400,
        MINIMUM_RESCALE_HEIGHT = 400;

    function SplitPanel(/*layoutManager, params*/) {
        var options = {};
        //set properties from options
        options[PanelBase.OPTIONS.LOGGER_INSTANCE_NAME] = 'SplitPanel';

        //call parent's constructor
        PanelBase.apply(this, [options]);

        this._panelIdCounter = 1;
        this._activePanelId = null;

        this._maximized = false;
        /**
         *
         * @example
         * {
         *   1: {
         *     instance: ModelEditor instance,
         *     panelContainer: <div class=PANEL_CLASS_CONTAINER, data=.. 0>,
         *     splitters: {
         *          top: null,
         *          right: 1_2,
         *          bottom: null,
         *          left: null
         *     },
         *     currentSplitter: 1_2,
         *     maximized: false
         *   },
         *   2: {
         *     instance: MetaEditor instance,
         *     panelContainer: <div class=PANEL_CLASS_CONTAINER, data=.. 1>,
         *     splitters: {
         *          top: null,
         *          right: null,
         *          bottom: null,
         *          left: 1_2
         *     },
         *     currentSplitter: 1_2,
         *     maximized: true
         *   }
         * }
         * @private
         */
        this._panels = {};

        this._readOnly = false;

        this._splitterPos = 0.5;

        /**
         *
         * @example
         * {
         *   1_2: {
         *      vertical: true,
         *      el: $splitter,
         *      relPos: 0.5, // Range between 0 and 1
         *      x1: 50,
         *      y1: 0,
         *      x2: 50,
         *      y2, 100
         *   }
         * }
         * @private
         */
        this._splitters = {};

        //initialize UI
        this._initialize();

        this.logger.debug('SplitPanel ctor finished');
    }

    //inherit from PanelBaseWithHeader
    _.extend(SplitPanel.prototype, PanelBase.prototype);

    SplitPanel.prototype._initialize = function () {
        var self = this,
            panelContainer = $('<div/>', {class: PANEL_CONTAINER_CLASS});

        this.$el.addClass(SPLIT_PANEL_CLASS);

        // Add this first panel container ..
        this._activePanelId = '' + this._panelIdCounter;
        panelContainer.data(PANEL_ID_DATA_KEY, this._activePanelId);

        this.$el.append(panelContainer);

        this._panels[this._activePanelId] = {
            panelContainer: panelContainer,
            instance: null,
            eventHandler: self._attachActivateHandler(panelContainer),
            maximizeButton: new SplitMaximizeButton(this._activePanelId, this, panelContainer),
            splitters: {
                top: null,
                right: null,
                bottom: null,
                left: null
            },
            currentSplitter: null
        };

        // the panel instance is still null at this point.
        WebGMEGlobal.PanelManager.setActivePanel(null);

        this.$el.on('mousedown', '.' + SPLITTER_CLASS, function (event) {
            var el = $(this),
                splitterId = el.data(SPLITTER_ID_DATA_KEY);

            self._startPanelResize(splitterId, event);
            event.stopPropagation();
            event.preventDefault();
        });

        this._updateUI();
    };

    SplitPanel.prototype.setActivePanel = function (panelId) {
        var panel;

        if (typeof panelId === 'string') {
            panel = this._panels[panelId].instance;
            this._activePanelId = panelId;
            WebGMEGlobal.PanelManager.setActivePanel(panel);
        } else {
            this.logger.error('panel el did not have "', PANEL_ID_DATA_KEY, '" data.');
        }
    };

    SplitPanel.prototype.updateActivePanel = function (panel) {
        var activePanel = this._panels[this._activePanelId];

        // activePanel.panelContainer.empty();
        activePanel.instance = panel;
        activePanel.panelContainer.append(panel.$pEl);
        panel.afterAppend();

        WebGMEGlobal.PanelManager.setActivePanel(panel);
        //make sure that read-only info is passed down to the actual panels
        this.onReadOnlyChanged(this._readOnly);

        this._updateUI();
    };

    SplitPanel.prototype.addPanel = function (vertical) {
        var panelContainer = $('<div/>', {class: PANEL_CONTAINER_CLASS}),
            self = this,
            activePanelPos,
            newPanelId,
            splitterId,
            splitterEl;

        this._panelIdCounter += 1;

        newPanelId = '' + this._panelIdCounter;
        panelContainer.data(PANEL_ID_DATA_KEY, newPanelId);

        this.$el.append(panelContainer);
        this._panels[newPanelId] = {
            panelContainer: panelContainer,
            instance: null,
            eventHandler: self._attachActivateHandler(panelContainer),
            maximizeButton: new SplitMaximizeButton(newPanelId, self, panelContainer),
            splitters: {
                // Initially set splitters to same as panel splitting from.
                top: this._panels[this._activePanelId].splitters.top,
                right: this._panels[this._activePanelId].splitters.right,
                bottom: this._panels[this._activePanelId].splitters.bottom,
                left: this._panels[this._activePanelId].splitters.left
            },
            currentSplitter: null
        };

        splitterId = this._activePanelId + '_' + newPanelId;
        splitterEl = $('<div/>', {class: SPLITTER_CLASS});
        splitterEl.data(SPLITTER_ID_DATA_KEY, splitterId);
        this.$el.append(splitterEl);

        this._splitters[splitterId] = {
            vertical: !!vertical,
            el: splitterEl,
            relPos: 0.5,
            x1: 0,
            y1: 0,
            x2: 0,
            y2: 0
        };

        this._panels[newPanelId].currentSplitter = splitterId;
        this._panels[this._activePanelId].currentSplitter = splitterId;

        // top: 0
        // left: 0
        // width: 0
        // height: 0
        activePanelPos = this._panels[this._activePanelId].panelContainer.position();
        activePanelPos.width = this._panels[this._activePanelId].panelContainer.width();
        activePanelPos.heigth = this._panels[this._activePanelId].panelContainer.height();

        // Based on the splitting direction - update the splitters for the new and the active panel.
        if (vertical) {
            splitterEl.addClass('vertical');
            this._panels[newPanelId].splitters.left = splitterId;
            this._panels[this._activePanelId].splitters.right = splitterId;

            this._splitters[splitterId].x1 = this._splitters[splitterId].x2 = activePanelPos.left +
                activePanelPos.width * 0.5;

            this._splitters[splitterId].y1 = activePanelPos.top;
            this._splitters[splitterId].y2 = activePanelPos.top + activePanelPos.heigth;

            splitterEl.css({
                width: SPLITTER_SIZE,
                height: this._splitters[splitterId].y2 - this._splitters[splitterId].y1,
                top: this._splitters[splitterId].y1,
                left: this._splitters[splitterId].x1
            });
        } else {
            splitterEl.addClass('horizontal');
            this._panels[newPanelId].splitters.top = splitterId;
            this._panels[this._activePanelId].splitters.bottom = splitterId;

            this._splitters[splitterId].y1 = this._splitters[splitterId].y2 = activePanelPos.top +
                activePanelPos.heigth * 0.5;

            this._splitters[splitterId].x1 = activePanelPos.left;
            this._splitters[splitterId].x2 = activePanelPos.left + activePanelPos.width;

            splitterEl.css({
                width: this._splitters[splitterId].x2 - this._splitters[splitterId].x1,
                height: SPLITTER_SIZE,
                top: this._splitters[splitterId].y1,
                left: this._splitters[splitterId].x1
            });
        }

        this._activePanelId = newPanelId;
        WebGMEGlobal.PanelManager.setActivePanel(null);
        // Awaiting a call to updateActivePanel
    };

    SplitPanel.prototype.deletePanel = function () {
        var activePanel = this._panels[this._activePanelId],
            removedSplitterId = activePanel.currentSplitter,
            newActivePanelId,
            shiftSplitterType,
            panelIds,
            splitter,
            i;

        ASSERT(removedSplitterId, 'Panel did not have a currentSplitter');

        splitter = this._splitters[removedSplitterId];

        this._removeActivateHandler(activePanel.panelContainer, activePanel.eventHandler);
        activePanel.panelContainer.remove();

        delete this._panels[this._activePanelId];

        splitter.el.remove();
        delete this._splitters[removedSplitterId];

        if (splitter.vertical) {
            if (activePanel.splitters.left === removedSplitterId) {
                shiftSplitterType = 'right';
            } else if (activePanel.splitters.right === removedSplitterId) {
                shiftSplitterType = 'left';
            } else {
                throw new Error('Mismatch in vertical splitters during remove!');
            }
        } else {
            if (activePanel.splitters.top === removedSplitterId) {
                shiftSplitterType = 'bottom';
            } else if (activePanel.splitters.bottom === removedSplitterId) {
                shiftSplitterType = 'top';
            } else {
                throw new Error('Mismatch in horizontal splitters during remove!');
            }
        }

        // The shift has been determined - go through all panels and shift their splitters.
        panelIds = Object.keys(this._panels);

        for (i = 0; i < panelIds.length; i += 1) {
            if (this._panels[panelIds[i]].splitters[shiftSplitterType] === removedSplitterId) {
                this._panels[panelIds[i]].splitters[shiftSplitterType] = activePanel.splitters[shiftSplitterType];

                // If the panel lost its current splitter we need to assign a new one.
                if (this._panels[panelIds[i]].currentSplitter === removedSplitterId) {
                    this._panels[panelIds[i]].currentSplitter = this._getNewCurrentSplitter(this._panels[panelIds[i]]);
                    newActivePanelId = panelIds[i];
                }
            }
        }

        // If no panel shared the current splitter - a random panel will become the active one.
        this._activePanelId = newActivePanelId ? newActivePanelId : panelIds[0];

        if (this._activePanelId) {
            WebGMEGlobal.PanelManager.setActivePanel(this._panels[this._activePanelId].instance);
        } else {
            this.logger.error('Deleted last panel..');
        }

        this._updateUI();
    };

    SplitPanel.prototype.deleteAllPanels = function () {
        var panelIds = Object.keys(this._panels),
            splitterIds = Object.keys(this._splitters),
            i;

        if (this._maximized) {
            this._maximized = false;
        }

        for (i = 0; i < splitterIds.length; i += 1) {
            this._splitters[splitterIds[i]].el.remove();
            delete this._splitters[splitterIds[i]];
        }

        for (i = 0; i < panelIds.length; i += 1) {
            if (panelIds[i] === this._activePanelId) {
                this._panels[panelIds[i]].splitters.top = null;
                this._panels[panelIds[i]].splitters.left = null;
                this._panels[panelIds[i]].splitters.bottom = null;
                this._panels[panelIds[i]].splitters.right = null;
                this._panels[panelIds[i]].currentSplitter = null;
            } else {
                this._removeActivateHandler(this._panels[panelIds[i]].panelContainer,
                    this._panels[panelIds[i]].eventHandler);
                this._panels[panelIds[i]].instance.destroy();
                this._panels[panelIds[i]].panelContainer.remove();
                delete this._panels[panelIds[i]];
            }
        }

        this._updateUI();
    };

    SplitPanel.prototype.getNumberOfPanels = function () {
        return Object.keys(this._panels).length;
    };

    SplitPanel.prototype.canSplitActivePanel = function (vertical) {
        var splitters,
            min,
            max;

        if (typeof this._activePanelId !== 'string') {
            return false;
        }

        splitters = this._panels[this._activePanelId].splitters;

        if (vertical) {
            min = splitters.left ? this._splitters[splitters.left].x1 : 0;
            max = splitters.right ? this._splitters[splitters.right].x1 : this._width;
        } else {
            min = splitters.top ? this._splitters[splitters.top].y1 : 0;
            max = splitters.bottom ? this._splitters[splitters.bottom].y1 : this._height;
        }

        return (max - min) > (MINIMUM_PANEL_SIZE * 2 + SPLITTER_SIZE);
    };

    SplitPanel.prototype._getNewCurrentSplitter = function (p) {
        var MARGIN = 2,
            top = p.splitters.top && {
                x1: this._splitters[p.splitters.top].x1,
                x2: this._splitters[p.splitters.top].x2,
                y: this._splitters[p.splitters.top].y1,
                id: p.splitters.top
            },
            bottom = p.splitters.bottom && {
                x1: this._splitters[p.splitters.bottom].x1,
                x2: this._splitters[p.splitters.bottom].x2,
                y: this._splitters[p.splitters.bottom].y1,
                id: p.splitters.bottom
            },
            left = p.splitters.left && {
                y1: this._splitters[p.splitters.left].y1,
                y2: this._splitters[p.splitters.left].y2,
                x: this._splitters[p.splitters.left].x1,
                id: p.splitters.left
            },
            right = p.splitters.right && {
                y1: this._splitters[p.splitters.right].y1,
                y2: this._splitters[p.splitters.right].y2,
                x: this._splitters[p.splitters.right].x,
                id: p.splitters.right
            },
            candidate;

        function eq(a, b) {
            return (a >= b - MARGIN) && (a <= b + MARGIN);
        }

        // Find the first splitter that isn't intersected by any of the other splitters.

        function verticalCheck(vertical) {
            if (!vertical) {
                return null;
            }

            if (top) {
                if (bottom) {
                    if (eq(top.y, vertical.y1) && eq(bottom.y, vertical.y2)) {
                        //
                        // ----------------- top y
                        //   |         |y1
                        //   |         |
                        //   |         |y2
                        //------------------ bottom y
                        return vertical.id;
                    }
                } else if (eq(top.y, vertical.y1)) {
                    return vertical.id;
                }
            } else if (bottom) {
                if (eq(bottom.y, vertical.y2)) {
                    return vertical.id;
                }
            } else {
                return vertical.id;
            }

            return null;
        }

        function horizontalCheck(horizontal) {
            if (!horizontal) {
                return null;
            }

            if (left) {
                if (right) {
                    if (eq(left.x, horizontal.x1) && eq(right.x, horizontal.x2)) {
                        // left x      right x
                        //   |          |
                        //   |----------|
                        //   |x1      x2|
                        //   |          |
                        //   |----------|
                        //   |          |
                        return horizontal.id;
                    }
                } else if (eq(left.x, horizontal.x1)) {
                    return horizontal.id;
                }
            } else if (right) {
                if (eq(right.x, horizontal.x2)) {
                    return horizontal.id;
                }
            } else {
                return horizontal.id;
            }

            return null;
        }

        candidate = verticalCheck(left);
        if (candidate) {
            return candidate;
        }

        candidate = verticalCheck(right);
        if (candidate) {
            return candidate;
        }

        candidate = horizontalCheck(top);
        if (candidate) {
            return candidate;
        }

        candidate = horizontalCheck(bottom);
        if (candidate) {
            return candidate;
        }

        ASSERT(!(left || right || top || bottom), 'Should have found new currentSplitter');

        return null;
    };

    SplitPanel.prototype._getSplitterBoundary = function (splitterId) {
        var self = this,
            maxVal = this._splitters[splitterId].vertical ? this._width : this._height,
            minVal = 0;

        Object.keys(this._panels).forEach(function (pId) {
            var candidateVal;
            if (self._splitters[splitterId].vertical) {
                if (self._panels[pId].splitters.left === splitterId && self._panels[pId].splitters.right) {
                    candidateVal = self._splitters[self._panels[pId].splitters.right].x1;

                    maxVal = candidateVal < maxVal ? candidateVal : maxVal;
                }

                if (self._panels[pId].splitters.right === splitterId && self._panels[pId].splitters.left) {
                    candidateVal = self._splitters[self._panels[pId].splitters.left].x1;

                    minVal = candidateVal > minVal ? candidateVal : minVal;
                }
            } else {
                // horizontal splitter
                if (self._panels[pId].splitters.top === splitterId && self._panels[pId].splitters.bottom) {
                    candidateVal = self._splitters[self._panels[pId].splitters.bottom].y1;

                    maxVal = candidateVal < maxVal ? candidateVal : maxVal;
                }

                if (self._panels[pId].splitters.bottom === splitterId && self._panels[pId].splitters.top) {
                    candidateVal = self._splitters[self._panels[pId].splitters.top].y1;

                    minVal = candidateVal > minVal ? candidateVal : minVal;
                }
            }
        });

        return {
            min: minVal,
            max: maxVal
        };
    };

    SplitPanel.prototype._harmonizeSplitters = function () {
        // TODO: This should make sure that all splitters fill up the canvas exactly.
        // TODO: When we support loading of stored configurations this needs to be implemented.
    };

    SplitPanel.prototype._updateUI = function () {
        var self = this,
            panelIds = Object.keys(this._panels),
            splitterIds = Object.keys(this._splitters),
            newVertPos = {},
            newHorzPos = {},
            panel,
            panelPos,
            splitter,
            splitterBoundary,
            x1,
            y1,
            x2,
            y2,
            i;

        function updateVerticalPositions(splitterId, panelPos) {
            newVertPos[splitterId] = newVertPos[splitterId] || {y1: self._height, y2: 0};
            newVertPos[splitterId].y1 = panelPos.top < newVertPos[splitterId].y1 ?
                panelPos.top : newVertPos[splitterId].y1;

            newVertPos[splitterId].y2 = panelPos.top + panelPos.height > newVertPos[splitterId].y2 ?
                panelPos.top + panelPos.height : newVertPos[splitterId].y2;
        }

        function updateHorizontalPositions(splitterId, panelPos) {
            newHorzPos[splitterId] = newHorzPos[splitterId] || {x1: self._width, x2: 0};
            newHorzPos[splitterId].x1 = panelPos.left < newHorzPos[splitterId].x1 ?
                panelPos.left : newHorzPos[splitterId].x1;

            newHorzPos[splitterId].x2 = panelPos.left + panelPos.width > newHorzPos[splitterId].x2 ?
                panelPos.left + panelPos.width : newHorzPos[splitterId].x2;
        }

        // Update all panels sizes based on splitter positions.
        for (i = 0; i < panelIds.length; i += 1) {
            panel = this._panels[panelIds[i]];
            x1 = panel.splitters.left ? this._splitters[panel.splitters.left].x1 : 0;
            y1 = panel.splitters.top ? this._splitters[panel.splitters.top].y1 : 0;

            x2 = panel.splitters.right ? this._splitters[panel.splitters.right].x1 : this._width;
            y2 = panel.splitters.bottom ? this._splitters[panel.splitters.bottom].y1 : this._height;

            panel.panelContainer.css({
                width: x2 - x1,
                height: y2 - y1,
                top: y1,
                left: x1
            });

            if (panel.instance) {
                panel.instance.setSize(x2 - x1, y2 - y1);
            }
        }

        // Determine lengths of splitters.
        for (i = 0; i < panelIds.length; i += 1) {
            panel = this._panels[panelIds[i]];
            panelPos = panel.panelContainer.position();
            panelPos.height = panel.panelContainer.height();
            panelPos.width = panel.panelContainer.width();

            if (panel.splitters.left) {
                updateVerticalPositions(panel.splitters.left, panelPos);
            }

            if (panel.splitters.right) {
                updateVerticalPositions(panel.splitters.right, panelPos);
            }

            if (panel.splitters.top) {
                updateHorizontalPositions(panel.splitters.top, panelPos);
            }

            if (panel.splitters.bottom) {
                updateHorizontalPositions(panel.splitters.bottom, panelPos);
            }
        }

        // Update the length and relPos of the splitters.
        for (i = 0; i < splitterIds.length; i += 1) {
            splitter = this._splitters[splitterIds[i]];
            splitterBoundary = this._getSplitterBoundary(splitterIds[i]);

            if (splitter.vertical) {
                splitter.relPos = (splitter.x1 - splitterBoundary.min) / (splitterBoundary.max - splitterBoundary.min);
                splitter.y1 = newVertPos[splitterIds[i]].y1;
                splitter.y2 = newVertPos[splitterIds[i]].y2;
                splitter.el.css({
                    top: splitter.y1,
                    height: splitter.y2 - splitter.y1
                });
            } else {
                splitter.relPos = (splitter.y1 - splitterBoundary.min) / (splitterBoundary.max - splitterBoundary.min);
                splitter.x1 = newHorzPos[splitterIds[i]].x1;
                splitter.x2 = newHorzPos[splitterIds[i]].x2;
                splitter.el.css({
                    left: splitter.x1,
                    width: splitter.x2 - splitter.x1
                });
            }
        }

        if (self._maximized) {
            self._panels[self._activePanelId].panelContainer.css({
                width: self._width,
                height: self._height,
                top: 0,
                left: 0
            });
            self._panels[self._activePanelId].instance.setSize(self._width, self._height);
        }
    };

    /* OVERRIDE FROM WIDGET-WITH-HEADER */
    /* METHOD CALLED WHEN THE WIDGET'S READ-ONLY PROPERTY CHANGES */
    SplitPanel.prototype.onReadOnlyChanged = function (isReadOnly) {
        var self = this;
        //apply parent's onReadOnlyChanged
        PanelBase.prototype.onReadOnlyChanged.call(this, isReadOnly);

        this._readOnly = isReadOnly;

        Object.keys(this._panels).forEach(function (panelId) {
            if (self._panels[panelId].instance) {
                self._panels[panelId].instance.onReadOnlyChanged(isReadOnly);
            }
        });
    };

    SplitPanel.prototype.onResize = function (width, height) {
        var self = this,
            widthMultiplier,
            heightMultiplier;

        this.logger.debug('onResize --> width: ' + width + ', height: ' + height);

        width = width < MINIMUM_RESCALE_WIDTH ? MINIMUM_RESCALE_WIDTH : width;
        height = height < MINIMUM_RESCALE_HEIGHT ? MINIMUM_RESCALE_HEIGHT : height;

        widthMultiplier = width / this._width;
        heightMultiplier = height / this._height;

        this._width = width;
        this._height = height;

        this.$el.width(this._width);
        this.$el.height(this._height);

        // Update splitters sizes..
        Object.keys(this._splitters).forEach(function (id) {
            if (self._splitters[id].vertical) {
                self._splitters[id].x1 = self._splitters[id].x2 = Math.floor(self._splitters[id].x1 * widthMultiplier);
                self._splitters[id].el.css({
                    left: self._splitters[id].x1
                });
            } else {
                self._splitters[id].y1 = self._splitters[id].y2 = Math.floor(self._splitters[id].y1 * heightMultiplier);
                self._splitters[id].el.css({
                    top: self._splitters[id].y1
                });
            }
        });

        // We need to make sure that splitters sizes still apply after truncations...
        this._harmonizeSplitters();

        // .. which will update the panel size in _updateUI.
        this._updateUI();
    };

    /*** SPLITTER POSITION UPDATES ***/
    SplitPanel.prototype._startPanelResize = function (splitterId, event) {
        var self = this;

        this._splitterResize = this._splitters[splitterId].el.clone().addClass(SPLITTER_RESIZE_CLASS);
        this.$el.append(this._splitterResize);

        this._splitterResizePos = this._splitters[splitterId].relPos;
        this._splitStartMousePos = this._splitters[splitterId].vertical ? event.pageX : event.pageY;

        $(document).on('mousemove.SplitPanel', function (event) {
            self._onMouseMove(splitterId, event);
        });
        $(document).on('mouseup.SplitPanel', function (event) {
            self._onMouseUp(splitterId, event);
        });
    };

    SplitPanel.prototype._onMouseMove = function (splitterId, event) {
        var mousePos = this._splitters[splitterId].vertical ? event.pageX : event.pageY,
            mouseDelta = mousePos - this._splitStartMousePos,
            boundary = this._getSplitterBoundary(splitterId),
            resizeDelta = mouseDelta / (boundary.max - boundary.min),
            snapDistance = SPLITTER_SNAP_FROM_DISTANCE / (boundary.max - boundary.min),
            minPanelSize = MINIMUM_PANEL_SIZE / (boundary.max - boundary.min);

        this._splitterResizePos = this._splitters[splitterId].relPos + resizeDelta;

        if (this._splitterResizePos >= this._splitters[splitterId].relPos - snapDistance &&
            this._splitterResizePos <= this._splitters[splitterId].relPos + snapDistance) {
            this._splitterResizePos = this._splitters[splitterId].relPos;
        }

        if (this._splitterResizePos < minPanelSize) {
            this._splitterResizePos = minPanelSize;
        }

        if (this._splitterResizePos > 1 - minPanelSize) {
            this._splitterResizePos = 1 - minPanelSize;
        }

        this._updateSplitterResize(splitterId, boundary.min, boundary.max);
    };

    SplitPanel.prototype._updateSplitterResize = function (splitterId, minVal, maxVal) {
        var sw = SPLITTER_SIZE + 2 * SPLITTER_RESIZE_PADDING,
            sh = SPLITTER_SIZE + 2 * SPLITTER_RESIZE_PADDING,
            splitterLeft,
            splitterTop;

        if (this._splitters[splitterId].vertical) {
            sh = this._splitters[splitterId].y2 - this._splitters[splitterId].y1;
            splitterLeft = Math.floor(minVal + (maxVal - minVal - sw) * this._splitterResizePos);
        } else {
            sw = this._splitters[splitterId].x2 - this._splitters[splitterId].x1;
            splitterTop = Math.floor(minVal + (maxVal - minVal - sh) * this._splitterResizePos);
        }

        this._splitterResize.css({
            width: sw,
            height: sh,
            top: splitterTop,
            left: splitterLeft
        });
    };

    SplitPanel.prototype._onMouseUp = function (splitterId /*, event*/) {
        $(document).off('mousemove.SplitPanel');
        $(document).off('mouseup.SplitPanel');

        var pos = this._splitterResize.position();

        this._splitters[splitterId].relPos = this._splitterResizePos;

        if (this._splitters[splitterId].vertical) {
            this._splitters[splitterId].x1 = this._splitters[splitterId].x2 = pos.left;
            this._splitters[splitterId].el.css({
                left: pos.left
            });
        } else {
            this._splitters[splitterId].y1 = this._splitters[splitterId].y2 = pos.top;
            this._splitters[splitterId].el.css({
                top: pos.top
            });
        }

        this._splitterResize.remove();
        this._splitterResize = undefined;
        this._splitterResizePos = undefined;

        this._updateUI();
    };

    // Attaching/Detaching events handler for setting the active panel.
    // It is important to use event capturing (instead of bubbling) since the panel container is the top-most
    // element and it is crucial that it gets the mousedown event before any of the panel's child-elements.
    // If using bubbling - the panel's child-elements might prevent the event propagation which cannot be controlled
    // from this scope (and could even be part of libraries used in the panel).
    // N.B. JQuery does not support event capturing..
    SplitPanel.prototype._attachActivateHandler = function (panelContainer) {
        var self = this,
            handler = function (event) {
                var el = $(this),
                    panelId = el.data(PANEL_ID_DATA_KEY);
                self.setActivePanel(panelId);
            };

        panelContainer.get(0).addEventListener('mousedown', handler, true);

        return handler;
    };

    SplitPanel.prototype._removeActivateHandler = function (panelContainer, handler) {
        panelContainer.get(0).removeEventListener('mousedown', handler, true);

        return handler;
    };

    SplitPanel.prototype.isMaximized = function () {
        return this._maximized;
    };

    SplitPanel.prototype.maximize = function (setToMax, panelId) {
        var panelIds = Object.keys(this._panels),
            splitterIds = Object.keys(this._splitters),
            i;

        if (this._maximized === false) {
            this._maximized = true;

            for (i = 0; i < splitterIds.length; i += 1) {
                $(this._splitters[splitterIds[i]].el).hide();
            }

            for (i = 0; i < panelIds.length; i += 1) {
                if (panelIds[i] !== panelId) {
                    this._panels[panelIds[i]].panelContainer.hide();
                }
            }

            this.setActivePanel(panelId);
        } else {
            this._maximized = false;

            for (i = 0; i < splitterIds.length; i += 1) {
                $(this._splitters[splitterIds[i]].el).show();
            }

            for (i = 0; i < panelIds.length; i += 1) {
                if (panelIds[i] !== this._activePanelId) {
                    this._panels[panelIds[i]].panelContainer.show();
                }
            }
        }

        this._updateUI();
    };

    return SplitPanel;
});
