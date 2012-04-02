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
            var allChildrenIds = [];

            var getChildren = function( moduleNode ) {

                if ( moduleNode === undefined ) {
                    return;
                }

                for( var i = 0; i < moduleNode.children.length; i++ ) {
                    allChildrenIds.push( moduleNode.children[i] );

                    getChildren( self.project.getNode(  moduleNode.children[i] ) );
                }
            };

            getChildren( self.project.getNode( node.data.key ) );

            //at this point we have all the nested childrenIds we don't care anymore
            for ( var j = 0; j < allChildrenIds.length; j++  ) {

                //remove from
                delete self._nodes[ allChildrenIds[ j ] ];

                //remove the chilren's interest from territory
                self.query.deletePattern( allChildrenIds[ j ] );
            }

            //remove the node itself from querypattern
            self.query.deletePattern( node.data.key );
        }

        this.treeBrowser.onNodeCopy = function( nodeId ) {
            console.log( "treeBrowser.onNodeCopy " + nodeId );
            self.project.copyNode( nodeId );
        }

        this.treeBrowser.onNodePaste = function( nodeId ) {
            console.log( "treeBrowser.onNodePaste " + nodeId );
            self.project.pasteTo( nodeId );
        }
    };

    ListerCtrl.prototype.onRefresh = function( nodes ){

        //disable rendering for tree, speed it up
        if ( nodes.length > 1 )
            this.treeBrowser.enableUpdate(false);

        for ( var i = 0; i < nodes.length; i++ ) {
            var currentNodeId = nodes[i];

            var currentNode = this.project.getNode( currentNodeId );

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

        //disable rendering for tree, speed it up
        if ( nodes.length > 1 )
            this.treeBrowser.enableUpdate(true);

        this.treeBrowser.focusActiveNode();
    };


    return ListerCtrl;
});
