/*
 * WIDGET TreeBrowserWidget based on DynaTree
 */
define( [ './util.js', '/common/logmanager.js', 'jquery.dynatree', 'jquery.contextMenu' ], function( util, logManager ) {

    //load its own CSS file (css/DynaTreeBrowserWidget.css)
    util.loadCSS( 'css/DynaTreeBrowserWidget.css' );

    var DynaTreeBrowserWidget = function ( containerId ){

        //get logger instance for this component
        var logger = logManager.create("DynaTreeBrowserWidget");

        //save parentcontrol
        this.containerControl =  $("#" + containerId );

        if ( this.containerControl.length === 0 ) {
            logger.error( "DynaTreeBrowserWidget's container control with id:'" + containerId + "' could not be found" );
            return;
        }

        //generate unique id for control
        this.guid = "TreeBrowserWidgetDynaTree";

        //by default use visual animations to reflect changes in the tree
        this._animation = true;

        //generate control dynamically
        this.treeViewE = $('<div/>', {
            id: "dynatree_" + this.guid
        });

        //add control to parent
        this.containerControl.append( this.treeViewE );

        //save this for later use
        var self = this;

        //create context menu dinamically
        var contextMenuId = this.guid + "contextMenu";
        var myContextMenu = $( '<ul/>', {
            id : contextMenuId,
            "class" : "contextMenu"
        } );

        //Context menu EDIT option
        var contextMenuEdit = $( '<li/>', {
            "class" : "edit"
        } ).html("<a href='#edit'>Edit</a>");
        myContextMenu.append( contextMenuEdit );

        //Context menu COPY option
        var contextMenuCopy = $( '<li/>', {
            "class" : "copy separator"
        } ).html("<a href='#copy'>Copy</a>");
        myContextMenu.append( contextMenuCopy );

        //Context menu PASTE option
        var contextMenuPaste = $( '<li/>', {
            "class" : "paste"
        } ).html("<a href='#paste'>Paste</a>");
        myContextMenu.append( contextMenuPaste );

        //Context menu DELETE option
        var contextMenuDelete = $( '<li/>', {
            "class" : "delete separator"
        } ).html("<a href='#delete'>Delete</a>");
        myContextMenu.append( contextMenuDelete );

        //finylla add the context menu conainet to the current control
        this.containerControl.append( myContextMenu );

        var editNode = function (nodeToEdit) {

            //can not edit 'loading...' node
            if ( nodeToEdit.data.addClass === "gme-loading" ) {
                return;
            }

            var prevTitle = nodeToEdit.data.title,
                tree = nodeToEdit.tree;
            // Disable dynatree mouse- and key handling
            tree.$widget.unbind();
            // Replace node with <input>
            $(nodeToEdit.span).find(".dynatree-title").html("<input id='editNode' value='" + prevTitle + "'  size='10' />");
            // Focus <input> and bind keyboard handler
            $("input#editNode")
                .focus()
                .keydown(
                function (event) {
                    switch (event.which) {
                        case 27: // [esc]
                            // discard changes on [esc]
                            $("input#editNode").val(prevTitle);
                            event.preventDefault();
                            $(this).blur();
                            break;
                        case 13: // [enter]
                            // simulate blur to accept new value
                            event.preventDefault();
                            $(this).blur();
                            break;
                    }
                }).blur(function (event) {
                    // Accept new value, when user leaves <input>
                    var title = $("input#editNode").val();
                    $(nodeToEdit.span).find(".dynatree-title").html(prevTitle);
                    if (prevTitle !== title) {
                        var changeAllowed = true;

                        if ($.isFunction(self.onNodeTitleChanged)) {
                            changeAllowed = self.onNodeTitleChanged.call(self, nodeToEdit.data.key, prevTitle, title);
                        }

                        if (changeAllowed === true) {
                            setTimeout( function() {
                                self.updateNode(nodeToEdit, { "text" : title } );
                            }, 1);
                        } else {
                            nodeToEdit.setTitle(prevTitle);
                            logger.debug("TreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed");
                        }
                    } else {
                        nodeToEdit.setTitle(title);
                    }
                    // Re-enable mouse and keyboard handlling
                    tree.$widget.bind();
                    nodeToEdit.select(true);
                    nodeToEdit.focus();
                });
        };

        var copyNode = function( node ) {
            //can not copy 'loading...' node
            if ( node.data.addClass === "gme-loading" ) {
                return;
            }

            var selectedIds = [];

            var selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();
            for ( var i = 0; i < selNodes.length; i++ ) {
                if ( selNodes[i].data.addClass !== "gme-loading" ) {
                    selectedIds.push( selNodes[i].data.key );
                }
            }

            logger.debug( "Copy " +  selectedIds );
            if ($.isFunction(self.onNodeCopy)){
                self.onNodeCopy.call(self, selectedIds);
            }
        };

        var pasteNode = function( node ) {
            //can not paste to 'loading...' node
            if ( node.data.addClass === "gme-loading" ) {
                return;
            }
            logger.debug( "Paste " +  node.data.key );
            if ($.isFunction(self.onNodePaste)){
                self.onNodePaste.call(self, node.data.key);
            }
        };

        var deleteNode = function( node ) {
            //can not delete 'loading...' node
            if ( node.data.addClass === "gme-loading" ) {
                return;
            }

            var selectedIds= [];

            var selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();
            for ( var i = 0; i < selNodes.length; i++ ) {
                if ( selNodes[i].data.addClass !== "gme-loading" ) {
                    selectedIds.push( selNodes[i].data.key );
                }
            }

            logger.debug( "Delete " +  selectedIds);
            if ($.isFunction(self.onNodeDelete)){
                self.onNodeDelete.call(self, selectedIds);
            }
        };

        /*
         * Deselec all the selectec nodes in the tree
         */
        var deselectSelectedNodes = function() {
            //deselect everyone else
            var selNodes = self.treeViewE.dynatree("getTree").getSelectedNodes();

            for ( var i = 0; i < selNodes.length; i++ ) {
                selNodes[i].select(false);
            }
        };

        //create tree using DynaTree
        this.treeViewE.dynatree( {
            checkbox: false,
            selectMode: 2,
            imagePath : "../",
            debugLevel: 0,
            onLazyRead : function (node) {
                logger.debug( "Expanding node:" + node.data.key );
                if ($.isFunction(self.onNodeOpen)){
                    self.onNodeOpen.call(self, node.data.key);
                }

                return false;
            },

            onQueryExpand: function(expand, node){
                if ( expand ) {
                    /* DO NOTHING HERE, EXPAND IS HANDLED IN 'onLazyLoad'
                     window.logMessage( "expanding node:" + node.data.key );
                     */
                } else {
                    logger.debug( "Collapsing node:" + node.data.key );
                    //remove all children from DOM
                    node.removeChildren();

                    //call onNodeClose if exist
                    if ( $.isFunction(self.onNodeClose) ) {
                        self.onNodeClose.call(self, node.data.key);
                    }
                }
            },

            onClick: function(node, event) {
                //single click on the title means rename if the node is already selected
                if ( node.getEventTargetType(event) === "title" ) {

                    //if node was already selected and
                    // if Ctrl is pressed, alter range selection, toggle this node's selection status
                    if ( event.ctrlKey === true ) {
                        node.toggleSelect();
                        node.focus();
                        return false;// Prevent default processing
                    } else {
                        //if node is already selected and clicked again, enter edit mode
                        //if node was not selected, then select it and deselect everyone else
                        if ( node.isSelected() === true ) {
                            editNode( node);
                            return false; // Prevent default processing
                        } else {
                            deselectSelectedNodes();
                            //finally select this node
                            node.select(true);
                            node.focus();
                            return false;
                        }
                    }
                } else {
                    //if the click does not happen on the title or expander, don't handle it
                    if ( node.getEventTargetType(event) !== "expander" ) {
                        return false;
                    }
                }
            },

            onSelect: function(select, node) {
                // Display list of selected nodes
                /* var selNodes = node.tree.getSelectedNodes();
                 // convert to title/key array
                 var selKeys = $.map(selNodes, function(node){
                 return "[" + node.data.key + "]: '" + node.data.title + "'";
                 });
                 logger.debug(selKeys.join(", "));*/
            },

            //we don't need an activation here, it just messes up the UI
            onQueryActivate: function(flag, dtnode) {
                return false;
            },

            onKeydown: function(node, event) {
                var sib = null;
                switch( event.which ) {
                    // Handle Ctrl-C, -X and -V
                    case 67:
                        if( event.ctrlKey ) { // Ctrl-C
                            copyNode( node );
                            return false;
                        }
                        break;
                    case 86:
                        if( event.ctrlKey ) { // Ctrl-V
                            pasteNode( node );
                            return false;
                        }
                        break;
                    case 113: //F2
                        editNode( node );
                        return false;
                        break;
                    case 13: //ENTER
                        return false;
                        break;
                    case 37: // <left>
                        if( node.bExpanded ) {
                            node.toggleExpand();
                            node.focus();
                            node.select(true);
                        }
                        return false;
                        break;
                    case 39: // <right>
                        if( !node.bExpanded && (node.childList || node.data.isLazy) ) {
                            node.toggleExpand();
                            node.focus();
                            node.select(true);
                        }
                        return false;
                        break;
                    case 38: // <up>
                        if ( event.shiftKey !== true ) {
                            deselectSelectedNodes();
                        }
                        sib = node.getPrevSibling();
                        while( sib && sib.bExpanded && sib.childList ){
                            sib = sib.childList[sib.childList.length-1];
                        }
                        if( !sib && node.parent && node.parent.parent ){
                            sib = node.parent;
                        }
                        if( sib ){
                            sib.focus();
                            sib.select(true);
                        }
                        return false;
                        break;
                    case 40: // <down>
                        if ( event.shiftKey !== true ) {
                            deselectSelectedNodes();
                        }
                        if( node.bExpanded && node.childList ) {
                            sib = node.childList[0];
                        } else {
                            var parents = node._parentList(false, true);
                            for(var i=parents.length-1; i>=0; i--) {
                                sib = parents[i].getNextSibling();
                                if( sib ){ break; }
                            }
                        }
                        if( sib ){
                            sib.focus();
                            sib.select(true);
                        }
                        return false;
                        break;
                }
            },

            onCreate: function(node, span){
                // --- Contextmenu helper --------------------------------------------------
                var bindContextMenu = function(span) {
                    // Add context menu to this node:
                    $(span).contextMenu({menu: contextMenuId }, function(action, el, pos) {
                        // The event was bound to the <span> tag, but the node object
                        // is stored in the parent <li> tag
                        var node = $.ui.dynatree.getNode(el);
                        switch( action ) {
                            case "edit":
                                editNode( node );
                                break;
                            case "copy":
                                copyNode(node);
                                break;
                            case "paste":
                                pasteNode(node);
                                break;
                            case "delete":
                                deleteNode(node);
                                break;
                        }
                    });
                };

                bindContextMenu(span);
            }
        });

        /**
         * Creates a new node in the treebrowser under parentNode with the given parameters
         * @param parentNode
         * @param objDescriptor
         */
        this.createNode = function( parentNode, objDescriptor ) {
            //check if the parentNode is null or not
            //when null, the new node belongs to the root
            if (parentNode === null) {
                // Now get the root node object
                parentNode = this.treeViewE.dynatree("getRoot");
            }

            // Call the DynaTreeNode.addChild() member function and pass options for the new node
            var newNode = parentNode.addChild({
                title:objDescriptor.name,
                tooltip:objDescriptor.name,
                key:objDescriptor.id,
                isFolder:false, // objDescriptor.hasChildren,
                isLazy:objDescriptor.hasChildren,
                addClass:objDescriptor["class"] || "",
                icon : objDescriptor.icon || null
            });

            //log
            logger.debug("New node created: " + newNode.data.key );

            //a bit of visual effect
            this.animateNode( newNode );

            //return the newly created node
            return newNode;
        };

        this.animateNode = function(node) {

            //if animation is enabled for the widget
            if (this._animation === true) {
                //force rendering of the node otherwise may happen that its DOM representation is not ready
                node.render();

                var jQureyNode = $( node.span.children[2] );
                jQureyNode.hide();
                jQureyNode.fadeIn('fast');
            }
        };

        /* Deletes the node from the tree
        * @param node
        */
        this.deleteNode = function(node) {
            //if no valid node, return
            //otherwise delete node
            if (!node)
                return;

            node.remove();

            //log
            logger.debug("Node deleted: " + node.data.key);
        };

        /*
         * Resets the given nodes text tp the given value
         * @param node
         * @param text
         */
        this.updateNode = function (node, objDescriptor ) {

            //check if valid node
            if (!node)
                return;

            //by default we say there is nothing to update
            var nodeDataChanged = false;

            //set new text value (if any)
            if ( objDescriptor.text && node.data.title !== objDescriptor.text ) {
                node.data.title = objDescriptor.text;
                node.data.tooltip = objDescriptor.text;

                //mark that change happened
                nodeDataChanged = true;
            }

            //set new childrend value (if any)
            if ( objDescriptor.hasChildren === true || objDescriptor.hasChildren === false) {
                if ( objDescriptor.hasChildren !== node.data.isLazy) {
                    node.data.isLazy = objDescriptor.hasChildren;

                    //furthermore if it has no more childrend, collapse node
                    if ( objDescriptor.hasChildren === false) {
                        this.collapse(node);
                    }

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            //set new class (if any)
            if ( objDescriptor["class"] ) {
                if ( node.data.addClass !== objDescriptor["class"] ) {
                    node.data.addClass = objDescriptor["class"];
                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            if (objDescriptor.icon) {
                if ( node.data.icon !== objDescriptor.icon ) {
                    node.data.icon = objDescriptor.icon;

                    //mark that change happened
                    nodeDataChanged = true;
                }
            }

            //if there were any change related to this node
            if (nodeDataChanged === true) {
                node.render();

                //a bit of visual effect
                this.animateNode( node );

                //log
                logger.debug("Node updated: " + node.data.key);
            }
        };

        /**
         * Called when a node is opened in the tree
         * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
         * @param nodeId
         */
        this.onNodeOpen = function (nodeId) {
            logger.warning("Default onNodeOpen for node " + nodeId + " called, doing nothing. Please override onNodeOpen(nodeId)");
        };

        /*
         * Called when a node's title is changed in the reeview
         * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
         */
        this.onNodeTitleChanged = function (nodeId, oldText, newText) {
            logger.warning("Default onNodeTitleChanged for node " + nodeId + " called, doing nothing. Please override onNodeTitleChanged(nodeId, oldText, newText)");
            return true;
        };

        /*
         * Collapses the given node
         */
        this.collapse = function (node) {
            node.expand(false);
        };

        /*
         * Expands the given node
         */
        this.expand = function (node) {
            node.expand(true);
        };

        this.isExpanded = function( node ) {
            //if the node is null its most propably represents the root
            //and the root is always expanded (since is not shown in the tree)
            if ( node === null ) {
                return true;
            }

            return node.isExpanded();
        };
    };

    return DynaTreeBrowserWidget;
});