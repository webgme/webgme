"use strict";

define(['logManager',
    'loaderCircles',
    'text!html/Dialogs/Export/ExportDialog.html',
    'js/NodePropertyNames',
    'codemirror'], function (logManager,
                                         LoaderCircles,
                                         exportDialogTemplate,
                                         nodePropertyNames,
                                         CodeMirror) {

    var ExportDialog;

    ExportDialog = function (client) {
        this._logger = logManager.create("ExportDialog");

        this._client = client;

        this._logger.debug("Created");
    };

    ExportDialog.prototype.show = function () {
        this._initDialog();

        this._dialog.modal('show');
    };

    ExportDialog.prototype._initDialog = function () {
        var self = this;

        this._dialog = $(exportDialogTemplate);

        this._messagePanel = this._dialog.find('.fs-message');

        this._btnDownload = this._dialog.find('.btn-download');
        this._btnDownload.addClass("disabled");

        this._exportSourceNodeLabel = this._dialog.find('.alert-info');

        this._exportErrorLabel = this._dialog.find('.alert-error');
        this._exportErrorLabel.hide();

        this._txtExport = this._dialog.find('.txt-export');
        this._txtExport.hide();

        this._progressBarDiv = this._dialog.find('.progress-bar');

        this._dialog.on('shown', function () {
            self._doExport();
        });

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });
    };

    ExportDialog.prototype._doExport = function () {
        var self = this,
            actualBranchName = this._client.getActualBranch(),
            projectName = this._client.getActiveProject(),
            exportSourceNodeID = WebGMEGlobal.PanelManager.getActivePanel().getNodeID(),
            loader;

        if (exportSourceNodeID === undefined || exportSourceNodeID === null) {
            this._messagePanel.remove();
            this._btnDownload.remove();
            this._exportSourceNodeLabel.text('Invalid export source object...');
            this._exportSourceNodeLabel.removeClass('alert-info').addClass('alert-error');
        } else {
            var nodeName = exportSourceNodeID;
            var obj = this._client.getNode(exportSourceNodeID);
            if (obj) {
                nodeName = obj.getAttribute(nodePropertyNames.Attributes.name);
                if (!nodeName || nodeName === "") {
                    nodeName = exportSourceNodeID;
                }
            }
            this._exportSourceNodeLabel.text('Export source: ' + nodeName);
            loader = new LoaderCircles({"containerElement": this._dialog.find('.progress-bar').first()});
            loader.start();

            //start export
            this._client.dumpNodeAsync(exportSourceNodeID, function (err, result) {
                var content = JSON.stringify(result, null, 2);
                var fileName = projectName + "_" + actualBranchName + "_" + nodeName + ".WebGME.json";
                if (err) {
                    self._exportErrorLabel.text(err);
                    self._exportErrorLabel.show();
                } else {
                    self._makeFullScreen();
                    self._txtExport.show();

                    self._codeMirror = CodeMirror(self._txtExport[0], {
                        value: content,
                        mode:  "javascript",
                        readOnly: "true"
                    });

                    self._dialog.find('.CodeMirror').css('height','100%');

                    self._btnDownload.removeClass("disabled");
                    self._btnDownload.on('click', function (event) {
                        event.stopPropagation();
                        event.preventDefault();

                        var pom = document.createElement('a');
                        pom.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(content));
                        pom.setAttribute('download', fileName);
                        pom.click();
                    });

                    setTimeout(function () {
                        self._codeMirror.refresh();
                        self._codeMirror.focus();
                    }, 10);
                }

                loader.stop();
                self._progressBarDiv.remove();
            });
        }
    };

    ExportDialog.prototype._makeFullScreen = function () {
        var WINDOW_PADDING = 20,
            wH = $(window).height(),
            wW = $(window).width();

        var modalBody = this._dialog.find('.modal-body');

        var dialogHeaderH = this._dialog.find('.modal-header').outerHeight(true),
            dialogFooterH = this._dialog.find('.modal-footer').outerHeight(true),
            modalBodyVPadding = parseInt(modalBody.css('padding-top'), 10) + parseInt(modalBody.css('padding-bottom'), 10),
            dW,
            dH,
            staticContentHeight = 200;

        //make it almost full screen
        dW = wW - 2 * WINDOW_PADDING;
        dH = wH - 2 * WINDOW_PADDING;

        this._dialog.removeClass("fade");

        modalBody.css({"max-height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH,
            "height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH});

        this._dialog.css({"width": dW,
            "margin-left": dW / 2 * (-1),
            "margin-top": dH / 2 * (-1),
            "top": "50%"});

        this._txtExport.css({"height": dH - modalBodyVPadding - dialogHeaderH - dialogFooterH - staticContentHeight});
    };

    return ExportDialog;
});