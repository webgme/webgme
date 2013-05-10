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



        this._widgetContainer = layoutManager.getMainPanelContainer();
        if (!this._widgetContainer) {
            this.logger.error("Invalid widgetContainer in params");
            throw "Invalid widgetContainer in params";
        }

        this._activeContoller = null;
        this._activeWidget = null;
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

        this._layoutManager._currentLayout.onCenterResize = function (w, h) {
            self.widgetContainerSizeChanged(w, h);
        };
    };

    VisualizerPanel.prototype._loadVisualizers = function () {
        var self = this;

        this.addRange(JSON.parse(VisualizersJSON), function () {
            self.setActiveVisualizer('DesignerCanvas_Model');
        });
    };

    VisualizerPanel.prototype._setActiveVisualizer = function (visualizer) {
        var WidgetClass,
            ControlClass;

        if (this._activeVisualizer !== visualizer && this._visualizers.hasOwnProperty(visualizer)) {

            this._activeVisualizer = visualizer;
            this._ul.find('> li').removeClass('active');
            this._ul.find('> li[data-id="' + visualizer + '"]').addClass('active');

            //destroy current controller and visualizer
            if (this._activeContoller && this._activeContoller.destroy) {
                this._activeContoller.destroy();
            }
            if (this._activeWidget && this._activeWidget.destroy) {
                this._activeWidget.destroy();
            }

            /*clear any leftover style --> should not happen, all the widgets needs to clean up after themselves, but...*/
            //this._widgetContainer.removeAttr("style").removeAttr("class");

            this._activeContoller = null;
            this._activeWidget = null;

            if (this._visualizers[visualizer]) {
                WidgetClass = this._visualizers[visualizer].widget;
                if (WidgetClass) {
                    var opts = {};
                    opts[PanelBaseWithHeader.OPTIONS.CONTAINER_ELEMENT] = this._widgetContainer;
                    this._activeWidget = new WidgetClass(opts);
                }

                ControlClass = this._visualizers[visualizer].control;
                if (ControlClass) {
                    this._activeContoller = new ControlClass({"client": this._client,
                        "widget": this._activeWidget});
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

            if (menuDesc.widgetJS && menuDesc.controlJS) {

                loaderDiv = $("<div/>", { "class": "vis-loader"});

                li.loader = new LoaderProgressBar({"containerElement": loaderDiv});
                li.loader.start();
                a.append(loaderDiv);

                require([menuDesc.widgetJS,
                    menuDesc.controlJS],
                    function (widgetClass, controlClass) {
                        self.logger.debug("downloaded: " + menuDesc.widgetJS + ", " + menuDesc.controlJS);
                        self._visualizers[menuDesc.id] = {"widget": widgetClass,
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

                this.logger.warning("The visualizer with the ID '" + menuDesc.id + "' is missing widgetJS or controlJS");

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

    VisualizerPanel.prototype.widgetContainerSizeChanged = function (nW, nH) {
        if (this._activeWidget && this._activeWidget.parentContainerSizeChanged) {
            this._activeWidget.parentContainerSizeChanged(nW, nH);
        }
    };

    VisualizerPanel.prototype.selectedObjectChanged = function (currentNodeId) {
        this._currentNodeID = currentNodeId;

        if (this._activeContoller) {
            this._activeContoller.selectedObjectChanged(this._currentNodeID);
        }
    };

    VisualizerPanel.prototype.setReadOnly = function (isReadOnly) {
        if (this._activeWidget) {
            if (this._activeWidget.setReadOnly) {
                this._activeWidget.setReadOnly(isReadOnly);
            } else {
                this.logger.error('Active widget does not support method "setReadOnly"!!!');
            }
        }
    };

    return VisualizerPanel;
});
