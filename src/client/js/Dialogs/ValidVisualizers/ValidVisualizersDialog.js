/*globals define, $, WebGMEGlobal, DEBUG*/
/*jshint browser: true*/

/**
 * Dialog for setting the validVisualizers registry of a node.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/ValidVisualizersDialog.html',
    'css!./styles/ValidVisualizersDialog.css'
], function (dialogTemplate) {
    'use strict';

    function ValidVisualizersDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._infoBtn = null;
        this._infoSpan = null;
    }

    ValidVisualizersDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this,
            result;

        this._dialog = $(dialogTemplate);

        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._infoSpan = this._dialog.find('.info-message');
        this._alertDiv = this._dialog.find('.alert');
        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');

        this._availableViz = this._dialog.find('#available');
        this._chosenViz = this._dialog.find('#chosen');

        this.populateLists(WebGMEGlobal.allVisualizers, oldValue ? oldValue.split(' ') : []);

        // Connect available and selected viz.
        this._dialog.find('#chosen, #available').sortable({
            connectWith: '.connectedSortable'
        }).disableSelection();

        // Set events handlers
        this._infoBtn.on('click', function () {
            if (self._infoSpan.hasClass('hidden')) {
                self._infoSpan.removeClass('hidden');
            } else {
                self._infoSpan.addClass('hidden');
            }
        });

        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            result = self.getResult();
            self._dialog.modal('hide');
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._okBtn.off('click');
            self._cancelBtn.off('click');
            self._infoBtn.off('click');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
            if (typeof result === 'string') {
                fnCallback(result);
            } else {
                fnCallback(oldValue);
            }
        });

        this._dialog.modal('show');
    };

    ValidVisualizersDialog.prototype.populateLists = function (available, chosen) {
        var availableMap = {},
            vizInfo,
            id,
            i;

        for (i = 0; i < available.length; i += 1) {
            availableMap[available[i].id] = available[i];
        }

        for (i = 0; i < chosen.length; i += 1) {
            vizInfo = availableMap[chosen[i]];

            if (vizInfo) {
                delete availableMap[chosen[i]];

                if (vizInfo.DEBUG_ONLY) {
                    this._chosenViz.append($('<li/>', {
                        class: 'alert alert-warning',
                        text: vizInfo.id,
                        title: 'Appears as ' + vizInfo.title + ' (only shown in debug mode).'
                    }));
                } else {
                    this._chosenViz.append($('<li/>', {
                        class: 'alert alert-info',
                        text: vizInfo.id,
                        title: 'Appears as ' + vizInfo.title
                    }));
                }
            } else {
                this._chosenViz.append($('<li/>', {
                    class: 'alert alert-danger',
                    text: chosen[i],
                    title: 'No visualizer with id ' + chosen[i] + ' available!'
                }));
            }
        }

        for (id in availableMap) {
            vizInfo = availableMap[id];
            if (vizInfo.DEBUG_ONLY && DEBUG) {
                this._availableViz.append($('<li/>', {
                    class: 'alert alert-warning',
                    text: vizInfo.id,
                    title: 'Appears as ' + vizInfo.title + ' (only shown in debug mode).'
                }));
            } else if (!vizInfo.DEBUG_ONLY) {
                this._availableViz.append($('<li/>', {
                    class: 'alert alert-info',
                    text: vizInfo.id,
                    title: 'Appears as ' + vizInfo.title
                }));
            }
        }
    };

    ValidVisualizersDialog.prototype.getResult = function () {
        var result = [];

        this._chosenViz.children('li').each(function (index, li) {
            result.push($(li).text().trim());
        });

        return result.join(' ');
    };

    return ValidVisualizersDialog;
});
