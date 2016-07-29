/*globals define, $*/
/*jshint browser: true*/

/**
 * Dialog for confirmation of project deletion.
 *
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Panels/ObjectBrowser/InheritanceBrowserControl',
    'js/Widgets/TreeBrowser/TreeBrowserWidget',
    'js/Utils/GMEConcepts',
    'text!./templates/ReplaceInstanceDialog.html',
    'css!./styles/ReplaceInstanceDialog.css'
], function (InheritanceBrowserControl, TreeBrowserWidget, GMEConcepts, dialogTemplate) {
    'use strict';

    function ReplaceInstanceDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._treeWidget = null;
        this._treeControl = null;
    }

    /**
     *
     * @param {object} params
     * @param {object} client - reference to client instance.
     * @param {string} nodeId - id of node that will be replaced.
     */
    ReplaceInstanceDialog.prototype.show = function (params) {
        var self = this,
            client = params.client,
            treeRootId = GMEConcepts.getConstrainedById(params.nodeId);

        this._dialog = $(dialogTemplate);

        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');

        this._treeWidget = new TreeBrowserWidget(this._dialog.find('.modal-body'), {
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            }
        });

        this._treeControl = new InheritanceBrowserControl(client, this._treeWidget);

        // Overwrite the default behavior for the treeControl
        this._treeControl._getRootId = function () {
            return treeRootId;
        };

        this._treeControl._onNodeDoubleClicked = function () {
            alert('sho flojt!');
        };

        this._treeControl._onCreatingContextMenu = function (nodeId, contextMenuOptions) {
            contextMenuOptions.rename = false;
            contextMenuOptions.delete = false;
            console.log(contextMenuOptions);
        };

        // Set events handlers
        this._okBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    return ReplaceInstanceDialog;
});
