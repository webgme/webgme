/*globals define, WebGMEGlobal, _, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/KeyboardManager/IKeyTarget'], function (IKeyTarget) {
    'use strict';

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
            node = this._treeInstance.getFocusNode(),
        //prevFocused = $.ui.fancytree.getNode(this._treeEl.find('.fancytree-focused')),
            sib = null,
            parents,
            parent,
            children,
            i,
            idxStart,
            idxCurrent;

        if (!node) {
            node = this._treeInstance.getSelectedNodes();
            if (node.length > 0) {
                node = node[0];
            } else {
                node = this._treeInstance.getRootNode().getChildren();
                if (node && node.length > 0) {
                    node = node[0];
                }
            }
        }

        this.prevFocused = this._treeInstance.getFocusNode();

        switch (eventArgs.combo) {
            case 'del':
                this._dropSelectionStateWithShift();
                this._nodeDelete(node);
                ret = false;
                break;
            case 'return':
                this._dropSelectionStateWithShift();
                this.onNodeDoubleClicked(node.key);
                ret = false;
                break;
            case 'f2':
                this._dropSelectionStateWithShift();
                setTimeout(function () {
                    node.editStart();
                });
                ret = false;
                break;
            case 'up':
            case 'shift+up':
                if (eventArgs.shiftKey !== true) {
                    this._deselectSelectedNodes();
                }

                sib = node.getPrevSibling();

                while (sib && sib.isExpanded() && sib.getChildren()) {
                    children = sib.getChildren();
                    sib = children[children.length - 1];
                }

                parent = node.getParent();
                if (!sib && parent && parent.getParent()) {
                    sib = parent;
                }

                if (sib) {
                    sib.setFocus(true);
                    sib.setSelected(true);

                    if (eventArgs.shiftKey) {
                        nodes = this._treeInstance.getSelectedNodes();
                        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

                        idxStart = nodes.indexOf(this.selectionStartNode);
                        idxCurrent = nodes.indexOf(sib);

                        if (idxCurrent >= idxStart) {
                            if (this.prevFocused) {
                                this.prevFocused.setSelected(false);
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

                children = node.getChildren();
                if (node.isExpanded() && children) {
                    sib = children[0];
                } else {
                    parents = node.getParentList(false, true);
                    for (i = parents.length - 1; i >= 0; i -= 1) {
                        sib = parents[i].getNextSibling();
                        if (sib) {
                            break;
                        }
                    }
                }
                if (sib) {
                    sib.setFocus(true);
                    sib.setSelected(true);

                    nodes = this._treeInstance.getSelectedNodes();

                    if (eventArgs.shiftKey) {
                        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

                        idxStart = nodes.indexOf(this.selectionStartNode);
                        idxCurrent = nodes.indexOf(sib);

                        if (idxCurrent <= idxStart) {
                            if (this.prevFocused) {
                                this.prevFocused.setSelected(false);
                            }
                        }
                    }
                }
                ret = false;
                break;
            case 'left':
                this._dropSelectionStateWithShift();
                if (node.isExpanded()) {
                    node.toggleExpanded();
                    node.setFocus(true);
                    node.setSelected(true);
                }
                ret = false;
                break;
            case 'right':
                this._dropSelectionStateWithShift();
                if (!node.isExpanded() && (node.getChildren() || node.isLazy())) {
                    node.toggleExpanded();
                    node.setFocus(true);
                    node.setSelected(true);
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

        this.prevFocused = this._treeInstance.getFocusNode();
        this.selectionStartNode = this.selectionStartNode || this.prevFocused;

        return ret;
    };

    TreeBrowserWidgetKeyboard.prototype.onKeyUp = function (/*eventArgs*/) {
    };


    return TreeBrowserWidgetKeyboard;
});
