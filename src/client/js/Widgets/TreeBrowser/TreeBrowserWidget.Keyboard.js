/*globals define, Raphael, window, WebGMEGlobal, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['js/KeyboardManager/IKeyTarget'], function (IKeyTarget) {

    "use strict";

    var TreeBrowserWidgetKeyboard;

    TreeBrowserWidgetKeyboard = function () {
    };

    _.extend(TreeBrowserWidgetKeyboard.prototype, IKeyTarget.prototype);

    TreeBrowserWidgetKeyboard.prototype._registerKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.setListener(this);
    };

    TreeBrowserWidgetKeyboard.prototype._unregisterKeyboardListener = function () {
        WebGMEGlobal.KeyboardManager.setListener(undefined);
    };

    TreeBrowserWidgetKeyboard.prototype.onKeyDown = function (eventArgs) {
        var ret = true,
            node = $.ui.dynatree.getNode(this._treeEl.find('.dynatree-focused')),
            sib = null,
            parents,
            i;

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

        switch (eventArgs.combo) {
            case 'del':
                this._nodeDelete(node);
                ret = false;
                break;
            case 'return':
                this.onNodeDoubleClicked(node.data.key);
                ret = false;
                break;
            case 'f2':
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
                }
                ret = false;
                break;
            case 'left':
                if (node.bExpanded) {
                    node.toggleExpand();
                    node.focus();
                    node.select(true);
                }
                ret = false;
                break;
            case 'right':
                if (!node.bExpanded && (node.childList || node.data.isLazy)) {
                    node.toggleExpand();
                    node.focus();
                    node.select(true);
                }
                ret = false;
                break;
            case 'ctrl+c':
                this._nodeCopy();
                ret = false;
                break;
            case 'ctrl+v':
                this._nodePaste(node);
                ret = false;
                break;
        }

        return ret;
    };

    TreeBrowserWidgetKeyboard.prototype.onKeyUp = function (eventArgs) {
    };


    return TreeBrowserWidgetKeyboard;
});
