"use strict";

// let require load all the toplevel needed script and call us on domReady
define(['logManager',
        'loaderCircles'], function (logManager,
                                    LoaderCircles) {

    var LayoutManager,
        LAYOUT_PATH = 'js/Layouts/',
        PANEL_PATH = 'js/Panels/';

    LayoutManager = function () {
        this._currentLayout = undefined;
        this._currentLayoutName = undefined;
        this._logger = logManager.create('LayoutManager');
        this._logger.debug('LayoutManager created.');
        this._startProgressBar();
        this._panels = {};
    };

    LayoutManager.prototype.loadLayout = function (layout, fnCallback) {
        var self = this;

        this._logger.warning('LayoutManager loadLayout...');

        //destroy existing
        if (this._currentLayout) {
            this._logger.debug('Destroying layout: ' + this._currentLayoutName);
            this._currentLayout.destroy();
            this._currentLayout = undefined;
            this._currentLayoutName = undefined;

            //just to make sure that HTML BODY is cleared out correctly
            $('body').empty();
        }

        this._startProgressBar();

        //load new one
        this._logger.warning("Downloading layout '" + layout + "'...");

        require([LAYOUT_PATH + layout],
            function (Layout) {
                if (Layout) {
                    self._logger.debug("Layout '" + layout + "' has been downloaded...");
                    self._currentLayoutName = layout;
                    self._currentLayout = new Layout();
                    self._currentLayout.init();
                    if (fnCallback) {
                        fnCallback.call(self);
                    }
                } else {
                    self._logger.error("Layout '" + layout + "' has been downloaded...BUT UNDEFINED!!!");
                }
            },
            function (err) {
                //on error
                self._logger.error("Failed to load layout because of '" + err.requireType + "' with module '" + err.requireModules[0] + "'...");
            });
    };

    LayoutManager.prototype.loadPanel = function (params, fnCallback) {
        var self = this,
            name = params.name,
            container = params.container,
            rPath = PANEL_PATH + name,
            fn;

        this._logger.warning('LayoutManager loadPanel with name: "' + name + '", container: "' + container + '"');

        fn = function () {
            if (fnCallback) {
                fnCallback.call(self);
            }
        };

        if (this._panels[name]) {
            this._logger.error('A Panel with the same name already exist!!!');
        } else {
            require([rPath],
                function (Panel) {
                    if (Panel) {
                        self._logger.debug("Panel '" + name + "' has been downloaded...");
                        self._panels[name] = new Panel(self, params.params);

                        self._currentLayout.addToContainer(self._panels[name], container);
                        self._panels[name].afterAppend();
                    } else {
                        self._logger.error("Panel '" + name + "' has been downloaded...BUT UNDEFINED!!!");
                    }
                    fn();
                },
                function (err) {
                    //on error
                    self._logger.error("Failed to load Panel '" + rPath + "' because of '" + err.requireType + "' with module '" + err.requireModules[0] + "'...");
                    fn();
                });
        }
    };

    LayoutManager.prototype.getMainPanelContainer = function () {
        if (this._currentLayout) {
            return this._currentLayout.getMainPanelContainer();
        }

        return undefined;
    };

    LayoutManager.prototype._startProgressBar = function () {
        var _loader;

        //start progressbar
        _loader = new LoaderCircles({"containerElement": $('body')});
        //_loader.setSize(100);
        _loader.start();
    };

    LayoutManager.prototype.setPanelReadOnly = function (readOnly) {
        var it;

        for (it in this._panels) {
            if (this._panels.hasOwnProperty(it)) {
                this._panels[it].setReadOnly(readOnly);
            }
        }
    };

    return LayoutManager;
});