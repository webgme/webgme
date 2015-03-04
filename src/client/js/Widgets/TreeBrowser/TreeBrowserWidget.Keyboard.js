/*globals define, Raphael, window, WebGMEGlobal, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/KeyboardManager/IKeyTarget'], function (IKeyTarget) {

    "use strict";

    var TreeBrowserWidgetKeyboard;

    TreeBrowserWidgetKeyboard = function () {
        this.selectionStartNode = null;
        this.prevFocused = null;
    };

    _.extend(TreeBrowserWidgetKeyboard.prototype, IKeyTarget.prototype);

    TreeBrowserWidgetKeyboard.prototype._dropSelectionStateWithShift = function () {
        this.selectionStartNode = null;
    };

    TreeBrowserWidgetKeyboard.prototype._registerKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.setListener(this);
    };

    TreeBrowserWidgetKeyboard.prototype._unregisterKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.setListener(undefined);
    };

    TreeBrowserWidgetKeyboard.prototype.onKeyDown = function (eventArgs) {
        var ret = true,
            nodes = this._treeInstance.getSelectedNodes(),
            node = $.ui.dynatree.getNode(this._treeEl.find('.dynatree-focused')),
            //prevFocused = $.ui.dynatree.getNode(this._treeEl.find('.dynatree-focused')),
            sib = null,
            parents,
            i,
            idxStart,
            idxCurrent;

        if (!node) {
            node = this._treeInstance.getSelectedNodes();
            if (node.length > 0) {
                node = node[0];
            } else {
                node = this._treeInstance.getRoot().getChildren();
                if (node && node.length > 0) {
                    node = node[0];
                }
            }
        }

        this.prevFocused = $.ui.dynatree.getNode(this._treeEl.find('.dynatree-focused'));

        switch (eventArgs.combo) {
            case 'del':
                this._dropSelectionStateWithShift();
                this._nodeDelete(node);
                ret = false;
                break;
            case 'return':
                this._dropSelectionStateWithShift();
                this.onNodeDoubleClicked(node.data.key);
                ret = false;
                break;
            case 'f2':
                this._dropSelectionStateWithShift();
                this._nodeEdit(node);
                ret = false;
                break;
            case 'up':
            case 'shift+up':
                if (eventArgs.shiftKey !== true) {
                    this._deselectSelectedNodes();
                }

                sib = node.getPrevSibling();
                while (sib && sib.bExpanded && sib.childList) {
                    sib = sib.childList[sib.childList.length - 1];
                }
                if (!sib && node.parent && node.parent.parent) {
                    sib = node.parent;
                }
                if (sib) {
                    sib.focus();
                    sib.select(true);

                    nodes = this._treeInstance.getSelectedNodes();

                    if (eventArgs.shiftKey) {
                        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

                        idxStart = nodes.indexOf(this.selectionStartNode);
                        idxCurrent = nodes.indexOf(sib);

                        if (idxCurrent >= idxStart) {
                            if (this.prevFocused) {
                                this.prevFocused.select(false);
                            }
                        }
                    }
                }
                ret = false;
                break;
            case 'down':
            case 'shift+down':
                if (eventArgs.shiftKey !== true) {
                    this._deselectSelectedNodes();
                }
                if (node.bExpanded && node.childList) {
                    sib = node.childList[0];
                } else {
                    parents = node._parentList(false, true);
                    for (i = parents.length - 1; i >= 0; i -= 1) {
                        sib = parents[i].getNextSibling();
                        if (sib) {
                            break;
                        }
                    }
                }
                if (sib) {
                    sib.focus();
                    sib.select(true);

                    nodes = this._treeInstance.getSelectedNodes();

                    if (eventArgs.shiftKey) {
                        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

                        idxStart = nodes.indexOf(this.selectionStartNode);
                        idxCurrent = nodes.indexOf(sib);

                        if (idxCurrent <= idxStart) {
                            if (this.prevFocused) {
                                this.prevFocused.select(false);
                            }
                        }
                    }
                }
                ret = false;
                break;
            case 'left':
                this._dropSelectionStateWithShift();
                if (node.bExpanded) {
                    node.toggleExpand();
                    node.focus();
                    node.select(true);
                }
                ret = false;
                break;
            case 'right':
                this._dropSelectionStateWithShift();
                if (!node.bExpanded && (node.childList || node.data.isLazy)) {
                    node.toggleExpand();
                    node.focus();
                    node.select(true);
                }
                ret = false;
                break;
            case 'ctrl+c':
                this._dropSelectionStateWithShift();
                this._nodeCopy();
                ret = false;
                break;
            case 'ctrl+v':
                this._dropSelectionStateWithShift();
                this._nodePaste(node);
                ret = false;
                break;
        }

        this.prevFocused = $.ui.dynatree.getNode(this._treeEl.find('.dynatree-focused'));
        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

        return ret;
    };

    TreeBrowserWidgetKeyboard.prototype.onKeyUp = function (eventArgs) {
    };


    return TreeBrowserWidgetKeyboard;
});
