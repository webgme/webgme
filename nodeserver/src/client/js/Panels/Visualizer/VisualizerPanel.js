"use strict";

define(['logManager',
    'loaderProgressBar',
    'commonUtil',
    'js/PanelBase/PanelBaseWithHeader',
    'text!js/Visualizers.json',
    'css!/css/Panels/Visualizer/VisualizerPanel'], function (logManager,
                                    LoaderProgressBar,
                                    commonUtil,
                                    PanelBaseWithHeader,
                                    VisualizersJSON) {

    var VisualizerPanel,
        __parent__ = PanelBaseWithHeader;

    VisualizerPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "Visualizer";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;
        this._layoutManager = layoutManager;

        //initialize UI
        this._initialize();

        this._activeContoller = null;
        this._activePanel = null;
        this._activeVisualizer = "";
        this._currentNodeID = null;
        this._visualizers = {};

        this._loadVisualizers();

        this.logger.debug("VisualizerPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(VisualizerPanel.prototype, __parent__.prototype);

    VisualizerPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("Visualizer");

        this._ul = $('<ul class="nav nav-pills nav-stacked">');

        this.$el.append(this._ul);

        this._ul.on('click', '> li', function (event) {
            var vis = $(this).attr("data-id");
            self._setActiveVisualizer(vis);
            event.stopPropagation();
            event.preventDefault();
        });

        this._client.addEventListener(this._client.events.SELECTEDOBJECT_CHANGED, function (__project, nodeId) {
            self.selectedObjectChanged(nodeId);
        });
    };

    VisualizerPanel.prototype._loadVisualizers = function () {
        var self = this;

        this.addRange(JSON.parse(VisualizersJSON), function () {
            self.setActiveVisualizer('ModelEditor');
        });
    };

    VisualizerPanel.prototype._setActiveVisualizer = function (visualizer) {
        var PanelClass,
            ControlClass;

        if (this._activeVisualizer !== visualizer && this._visualizers.hasOwnProperty(visualizer)) {

            //destroy current controller and visualizer
            if (this._activeContoller && this._activeContoller.destroy) {
                this._activeContoller.destroy();
            }
            if (this._activePanel && this._activePanel.destroy) {
                this._layoutManager.removePanel(this._activeVisualizer);
                this._activePanel.destroy();
            }

            this._activeVisualizer = visualizer;
            this._ul.find('> li').removeClass('active');
            this._ul.find('> li[data-id="' + visualizer + '"]').addClass('active');

            this._activeContoller = null;
            this._activePanel = null;

            if (this._visualizers[visualizer]) {
                PanelClass = this._visualizers[visualizer].panel;
                if (PanelClass) {
                    this._activePanel = new PanelClass(this._layoutManager, {'client': this._client});
                    this._layoutManager.addPanel(visualizer, this._activePanel, 'main');
                }

                ControlClass = this._visualizers[visualizer].control;
                if (ControlClass) {
                    this._activeContoller = new ControlClass({"client": this._client,
                        "panel": this._activePanel});
                }

                if (this._currentNodeID) {
                    if (this._activeContoller) {
                        this._activeContoller.selectedObjectChanged(this._currentNodeID);
                    }
                }
            }
        }
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

        if (menuDesc.DEBUG_ONLY === true && commonUtil.DEBUG !== true) {
            doCallBack();
            return;
        }

        if (this._visualizers[menuDesc.id]) {
            this.logger.warning("A visualizer with the ID '" + menuDesc.id + "' already exists...");
            doCallBack();
        } else {
            li.attr("data-id", menuDesc.id);
            a.text(menuDesc.title);

            this._ul.append(li);

            if (menuDesc.panel && menuDesc.control) {

                loaderDiv = $("<div/>", { "class": "vis-loader"});

                li.loader = new LoaderProgressBar({"containerElement": loaderDiv});
                li.loader.start();
                a.append(loaderDiv);

                require([menuDesc.panel,
                    menuDesc.control],
                    function (panelClass, controlClass) {
                        self.logger.debug("downloaded: " + menuDesc.panel + ", " + menuDesc.control);
                        self._visualizers[menuDesc.id] = {"panel": panelClass,
                            "control": controlClass};
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    },
                    function (err) {
                        var msg = "Failed to download '" + err.requireModules[0] + "'";
                        //for any error store undefined in the list and the default decorator will be used on the canvas
                        self.logger.error(msg);
                        a.append(' <i class="icon-warning-sign" title="' + msg + '"></i>');
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    });
            } else {
                a.append(' <i class="icon-warning-sign"></i>');

                this.logger.warning("The visualizer with the ID '" + menuDesc.id + "' is missing 'panel' or 'control'");

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
            }
        }

        for (i = 0; i < len; i += 1) {
            queueLen += 1;
            this.add(menuDescList[i], callbackWrap);
        }
    };

    VisualizerPanel.prototype.setActiveVisualizer = function (visualizer) {
        this._setActiveVisualizer(visualizer);
    };

    VisualizerPanel.prototype.selectedObjectChanged = function (currentNodeId) {
        this._currentNodeID = currentNodeId;

        if (this._activeContoller) {
            this._activeContoller.selectedObjectChanged(this._currentNodeID);
        }
    };

    return VisualizerPanel;
});
