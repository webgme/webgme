/*globals define, WebGMEGlobal, $, require*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/logger', 'js/Loader/LoaderCircles'], function (Logger, LoaderCircles) {

    'use strict';

    var LayoutManager;

    LayoutManager = function () {
        this._currentLayout = undefined;
        this._currentLayoutName = undefined;
        this._logger = Logger.create('gme:LayoutManager:LayoutManager', WebGMEGlobal.gmeConfig.client.log);
        this._logger.debug('LayoutManager created.');
        this._startProgressBar();
        this._panels = {};
    };

    LayoutManager.prototype.loadLayout = function (layout, fnCallback) {
        var self = this,
            layoutPath = ['layout', layout, layout, layout].join('/');

        this._logger.debug('LayoutManager loadLayout...');

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
        this._logger.debug('Downloading layout "' + layout + '"...');

        require([layoutPath],
            function (Layout) {
                if (Layout) {
                    self._logger.debug('Layout "' + layout + '" has been downloaded...');
                    self._currentLayoutName = layout;
                    self._currentLayout = new Layout();
                    self._currentLayout.init();
                    if (fnCallback) {
                        fnCallback.call(self);
                    }
                } else {
                    self._logger.error('Layout "' + layout + '" has been downloaded...BUT UNDEFINED!!!');
                }
            },
            function (err) {
                //on error
                self._logger.error('Failed to load layout because of "' + err.requireType + '" with module "' +
                                   err.requireModules[0] + '"...');
            });
    };

    LayoutManager.prototype.loadPanel = function (params, fnCallback) {
        var self = this,
            panel = params.panel,
            container = params.container,
            rPath = ['panel', panel].join('/'),
            containerSizeUpdateFn,
            fn;

        this._logger.debug('LayoutManager loadPanel with name: "' + name + '", container: "' + container + '"');

        fn = function () {
            if (fnCallback) {
                fnCallback.call(self);
            }
        };

        if (this._panels[panel]) {
            this._logger.error('A Panel with the same name already exist!!!');
        } else {
            require([rPath],
                function (Panel) {
                    if (Panel) {
                        self._logger.debug('Panel "' + panel + '" has been downloaded...');
                        self._panels[panel] = new Panel(self, params.params);

                        containerSizeUpdateFn = self._currentLayout.addToContainer(self._panels[panel], container);
                        self._panels[panel].afterAppend();
                        self._panels[panel].setContainerUpdateFn(self._currentLayout, containerSizeUpdateFn);
                    } else {
                        self._logger.error('Panel "' + panel + '" has been downloaded...BUT UNDEFINED!!!');
                    }
                    fn(self._panels[panel]);
                },
                function (err) {
                    //on error
                    self._logger.error('Failed to load Panel "' + rPath + '" because of "' + err.requireType +
                                       '" with module "' + err.requireModules[0] + '"...');
                    fn();
                });
        }
    };

    LayoutManager.prototype.addPanel = function (name, panel, container) {
        this._panels[name] = panel;
        this._currentLayout.addToContainer(panel, container);
        panel.afterAppend();
    };

    LayoutManager.prototype.removePanel = function (name) {
        if (this._panels[name]) {
            this._currentLayout.remove(this._panels[name]);
            delete this._panels[name];
        }
    };

    LayoutManager.prototype._startProgressBar = function () {
        var loader;

        //start progressbar
        loader = new LoaderCircles({containerElement: $('body')});
        loader.start();
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
