/*
graphNode = {
    guid: 'unique identifier' //if not given, then generated
    position:{
        x:0,
        y:0
    }, //if position is not given than based on the view's option regarding layout would be the node represented
    type: 'basic', //possible values: basic,named ; default: basic
    name: 'nodename' //default is random generated GUID
};
*/
/*
graphViewOptions = {
    nodesize  : 5, //gives the size of the nodes - in case of basic it is the radius of the node in case of named it is the font size
    nodecolor : black,
    nodeclass : null, //CSS class of the node
    nodedraggable : true, //if false the nodes cannot be moved
    mineventdelay : 10, //ms shows how long we should wait before next event on the same object
};
*/
define(['commonUtil'],
    function(CU){
        var GUID = CU.guid;
        var SimpleGraphView = function(containerElement){
            /*variables for later style options*/
            var _options = {
                nodesize : 5,
                nodecolor : 'grey',
                nodeselectcolor : 'red',
                penwidth : 1,
                pencolor : 'blue',
                nodedraggable : true,
                nodeselectable : true,
                mineventdelay : 10,
                width : '100%',
                height : '0px',
                //event functions
                nodeselected : null,
                nodedblclicked : null,
                nodeupdated : null
            };
            var TSTAMP = CU.timestamp,
                _nodes = {},
                _edges = {},
                _paper = Raphael(containerElement,_options.width,_options.height);


            var _resizePaper = function(){
                var maxy = 0,
                    namey = "y",
                    additionalsize = 0;

                for(var i in _nodes){
                    switch (_nodes[i].data("shape")){
                        case "square":
                            namey = "y";
                            additionalsize = 2*_options.nodesize;
                            break;
                        default: //circle
                            namey = "cy";
                            additionalsize = _options.nodesize;
                            break;
                    }

                    if(maxy<_nodes[i].attr(namey)+additionalsize){
                        maxy = _nodes[i].attr(namey)+additionalsize;
                    }
                }

                _paper.setSize(_options.width,maxy+_options.nodesize);
            };

            var _selectNode = function(guid){
                _nodes[guid].attr('fill',_options.nodeselectcolor);

            };
            var _deselectNode = function(guid){
                _nodes[guid].attr('fill',_options.nodecolor);
            };
            var _basicNodeAttributes = function(guid){
                _nodes[guid].attr('stroke',_options.pencolor);
                _nodes[guid].attr('fill',_options.nodecolor);
                _nodes[guid].attr('stroke-width',_options.penwidth);
                _nodes[guid].data('edges',[]);

                if(_options.nodedraggable){
                    _nodes[guid].drag(_onMouseMove,_onMouseMoveStart,_onMouseMoveEnd, _nodes[guid], _nodes[guid], _nodes[guid]);
                }
                if(_options.nodeselectable){
                    _nodes[guid].click(_onNodeClick);
                    _nodes[guid].dblclick(_onNodeDblClick);
                }
            };

            /*event functions and helper variables*/
            var dragx = 0,
                dragy = 0,
                selectednode = null,
                eventnode = null,
                eventtime = TSTAMP(),
                drag = false;


            var _onMouseMoveStart = function(x,y,event){
                dragx = this.attr('cx');
                dragy = this.attr('cy');
            };
            var _onMouseMove = function(dx,dy,x,y,event){
                drag = true;
                this.attr('cx',dragx+dx);
                this.attr('cy',dragy+dy);
                for(var i in this.data('edges')){
                    _updateEdge(i);
                }
            };
            var _onMouseMoveEnd = function(event){
                if(TSTAMP()-eventtime > _options.mineventdelay && drag){
                    drag = false;
                    eventnode = this.data('guid');
                    eventtime = TSTAMP();
                    /*TODO - call the defined function of Update*/
                }
            };
            var _onNodeClick = function(event){
                console.log("kecso click");
                if(TSTAMP()-eventtime > _options.mineventdelay || eventnode !== this.data('guid')){
                    eventtime = TSTAMP();
                    eventnode = this.data('guid');
                    if(selectednode){
                        if(_nodes[selectednode]){
                            _deselectNode(selectednode);
                            if(selectednode === this.data('guid')){
                                selectednode = null;
                                return;
                            }
                        }
                    }
                    selectednode = this.data('guid');
                    _selectNode(this.data('guid'));
                }
            };
            var _onNodeDblClick = function(event){
                console.log("kecso dblclick");
                eventtime = TSTAMP();
                eventnode = this.data('guid');
                if(selectednode){
                    if(_nodes[selectednode]){
                        _deselectNode(selectednode);
                    }
                }
                selectednode = this.data('guid');
                _selectNode(this.data('guid'));
                if(!!(_options.nodedblclicked && _options.nodedblclicked.constructor && _options.nodedblclicked.call && _options.nodedblclicked.apply)){
                    _options.nodedblclicked(this.data('guid'));
                }
            };

            var addBasicNode = function(node){
                var guinode = null;
                var namex = "";
                var namey = "";
                var offsetx = 0;
                var offsety = 0;
                switch (node.shape){
                    case "square":
                        guinode = _paper.rect(0,0,_options.nodesize*2,_options.nodesize*2,_options.nodesize*2/10);
                        namex = "x";
                        namey = "y";
                        break;
                    default:
                        guinode = _paper.circle(0,0,_options.nodesize);
                        namex="cx";
                        namey="cy";
                        offsetx = _options.nodesize;
                        offsety = _options.nodesize;
                        break;
                }
                _nodes[node.guid] = guinode;

                if(node.position && node.position.x && node.position.y){
                    guinode.attr(namex,node.position.x+offsetx);
                    guinode.attr(namey,node.position.y+offsety);
                } else {
                    guinode.hide();
                    /*TODO - after the layout function sets the real positions we should show the nodes again :)*/
                }
                _basicNodeAttributes(node.guid);

                for(var i in node){
                    guinode.data(i,node[i]);
                }

                return node.guid;
            };
            var addNode = function(node){
                var retval = null;
                node.guid = node.guid || GUID();
                node.type = node.type || "basic";
                switch(node.type){
                    case "named":
                        break;
                    default:
                        retval = addBasicNode(node);
                }
                _resizePaper();
                return retval;
            };

            var addEdge = function(src,dst,guid){
                guid = guid || GUID();
                var srcnode = _nodes[src];
                var dstnode = _nodes[dst];
                if(srcnode && dstnode){
                    var edge = _paper.path("M0 0");
                    edge.attr('stroke-width','3');
                    edge.data('src',src);
                    edge.data('dst',dst);
                    edge.data('guid',guid);
                    var edges = srcnode.data('edges');
                    edges[guid] = 'src';
                    srcnode.data('edges',edges);
                    edges = dstnode.data('edges');
                    edges[guid] = 'src';
                    dstnode.data('edges',edges);
                    _edges[guid] = edge;
                    _updateEdge(guid);
                    return guid;
                }
                return null;
            };

            var updateNode = function(node){
                if(_nodes[node.guid]){
                    var guinode = _nodes[node.guid];
                    if(guinode.data('type') !== node.type){
                        /*TODO - ezt meg ki kell talalni*/
                    } else {
                        for(var i in node){
                            guinode.data(i,node[i]);
                        }

                        if(node.position && node.position.x && node.position.y){
                            guinode.attr('cx',node.position.x);
                            guinode.attr('cy',node.position.y);
                        }
                    }
                }
                _resizePaper();
            };

            var updateEdge = function(){

            };

            var _updateEdge = function(guid){
                var edge = _edges[guid];
                if(edge){
                    var srcnode = _nodes[edge.data('src')];
                    var dstnode = _nodes[edge.data('dst')];
                    if(srcnode && dstnode){
                        edge.attr('path',
                            "M"+srcnode.attr('cx')+" "+srcnode.attr('cy')+
                            "L"+dstnode.attr('cx')+" "+dstnode.attr('cy')
                        );
                        edge.toBack();
                    }
                }
            };

            var deleteNode = function(guid){
                var edges = _nodes[guid].data('edges');
                for(var i in edges){
                    if(edges.hasOwnProperty(i)){
                        deleteEdge(i);
                    }
                }
                _nodes[guid].remove();
                delete _nodes[guid];
                _resizePaper();
            };

            var deleteEdge = function(guid){
                _edges[guid].remove();
                delete _edges[guid];
            };

            var eraseAll = function(){
                for(i in _nodes){
                    deleteNode(i);
                }
                _resizePaper();
            };

            var changeOptions = function(optionname,value){
                _options[optionname] = value;
                /*TODO if the event handler changes then we have to take care of them here...*/
            };

            return{
                addNode          : addNode,
                addEdge          : addEdge,
                updateNode       : updateNode,
                updateEdge       : updateEdge,
                deleteNode       : deleteNode,
                deleteEdge       : deleteEdge,
                eraseAll         : eraseAll,
                changeOptions    : changeOptions

            }
        };
        return SimpleGraphView;
    });


