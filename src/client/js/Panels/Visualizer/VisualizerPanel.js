/*globals define, _, $, WebGMEGlobal, DEBUG, require*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
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

        //initialize UI
        this._initialize();

        this._activePanel = {};
        this._activeVisualizer = {};
        this._currentNodeID = null;
        this._visualizers = {};
        this._validVisualizers = null;
        this.defaultVisualizer = VisualizersJSON[0] || null;

        this._loadVisualizers();

        this.logger.debug('VisualizerPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(VisualizerPanel.prototype, PanelBaseWithHeader.prototype);

    VisualizerPanel.prototype._isAvailableVisualizer = function (visualizerId) {
        var i;

        for (i = 0; i < VisualizersJSON.length; i += 1) {
            if (visualizerId === VisualizersJSON[i].id) {
                return true;
            }
        }
        return false;
    };

    VisualizerPanel.prototype._initialize = function () {
        var self = this,
            toolbar = WebGMEGlobal.Toolbar,
            btnIconBase = $('<i/>');

        //set Widget title
        this.setTitle('Visualizer');

        this.$el.addClass('visualizer-panel');

        //add toolbar controls
        toolbar.addSeparator();

        toolbar.addToggleButton({
            title: 'Split view ON/OFF',
            icon: btnIconBase.clone().addClass('gme icon-gme_split-panels'),
            clickFn: function (data, toggled) {
                self._p2Editor(toggled);
            }
        });

        this._panel1VisContainer = $('<div/>');
        this._ul1 = $('<ul class="nav nav-pills nav-stacked">');
        this._ul1.attr('data-id', 'p1');
        this._panel1VisContainer.append($('<div class="pp">Panel 1:</div>'));
        this._panel1VisContainer.append(this._ul1);

        this.$el.append(this._panel1VisContainer);

        this.$el.on('click', 'ul > li:not(.active)', function (event) {
            var vis = $(this).attr('data-id'),
                ul = $(this).parent();
            self._setActiveVisualizer(vis, ul);
            event.stopPropagation();
            event.preventDefault();
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, function (model, activeObjectId) {
            self.selectedObjectChanged(activeObjectId);
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_CLOSED, function (/* __project, nodeId */) {
            self._p2Editor(false);
            self._validVisualizers = null;
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_OPENED, function (/* __project, nodeId */) {
            self._p2Editor(false);
            self._validVisualizers = null;
        });

        this._client.addEventListener(CONSTANTS.CLIENT.BRANCH_CHANGED, function (/* __project, nodeId */) {
            self._p2Editor(false);
            self._validVisualizers = null;
        });

        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_VISUALIZER, function (model, activeVisualizer) {
            if (self._settingVisualizer !== true) {
                self.setActiveVisualizer(activeVisualizer);
            }
        });

        this._splitPanel = new SplitPanel();
        this._layoutManager.addPanel('visualizerSplitPanel', this._splitPanel, 'center');
    };

    VisualizerPanel.prototype._loadVisualizers = function () {
        var self = this;

        // Set the default visualizer
        for (var i = VisualizersJSON.length; i--;) {
            if (VisualizersJSON[i].default) {
                self.defaultVisualizer = VisualizersJSON[i];
            }
        }

        this.addRange(VisualizersJSON, function () {
            self._setActiveVisualizer(self.defaultVisualizer.id, self._ul1);
        });
    };

    VisualizerPanel.prototype._setActiveVisualizer = function (visualizer, ul) {
        var PanelClass,
            panel = ul.attr('data-id');

        this._settingVisualizer = true;

        if (this._activeVisualizer[panel] !== visualizer && this._visualizers.hasOwnProperty(visualizer)) {
            //we should change the selected tab to 0 in case of visualizer change to get the 'default' behaviour
            //WebGMEGlobal.State.registerActiveTab(0);
            //WebGMEGlobal.State.set(CONSTANTS.STATE_ACTIVE_ASPECT, 'All');

            //destroy current visualizer
            if (this._activePanel[panel]) {
                this._activePanel[panel].destroy();
            }

            this._activeVisualizer[panel] = visualizer;
            ul.find('> li').removeClass('active');
            ul.find('> li[data-id="' + visualizer + '"]').addClass('active');

            this._activePanel[panel] = null;

            if (this._visualizers[visualizer]) {
                PanelClass = this._visualizers[visualizer].panel;
                if (PanelClass) {
                    this._activePanel[panel] = new PanelClass(this._layoutManager, {client: this._client});
                    this._activePanel[panel][CONSTANTS.VISUALIZER_PANEL_IDENTIFIER] = this._visualizers[visualizer].id;
                    this._splitPanel.setPanel(this._activePanel[panel], panel);
                }

                if (this._currentNodeID || this._currentNodeID === CONSTANTS.PROJECT_ROOT_ID) {
                    if (this._activePanel[panel] && this._activePanel[panel].control &&
                        _.isFunction(this._activePanel[panel].control.selectedObjectChanged)) {

                        this._activePanel[panel].control.selectedObjectChanged(this._currentNodeID);
                    }
                }
            }

            WebGMEGlobal.State.registerActiveVisualizer(visualizer);
        }

        this._settingVisualizer = false;
    };

    VisualizerPanel.prototype._updateValidVisualizers = function (currentNodeId) {
        var node,
            validVisuals;
        // Update the validVisualizers
        if (currentNodeId || currentNodeId === CONSTANTS.PROJECT_ROOT_ID) {
            node = this._client.getNode(currentNodeId);
            if (node) {
                validVisuals = node.getRegistry(REGISTRY_KEYS.VALID_VISUALIZERS);
                if (validVisuals) {
                    this._validVisualizers = validVisuals.split(' ');

                    return;
                }
            } else {
                this.logger.error('could not load node in _updateValidVisualizers', currentNodeId);
            }
        } else {
            this.logger.debug('nodePath not given');
        }
        this._validVisualizers = null;
    };

    VisualizerPanel.prototype._getActivePanelElem = function () {
        var panelListName = WebGMEGlobal.PanelManager.getActivePanel() === this._activePanel.p1 ? 'p1' : 'p2';
        return panelListName === 'p1' ? this._ul1 : this._ul2;
    };

    VisualizerPanel.prototype._updateListedVisualizers = function (setActiveViz) {
        var self = this,
            ul = this._getActivePanelElem(),
            currentNode = self._client.getNode(self._currentNodeID),
            idToElem = {},
            activeVisualizer,
            i,
            vizId,
            libraryRoot = false;

        if (currentNode) {
            libraryRoot = currentNode.isLibraryRoot();
        }
        // For the active panel hide/show listed visualizers
        ul.children('li').each(function (index, _li) {
            var li = $(_li),
                id = li.attr('data-id');
            if (self._validVisualizers === null) {
                // By default fall back on showing all loaded visualizers.
                if (libraryRoot && id === 'SetEditor') {
                    li.hide();
                } else {
                    li.show();
                }
            } else {
                if (self._validVisualizers.indexOf(id) > -1 && (!libraryRoot || (libraryRoot && id !== 'SetEditor'))) {
                    li.show();
                } else {
                    li.hide();
                }

                idToElem[id] = li.detach();
            }
        });

        if (self._validVisualizers !== null) {
            // Reinsert the detached li-elements based on the specified order.
            for (i = 0; i < self._validVisualizers.length; i += 1) {
                vizId = self._validVisualizers[i];
                if (idToElem.hasOwnProperty(vizId)) {
                    ul.append(idToElem[vizId]);
                    idToElem[vizId] = null;
                }
            }

            // Finally append the hidden elements too.
            for (vizId in idToElem) {
                if (idToElem[vizId] !== null) {
                    ul.append(idToElem[vizId]);
                }
            }
        }

        this.updateContainerSize();

        if (self._validVisualizers) {
            activeVisualizer = self._validVisualizers[0];
            if (!self._isAvailableVisualizer(activeVisualizer)) {
                //fallback to the global default
                activeVisualizer = self.defaultVisualizer.id;
            }
        } else {
            // Set this to the global default if it is valid for the project
            activeVisualizer = self.defaultVisualizer.id;
        }

        if (!self._isAvailableVisualizer(activeVisualizer)) {
            if (self._isAvailableVisualizer(CONSTANTS.DEFAULT_VISUALIZER)) {
                //fall back to model editor if nothing else works
                activeVisualizer = CONSTANTS.DEFAULT_VISUALIZER;
            } else {
                activeVisualizer = null;
            }
        }

        // Only set the visualizer only if we were able to select some valid one.
        if (setActiveViz && activeVisualizer) {
            setTimeout(function () {
                self._setActiveVisualizer(activeVisualizer, ul);
            }, 0);
        }
    };

    VisualizerPanel.prototype.setActiveVisualizer = function (visualizer) {
        this._setActiveVisualizer(visualizer, this._getActivePanelElem());
    };

    VisualizerPanel.prototype._removeLoader = function (li, loaderDiv) {
        if (li.loader) {
            li.loader.stop();
            li.loader.destroy();
            delete li.loader;
        }
        loaderDiv.remove();
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

            this._ul1.append(li);

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

    VisualizerPanel.prototype.selectedObjectChanged = function (currentNodeId) {
        this._currentNodeID = currentNodeId;
        this._updateValidVisualizers(currentNodeId);
        this._updateListedVisualizers(!WebGMEGlobal.State.getSuppressVisualizerFromNode());
    };

    VisualizerPanel.prototype._p2Editor = function (enabled) {
        var activeLi,
            vis,
            ul,
            panel;

        if (enabled) {
            //show 2 panels
            this._panel2VisContainer = this._panel1VisContainer.clone();
            this._ul2 = this._panel2VisContainer.find('ul');
            this._ul2.attr('data-id', 'p2');
            this._panel2VisContainer.find('.pp').text('Panel 2:');
            this.$el.append(this._panel2VisContainer);
            //find the selected on
            activeLi = this._panel2VisContainer.find('ul > li.active');
            vis = activeLi.attr('data-id');
            ul = activeLi.parent();
            this._setActiveVisualizer(vis, ul);
        } else {
            //destroy current controller and visualizer
            panel = 'p2';
            if (this._activePanel[panel] && this._activePanel[panel].destroy) {
                this._activePanel[panel].destroy();
            }

            this._activePanel[panel] = null;
            this._activeVisualizer[panel] = null;

            if (this._panel2VisContainer) {
                this._panel2VisContainer.remove();
                this._panel2VisContainer = undefined;
                this._splitPanel.deletePanel('p2');
                delete this._ul2;
            }

            WebGMEGlobal.State.registerActiveObject(this._currentNodeID);
        }

        this.updateContainerSize();
    };

    return VisualizerPanel;
});
