define([], function(){
    var ListerCtrl = function(project, containerId ){
        this.project = project;

        this.containerId = containerId;

        this.query = this.project.createQuery();
        this.query.addUI(this);
        this.query.addPattern( "root",{self:true, children:true} );

        this._nodes = {};

        this.treeBrowser = new TreeBrowserWidget( containerId );

        //handle node open
        var self = this;

        this.treeBrowser.onNodeOpen = function( node ) {
            self.query.addPattern( node.data.key, {self:true, children:true} );
        }

        this.treeBrowser.onNodeTitleChanged = function( node, oldText, newText ) {

            var currentNode = self.project.getNode( node.data.key );
            currentNode.name = newText;
            self.project.setNode( currentNode );

            //accept namechange
            return true;
        }

        this.treeBrowser.onNodeClose = function( node) {
            //remove all chilrend (deep nested children) from the accoutned open-node list
            var allChildrenIds = self._queryNodeAllChildrenIds( node.data.key );

            var removeFromTerritory = [];

            //at this point we have all the nested childrenIds we don't care anymore
            for ( var j = 0; j < allChildrenIds.length; j++  ) {

                //remove from
                delete self._nodes[ allChildrenIds[ j ] ];

                removeFromTerritory.push( { id : allChildrenIds[ j ] } );
            }

            //extend list with the current node's ID
            removeFromTerritory.push( { id : node.data.key } );

            //remove the node itself from querypattern
            self.query.deletePatterns( removeFromTerritory );
        }

        this.treeBrowser.onNodeCopy = function( nodeId ) {
            console.log( "treeBrowser.onNodeCopy " + nodeId );
            self.project.copyNode( nodeId );
        }

        this.treeBrowser.onNodePaste = function( nodeId ) {
            console.log( "treeBrowser.onNodePaste " + nodeId );
            self.project.pasteTo( nodeId );
        }

        this.treeBrowser.onNodeDelete = function( nodeId ) {
            console.log( "treeBrowser.onNodeDelete " + nodeId );
            self.project.delNode( nodeId );
        }
    };

    ListerCtrl.prototype._queryNodeAllChildrenIds = function( nodeId ) {
        //remove all chilrend (deep nested children) from the accoutned open-node list
        var allChildrenIds = [];

        var self = this;

        var getChildren = function( moduleNode ) {

            if ( moduleNode === undefined ) {
                return;
            }

            for( var i = 0; i < moduleNode.children.length; i++ ) {
                allChildrenIds.push( moduleNode.children[i] );

                getChildren( self.project.getNode(  moduleNode.children[i] ) );
            }
        };

        getChildren( self.project.getNode( nodeId ) );

        //return the children ID list
        return allChildrenIds;
    }


    ListerCtrl.prototype.onRefresh = function( updatedata ){

        //updatedata contains:
        //ilist for inserted nodes
        //mlist for updated nodes
        //dlist for deleted ndoes

        //disable rendering for tree, speed it up
        if ( updatedata.ilist.length + updatedata.mlist.length + updatedata.dlist.length > 1 )
            this.treeBrowser.enableUpdate(false);

        //Handle INSERTED LIST
        for ( var i = 0; i < updatedata.ilist.length; i++ ) {
            var inseretedNodeId = updatedata.ilist[i];

            if ( inseretedNodeId !== "root" ) {

                var inseretedNode = this.project.getNode( inseretedNodeId );

                //just to make sure that the inserted node really exist on the client
                if ( inseretedNode )
                {
                    var parentNode = inseretedNode.parentId;

                    if ( inseretedNode.parentId !== null ) {
                        parentNode = this._nodes[ inseretedNode.parentId ];
                    }

                    var newTreeNode = this.treeBrowser.createNode( parentNode, { id: inseretedNode._id, name: inseretedNode.name, hasChildren : inseretedNode.children.length > 0 } );

                    this._nodes[ inseretedNode._id ] = newTreeNode;
                }
            }
        }

        //HANDLE UPDATED LIST
        for (  i = 0; i < updatedata.mlist.length; i++ ) {
            var updatedNodeId = updatedata.mlist[i];

            if ( updatedNodeId !== "root" ) {

                var updatedNode = this.project.getNode( updatedNodeId );

                //just to make sure that the inserted node really exist on the client
                if ( updatedNode )
                {
                    if ( this._nodes[ updatedNodeId ] ) {
                        //node is present in treebrowser, update it

                        //check if name changed
                        if ( updatedNode.name !== this.treeBrowser.getNodeText( this._nodes[ updatedNodeId ] ) ) {
                            this.treeBrowser.renameNode( this._nodes[ updatedNodeId ], updatedNode.name );
                        }

                        //check if children number changed
                        //1) before it had no children and now it has

                        //2) before it had children, and now it has no chilren
                        //2a) node was closed --> remove the "expand" icon
                        this._nodes[ updatedNodeId ].data.isLazy =  updatedNode.children.length > 0;
                        this._nodes[ updatedNodeId ].render();
                        //2b) node was open --> remove the children, close it, and remove the "expand" icon   --- HANDLED with the children deletion

                    } else {
                        //there is an update indicator about the node, but the node itself is not in the tree
                        //this should never happen
                    }
                }
            }
        }

        //HANDLE DELETED LIST
        var removeFromTerritory = [];
        for (  i = 0; i < updatedata.dlist.length; i++ ) {
            var deletedNodeId = updatedata.dlist[i];

            if ( deletedNodeId !== "root" ) {

                if ( this._nodes[ deletedNodeId ] ) {
                    //node is present in treebrowser, update it
                    this.treeBrowser.deleteNode( this._nodes[ deletedNodeId ]  );

                    //remove from local opened node list
                    delete this._nodes[ deletedNodeId ];

                    //extend list with the current node's ID
                    removeFromTerritory.push( { nodeid : deletedNodeId } );
                }
            }
        }
        //remove the node itself from querypattern
        if ( removeFromTerritory.length > 0 )  {
            this.query.deletePatterns( removeFromTerritory );
        }

        /*for ( var i = 0; i < nodes.length; i++ ) {
            var currentNodeId = nodes[i];

            var currentNode = this.project.getNode( currentNodeId );

            if ( currentNode )
            {
                //check if node is already here?
                if ( this._nodes[ currentNodeId ] ) {
                    //node is present in treebrowser, update it
                    if ( currentNode.name !== this.treeBrowser.getNodeText( this._nodes[ currentNodeId ] ) ) {
                        this.treeBrowser.renameNode( this._nodes[ currentNodeId ], currentNode.name );
                    }
                } else {
                    if ( currentNode._id !== "root" ) {

                        var parentNode = currentNode.parentId;

                        if ( currentNode.parentId !== null ) {
                            parentNode = this._nodes[ currentNode.parentId ];
                        }

                        var newTreeNode = this.treeBrowser.createNode( parentNode, { id: currentNode._id, name: currentNode.name, hasChildren : currentNode.children.length > 0 } );

                        this._nodes[ currentNode._id ] = newTreeNode;
                    }
                }
            }
        }*/

        //disable rendering for tree, speed it up
        if ( updatedata.ilist.length + updatedata.mlist.length + updatedata.dlist.length > 1 )
            this.treeBrowser.enableUpdate(true);
    };


    return ListerCtrl;
});
