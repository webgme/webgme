/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */

define([
    'js/Controls/PropertyGrid/Widgets/WidgetBase',
    'blob/BlobClient',
    'js/logger',
    'common/regexp',
    'css!./styles/BlobHashWidget.css'
], function (WidgetBase,
             BlobClient,
             Logger,
             REGEXP) {

    'use strict';

    var BlobHashWidget,
        BTN_READY = $('<a class="btn btn-mini btn-ready"><i class="glyphicon glyphicon-refresh" /></a>'),
        BTN_CLEAR = $('<a class="btn btn-mini btn-clear"><i class="glyphicon glyphicon-remove" /></a>'),
        INPUT_FIELD = $('<input type="text"/>'),
        WIDGET_BASE = $('<div class="blobhash-widget" />'),
        ASSET_LINK = $('<a class="blob-download-link" href="" target="_self"/>');

    BlobHashWidget = function (propertyDesc) {
        WidgetBase.call(this, propertyDesc);
        this._logger = Logger.create('gme:js:Controls:PropertyGrid:Widgets:BlobHashWidget',
            WebGMEGlobal.gmeConfig.client.log);

        this.__el = WIDGET_BASE.clone();
        this.el.append(this.__el);

        this.__assetLink = ASSET_LINK.clone();
        this.__el.append(this.__assetLink);

        this.__btnReady = BTN_READY.clone();
        this.__el.append(this.__btnReady);

        this.__btnClear = BTN_CLEAR.clone();
        this.__el.append(this.__btnClear);

        this.__input = INPUT_FIELD.clone();
        this.__el.append(this.__input);

        this.__targetHash = null;

        this.__bc = new BlobClient({logger: this._logger.fork('BlobClient')});
        this.__urlDownload = null;
        this.__fileInfo = null;
        this.propertyValue = null;

        this._attachHandlers();

        this.updateDisplay();
    };

    BlobHashWidget.prototype = Object.create(WidgetBase.prototype);
    BlobHashWidget.prototype.constructor = BlobHashWidget;

    BlobHashWidget.prototype._attachHandlers = function () {
        var self = this;

        this.__btnReady.on('click', function (e) {
            var input = self.__input.val();
            self.__bc.getMetadata(input, function (err, fileInfo) {
                if (err) {
                    //TODO may need a more appropriate error handling
                    self.__input.val('');
                } else {
                    self.__fileInfo = fileInfo;
                    self.propertyValue = input;
                    self.__urlDownload = self.__bc.getDownloadURL(input);
                }
                self.updateDisplay();
            });
        });

        this.__btnClear.on('click', function (e) {
            self.__fileInfo = null;
            self.propertyValue = null;
            self.__urlDownload = null;
            self.__input.val('');
            self.updateDisplay();
        });

        this.__input.on('change', function (e) {
            self.updateDisplay();
        });
    };

    BlobHashWidget.prototype._detachHandlers = function () {
        this.__btnClear.off('click');
        this.__btnReady.off('click');
        this.__input.off('change');
    };

    BlobHashWidget.prototype.updateDisplay = function () {
        var text,
            inputValue = this.__input.val() || '';
        if (this.propertyValue && this.propertyValue === inputValue) {
            // We already checked the things so we can just make it look like asset widget
            text = this.__fileInfo.name + ' (' + this._humanFileSize(this.__fileInfo.size) + ')';
            this.__input.hide();
            this.__assetLink.show();
            this.__assetLink.text(text);
            this.__assetLink.attr('title', text);
            this.__assetLink.attr('href', this.__urlDownload);
            this.__btnClear.disable(false);
            this.__btnReady.disable(true);
        } else {
            this.__fileInfo = null;
            this.propertyValue = null;
            this.__urlDownload = null;
            this.__input.show();
            this.__assetLink.hide();

            if (inputValue.length === 0) {
                this.__btnClear.disable(true);
                this.__btnReady.disable(true);
            } else {
                if (REGEXP.BLOB_HASH.test(inputValue)) {
                    this.__btnClear.disable(false);
                    this.__btnReady.disable(false);
                } else {
                    this.__btnClear.disable(false);
                    this.__btnReady.disable(true);
                }
            }
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    BlobHashWidget.prototype.setReadOnly = function (isReadOnly) {
        WidgetBase.prototype.setReadOnly.call(this, isReadOnly);

        if (isReadOnly) {
            this._detachHandlers();
        } else {
            this._attachHandlers();
        }
        this.updateDisplay();
    };

    BlobHashWidget.prototype._humanFileSize = function (bytes, si) {
        var thresh = si ? 1000 : 1024,
            units = si ?
                ['kB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'] :
                ['KiB', 'MiB', 'GiB', 'TiB', 'PiB', 'EiB', 'ZiB', 'YiB'],
            u = -1;

        if (bytes < thresh) {
            return bytes + ' B';
        }

        do {
            bytes = bytes / thresh;
            u += 1;
        } while (bytes >= thresh);

        return bytes.toFixed(1) + ' ' + units[u];
    };

    BlobHashWidget.prototype.destroy = function () {
        this._detachHandlers();
        clearTimeout(this.__timeoutId);
        WidgetBase.prototype.destroy.call(this);
    };

    return BlobHashWidget;

});