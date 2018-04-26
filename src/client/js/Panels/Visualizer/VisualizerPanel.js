/*globals define, _, $, WebGMEGlobal, DEBUG, require*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/logger',
    'js/Loader/LoaderProgressBar',
    'js/Constants',
    'js/RegistryKeys',
    'js/PanelBase/PanelBaseWithHeader',
    'js/Panels/SplitPanel/SplitPanel',
    'css!./styles/VisualizerPanel.css'
], function (Logger,
             LoaderProgressBar,
             CONSTANTS,
             REGISTRY_KEYS,
             PanelBaseWithHeader,
             SplitPanel) {

    'use strict';

    var VisualizerPanel,
        VisualizersJSON = WebGMEGlobal.allVisualizers;

    VisualizerPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'Visualizer';
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = false;

        //call parent's constructor
        PanelBaseWithHeader.apply(this, [options]);

        this._client = params.client;
        this._layoutManager = layoutManager;

        /**
         *
         * @example
         * {
         *  ModelEditor: {
         *      id: "ModelEditor",
         *      panel: ModelEditorPanel constructor
         *  },
         *  MetaEditor: {
         *      id: "MetaEditor",
         *      panel: MetaEditorPanel constructor
         *  },
         *  ...
         * }
         * @private
         */
        this._visualizers = {};

        /**
         * @example
         * "ModelEditor"
         * @private
         */
        this.defaultVisualizerId = null;

        /**
         * @example
         * "MetaEditor"
         * @private
         */
        this._activeVisualizerId = null;

        this._activeNodeID = null;

        /**
         *
         * @example
         * ["ModelEditor", "MetaEditor", ...]
         * @private
         */
        this._validVisualizerIds = null;

        //initialize UI

        this._initialize();

        this._loadVisualizers();

        this.logger.debug('VisualizerPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(VisualizerPanel.prototype, PanelBaseWithHeader.prototype);

    VisualizerPanel.prototype._initialize = function () {
        var self = this,
            toolbar = WebGMEGlobal.Toolbar;

        //set Widget title
        this.setTitle('Visualizer');

        this.$el.addClass('visualizer-panel');

        //add toolbar controls
        toolbar.addSeparator();

        this._toolbarBtn = toolbar.addDropDownButton({
            title: 'Split Panels',
            icon: 'gme icon-gme_split-panels',
            menuClass: 'split-panel-dropdown-list',
            clickFn: function () {
                var maximized = self._splitPanel.isMaximized();

                self._toolbarBtn.clear();

                self._toolbarBtn.addButton({
                    text: maximized ? 'Exit maximize' : 'Maximize active panel',
                    title: maximized ? 'Shows all split panels' : 'Maximizes the active panel',
                    icon: 'split-panel-dropdown-icon glyphicon ' +
                    (maximized ? 'glyphicon-resize-small' : 'glyphicon-resize-full'),
                    disabled: self._splitPanel.getNumberOfPanels() === 1,
                    clickFn: function () {
                        self._splitPanel.maximize(!maximized, self._splitPanel._activePanelId);
                    }
                });

                self._toolbarBtn.addDivider();

                self._toolbarBtn.addButton({
                    text: 'Split vertically',
                    title: 'Splits the active panel vertically',
                    icon: 'fa fa-columns split-panel-dropdown-icon',
                    disabled: maximized,
                    clickFn: function () {
                        self._addNewPanel(true);
                    }
                });

                self._toolbarBtn.addButton({
                    text: 'Split horizontally',
                    title: 'Splits the active panel horizontally',
                    icon: 'fa fa-columns fa-rotate-270 split-panel-dropdown-icon',
                    disabled: maximized,
                    clickFn: function () {
                        self._addNewPanel();
                    }
                });

                self._toolbarBtn.addDivider();

                self._toolbarBtn.addButton({
                    text: 'Remove active panel',
                    title: 'Removes the active panel',
                    icon: 'fa fa-minus-circle split-panel-dropdown-icon',
                    disabled: maximized || self._splitPanel.getNumberOfPanels() === 1,
                    clickFn: function () {
                        self._deletePanel();
                    }
                });

                self._toolbarBtn.addButton({
                    text: 'Exit split mode',
                    title: 'Remove all but the active panel',
                    icon: 'fa fa-times-circle split-panel-dropdown-icon',
                    disabled: self._splitPanel.getNumberOfPanels() === 1,
                    clickFn: function () {
                        self._exitSplitMode();
                    }
                });
            }
        });

        this._panelVisContainer = $('<div/>');
        this._panelVisContainer.append($('<div class="pp">Visualizer Selector</div>'));
        this._ul = $('<ul class="nav nav-pills nav-stacked">');

        this._panelVisContainer.append(this._ul);

        this.$el.append(this._panelVisContainer);

        this.$el.on('click', 'ul > li:not(.active)', function (event) {
            var vizId = $(this).attr('data-id');

            self._setActiveVisualizer(vizId);
            event.stopPropagation();
            event.preventDefault();
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_TO_BE_ACTIVE_OBJECT, function (model, activeObjectId, opts) {
            if (opts.invoker !== self) {
                self._onSelectedObjectChanged(activeObjectId, opts);
            }
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_CLOSED, function (/* __project, nodeId */) {
            self._validVisualizerIds = null;
            self._exitSplitMode(true);
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_OPENED, function (/* __project, nodeId */) {
            self._validVisualizerIds = null;
            self._exitSplitMode(true);
        });

        this._client.addEventListener(CONSTANTS.CLIENT.BRANCH_CHANGED, function (/* __project, nodeId */) {
            self._validVisualizerIds = null;
            self._exitSplitMode(true);
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_VISUALIZER, function (model, activeVisualizer, opts) {
            var keepPrevPanelInstance = opts.invoker === self || opts.invoker === WebGMEGlobal.PanelManager;
            self._setActiveVisualizer(activeVisualizer, keepPrevPanelInstance);
        });

        this._splitPanel = new SplitPanel();
        this._layoutManager.addPanel('visualizerSplitPanel', this._splitPanel, 'center');
    };

    VisualizerPanel.prototype._onSelectedObjectChanged = function (currentNodeId, opts) {
        this._activeNodeID = currentNodeId;
        this._updateValidVisualizers(currentNodeId);
        this._updateListedVisualizers(!opts.suppressVisualizerFromNode);
    };

    VisualizerPanel.prototype._setActiveVisualizer = function (visualizerId, keepPrevPanelInstance) {
        var PanelClass,
            activePanel;

        if (this._activeVisualizerId !== visualizerId && this._visualizers.hasOwnProperty(visualizerId)) {
            this._activeVisualizerId = visualizerId;

            this._ul.find('> li').removeClass('active');
            this._ul.find('> li[data-id="' + visualizerId + '"]').addClass('active');

            if (keepPrevPanelInstance) {
                return;
            }

            // Destroy the previous visualizer.
            activePanel = WebGMEGlobal.PanelManager.getActivePanel();

            if (activePanel) {
                activePanel.destroy();
            }

            if (this._visualizers[visualizerId]) {
                PanelClass = this._visualizers[visualizerId].panel;
                if (PanelClass) {
                    activePanel = new PanelClass(this._layoutManager, {client: this._client});
                    activePanel[CONSTANTS.VISUALIZER_PANEL_IDENTIFIER] = this._visualizers[visualizerId].id;
                    this._splitPanel.updateActivePanel(activePanel);
                    // The new panel is activated and should be listening to state events of interest..
                }

                if (typeof this._activeNodeID === 'string') {
                    // ...so trigger an event about the active-object to get it started.

                    // First set the state to null silently so even the same object will trigger an event.
                    WebGMEGlobal.State.registerActiveObject(null, {silent: true});
                    WebGMEGlobal.State.registerActiveObject(this._activeNodeID, {invoker: this});
                }
            }

            WebGMEGlobal.State.registerActiveVisualizer(visualizerId, {invoker: this});
        }
    };

    VisualizerPanel.prototype._updateValidVisualizers = function (currentNodeId) {
        var node,
            validVisuals;
        // Update the validVisualizers
        if (typeof currentNodeId === 'string') {
            node = this._client.getNode(currentNodeId);
            if (node) {
                validVisuals = node.getRegistry(REGISTRY_KEYS.VALID_VISUALIZERS);
                if (validVisuals) {
                    this._validVisualizerIds = validVisuals.split(' ');

                    return;
                }
            } else {
                this.logger.error('could not load node in _updateValidVisualizers', currentNodeId);
            }
        } else {
            this.logger.debug('nodePath not given');
        }

        // Fall back on null -> all visualizers displayed
        this._validVisualizerIds = null;
    };

    VisualizerPanel.prototype._updateListedVisualizers = function (setActiveViz) {
        var self = this,
            currentNode = self._client.getNode(self._activeNodeID),
            idToElem = {},
            visualizerToSet,
            i,
            vizId,
            libraryRoot = false;

        function isAvailable(visualizerId) {
            var i;

            for (i = 0; i < VisualizersJSON.length; i += 1) {
                if (visualizerId === VisualizersJSON[i].id) {
                    return true;
                }
            }

            return false;
        }

        if (currentNode) {
            libraryRoot = currentNode.isLibraryRoot();
        }

        // For the active panel hide/show listed visualizers
        self._ul.children('li').each(function (index, _li) {
            var li = $(_li),
                id = li.attr('data-id');
            if (self._validVisualizerIds === null) {
                // By default fall back on showing all loaded visualizers.
                if (libraryRoot && id === 'SetEditor') {
                    li.hide();
                } else {
                    li.show();
                }
            } else {
                if (self._validVisualizerIds.indexOf(id) > -1 && (!libraryRoot || (libraryRoot && id !== 'SetEditor'))) {
                    li.show();
                } else {
                    li.hide();
                }

                idToElem[id] = li.detach();
            }
        });

        if (self._validVisualizerIds !== null) {
            // Reinsert the detached li-elements based on the specified order.
            for (i = 0; i < self._validVisualizerIds.length; i += 1) {
                vizId = self._validVisualizerIds[i];
                if (idToElem.hasOwnProperty(vizId)) {
                    self._ul.append(idToElem[vizId]);
                    idToElem[vizId] = null;
                }
            }

            // Finally append the hidden elements too.
            for (vizId in idToElem) {
                if (idToElem[vizId] !== null) {
                    self._ul.append(idToElem[vizId]);
                }
            }
        }

        this.updateContainerSize();

        if (self._validVisualizerIds) {
            visualizerToSet = self._validVisualizerIds[0];
            if (!isAvailable(visualizerToSet)) {
                //fallback to the global default
                visualizerToSet = self.defaultVisualizerId.id;
            }
        } else {
            // Set this to the global default if it is valid for the project
            visualizerToSet = self.defaultVisualizerId.id;
        }

        if (!isAvailable(visualizerToSet)) {
            if (isAvailable(CONSTANTS.DEFAULT_VISUALIZER)) {
                //fall back to model editor if nothing else works
                visualizerToSet = CONSTANTS.DEFAULT_VISUALIZER;
            } else {
                visualizerToSet = null;
            }
        }

        // Only set the visualizer only if we were able to select some valid one.
        if (setActiveViz && visualizerToSet) {
            //setTimeout(function () {
            self._setActiveVisualizer(visualizerToSet);
            //}, 0);
        }
    };

    VisualizerPanel.prototype._isAvailableVisualizer = function (visualizerId) {
        var i;

        for (i = 0; i < VisualizersJSON.length; i += 1) {
            if (visualizerId === VisualizersJSON[i].id) {
                return true;
            }
        }
        return false;
    };

    VisualizerPanel.prototype._loadVisualizers = function () {
        var self = this,
            defaultFromConst;

        // Set the default visualizer
        for (var i = VisualizersJSON.length; i--;) {
            if (VisualizersJSON[i].default) {
                self.defaultVisualizerId = VisualizersJSON[i];
            }

            // If no default given - use the one from constants.
            if (VisualizersJSON[i].id === CONSTANTS.DEFAULT_VISUALIZER) {
                defaultFromConst = VisualizersJSON[i];
            }
        }

        self.defaultVisualizerId = self.defaultVisualizerId || defaultFromConst;

        this.addRange(VisualizersJSON, function () {
            self._setActiveVisualizer(self.defaultVisualizerId.id);
        });
    };

    VisualizerPanel.prototype._removeLoader = function (li, loaderDiv) {
        if (li.loader) {
            li.loader.stop();
            li.loader.destroy();
            delete li.loader;
        }
        loaderDiv.remove();
    };

    VisualizerPanel.prototype._addNewPanel = function (vertical) {
        //find the selected on
        var activeLi = this._ul.find('li.active'),
            visualizerId = activeLi.attr('data-id') || this.defaultVisualizerId;

        if (this._splitPanel.canSplitActivePanel(vertical)) {
            this._activeVisualizerId = null;

            this._splitPanel.addPanel(vertical);

            this._setActiveVisualizer(visualizerId);
        } else {
            this._client.notifyUser({
                message: 'Active panel is too small to split ' + (vertical ? 'vertically' : 'horizontally') + '...',
                severity: 'warn'
            });
        }
    };

    VisualizerPanel.prototype._deletePanel = function () {
        var activePanel = WebGMEGlobal.PanelManager.getActivePanel();

        if (this._splitPanel.getNumberOfPanels() > 1) {
            if (activePanel) {
                activePanel.destroy();
            }

            this._splitPanel.deletePanel();
            // Split panel will register new active panel.
        } else {
            this._client.notifyUser({
                message: 'You cannot remove last visualizer panel...',
                severity: 'warn'
            });
        }
    };

    VisualizerPanel.prototype._exitSplitMode = function (force) {
        var activePanel;

        if (this._splitPanel.getNumberOfPanels() > 1) {

            this._splitPanel.deleteAllPanels();
            activePanel = WebGMEGlobal.PanelManager.getActivePanel();
            WebGMEGlobal.PanelManager.setActivePanel(null);
            WebGMEGlobal.PanelManager.setActivePanel(activePanel);
            //WebGMEGlobal.State.registerActiveObject(this._activeNodeID);
        } else if (!force) {
            this._client.notifyUser({
                message: 'There are no split panels..',
                severity: 'info'
            });
        }
    };

    /**********************************************************************/
    /***************     P U B L I C     A P I             ****************/
    /**********************************************************************/

    VisualizerPanel.prototype.add = function (menuDesc, callback) {
        var li = $('<li class="center pointer"><a class="btn-env" id=""></a></li>'),
            a = li.find('> a'),
            self = this,
            loaderDiv,
            doCallBack;

        doCallBack = function () {
            if (callback) {
                callback();
            }
        };

        if (menuDesc.DEBUG_ONLY === true && DEBUG !== true) {
            doCallBack();
            return;
        }

        if (this._visualizers[menuDesc.id]) {
            this.logger.warn('A visualizer with the ID "' + menuDesc.id + '" already exists...');
            doCallBack();
        } else {
            li.attr('data-id', menuDesc.id);
            a.text(menuDesc.title);

            this._ul.append(li);

            if (menuDesc.panel) {

                loaderDiv = $('<div/>', {class: 'vis-loader'});

                li.loader = new LoaderProgressBar({containerElement: loaderDiv});
                li.loader.start();
                a.append(loaderDiv);

                require([menuDesc.panel],
                    function (panelClass) {
                        self.logger.debug('downloaded: ' + menuDesc.panel);
                        self._visualizers[menuDesc.id] = {panel: panelClass, id: menuDesc.id};
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    },
                    function (err) {
                        var msg = 'Failed to download "' + err.requireModules[0] + '"';
                        //for any error store undefined in the list and the default decorator will be used on the canvas
                        self.logger.error(msg);
                        a.append(' <i class="glyphicon glyphicon-warning-sign" title="' + msg + '"></i>');
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    });
            } else {
                a.append(' <i class="glyphicon glyphicon-warning-sign"></i>');

                this.logger.warn('The visualizer with the ID "' + menuDesc.id + '" is missing "panel" or "control"');

                doCallBack();
            }
        }
    };

    VisualizerPanel.prototype.addRange = function (menuDescList, callback) {
        var queueLen = 0,
            len = menuDescList.length,
            i,
            callbackWrap;

        if (callback) {
            callbackWrap = function () {
                queueLen -= 1;
                if (queueLen === 0) {
                    callback();
                }
            };
        }

        for (i = 0; i < len; i += 1) {
            queueLen += 1;
            this.add(menuDescList[i], callbackWrap);
        }
    };

    return VisualizerPanel;
});
