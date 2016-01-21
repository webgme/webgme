/*globals define, WebGMEGlobal, _, alert, $*/
/*jshint browser: true*/

/**
 * WIDGET TreeBrowserWidget based on FancyTree
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/logger',
    'js/Constants',
    './TreeBrowserWidget.Keyboard',
    'js/DragDrop/DragSource',
    'lib/jquery/jquery.fancytree-all',
    'lib/jquery/jquery.contextMenu',
    'css!./styles/TreeBrowserWidget.css'
], function (Logger, CONSTANTS, TreeBrowserWidgetKeyboard, dragSource) {
    'use strict';

    var NODE_PROGRESS_CLASS = 'node-progress',
        TREE_BROWSER_CLASS = 'tree-browser',

        TreeBrowserWidget = function (container/*, params*/) {
            //get this._logger instance for this component
            this._logger = Logger.create('gme:Widgets:TreeBrowser:TreeBrowserWidget',
                WebGMEGlobal.gmeConfig.client.log);

            //save parent control
            this._el = container;

            this._initialize();

            this._logger.debug('Ctor finished...');
        };

    TreeBrowserWidget.prototype._initialize = function () {
        var self = this,
            lastDblClicked,
            dynamicContextMenuCreate;

        //clear container content
        this._el.html('');

        //set Widget title
        this._el.addClass(TREE_BROWSER_CLASS);

        //by default use visual animations to reflect changes in the tree
        this._animation = false;

        //https://github.com/webgme/webgme/issues/347
        this._enableNodeRename = false;

        //generate control dynamically
        this._treeEl = $('<div/>', {});

        //add control to parent
        this._el.append(this._treeEl);

        dynamicContextMenuCreate = function ($trigger) {
            return self._createContextMenu($trigger);
        };

        //hook up jquery.contextMenu
        this._treeEl.contextMenu({
            selector: '.fancytree-node',
            position: function (selector/*, x, y*/) {
                var _offset = selector.$trigger.find('.fancytree-title').offset();
                selector.$menu.css({top: _offset.top + 10, left: _offset.left - 10});
            },
            build: function ($trigger/*, e*/) {
                // this callback is executed every time the menu is to be shown
                // its results are destroyed every time the menu is hidden
                // e is the original contextmenu event, containing e.pageX and e.pageY (amongst other data)
                return {
                    callback: function (key, options) {
                        var node = $.ui.fancytree.getNode(options.$trigger),
                            m = 'clicked: \'' + key + '\' on \'' + node.title + ' (' + node.key + ')\'';
                        alert(m);
                    },
                    items: dynamicContextMenuCreate($trigger)
                };
            }
        });

        // Create FancyTree.
        // http://wwwendt.de/tech/fancytree/doc/jsdoc/global.html#FancytreeOptions
        // http://wwwendt.de/tech/fancytree/doc/jsdoc/global.html#FancytreeEvents
        this._treeEl.fancytree({
            source: [],
            toggleEffect: false,
            checkbox: false,
            selectMode: 2,
            keyboard: false,
            imagePath: '/',
            debugLevel: 0,
            quicksearch: true,
            lazyLoad: function (event, data) {
                self._logger.debug('onLazyRead node:' + data.node.key);
                self.onNodeOpen.call(self, data.node.key);

                event.preventDefault();
                event.stopPropagation();
            },
            collapse: function (event, data) {
                self._logger.debug('Collapsing node:' + data.node.key);

                //remove all children from DOM
                data.node.resetLazy();

                //call onNodeClose if exist
                self.onNodeClose.call(self, data.node.key);
            },

            click: function (event, data) {
                //override just to prevent default fancytree behavior
                //onClick: null, // null: generate focus, expand, activate, select events.
                self._registerKeyboardListener();
            },

            focus: function (/*event, data*/) {
                //override just to prevent default fancytree behavior
                //onFocus: null, // null: set focus to node.
                var tnFocused = this.tnFocused;
                //NOTE: in WebGMEGlobal.KeyboardManager.captureFocus(); the tnFocused will be cleared out
                //since the original control looses focus
                //need to save it back
                self._registerKeyboardListener();
                this.tnFocused = tnFocused;
            },

            dblclick: function (event, data) {
                var editNoteTitle = false;

                self._logger.debug('Node double-click: ' + data.node.key);
                event.preventDefault();
                event.stopPropagation();

                //if Ctrl or Meta pressed for whatever reason (accidentally dblclick with modifier keys, just ignore)
                if (event.ctrlKey === true || event.metaKey === true) {
                    return;
                }

                if (data.targetType === 'expander') {
                    return;
                }

                //deselect everyone and select the dblclicked one
                self._deselectSelectedNodes();
                data.node.setSelected(true);

                //check if the node is already focused and the title is clicked --> edit title
                if (data.targetType === 'title' && lastDblClicked === data.node) {
                    editNoteTitle = true;
                }

                //check what mode should be activated
                if (editNoteTitle === true) {
                    self._nodeEdit(data.node);
                } else {
                    lastDblClicked = data.node;
                    if ($.isFunction(self.onNodeDoubleClicked)) {
                        self._logger.debug('default double-click handler: ' + data.node.key);
                        self.onNodeDoubleClicked.call(self, data.node.key);
                    }
                }
            },

            //we don't need an activation here, it just messes up the UI
            beforeActivate: function (/*event, data*/) {
                return false;
            },

            createNode: function (event, data) {
                self._makeNodeDraggable(data.node);
            }
        });

        this._treeInstance = this._treeEl.fancytree('getTree');

        //register keyboard handling whenever user clicks on widget
        this._el.on('mousedown', function (/*event*/) {
            self._registerKeyboardListener(self);
        });

        this._treeEl.on('mousedown', 'span.fancytree-node', function (event) {
            self._onNodeMouseDown($.ui.fancytree.getNode(this), event);
        });
    };

    TreeBrowserWidget.prototype.enableUpdate = function (/*enable*/) {
        this._logger.warn('TreeBrowserWidget.enableUpdate not valid with fancy tree. ' +
            'Use TreeBrowserWidgetcreateNodes instead!');
    };

    /**
     * Creates multiple new nodes and sorts all children after inserted.
     *
     * @param {object} parentNode
     * @param {objects[]} objDescriptors
     * @returns {*}
     */
    TreeBrowserWidget.prototype.createNodes = function (parentNode, objDescriptors) {
        var childrenParams = [],
            prevChildrenKeys,
            newNodes,
            i;

        if (parentNode === null) {
            // Now get the root node object.
            parentNode = this._treeInstance.getRootNode();
        }

        if (parentNode.getChildren()) {
            prevChildrenKeys = {};
            parentNode.getChildren().forEach(function (childNode) {
                prevChildrenKeys[childeNode.key] = true;
            });
        }

        for (i = 0; i < objDescriptors.length; i += 1) {
            childrenParams.push({
                title: objDescriptors[i].name,
                //tooltip: objDescriptors[i].name,
                key: objDescriptors[i].id,
                folder: false,
                lazy: objDescriptors[i].hasChildren,
                extraClasses: objDescriptors[i].class || '',
                icon: objDescriptors[i].icon || null
            });
        }

        if (childrenParams.length > 0) {
            parentNode.addChildren(childrenParams);
            newNodes = parentNode.getChildren().slice(); // sortChildren sorts newNodes too if no copy!
            parentNode.sortChildren();
            //this._animateNode(parentNode.getChildren());
            this._logger.debug('nodes created', newNodes);
        } else {
            newNodes = [];
            this._logger.debug('no new nodes created');
        }

        if (prevChildrenKeys) {
            for (i = newNodes.length - 1; i >= 0; i -= 1) {
                if (prevChildrenKeys[newNodes[i].key] === true) {
                    newNodes.splice(i, 1);
                }
            }
        }


        return newNodes;
    };

    /**
     * Creates a new node in the tree under parentNode with the given parameters
     * @param parentNode
     * @param objDescriptor
     */
    TreeBrowserWidget.prototype.createNode = function (parentNode, objDescriptor) {
        var beforeNode, existingChildren, i, newNode;
        objDescriptor.name = objDescriptor.name || '';
        //check if the parentNode is null or not
        //when null, the new node belongs to the root
        if (parentNode === null) {
            // Now get the root node object
            parentNode = this._treeInstance.getRootNode();
        }

        //find the new node's place in ABC order
        beforeNode = null;

        existingChildren = parentNode.getChildren();
        if (existingChildren) {

            for (i = existingChildren.length - 1; i >= 0; i -= 1) {
                if (objDescriptor.name.toLowerCase() < existingChildren[i].title.toLowerCase()) {
                    beforeNode = existingChildren[i];
                } else {
                    break;
                }
            }
        }

        // Call the DynaTreeNode.addChildren() and pass options for the new node.
        newNode = parentNode.addChildren({
            title: objDescriptor.name,
            //tooltip: objDescriptor.name,
            key: objDescriptor.id,
            folder: false,
            lazy: objDescriptor.hasChildren,
            extraClasses: objDescriptor.class || '',
            icon: objDescriptor.icon || null
        }, beforeNode);

        //log
        this._logger.debug('New node created: ' + newNode.key);

        //a bit of visual effect
        //this._animateNode(newNode);

        //return the newly created node
        return newNode;
    };

    /**
     * Deletes the node from the tree
     * @param node
     */
    TreeBrowserWidget.prototype.deleteNode = function (node) {
        //if no valid node, return
        //otherwise delete node
        if (!node) {
            return;
        }

        node.remove();

        //log
        this._logger.debug('Node deleted: ' + node.key);
    };

    /**
     * Resets the given nodes text tp the given value
     * @param node
     * @param text
     */
    TreeBrowserWidget.prototype.updateNode = function (node, objDescriptor) {

        //by default we say there is nothing to update
        var nodeDataChanged = false,
            nodeNameChanged = false,
            nodeName,
            parentNode;


        //check if valid node
        if (!node) {
            return;
        }

        //set new text value (if any)
        if (node.title !== objDescriptor.name) {


            nodeName = objDescriptor.name;

            node.setTitle(nodeName);
            //node.toolTip = nodeName;

            //mark that change happened
            //nodeDataChanged = true;
            nodeNameChanged = true;
        }

        //set new children value (if any)
        if (objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {

            // Has the folder property changed?
            if (objDescriptor.hasChildren !== node.isFolder()) {
                node.folder = objDescriptor.hasChildren;

                if (!node.isExpanded() && objDescriptor.hasChildren === true) {
                    // The node is not expanded and it just got children - the node is 'lazy'.
                    node.resetLazy();
                } else if (objDescriptor.hasChildren === false) {
                    // The node does not have children anymore - so it is not lazy.
                    node.lazy = false;
                }

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        //set new class (if any)
        if (objDescriptor.class) {
            if (node.extraClasses !== objDescriptor.class) {
                node.extraClasses = objDescriptor.class;
                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (objDescriptor.icon) {
            if (node.icon !== objDescriptor.icon) {
                node.icon = objDescriptor.icon;

                //mark that change happened
                nodeDataChanged = true;
            }
        }

        if (nodeNameChanged === true) {
            //find it's new place based on alphabetical order
            parentNode = node.getParent();

            if (parentNode) {
                parentNode.sortChildren();
            }
        }

        //if there were any change related to this node
        if (nodeDataChanged === true) {
            //a bit of visual effect
            //this._animateNode(node);
            node.render();

            //log
            this._logger.debug('Node updated: ' + node.key);
        }
    };


    /**
     * Called when a node is opened in the tree
     * PLEASE OVERRIDE TO FILL THE NODES CHILDREN
     * @param nodeId
     */
    TreeBrowserWidget.prototype.onNodeOpen = function (nodeId) {
        this._logger.warn('Default onNodeOpen for node ' +
            nodeId + ' called, doing nothing. Please override onNodeOpen(nodeId)');
    };

    /**
     * Called when a node is closed in the tree
     * PLEASE OVERRIDE TO HANDLE NODE CLOSE
     * DOM children will be cleared out from the tree
     * @param nodeId
     */
    TreeBrowserWidget.prototype.onNodeClose = function (nodeId) {
        this._logger.warn('Default onNodeClose for node ' +
            nodeId + ' called, doing nothing. Please override onNodeClose(nodeId)');
    };

    /*
     * Called when a node's title is changed in the reeview
     * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
     */
    TreeBrowserWidget.prototype.onNodeTitleChanged = function (nodeId/*, oldText, newText*/) {
        this._logger.warn('Default onNodeTitleChanged for node ' +
            nodeId + ' called, doing nothing. Please override onNodeTitleChanged(nodeId, oldText, newText)');
        return true;
    };

    /*
     * Collapses the given node
     */
    TreeBrowserWidget.prototype.collapse = function (node) {
        node.setExpanded(false);
    };

    /*
     * Expands the given node
     */
    TreeBrowserWidget.prototype.expand = function (node) {
        node.setExpanded(true);
    };

    TreeBrowserWidget.prototype.isExpanded = function (node) {
        //if the node is null its most propably represents the root
        //and the root is always expanded (since is not shown in the tree)
        if (node === null) {
            return true;
        }

        return node.isExpanded();
    };


    TreeBrowserWidget.prototype._animateNode = function (node) {
        var nodes = node instanceof Array ? node : [node];
        //if animation is enabled for the widget
        if (this._animation === true) {
            //force rendering of the node otherwise may happen that its DOM representation is not ready
            nodes.forEach(function (node) {
                node.render();

                var jQureyNode = $(node.span.children[2]);
                jQureyNode.hide();
                jQureyNode.fadeIn('fast');
            });
        }
    };

    TreeBrowserWidget.prototype._onNodeMouseDown = function (node, event) {
        var modifierKey = event.ctrlKey === true || event.metaKey === true;

        if (modifierKey) {
            //modifier key pressed
            //handle multi selection/deselection
            this._logger.debug('_onNodeMouseDown: ' + node.title + ' --> toggleSelect');
            node.toggleSelected();
        } else {
            //no modifier key pressed
            //check if the current node is selected or not
            //if selected already, don't do anything
            //if not yet selected, deselect all and select this one only
            if (!node.isSelected()) {
                //deselect everyone and select the clicked one
                this._logger.debug('_onNodeMouseDown: ' + node.title + ' --> select this one only');
                this._deselectSelectedNodes();
                node.setSelected(true);
            } else {
                this._logger.debug('_onNodeMouseDown: ' + node.title + ' --> already selected, noop');
            }
        }
    };

    TreeBrowserWidget.prototype._makeNodeDraggable = function (node) {
        var nodeEl = $(node.span),
            self = this;

        dragSource.makeDraggable(nodeEl, {
            helper: function (event) {
                return self._dragHelper(this, event);
            },
            dragItems: function (el) {
                return self.getDragItems(el);
            },
            dragEffects: function (el) {
                return self.getDragEffects(el);
            },
            dragParams: function (el) {
                return self.getDragParams(el);
            }
        });
    };

    /* OVERWRITE DragSource.prototype.dragHelper */
    TreeBrowserWidget.prototype._dragHelper = function (el/*, event*/) {
        var helperEl = el.clone(),
            wrapper = $('<div class="' + TREE_BROWSER_CLASS + '"><ul class="fancytree-container"><li></li></ul></div>'),
            selectedIds,
            selNodes,
            i, t,
            removeClasses = ['fancytree-selected',
                'fancytree-focus',
                'fancytree-has-children',
                'fancytree-lazy',
                'fancytree-lastsib',
                'fancytree-exp-cdl',
                'fancytree-ico-c'];

        //trim down unnecessary DOM elements from it
        helperEl.children().first().remove();
        helperEl.removeClass(removeClasses.join(' '));

        wrapper.find('li').append(helperEl);

        helperEl = wrapper;

        selectedIds = [];
        selNodes = this._treeInstance.getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].extraClasses !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].key);
            }
        }

        if (selectedIds.length > 1) {
            t = helperEl.find('.fancytree-title').text();
            helperEl.find('.fancytree-title').text(t + ' (+' + (selectedIds.length - 1) + ')');
        }

        return helperEl;
    };

    TreeBrowserWidget.prototype.getDragItems = function (/*el*/) {
        this._logger.warn('TreeBrowserWidget.getDragItems is not overridden in the controller!!!');
        return [];
    };

    TreeBrowserWidget.prototype.getDragEffects = function (/*el*/) {
        this._logger.warn('TreeBrowserWidget.getDragEffects is not overridden in the controller!!!');
        return [];
    };

    TreeBrowserWidget.prototype.getDragParams = function (/*el*/) {
        this._logger.debug('TreeBrowserWidget.getDragParams is not overridden in the controller!!!');
        return undefined;
    };

    TreeBrowserWidget.prototype.DRAG_EFFECTS = dragSource.DRAG_EFFECTS;

    TreeBrowserWidget.prototype._nodeEdit = function (nodeToEdit) {
        var self = this;

        //can not edit 'loading...' node
        if (nodeToEdit.extraClasses === NODE_PROGRESS_CLASS) {
            return;
        }

        if (this._enableNodeRename !== true) {
            return;
        }

        this._logger.debug('Edit node: ' + nodeToEdit.key);

        $(nodeToEdit.span).find('a').editInPlace({
            class: '',
            onChange: function (oldValue, newValue) {
                self.onNodeTitleChanged.call(self, nodeToEdit.key, oldValue, newValue);
            }
        });
    };

    TreeBrowserWidget.prototype._nodeCopy = function () {
        var selectedIds = [],
            selNodes,
            i;

        selNodes = this._treeInstance.getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            //can not copy 'loading...' node
            if (selNodes[i].extraClasses !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].key);
            }
        }

        this._logger.debug('Copy ' + selectedIds);
        if ($.isFunction(this.onNodeCopy)) {
            this.onNodeCopy(selectedIds);
        }
    };

    TreeBrowserWidget.prototype._nodePaste = function (node) {
        //can not paste to 'loading...' node
        if (node.extraClasses === NODE_PROGRESS_CLASS) {
            return;
        }
        this._logger.debug('Paste ' + node.key);
        if ($.isFunction(this.onNodePaste)) {
            this.onNodePaste(node.key);
        }
    };

    TreeBrowserWidget.prototype._nodeDelete = function (node) {
        var selectedIds,
            selNodes,
            i;

        //can not delete 'loading...' node
        if (node.extraClasses === NODE_PROGRESS_CLASS) {
            return;
        }

        selectedIds = [];

        selNodes = this._treeInstance.getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].extraClasses !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].key);
            }
        }

        this._logger.debug('Delete ' + selectedIds);
        if ($.isFunction(this.onNodeDelete)) {
            this.onNodeDelete(selectedIds);
        }
    };

    /*
     * Deselect all the selected nodes in the tree
     */
    TreeBrowserWidget.prototype._deselectSelectedNodes = function () {
        var i,
            selNodes;

        //deselect everyone else
        selNodes = this._treeInstance.getSelectedNodes();

        for (i = 0; i < selNodes.length; i += 1) {
            selNodes[i].setSelected(false);
        }
        this._dropSelectionStateWithShift();
    };


    TreeBrowserWidget.prototype._createContextMenu = function ($trigger) {
        var node = $.ui.fancytree.getNode($trigger),
            menuItems = {},
            self = this,
            contextMenuOptions = {
                rename: this._enableNodeRename,
                delete: true
            };

        //context menu is available for nodes that are not currently in 'loading' state
        if ($trigger.hasClass(NODE_PROGRESS_CLASS) !== true) {

            self.onCreatingContextMenu(node.key, contextMenuOptions);
            contextMenuOptions.rename = this._enableNodeRename;

            // The default set of available items :  Rename, Create, Copy, Paste, Delete
            menuItems = {
                toggleNode: { // The "expand/collapse" menu item
                    name: 'Expand',
                    callback: function (/*key, options*/) {
                        node.toggleExpanded();
                    },
                    icon: false
                },
                openInVisualizer: { // The "select (aka double-click)" menu item
                    name: 'Open in visualizer',
                    callback: function (/*key, options*/) {
                        self.onNodeDoubleClicked.call(self, node.key);
                    },
                    icon: false
                }
            };

            if (contextMenuOptions.rename === true) {
                menuItems.separatorRename = '-';
                menuItems.rename = { // The "rename" menu item
                    name: 'Rename',
                    callback: function (/*key, options*/) {
                        self._nodeEdit(node);
                    },
                    icon: 'edit'
                };
            }

            if (contextMenuOptions.delete === true) {
                menuItems.separatorDelete = '-';
                menuItems.delete = { // The "delete" menu item
                    name: 'Delete',
                    callback: function (/*key, options*/) {
                        self._nodeDelete(node);
                    },
                    icon: 'delete'
                };
            }

            if ($trigger.hasClass('fancytree-has-children') === true) {
                if (node.isExpanded()) {
                    menuItems.toggleNode.name = 'Collapse';
                }
            } else {
                delete menuItems.toggleNode;
            }

            self.onExtendMenuItems(node.key, menuItems);
        }

        //return the complete action set for this node
        return menuItems;
    };

    TreeBrowserWidget.prototype.getSelectedIDs = function () {
        var selectedIds = [],
            selNodes,
            i;

        selNodes = this._treeInstance.getSelectedNodes();
        for (i = 0; i < selNodes.length; i += 1) {
            if (selNodes[i].extraClasses !== NODE_PROGRESS_CLASS) {
                selectedIds.push(selNodes[i].key);
            }
        }

        return selectedIds;
    };


    TreeBrowserWidget.prototype.onExtendMenuItems = function (nodeId/*, menuItems*/) {
        this._logger.debug('onExtendMenuItems is not overridden for node with ID: "' + nodeId + '".');
    };

    TreeBrowserWidget.prototype.onCreatingContextMenu = function (nodeId, contextMenuOptions) {
        this._logger.debug('onCreatingContextMenu is not overridden for node with ID: "' +
            nodeId + '", contextMenuOptions: ' + JSON.stringify(contextMenuOptions));
    };

    _.extend(TreeBrowserWidget.prototype, TreeBrowserWidgetKeyboard.prototype);

    return TreeBrowserWidget;
});