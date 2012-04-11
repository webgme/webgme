/*
 * WIDGET TreeBrowserWidget based on DynaTree
 */
define( ['jquery.dynatree', 'jquery.contextMenu' ], function() {
    var DynaTreeBrowserWidget = function ( containerId ){

        //save parentcontrol
        this.containerControl =  $("#" + containerId );

        this.containerControl.bind('onkeydown', function() {
            alert('User clicked on "foo."');
        });

        if ( this.containerControl.length === 0 ) {
            alert( "TreeBrowserWidget's container control with id:'" + containerId + "' could not be found" );
            return;
        }

        //generate unique id for control
        this.guid = "TreeBrowserWidgetDynaTree";

        //by default use visual animations to reflect changes in the three
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
                            self.renameNode(nodeToEdit, title);
                        } else {
                            nodeToEdit.setTitle(prevTitle);
                            console.log("TreeBrowserWidget.onNodeTitleChanged returned false, title change not alloweed");
                        }
                    } else {
                        nodeToEdit.setTitle(title);
                    }
                    // Re-enable mouse and keyboard handlling
                    tree.$widget.bind();
                    nodeToEdit.focus();
                });
        };

        var copyNode = function( node ) {
            var selectedIds= [];
            selectedIds.push( node.data.key );
            console.log( "TreeBrowser copy " +  selectedIds );
            if ($.isFunction(self.onNodeCopy)){
                self.onNodeCopy.call(self, selectedIds);
            }
        };

        var pasteNode = function( node ) {
            console.log( "TreeBrowser paste " +  node.data.key );
            if ($.isFunction(self.onNodePaste)){
                self.onNodePaste.call(self, node.data.key);
            }
        };

        var deleteNode = function( node ) {
            var selectedIds= [];
            selectedIds.push( node.data.key );
            console.log( "TreeBrowser delete " +  selectedIds);
            if ($.isFunction(self.onNodeDelete)){
                self.onNodeDelete.call(self, selectedIds);
            }
        };

        //create tree using DynaTree
        this.treeViewE.dynatree( {
            /*debugLevel: 2,*/
            onLazyRead : function (node) {
                console.log( "onLazyRead node:" + node.data.key );
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
                    console.log( "collapsing node:" + node.data.key );
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
                if ( ( node.getEventTargetType(event) === "title" ) && ( node.isActive() ) ) {

                    editNode( node );

                    return false;// Prevent default processing
                }
            },

            onKeydown: function(node, event) {
                switch( event.which ) {
                    // Handle Ctrl-C, -X and -V
                    /*case 67:
                        if( event.ctrlKey ) { // Ctrl-C
                            //call onNodeClose if exist
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
                        break;*/
                    case 13: //ENTER
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

        this.treeViewE.bind("keydown", function(event){

        });
    }

    DynaTreeBrowserWidget.prototype = {

        /**
         * Creates a new node in the treebrowser under parentNode with the given parameters
         * @param parentNode
         * @param objDescriptor
         */
        createNode : function( parentNode, objDescriptor ) {
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
                addClass:objDescriptor.objectType || ""
            });


            //log
            console.log("New node created: " + newNode);

            //a bit of visual effect
            this.animateNode( newNode );

            //return the newly created node
            return newNode;
        },

        animateNode : function(node) {

            //if animation is enabled for the widget
            if (this._animation === true) {
                //force rendering of the node otherwise may happen that its DOM representation is not ready
                node.render();

                var jQureyNode = $( node.span.children[2] );
                jQureyNode.hide();
                jQureyNode.fadeIn('fast');
            }
        },

        /**
         * Deletes the node from the tree
         * @param node
         */
        deleteNode : function(node) {
            //if no valid node, return
            //otherwise delete node
            if (!node)
                return;

            if (node) {
                //get its parent
                //var parent = node.getParent();

                node.remove();

                //the parent has no more children
                /*if (parent.hasChildren() !== true) {
                    //close parent and update it's lazyLoad status and remove expand icon
                    this.updateNode(parent, null, false, true);
                }*/

                //log
                console.log("Node removed: " + node.data.key);
            }
        },

        /**
         * Resets the given nodes text tp the given value
         * @param node
         * @param text
         */
        renameNode:function (node, text) {

            this.updateNode(node, { "text" : text } );
        },

        /*
         * Resets the given nodes text tp the given value
         * @param node
         * @param text
         */
        updateNode:function (node, objDescriptor ) {

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

            //set new icon (if any)
            if ( objDescriptor.objType ) {
                if ( node.data.addClass !== objDescriptor.objType ) {
                    node.data.addClass = objDescriptor.objType;
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
                console.log("Node updated: " + node.data.key);
            }
        },

        /**
         * Called when a node is opened in the tree
         * PLEASE OVERIDDE TO FILL THE NODES CHILDREN
         * @param nodeId
         */
        onNodeOpen:function (nodeId) {
            console.log("Default onNodeOpen for node " + nodeId + " called, doing nothing. Please override onNodeOpen(nodeId)");
        },

        /*
         * Called when a node's title is changed in the reeview
         * PLEASE OVERIDDE TO HANDLE TITLE CHANGE FOR YOURSELF
         */
        onNodeTitleChanged:function (nodeId, oldText, newText) {
            console.log("Default onNodeTitleChanged for node " + nodeId + " called, doing nothing. Please override onNodeTitleChanged(nodeId, oldText, newText)");
            return true;
        },

        /*
         * Collapses the given node
         */
        collapse:function (node) {
            node.expand(false);
        },

        /*
         * Expands the given node
         */
        expand:function (node) {
            node.expand(true);
        },

        isExpanded : function( node ) {
            //if the node is null its most propably represents the root
            //and the root is always expanded (since is not shown in the tree)
            if ( node === null ) {
                return true;
            }

            return node.isExpanded();
        }
    };

    return DynaTreeBrowserWidget;
});