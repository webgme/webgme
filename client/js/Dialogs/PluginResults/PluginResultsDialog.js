/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['clientUtil',
    'text!html/Dialogs/PluginResults/PluginResultsDialog.html',
    'css!/css/Dialogs/PluginResults/PluginResultsDialog'], function (clientUtil,
                                                                     pluginResultsDialogTemplate) {

    var PluginResultsDialog,
        PLUGIN_RESULT_ENTRY_BASE = $('<div/>', { 'class': 'plugin-result' }),
        PLUGIN_RESULT_HEADER_BASE = $('<div class="alert"></div>'),
        RESULT_SUCCESS_CLASS = 'alert-success',
        RESULT_ERROR_CLASS  = 'alert-error',
        ICON_SUCCESS = $('<i class="icon-ok"/>'),
        ICON_ERROR = $('<i class="icon-warning-sign"/>'),
        RESULT_NAME_BASE = $('<span/>', { 'class': 'title' }),
        RESULT_TIME_BASE = $('<span/>', { 'class': 'time' }),
        RESULT_DETAILS_BTN_BASE = $('<span class="btn-details pull-right">Details</span>'),
        RESULT_DETAILS_BASE = $('<div/>', {'class': 'messages collapse'}),
        MESSAGE_ENTRY_BASE = $('<div class="msg"><div class="msg-title"></div><div class="msg-body"></div></div>'),
        MESSAGE_PREFIX = 'Message #';

    PluginResultsDialog = function () {
    };

    PluginResultsDialog.prototype.show = function (pluginResults) {
        var self = this;

        this._dialog = $(pluginResultsDialogTemplate);
        this._initDialog(pluginResults);

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };


    PluginResultsDialog.prototype._initDialog = function (pluginResults) {
        var dialog = this._dialog,
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
            messages,
            j;

        for (var i = 0; i < pluginResults.length; i += 1) {
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

            var pluginName = result.getName ? result.getName() : 'PluginName N/A';
            spanResultTitle = RESULT_NAME_BASE.clone();
            spanResultTitle.text(pluginName);
            resultHeader.append(spanResultTitle);

            var pluginTime = result.getTime ? clientUtil.formattedDate(new Date(result.getTime()), 'elapsed') : 'Time: N/A';
            spanResultTime = RESULT_TIME_BASE.clone();
            spanResultTime.text(pluginTime);
            resultHeader.append(spanResultTime);

            resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
            resultHeader.append(resultDetailsBtn);

            messageContainer = RESULT_DETAILS_BASE.clone();
            messages = result.getMessages();

            for (j = 0; j < messages.length; j += 1) {
                messageEntry = MESSAGE_ENTRY_BASE.clone();
                messageEntry.find('.msg-title').text(MESSAGE_PREFIX + (j+1));
                messageEntry.find('.msg-body').html(JSON.stringify(messages[j], 0, 2).replace(/\n/g, '<br/>').replace(/  /g, '&nbsp;&nbsp;'));
                messageContainer.append(messageEntry);
            }

            resultEntry.append(resultHeader);
            resultEntry.append(messageContainer);

            body.append(resultEntry);
        }

        dialog.find('.btn-clear').on('click', function () {
            body.empty();
            pluginResults.splice(0, pluginResults.length);
        });

        dialog.on('click', '.btn-details', function (event) {
            var detailsBtn = $(this),
                messagesPanel = detailsBtn.parent().parent().find('.messages');

            messagesPanel.toggleClass('in');

            event.stopPropagation();
            event.preventDefault();
        });

    };


    return PluginResultsDialog;
});