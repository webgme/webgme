/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author kecso / https://github.com/kecso
 */

define(['js/util',
    'common/regexp',
    'js/logger',
    'text!./templates/ConstraintCheckResultsDialog.html',
    'css!./styles/ConstraintCheckResultsDialog.css'
], function (clientUtil, REGEXP, Logger, pluginResultsDialogTemplate) {

    'use strict';

    var ConstraintCheckResultsDialog = function (title) {
            this._dialogTitle = title;
            this.logger = Logger.create('gme:Dialogs:ConstraintCheckResults:ConstraintCheckResultsDialog',
                WebGMEGlobal.gmeConfig.client.log);
            this.logger.debug('ctor');
        },
        PLUGIN_RESULT_ENTRY_BASE = $('<div/>', {class: 'constraint-check-result'}),
        PLUGIN_RESULT_HEADER_BASE = $('<div class="alert"></div>'),
        RESULT_SUCCESS_CLASS = 'alert-success',
        RESULT_ERROR_CLASS = 'alert-danger',
        ICON_SUCCESS = $('<i class="glyphicon glyphicon-ok"/>'),
        ICON_ERROR = $('<i class="glyphicon glyphicon-warning-sign"/>'),
        RESULT_NAME_BASE = $('<span/>', {class: 'title'}),
        RESULT_TIME_BASE = $('<span/>', {class: 'time'}),
    //jscs:disable maximumLineLength
        RESULT_DETAILS_BTN_BASE = $('<span class="btn btn-micro btn-details pull-right result-details"><i class="glyphicon glyphicon-plus"/></span>'),
    //jscs:enable maximumLineLength
        RESULT_DETAILS_BASE = $('<div/>', {class: 'messages collapse'}),
        NODE_ENTRY_BASE = $('<div/>', {class: 'constraint-check-result'}),
    //jscs:disable maximumLineLength
        NODE_BTN_BASE = $('<span class="btn btn-micro btn-node pull-left"><i class="glyphicon glyphicon-link"/></span>'),
    //jscs:enable maximumLineLength
        MESSAGE_ENTRY_BASE = $('<div class="msg"><div class="msg-title"></div><div class="msg-body"></div></div>');

    ConstraintCheckResultsDialog.prototype.show = function (client, pluginResults) {
        var self = this;

        this._dialog = $(pluginResultsDialogTemplate);
        if (this._dialogTitle) {
            this._dialog.find('h3').first().text(this._dialogTitle);
        }
        this._client = client;
        this._initDialog(pluginResults);

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    ConstraintCheckResultsDialog.prototype._initDialog = function (results) {
        var dialog = this._dialog,
            client = this._client,
            self = this,
            resultEntry,
            body = dialog.find('.modal-body'),
            UNREAD_CSS = 'unread',
            result,
            resultHeader,
            spanResultTitle,
            spanResultTime,
            nodeContainer,
            nodeGuids,
            resultDetailsBtn,
            nodeEntry,
            constraintContainer,
            constraintNames,
            constraintEntry,
            i,
            j,
            k;

        for (i = 0; i < results.length; i += 1) {
            result = results[i];

            resultEntry = PLUGIN_RESULT_ENTRY_BASE.clone();

            if (result.__unread === true) {
                resultEntry.addClass(UNREAD_CSS);
                delete result.__unread;
            }

            resultHeader = PLUGIN_RESULT_HEADER_BASE.clone();
            if (result.hasViolation === true) {
                resultHeader.addClass(RESULT_ERROR_CLASS);
                resultHeader.append(ICON_ERROR.clone());
            } else {
                resultHeader.append(ICON_SUCCESS.clone());
                resultHeader.addClass(RESULT_SUCCESS_CLASS);
            }

            var checkName = result.info || 'unspecified checking';
            spanResultTitle = RESULT_NAME_BASE.clone();
            spanResultTitle.text(checkName);
            resultHeader.append(spanResultTitle);

            var checkTime = result.__time ? clientUtil.formattedDate(new Date(result.__time), 'elapsed') : 'Time: N/A';
            spanResultTime = RESULT_TIME_BASE.clone();
            spanResultTime.text(checkTime);
            resultHeader.append(spanResultTime);

            resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
            resultDetailsBtn.addClass('main-details');
            resultHeader.append(resultDetailsBtn);

            //collecting the nodes which has violation
            nodeGuids = Object.keys(result);
            j = nodeGuids.length;
            while (--j >= 0) {
                if (!(REGEXP.GUID.test(nodeGuids[j]) && result[nodeGuids[j]].hasViolation === true )) {
                    nodeGuids.splice(j, 1);
                }
            }

            nodeContainer = RESULT_DETAILS_BASE.clone();
            for (j = 0; j < nodeGuids.length; j++) {
                nodeEntry = NODE_ENTRY_BASE.clone();

                nodeEntry.attr('GMEpath', result[nodeGuids[j]]._path);
                nodeEntry.append(NODE_BTN_BASE.clone());

                spanResultTitle = RESULT_NAME_BASE.clone();
                //TODO GUID removed, come up some real identification text
                spanResultTitle.text(result[nodeGuids[j]]._name /*+"["+nodeGuids[j]+"]"*/);

                nodeEntry.append(spanResultTitle);

                resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
                nodeEntry.append(resultDetailsBtn);

                //now the constraint results
                constraintNames = Object.keys(result[nodeGuids[j]]);
                k = constraintNames.length;
                while (--k >= 0) {
                    if (!result[nodeGuids[j]][constraintNames[k]].hasViolation) {
                        constraintNames.splice(k, 1);
                    }
                }

                constraintContainer = RESULT_DETAILS_BASE.clone();
                for (k = 0; k < constraintNames.length; k++) {
                    constraintEntry = MESSAGE_ENTRY_BASE.clone();
                    constraintEntry.find('.msg-title').text(constraintNames[k]);
                    constraintEntry.find('.msg-body').html(result[nodeGuids[j]][constraintNames[k]].message);

                    constraintContainer.append(constraintEntry);
                }
                nodeEntry.append(constraintContainer);

                nodeContainer.append(nodeEntry);

            }
            resultHeader.append(nodeContainer);

            if (j === 0) {
                resultDetailsBtn.addClass('no-details-available');
            }

            resultEntry.append(resultHeader);

            body.append(resultEntry);
        }

        dialog.find('.btn-clear').on('click', function () {
            body.empty();
            results.splice(0, results.length);
        });

        dialog.on('click', '.btn-details', function (event) {
            $(this).siblings('.messages').toggleClass('in');

            if ($(this).children('.glyphicon-plus').length > 0) {
                $(this).html('<i class="glyphicon glyphicon-minus"/>');
            } else {
                $(this).html('<i class="glyphicon glyphicon-plus"/>');
            }
            event.stopPropagation();
            event.preventDefault();
        });

        dialog.on('click', '.btn-node', function (/* event */) {
            var nodeId = $(this).parent().attr('GMEpath'),
                patterns = {},
                territoryId = client.addUI(this, function (events) {
                    var nodeLoaded = false;
                    events.forEach(function (event) {
                        if (event.etype === 'load' && event.eid === nodeId) {
                            nodeLoaded = true;
                        }
                    });

                    client.removeUI(territoryId);

                    if (nodeLoaded) {
                        WebGMEGlobal.State.registerActiveObject(nodeId);
                        WebGMEGlobal.State.registerActiveSelection([]);
                        dialog.modal('hide');
                    } else {
                        self.logger.error('Could not load the linked node at path', nodeId);
                    }
                });

            patterns[nodeId] = {children: 0};
            client.updateTerritory(territoryId, patterns);
        });

    };

    return ConstraintCheckResultsDialog;
});