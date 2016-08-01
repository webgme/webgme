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
    'text!./templates/ReplaceBaseDialog.html',
    'css!./styles/ReplaceBaseDialog.css'
], function (InheritanceBrowserControl, TreeBrowserWidget, GMEConcepts, dialogTemplate) {
    'use strict';

    function ReplaceBaseDialog() {
        this._dialog = null;
        this._okBtn = null;
        this._cancelBtn = null;
        this._infoBtn = null;
        this._infoSpan = null;
        this._alertDiv = null;
        this._treeWidget = null;
        this._treeControl = null;
    }

    /**
     *
     * @param {object} params
     * @param {object} client - reference to client instance.
     * @param {string} nodeId - id of node that will be replaced.
     */
    ReplaceBaseDialog.prototype.show = function (params) {
        var self = this,
            client = params.client,
            treeRootId = GMEConcepts.getConstrainedById(params.nodeId);

        this._dialog = $(dialogTemplate);

        this._infoBtn = this._dialog.find('.toggle-info-btn');
        this._infoSpan = this._dialog.find('.info-message');
        this._alertDiv = this._dialog.find('.alert');
        this._okBtn = this._dialog.find('.btn-ok');
        this._cancelBtn = this._dialog.find('.btn-cancel');

        this._treeWidget = new TreeBrowserWidget(this._dialog.find('.tree-container'), {
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            }
        });

        this._treeWidget._makeNodeDraggable = function(/*node*/) {
            // Do nothing here - we don't want nodes to be draggable.
        };

        this._treeControl = new InheritanceBrowserControl(client, this._treeWidget);

        // Overwrite the default behavior for the treeControl
        this._treeControl._getRootId = function () {
            return treeRootId;
        };

        this._treeControl._onNodeDoubleClicked = function (nodeId) {
            var nodeObj = client.getNode(nodeId);
            if (GMEConcepts.isValidReplaceableTarget(params.nodeId, nodeId)) {
                self._showAlert(nodeObj.getAttribute('name') + ' [' + nodeId + '] is valid new base. ' +
                    'Press OK to replace the current base with it.', 'alert-success');
            } else {
                self._showAlert(nodeObj.getAttribute('name') + ' [' + nodeId + '] is not a valid new base - ' +
                    'it would create a loop in containment/inheritance tree.', 'alert-danger');
            }
        };

        this._treeControl._onCreatingContextMenu = function (nodeId, contextMenuOptions) {
            contextMenuOptions.rename = false;
            contextMenuOptions.delete = false;
        };

        // Set events handlers
        this._infoBtn.on('click', function () {
            if (self._infoSpan.hasClass('hidden')) {
                self._infoSpan.removeClass('hidden');
            } else {
                self._infoSpan.addClass('hidden');
            }
        });

        this._okBtn.on('click', function (event) {
            var selectedNode = self._treeWidget.getSelectedIDs();
            event.preventDefault();
            event.stopPropagation();
            if (selectedNode.length !== 1) {
                self._showAlert('Please select exactly one node in the tree to replace the current base.',
                    'alert-danger');
            } else if (GMEConcepts.isValidReplaceableTarget(params.nodeId, selectedNode[0]) === false) {
                selectedNode = client.getNode(selectedNode[0]);
                self._showAlert(selectedNode.getAttribute('name') + ' [' + selectedNode.getId() + '] is not a ' +
                    'valid new base - it would create a loop in containment/inheritance tree.', 'alert-danger');
            } else {
                client.setBase(params.nodeId, selectedNode[0]);
                self._dialog.modal('hide');
            }
        });

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._dialog.on('hide.bs.modal', function () {
            self._treeControl.destroy();
            self._okBtn.off('click');
            self._cancelBtn.off('click');
            self._infoBtn.off('click');
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };

    ReplaceBaseDialog.prototype._showAlert = function (msg, severity) {
        this._alertDiv.removeClass('alert-success alert-info alert-warning alert-danger hidden');
        this._alertDiv.addClass(severity);
        this._alertDiv.text(msg);
    };

    ReplaceBaseDialog.prototype._hideAlert = function () {
        this._alertDiv.addClass('hidden');
    };

    return ReplaceBaseDialog;
});
