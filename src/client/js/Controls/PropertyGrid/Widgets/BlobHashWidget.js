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
        BTN_CLEAR = $('<a class="btn btn-mini btn-clear"><i class="glyphicon glyphicon-remove" /></a>'),
        INPUT_FIELD = $('<input type="text" placeholder="Paste an exported blob-hash here"/>'),
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

        this.__btnClear = BTN_CLEAR.clone();
        this.__el.append(this.__btnClear);

        this.__input = INPUT_FIELD.clone();
        this.__el.append(this.__input);
        this.__input.attr('title', 'Paste or type in a valid blobhash. Once the input is checked the field will be' +
            'replaced with the link of the pointed blob.');

        this.__targetHash = null;

        this.__bc = new BlobClient({logger: this._logger.fork('BlobClient')});
        this.__urlDownload = null;
        this.__fileInfo = null;
        this.propertyValue = null;
        this.__gettingBlobInfo = false;

        this._attachHandlers();

        this.updateDisplay();
    };

    BlobHashWidget.prototype = Object.create(WidgetBase.prototype);
    BlobHashWidget.prototype.constructor = BlobHashWidget;

    BlobHashWidget.prototype._attachHandlers = function () {
        var self = this,
            justUpdate = function (event) {
                var clipboardText = null;
                if (event && event.originalEvent && event.originalEvent.clipboardData) {
                    clipboardText = event.originalEvent.clipboardData.getData('Text');
                }
                self.updateDisplay(clipboardText);
            };

        this.__btnClear.on('click', function (e) {
            self.__fileInfo = null;
            self.propertyValue = null;
            self.__urlDownload = null;
            self.__input.val('');
            self.updateDisplay();
        });

        this.__input.on('change', justUpdate);
        this.__input.on('paste', justUpdate);
        this.__input.on('keyup', justUpdate);
    };

    BlobHashWidget.prototype._detachHandlers = function () {
        this.__btnClear.off('click');
        this.__input.off('change');
        this.__input.off('paste');
        this.__input.off('keyup');
    };

    BlobHashWidget.prototype.updateDisplay = function (clipboardText) {
        var text,
            inputValue = this.__input.val() || clipboardText || '';
        if (this.propertyValue && this.propertyValue === inputValue) {
            // We already checked the things so we can just make it look like asset widget
            text = this.__fileInfo.name + ' (' + this.__bc.getHumanSize(this.__fileInfo.size) + ')';
            this.__input.hide();
            this.__assetLink.show();
            this.__assetLink.text(text);
            this.__assetLink.attr('title', text);
            this.__assetLink.attr('href', this.__urlDownload);
            this.__btnClear.disable(false);
        } else {
            this.__fileInfo = null;
            this.propertyValue = null;
            this.__urlDownload = null;
            this.__input.show();
            this.__assetLink.hide();

            if (inputValue.length === 0) {
                this.__btnClear.disable(true);

            } else {
                if (REGEXP.BLOB_HASH.test(inputValue)) {
                    this.__btnClear.disable(false);
                    this._getMetadata(inputValue);
                } else {
                    this.__btnClear.disable(false);
                }
            }
        }

        return WidgetBase.prototype.updateDisplay.call(this);
    };

    BlobHashWidget.prototype._getMetadata = function (blobHash) {
        var self = this;
        if (self.__gettingBlobInfo === false) {
            self.__gettingBlobInfo = true;
            self.__bc.getMetadata(blobHash, function (err, fileInfo) {
                self.__gettingBlobInfo = false;
                if (err) {
                    //TODO may need a more appropriate error handling
                    self.__input.val('');
                } else {
                    self.__fileInfo = fileInfo;
                    self.propertyValue = blobHash;
                    self.__urlDownload = self.__bc.getDownloadURL(blobHash);
                }
                self.updateDisplay();
            });
        }
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

    BlobHashWidget.prototype.destroy = function () {
        this._detachHandlers();
        WidgetBase.prototype.destroy.call(this);
    };

    return BlobHashWidget;

});