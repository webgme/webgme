/*globals define, $, WebGMEGlobal, console*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/util',
    'blob/BlobClient',
    'text!./templates/PluginResultsDialog.html',
    'css!./styles/PluginResultsDialog.css'
], function (clientUtil,
             BlobClient,
             pluginResultsDialogTemplate) {

    'use strict';

    var PluginResultsDialog,
        PLUGIN_RESULT_ENTRY_BASE = $('<div/>', {class: 'plugin-result'}),
        PLUGIN_RESULT_HEADER_BASE = $('<div class="alert"></div>'),
        RESULT_SUCCESS_CLASS = 'alert-success',
        RESULT_ERROR_CLASS = 'alert-danger',
        ICON_SUCCESS = $('<i class="glyphicon glyphicon-ok glyphicon glyphicon-ok"/>'),
        ICON_ERROR = $('<i class="glyphicon glyphicon-warning-sign glyphicon glyphicon-warning-sign"/>'),
        RESULT_NAME_BASE = $('<span/>', {class: 'title'}),
        RESULT_TIME_BASE = $('<span/>', {class: 'time'}),
        RESULT_DETAILS_BTN_BASE = $('<span class="btn btn-micro btn-details pull-right">Details</span>'),
        RESULT_DETAILS_BASE = $('<div/>', {class: 'messages collapse'}),
        MESSAGE_ENTRY_BASE = $('<div class="msg"><div class="msg-title"></div><div class="msg-body"></div></div>'),
        MESSAGE_ENTRY_NODE_BTN_BASE = $('<span class="btn btn-micro btn-node pull-right">Show node</span>'),
    //jscs:disable maximumLineLength
        RESULT_ARTIFACTS_BASE = $('<div class="artifacts collapse"><div class="artifacts-title">Generated artifacts</div><div class="artifacts-body"><ul></ul></div></div>'),
    //jscs:enable maximumLineLength
        ARTIFACT_ENTRY_BASE = $('<li><a href="#" target="_blank">Loading...</a></li>'),
        MESSAGE_PREFIX = 'Message #';

    PluginResultsDialog = function () {
    };

    PluginResultsDialog.prototype.show = function (client, pluginResults) {
        var self = this;

        this._dialog = $(pluginResultsDialogTemplate);
        this._client = client;
        this._initDialog(pluginResults);

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };


    PluginResultsDialog.prototype._initDialog = function (pluginResults) {
        var dialog = this._dialog,
            client = this._client,
            resultEntry,
            body = dialog.find('.modal-body'),
            UNREAD_CSS = 'unread',
            result,
            resultHeader,
            spanResultTitle,
            spanResultTime,
            messageContainer,
            resultDetailsBtn,
            messageEntry,
            messageEntryBtn,
            messages,
            j,
            artifactsContainer,
            artifacts,
            artifactsUL,
            artifactEntry,
            artifactEntryA,
            i,
            pluginName,
            pluginTime,
            blobClient,
            addArtifactUL;

        addArtifactUL = function (hash, ulE, bc) {
            bc.getArtifact(hash, function (err, artifact) {
                if (err) {
                    console.error(err);
                    return;
                }

                artifactEntry = ARTIFACT_ENTRY_BASE.clone();
                artifactEntryA = artifactEntry.find('a');
                //TODO: set the correct URL here
                artifactEntryA.attr('href', (new BlobClient()).getDownloadURL(hash));
                //TODO: set the correct link text here
                artifactEntryA.text(artifact.name);
                ulE.append(artifactEntry);
            });
        };

        for (i = 0; i < pluginResults.length; i += 1) {
            result = pluginResults[i];

            resultEntry = PLUGIN_RESULT_ENTRY_BASE.clone();

            if (result.__unread === true) {
                resultEntry.addClass(UNREAD_CSS);
                delete result.__unread;
            }

            resultHeader = PLUGIN_RESULT_HEADER_BASE.clone();
            if (result.getSuccess() === true) {
                resultHeader.append(ICON_SUCCESS.clone());
                resultHeader.addClass(RESULT_SUCCESS_CLASS);
            } else {
                resultHeader.addClass(RESULT_ERROR_CLASS);
                resultHeader.append(ICON_ERROR.clone());
            }

            pluginName = result.getPluginName ? result.getPluginName() : 'PluginName N/A';
            spanResultTitle = RESULT_NAME_BASE.clone();
            spanResultTitle.text(pluginName);
            resultHeader.append(spanResultTitle);

            pluginTime = result.getFinishTime ? clientUtil.formattedDate(new Date(result.getFinishTime()),
                'elapsed') : 'Time: N/A';
            spanResultTime = RESULT_TIME_BASE.clone();
            spanResultTime.text(pluginTime);
            resultHeader.append(spanResultTime);

            resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
            resultHeader.append(resultDetailsBtn);

            messageContainer = RESULT_DETAILS_BASE.clone();
            messages = result.getMessages();

            for (j = 0; j < messages.length; j += 1) {
                messageEntry = MESSAGE_ENTRY_BASE.clone();
                messageEntry.find('.msg-title').text(MESSAGE_PREFIX + (j + 1));
                if (messages[j].activeNode.id) {
                    messageEntryBtn = MESSAGE_ENTRY_NODE_BTN_BASE.clone();
                    messageEntry.append(messageEntryBtn);
                    messageEntry.find('.btn-node').attr('node-result-details', JSON.stringify(messages[j]));
                }
                messageEntry.find('.msg-body').html(messages[j].message);
                messageContainer.append(messageEntry);
            }

            artifactsContainer = undefined;

            blobClient = new BlobClient();

            artifacts = result.getArtifacts();
            if (artifacts.length > 0) {
                artifactsContainer = RESULT_ARTIFACTS_BASE.clone();
                artifactsUL = artifactsContainer.find('ul');
                for (j = 0; j < artifacts.length; j += 1) {
                    addArtifactUL(artifacts[j], artifactsUL, blobClient);
                }
            }

            resultEntry.append(resultHeader);

            if (artifactsContainer) {
                resultEntry.append(artifactsContainer);
            }

            resultEntry.append(messageContainer);

            body.append(resultEntry);
        }

        dialog.find('.btn-clear').on('click', function () {
            body.empty();
            pluginResults.splice(0, pluginResults.length);
        });

        dialog.on('click', '.btn-details', function (event) {
            var detailsBtn = $(this),
                messagesPanel = detailsBtn.parent().parent().find('.messages'),
                artifactsPanel = detailsBtn.parent().parent().find('.artifacts');

            messagesPanel.toggleClass('in');
            artifactsPanel.toggleClass('in');

            event.stopPropagation();
            event.preventDefault();
        });

        dialog.on('click', '.btn-node', function (/* event */) {
            var nodeBtn = $(this),
                resultEntry = JSON.parse(nodeBtn.attr('node-result-details')),
                node = client.getNode(resultEntry.activeNode.id),
                parentId = node ? node.getParentId() : null;

            //TODO maybe this could be done in a more nicer way
            if (typeof parentId === 'string') {
                WebGMEGlobal.State.registerActiveObject(parentId);
                WebGMEGlobal.State.registerActiveSelection([resultEntry.activeNode.id]);
            } else {
                WebGMEGlobal.State.registerActiveObject(resultEntry.activeNode.id);
            }
            dialog.modal('hide');
        });

    };


    return PluginResultsDialog;
});