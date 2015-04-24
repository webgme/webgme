/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['css!js/Loader/styles/LoaderProgressBar.css'], function () {

    'use strict';

    var LoaderProgressBar;

    LoaderProgressBar = function (params) {

        this._el = params.containerElement;

        if (this._el.length === 0) {
            throw 'LoaderProgressBar\'s container control with id:"' + params.containerElement + '" could not be found';
        }
    };

    LoaderProgressBar.prototype._initialize = function () {
        this._createElements();
    };

    LoaderProgressBar.prototype._removeElements = function () {
        if (this._loaderDiv) {
            this._loaderDiv.remove();
        }
        this._loaderDiv = null;
    };

    LoaderProgressBar.prototype._createElements = function () {
        if (!this._loaderDiv) {
            this._loaderDiv = $('<div/>', {class: 'loader-progressbar'});

            this._el.append(this._loaderDiv);

            //force reflow
            this._el.width();
        }
    };

    LoaderProgressBar.prototype.destroy = function () {
        this._removeElements();
    };

    LoaderProgressBar.prototype.stop = function () {
        this._removeElements();
    };

    LoaderProgressBar.prototype.start = function () {
        this._createElements();
    };

    return LoaderProgressBar;
});
