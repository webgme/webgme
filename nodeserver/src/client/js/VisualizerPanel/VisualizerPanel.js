"use strict";

define(['logManager',
    'loaderProgressBar',
    'commonUtil',
    'css!VisualizerPanelCSS/VisualizerPanel'], function (logManager,
                                    LoaderProgressBar,
                                    commonUtil) {

    var VisualizerPanel;

    VisualizerPanel = function (params) {
        this._logger = logManager.create("VisualizerPanel_" + params.containerElement);

        this._el = $("#" + params.containerElement);

        if (this._el.length === 0) {
            this._logger.warning("VisualizerPanel's container control with id:'" + params.containerElement + "' could not be found");
            throw "VisualizerPanel's container control with id:'" + params.containerElement + "' could not be found";
        }

        this._client = params.client;
        if (!this._client) {
            this.logger.error("Invalid client in params");
            throw "Invalid client in params";
        }

        this._widgetContainer = params.widgetContainer;
        if (!this._widgetContainer) {
            this.logger.error("Invalid widgetContainer in params");
            throw "Invalid widgetContainer in params";
        }

        if (_.isString(this._widgetContainer)) {
            this._widgetContainer = $("#" + this._widgetContainer);
        }
        if (this._widgetContainer.length !== 1) {
            this.logger.error("Invalid widgetContainer in params");
            throw "Invalid widgetContainer in params";
        }

        this._activeContoller = null;
        this._activeWidget = null;
        this._activeVisualizer = "";
        this._currentNodeID = null;
        this._visualizers = {};

        this._initialize();

        this._logger.debug("Created");
    };

    VisualizerPanel.prototype._initialize = function () {
        var self = this;

        this._ul = $('<ul class="nav nav-pills nav-stacked">');

        this._el.append(this._ul);

        this._ul.on('click', '> li', function (event) {
            var vis = $(this).attr("data-id");
            self._setActiveVisualizer(vis);
            event.stopPropagation();
            event.preventDefault();
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
            this._widgetContainer.removeAttr("style").removeAttr("class");

            this._activeContoller = null;
            this._activeWidget = null;

            if (this._visualizers[visualizer]) {
                WidgetClass = this._visualizers[visualizer].widget;
                if (WidgetClass) {
                    this._activeWidget = new WidgetClass({"containerElement": this._widgetContainer});
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
        }

        if (menuDesc.DEBUG_ONLY === true && commonUtil.DEBUG !== true) {
            doCallBack();
            return;
        }

        if (this._visualizers[menuDesc.id]) {
            this._logger.warning("A visualizer with the ID '" + menuDesc.id + "' already exists...");
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
                        self._logger.debug("downloaded: " + menuDesc.widgetJS + ", " + menuDesc.controlJS);
                        self._visualizers[menuDesc.id] = {"widget": widgetClass,
                            "control": controlClass};
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    },
                    function (err) {
                        var msg = "Failed to download '" + err.requireModules[0] + "'";
                        //for any error store undefined in the list and the default decorator will be used on the canvas
                        self._logger.error(msg);
                        a.append(' <i class="icon-warning-sign" title="' + msg + '"></i>');
                        self._removeLoader(li, loaderDiv);
                        doCallBack();
                    });
            } else {
                a.append(' <i class="icon-warning-sign"></i>');

                this._logger.warning("The visualizer with the ID '" + menuDesc.id + "' is missing widgetJS or controlJS");

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

    return VisualizerPanel;
});
