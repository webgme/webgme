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
    'jquery-fancytree',
    'jquery-contextMenu',
    'css!./styles/TreeBrowserWidget.css'
], function (Logger, CONSTANTS, TreeBrowserWidgetKeyboard, dragSource) {
    'use strict';

    var NODE_PROGRESS_CLASS = 'node-progress',
        TREE_BROWSER_CLASS = 'tree-browser';

    function TreeBrowserWidget(container, options) {

        this._logger = Logger.create('gme:Widgets:TreeBrowser:TreeBrowserWidget',
            WebGMEGlobal.gmeConfig.client.log);

        options = options || {};

        //save parent control
        this._el = container;

        this._isReadOnly = false;

        this._initialize(options);

        this._logger.debug('Ctor finished...');
    }

    TreeBrowserWidget.prototype._initialize = function (options) {
        var self = this,
            lastDblClicked,
            dynamicContextMenuCreate;

        //clear container content
        this._el.html('');

        //set Widget title
        this._el.addClass(TREE_BROWSER_CLASS);

        //generate control dynamically
        this._treeEl = $('<div/>', {});

        // Add filter search.
        this._initializeFilters(options);

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
            minExpandLevel: 1,
            keyboard: false,
            autoScroll: true,
            //focusOnSelect: true,
            imagePath: '/',
            debugLevel: 0,
            quicksearch: true,
            lazyLoad: function (event, data) {
                self._logger.debug('onLazyRead node:' + data.node.key);
                self.onNodeOpen.call(self, data.node.key);
                event.preventDefault();
                event.stopPropagation();
            },
            //we don't need an activation here, it just messes up the UI
            beforeActivate: function (event, data) {
                self._logger.debug('### beforeActivate', data.node.title, event, data);
            },
            onActivate: function (event, data) {
                self._logger.debug('### onActivate', data.node.title, event, data);
            },
            deactivate: function (event, data) {
                self._logger.debug('### deactivate', data.node.title, event, data);
            },
            beforeSelect: function (event, data) {
                self._logger.debug('### beforeSelect', data.node.title, event, data);
            },
            select: function (event, data) {
                self._logger.debug('### select', data.node.title, event, data);
            },
            focus: function (event, data) {
                self._logger.debug('### focus', event, data);
                self._registerKeyboardListener();
            },
            click: function (event, data) {
                self._logger.debug('### click', data.node.title, event, data);
                if (event.ctrlKey === true || event.metaKey === true) {
                    // Multi select: toggle selected on this node.
                    if (data.node.isSelected() === true) {
                        data.node.setFocus(false);
                    } else {
                        data.node.setFocus(true);
                    }

                    data.node.toggleSelected();
                } else {
                    if (data.node.isSelected() === false) {
                        self._deselectSelectedNodes();
                        data.node.setSelected(true);
                        data.node.setFocus(true);
                    } else {
                        data.node.setFocus(false);
                    }
                }

                if (data.targetType !== 'expander') {
                    event.preventDefault();
                    return;
                }
            },

            collapse: function (event, data) {
                self._logger.debug('Collapsing node:' + data.node.key);

                //remove all children from DOM
                data.node.resetLazy();

                //call onNodeClose if exist
                self.onNodeClose.call(self, data.node.key);
            },
            focusTree: function (event, data) {
                self._logger.debug('### focusTree', event, data);
                self._registerKeyboardListener();
            },
            blurTree: function (event, data) {
                self._logger.debug('### blurTree', event, data);
            },
            dblclick: function (event, data) {
                self._logger.debug('Node double-click: ' + data.node.key);

                if (event.ctrlKey === true || event.metaKey === true) {
                    event.preventDefault();
                    return;
                }

                if (data.targetType === 'expander') {
                    event.preventDefault();
                    return;
                }

                // Deselect everyone and select the dblclicked one.
                self._deselectSelectedNodes();
                data.node.setSelected(true);

                lastDblClicked = data.node;
                if ($.isFunction(self.onNodeDoubleClicked)) {
                    self._logger.debug('default double-click handler: ' + data.node.key);
                    self.onNodeDoubleClicked.call(self, data.node.key);
                    event.preventDefault();
                }
            },

            createNode: function (event, data) {
                self._makeNodeDraggable(data.node);
            },
            removeNode: function (event, data) {
                self._destroyDraggable(data.node);
            },

            // Extensions
            extensions: ['edit', 'filter'],
            edit: {
                adjustWidthOfs: 4,
                allowEmpty: true,
                inputCss: {minWidth: '3em'},
                triggerCancel: ['enter'],
                triggerStart: [],
                beforeEdit: function (event, data) {
                    self._logger.debug('beforeEdit', event, data);
                    if (data.node.extraClasses === NODE_PROGRESS_CLASS || self._isReadOnly) {
                        return false;
                    }
                },
                edit: function (event, data) {
                    self._logger.debug('edit', event, data);
                },
                beforeClose: function (event, data) {
                    self._logger.debug('beforeClose', event, data);
                },
                save: function (event, data) {
                    self._logger.debug('save', event, data);
                },
                close: function (event, data) {
                    self._logger.debug('close', event, data);
                    if (data.dirty === true) {
                        self.onNodeTitleChanged(data.node.key, data.orgTitle, data.node.title);
                    }

                    self._registerKeyboardListener();
                }
            },
            filter: {
                autoApply: true, // Re-apply last filter if lazy data is loaded
                counter: false, // Show a badge with number of matching child nodes near parent icons
                hideExpandedCounter: true, // Hide counter badge, when parent is expanded
                mode: 'hide',  // "dimm": Grayout unmatched nodes, "hide": remove unmatched nodes
                highlight: false // Highlight matches by wrapping inside tags.
            }
        });

        this._treeInstance = this._treeEl.fancytree('getTree');
        this._treeEl.append(this._noFilterMatchesEl);
    };

    TreeBrowserWidget.prototype.enableUpdate = function (/*enable*/) {
        this._logger.warn('TreeBrowserWidget.enableUpdate not valid with fancy tree. ' +
            'Use TreeBrowserWidgetcreateNodes instead!');
    };

    TreeBrowserWidget.prototype.setReadOnly = function (isReadOnly) {
        this._isReadOnly = isReadOnly;
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
                prevChildrenKeys[childNode.key] = true;
            });
        }

        for (i = 0; i < objDescriptors.length; i += 1) {
            childrenParams.push({
                title: objDescriptors[i].name,
                tooltip: objDescriptors[i].libraryInfo ? objDescriptors[i].libraryInfo :
                    objDescriptors[i].metaType ? '<<' + objDescriptors[i].metaType + '>>' : '',
                key: objDescriptors[i].id,
                folder: false,
                lazy: objDescriptors[i].hasChildren,
                extraClasses: objDescriptors[i].class || '',
                icon: objDescriptors[i].icon || null,
                isConnection: objDescriptors[i].isConnection,
                isAbstract: objDescriptors[i].isAbstract,
                isLibrary: objDescriptors[i].isLibrary,
                isLibraryRoot: objDescriptors[i].isLibraryRoot,
                libraryInfo: objDescriptors[i].libraryInfo,
                metaType: objDescriptors[i].metaType,
                isMetaNode: objDescriptors[i].isMetaNode
            });
        }

        if (childrenParams.length > 0) {
            parentNode.addChildren(childrenParams);

            // sortChildren sorts newNodes too if it is not copied!
            newNodes = parentNode.getChildren().slice();
            this.sortChildren(parentNode, false);
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

        // Call the FancyTreeNode.addChildren() and pass options for the new node.
        newNode = parentNode.addChildren({
            title: objDescriptor.name,
            tooltip: objDescriptor.libraryInfo ? objDescriptor.libraryInfo :
                objDescriptor.metaType ? '<<' + objDescriptor.metaType + '>>' : '',
            key: objDescriptor.id,
            folder: false,
            lazy: objDescriptor.hasChildren,
            extraClasses: objDescriptor.class || '',
            icon: objDescriptor.icon || null,
            isConnection: objDescriptor.isConnection,
            isAbstract: objDescriptor.isAbstract,
            isLibrary: objDescriptor.isLibrary,
            isLibraryRoot: objDescriptor.isLibraryRoot,
            libraryInfo: objDescriptor.libraryInfo,
            metaType: objDescriptor.metaType,
            isMetaNode: objDescriptor.isMetaNode
        }, beforeNode);

        this.sortChildren(parentNode, false);
        this._logger.debug('New node created: ' + newNode.key);

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
        if (objDescriptor.hasOwnProperty('name') && node.title !== objDescriptor.name) {

            nodeName = objDescriptor.name;

            node.setTitle(nodeName);

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

        if (objDescriptor.hasOwnProperty('isAbstract') && objDescriptor.isAbstract !== node.data.isAbstract) {
            node.data.isAbstract = objDescriptor.isAbstract;
            //mark that change happened
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('isConnection') && objDescriptor.isConnection !== node.data.isConnection) {
            node.data.isConnection = objDescriptor.isConnection;
            //mark that change happened
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('metaType') && objDescriptor.metaType !== node.data.metaType) {
            node.data.metaType = objDescriptor.metaType;
            node.tooltip = '<<' + objDescriptor.metaType + '>>';
            //mark that change happened
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('isMetaNode') && objDescriptor.isMetaNode !== node.data.isMetaNode) {
            node.data.isMetaNode = objDescriptor.isMetaNode;
            //mark that change happened
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('libraryInfo') && typeof objDescriptor.librayInfo === 'string' &&
            objDescriptor.libraryInfo !== node.data.libraryInfo) {
            node.data.libraryInfo = objDescriptor.libraryInfo;
            node.tooltip = objDescriptor.libraryInfo;
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('isLibrary') && objDescriptor.isLibrary !== node.data.isLibrary) {
            node.data.isLibrary = objDescriptor.isLibrary;
            //mark that change happened
            nodeDataChanged = true;
        }

        if (objDescriptor.hasOwnProperty('isLibraryRoot') && objDescriptor.isLibraryRoot !== node.data.isLibraryRoot) {
            node.data.isLibraryRoot = objDescriptor.isLibraryRoot;
            //mark that change happened
            nodeDataChanged = true;
        }

        //if there were any change related to this node
        if (nodeDataChanged === true) {
            node.render(true);

            //log
            this._logger.debug('Node updated: ' + node.key);
        }

        if (nodeNameChanged === true) {
            //find it's new place based on alphabetical order
            parentNode = node.getParent();

            if (parentNode) {
                this.sortChildren(parentNode, false);
            }
        }

        if (nodeDataChanged && objDescriptor.hasChildren === true) {
            this.sortChildren(node, false);
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

    /**
     * Called when a node's title is changed in the reeview
     * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
     */
    TreeBrowserWidget.prototype.onNodeTitleChanged = function (nodeId, oldText, newText) {
        this._logger.warn('Default onNodeTitleChanged for node ' + nodeId + ' called, doing nothing.' +
            'Please override onNodeTitleChanged(nodeId, oldText, newText)', oldText, newText);
        return true;
    };

    /**
     * Collapses the given node
     */
    TreeBrowserWidget.prototype.collapse = function (node) {
        node.setExpanded(false);
    };

    /**
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

    TreeBrowserWidget.prototype._makeNodeDraggable = function (node) {
        var nodeEl = $(node.span),
            self = this;

        dragSource.makeDraggable(nodeEl, {
            helper: function (event) {
                return self._dragHelper(this, event);
            },
            dragItems: function (el) {
                if (node.isSelected() === false) {
                    self._deselectSelectedNodes();
                    node.setSelected(true);
                    node.setFocus(true);
                }

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

    TreeBrowserWidget.prototype._destroyDraggable = function (node) {
        var nodeEl = $(node.span);

        dragSource.destroyDraggable(nodeEl);
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
            multiple;

        //context menu is available for nodes that are not currently in 'loading' state
        if ($trigger.hasClass(NODE_PROGRESS_CLASS) !== true) {
            if (node.isSelected() === false) {
                self._deselectSelectedNodes();
                node.setSelected(true);
            }

            node.setFocus(true);
            multiple = self.getSelectedIDs().length > 1;

            // The default set of available items :  Rename, Create, Copy, Paste, Delete
            menuItems = {
                toggleNode: { // The "expand/collapse" menu item
                    name: 'Expand',
                    callback: function (/*key, options*/) {
                        node.toggleExpanded();
                    },
                    icon: false
                },
                selectNode: { // The "select (aka double-click)" menu item
                    name: 'Select node',
                    callback: function (/*key, options*/) {
                        self.onMakeNodeSelected.call(self, node.key);
                    },
                    icon: false
                },
                open: { // The "select (aka double-click)" menu item
                    name: 'Open in visualizer',
                    callback: function (/*key, options*/) {
                        self.onNodeDoubleClicked.call(self, node.key);
                    },
                    icon: 'paste'
                }
            };

            menuItems.separatorOperationsStart = '-';

            menuItems.rename = { // The "rename" menu item
                name: 'Rename',
                callback: function (/*key, options*/) {
                    node.editStart();
                },
                icon: 'edit'
            };

            menuItems.delete = { // The "delete" menu item
                name: multiple ? 'Delete selection' : 'Delete',
                callback: function (/*key, options*/) {
                    self._nodeDelete(node);
                },
                icon: 'delete'
            };

            if ($trigger.hasClass('fancytree-has-children') === true) {
                if (node.isExpanded()) {
                    menuItems.toggleNode.name = 'Collapse';
                }
            } else {
                delete menuItems.toggleNode;
            }

            self.onExtendMenuItems(node.key, menuItems);
        } else {
            menuItems = {
                loading: {
                    name: 'Node is loading...',
                    callback: function (/*key, options*/) {
                        return;
                    },
                    icon: false
                }
            };
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

    TreeBrowserWidget.prototype._initializeFilters = function (options) {
        var self = this,
            filterForm = $('<div class="filter-form">'),
            filterContainer,
            menuToggleBtn,
            buttonGroupSpan,
            inputTypeSpan;

        this._filterFunctions = [];
        this._currentFilters = {
            //titleFilter: {
            //  text: '',
            //  type: 'regex', 'caseSensitive', 'caseInsensitive'
            // },
            //metaTypeFilter: '',
            //hideAbstracts: false,
            //hideConnections: true
        };

        function addInputFilter(name, placeHolder) {
            var filterGroup = $('<div class="input-group input-group-sm filter-input-form">'),
                inputField = $('<input type="text" class="form-control" placeholder="' + placeHolder + '"' +
                    'aria-describedby="sizing-addon3">'),
                clearEl = $('<span class="input-group-btn">' +
                    '<button class="btn btn-default btn-clear-filter" type="button">' +
                    '<i class="glyphicon glyphicon-remove-circle"/></button>' +
                    '</span>'),
                caseInsensBtn,
                caseSensBtn,
                regexBtn;

            if (!inputTypeSpan) {
                // TODO: Currently these are shared decide how to display them separatly.
                inputTypeSpan = $('<span class="btn-group input-filter-type" data-toggle="buttons">' +
                    '<label class="btn btn-default btn-xs btn-case-insensitive" title="Case insensitive">' +
                    '<input type="radio"/>AA' +
                    '</label>' +
                    '<label class="btn btn-default btn-xs btn-case-sensitive" title="Case sensitive">' +
                    '<input type="radio">Aa' +
                    '</label>' +
                    '<label class="btn btn-default btn-xs btn-regex" title="Regular expression">' +
                    '<input type="radio">.*' +
                    '</label>' +
                    '</span>');

                caseInsensBtn = inputTypeSpan.find('.btn-case-insensitive');
                caseSensBtn = inputTypeSpan.find('.btn-case-sensitive');
                regexBtn = inputTypeSpan.find('.btn-regex');

                if (self._currentFilters[name].type === 'caseInsensitive') {
                    caseInsensBtn.addClass('active');
                } else if (self._currentFilters[name].type === 'caseSensitive') {
                    caseSensBtn.addClass('active');
                } else if (self._currentFilters[name].type === 'regex') {
                    regexBtn.addClass('active');
                }

                // TODO: This is hardcoded for now..
                caseInsensBtn.click(function () {
                    if (self._currentFilters.hasOwnProperty('titleFilter')) {
                        self._currentFilters.titleFilter.type = 'caseInsensitive';
                    }

                    if (self._currentFilters.hasOwnProperty('metaTypeFilter')) {
                        self._currentFilters.metaTypeFilter.type = 'caseInsensitive';
                    }
                    self.applyFilters();
                });

                caseSensBtn.click(function () {
                    if (self._currentFilters.hasOwnProperty('titleFilter')) {
                        self._currentFilters.titleFilter.type = 'caseSensitive';
                    }

                    if (self._currentFilters.hasOwnProperty('metaTypeFilter')) {
                        self._currentFilters.metaTypeFilter.type = 'caseSensitive';
                    }
                    self.applyFilters();
                });

                regexBtn.click(function () {
                    if (self._currentFilters.hasOwnProperty('titleFilter')) {
                        self._currentFilters.titleFilter.type = 'regex';
                    }

                    if (self._currentFilters.hasOwnProperty('metaTypeFilter')) {
                        self._currentFilters.metaTypeFilter.type = 'regex';
                    }
                    self.applyFilters();
                });

                filterForm.append(inputTypeSpan);
            }

            inputField.keyup(function () {
                self._currentFilters[name].text = inputField.val();
                self.applyFilters();
            });

            clearEl.find('button.btn-clear-filter').click(function () {
                inputField.val('');
                self._currentFilters[name].text = inputField.val();
                self.applyFilters();
            });

            filterGroup.append(inputField);
            filterGroup.append(clearEl);
            filterForm.append(filterGroup);
        }

        function addToggleBtn(name, displayName, textOrIcon) {
            var buttonEl = $('<button class="btn btn-default btn-xs" type="checkbox">' + textOrIcon + '</button>');

            buttonGroupSpan = buttonGroupSpan || $('<span class="btn-group filter-toggle-buttons" data-toggle="buttons"/>');

            if (self._currentFilters[name] === true) {
                buttonEl.addClass('active');
                buttonEl.prop('title', 'Show ' + displayName);
            } else {
                buttonEl.prop('title', 'Hide ' + displayName);
            }

            buttonEl.click(function () {
                var el = $(this);

                if (el.hasClass('active')) {
                    el.prop('title', 'Hide ' + displayName);
                    el.removeClass('active');
                } else {
                    el.prop('title', 'Show ' + displayName);
                    el.addClass('active');
                }

                self._currentFilters[name] = !self._currentFilters[name];
                self.applyFilters();
            });

            buttonGroupSpan.append(buttonEl);
        }

        if (typeof options.hideConnections === 'boolean') {
            self._currentFilters.hideConnections = options.hideConnections;
            self._filterFunctions.push(function (node) {
                // Filter out connection nodes.
                if (self._currentFilters.hideConnections === true) {
                    return node.data.isConnection !== true;
                } else {
                    return true;
                }
            });

            addToggleBtn('hideConnections', 'connections', '<i class="fa gme-connection"/>');
        }

        if (typeof options.hideAbstracts === 'boolean') {
            self._currentFilters.hideAbstracts = options.hideAbstracts;
            self._filterFunctions.push(function (node) {
                // Filter out abstract nodes.
                if (self._currentFilters.hideAbstracts === true) {
                    return node.data.isAbstract !== true;
                } else {
                    return true;
                }
            });

            addToggleBtn('hideAbstracts', 'abstract nodes', '<i class="fa fa-code"/>');
        }

        if (typeof options.hideLeaves === 'boolean') {
            self._currentFilters.hideLeaves = options.hideLeaves;
            self._filterFunctions.push(function (node) {
                // Filter out connection nodes.
                if (self._currentFilters.hideLeaves === true) {
                    return node.isFolder() === true || node.lazy === true;
                } else {
                    return true;
                }
            });

            addToggleBtn('hideLeaves', 'leaf nodes', '<i class="fa gme-atom"/>');
        }

        if (typeof options.hideLibraries === 'boolean') {
            self._currentFilters.hideLibraries = options.hideLibraries;
            self._filterFunctions.push(function (node) {
                // Filter out library nodes.
                if (self._currentFilters.hideLibraries === true) {
                    return node.data.isLibrary !== true;
                } else {
                    return true;
                }
            });

            addToggleBtn('hideLibraries', 'libraries', '<i class="fa gme-library"/>');
        }

        if (typeof options.hideMetaNodes === 'boolean') {
            self._currentFilters.hideMetaNodes = options.hideMetaNodes;
            self._filterFunctions.push(function (node) {
                // Filter out library nodes.
                if (self._currentFilters.hideMetaNodes === true) {
                    return node.data.isMetaNode !== true;
                } else {
                    return true;
                }
            });

            addToggleBtn('hideMetaNodes', 'meta nodes', '<i class="fa gme-meta-node"/>');
        }

        if (buttonGroupSpan) {
            filterForm.append(buttonGroupSpan);
        }

        if (options.titleFilter) {
            self._currentFilters.titleFilter = options.titleFilter;
            self._filterFunctions.push(function (node) {
                // Filter based on name.
                if (self._currentFilters.titleFilter.text) {
                    if (self._currentFilters.titleFilter.type === 'caseInsensitive') {
                        return node.title.toLowerCase().indexOf(
                                self._currentFilters.titleFilter.text.toLowerCase()) > -1;
                    } else if (self._currentFilters.titleFilter.type === 'regex') {
                        try {
                            return (new RegExp(self._currentFilters.titleFilter.text).test(node.title));
                        } catch (err) {
                            return true;
                        }
                    } else {
                        return node.title.indexOf(self._currentFilters.titleFilter.text) > -1;
                    }
                } else {
                    return true;
                }
            });

            addInputFilter('titleFilter', 'Filter by name...');
        }

        if (options.metaTypeFilter) {
            self._currentFilters.metaTypeFilter = options.metaTypeFilter;
            self._filterFunctions.push(function (node) {
                // Filter based on name.
                if (self._currentFilters.metaTypeFilter.text) {
                    if (self._currentFilters.metaTypeFilter.type === 'caseInsensitive') {
                        return (node.data.metaType || '').toLowerCase().indexOf(
                                self._currentFilters.metaTypeFilter.text.toLowerCase()) > -1;
                    } else if (self._currentFilters.metaTypeFilter.type === 'regex') {
                        try {
                            return (new RegExp(self._currentFilters.metaTypeFilter.text)
                                .test((node.data.metaType || '')));
                        } catch (err) {
                            return true;
                        }
                    } else {
                        return (node.data.metaType || '').indexOf(self._currentFilters.metaTypeFilter.text) > -1;
                    }
                } else {
                    return true;
                }
            });

            addInputFilter('metaTypeFilter', 'Filter by meta type...');
        }

        // Add a wrapper with a show/hide button.
        filterContainer = $('<div class="filter-container collapsed"/>');
        menuToggleBtn = $('<button class="btn btn-default btn-xs btn-hide-show-filters pull-right" type="button"' +
            'title="Show filters...">' +
            '<i class="fa fa-angle-left expand-filter"/><i class="fa fa-angle-right collapse-filter"/>' +
            '<i class="glyphicon glyphicon-filter filter-icon"/></button>');

        menuToggleBtn.click(function () {
            var el = $(this);

            if (filterContainer.hasClass('collapsed')) {
                filterContainer.removeClass('collapsed');
                el.prop('title', 'Hide filters...');
            } else {
                filterContainer.addClass('collapsed');
                el.prop('title', 'Show filters...');
            }
        });

        filterContainer.append(menuToggleBtn);
        filterContainer.append(filterForm);

        this._treeEl.append(filterContainer);
        this._noFilterMatchesEl = $('<span class="all-filtered-out hidden">No matches...</span>');
    };

    TreeBrowserWidget.prototype.applyFilters = function (newFilterData) {
        var self = this,
            matches,
            filterFn;

        this._currentFilters = newFilterData || this._currentFilters;

        filterFn = function (node) {
            var i;

            for (i = 0; i < self._filterFunctions.length; i += 1) {
                if (self._filterFunctions[i](node) === false) {
                    return false;
                }
            }

            return true;
        };

        matches = this._treeInstance.filterNodes(filterFn);
        if (matches === 0) {
            this._noFilterMatchesEl.removeClass('hidden');
        } else {
            this._noFilterMatchesEl.addClass('hidden');
        }
    };

    TreeBrowserWidget.prototype.clearFilters = function () {
        this._treeInstance.clearFilter();
    };

    TreeBrowserWidget.prototype.sortChildren = function (node, rec) {
        var compareFn = function (nodeA, nodeB) {
            // Move connections to bottom and libraries to top
            if (nodeA.data.isConnection === true && !nodeB.data.isConnection) {
                return 1;
            } else if (nodeB.data.isConnection === true && !nodeA.data.isConnection) {
                return -1;
            } else if (nodeA.data.isLibraryRoot === true && !nodeB.data.isLibraryRoot) {
                return -1;
            } else if (nodeB.data.isLibraryRoot === true && !nodeA.data.isLibraryRoot) {
                return 1;
            } else {
                if (nodeA.title.toLowerCase() > nodeB.title.toLowerCase()) {
                    return 1;
                } else if (nodeA.title.toLowerCase() < nodeB.title.toLowerCase()) {
                    return -1;
                } else {
                    return 0;
                }
            }
        };

        node.sortChildren(compareFn, rec);
    };

    _.extend(TreeBrowserWidget.prototype, TreeBrowserWidgetKeyboard.prototype);

    return TreeBrowserWidget;
});
