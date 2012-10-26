define(['commonUtil'],
    function(CU){
        var SVGGraphCommitCtrl = function(_client,_view){

            var _objects = {};
            var _uptodate = false;
            var _root = null;
            var BID ="*";

            var _onPoll = function(node){
                _client.requestPoll(node['_id'],_onPoll);
                if(_uptodate){
                    _coreUpdateNode(node);
                }
            };

            var _coreUpdateNode = function(node){
                if(node.root !== _objects[node['_id']].root){
                    console.log("branch "+node['_id']+" changes from "+_objects[node['_id']].root+" to "+node.root);
                }

                if(!CU.isSameArray(node.parents,_objects[node['_id']].parents)){
                    _init(function(){
                       /*TODO additional reinitalization functions*/
                    });
                }

            };

            var _viewNodeSelected = function(nid){
                if(_objects[nid]){
                    if(_objects[nid].type === "branch"){
                        _client.selectBranch(_objects[nid].name);
                    } else {
                        _client.loadCommit(nid);
                    }
                }
            };

            var _setGraph = function(callback){
                var stepy = 50;
                var y = 20;
                var nodes = [];
                for(var i in _objects){
                    nodes.push({
                        guid: i,
                        position:{
                            x:20,
                            y:20
                        },
                        type: 'basic',
                        name: _objects[i].type === 'branch' ? _objects[i].name : i,
                        tstamp : _objects[i].end,
                        shape : _objects[i].type === "branch" ? "square" : "circle",
                        tooltip: 'ezvankerem '+i
                    });
                }

                /*ordering based on tstamp*/
                for(i=0;i<nodes.length-1;i++){
                    for(j=i+1;j<nodes.length;j++){
                        var needreplace = false;
                        if(nodes[i].tstamp === null){
                            needreplace = true;
                        } else {
                            if(nodes[j].tstamp){
                                if(nodes[j].tstamp<nodes[i].tstamp){
                                    needreplace = true;
                                }
                            }
                        }

                        if(needreplace){
                            var temp = nodes[i];
                            nodes[i] = nodes[j];
                            nodes[j] = temp;
                        }
                    }
                }

                /*correct positioning and put to view*/
                for(i=0;i<nodes.length;i++){
                    nodes[i].position.y = y;
                    y +=stepy;
                    _view.addNode(nodes[i]);
                }



                callback();
            };
            
            var _init = function(callback){
                _objects = {};
                _root = null;
                _uptodate = false;
                _view.eraseAll();
                _view.changeOptions('nodedraggable',false);
                _view.changeOptions('nodedblclicked',_viewNodeSelected);

                var idlist = [];
                var counter = 0;
                var objectLoaded = function(err,node){
                    if(!err && node){
                        _objects[node['_id']] = node;
                        _onPoll(node);
                        if(node.parents.length === 0){
                            _root = node['_id'];
                        }
                    }
                    
                    if(++counter === idlist.length){
                        //*now we are ready to set the graph*//
                        _setGraph(callback);
                        _uptodate = true;
                    }
                };
                
                _client.getBranches(function(err,branches){
                    if(!err ){
                        if(branches){
                            for(var i=0;i<branches.length;i++){
                                idlist.push(BID+branches[i]);
                            }
                        }
                        _client.getCommits(function(err,commits){
                            if(!err || err == "no branches were found"){
                                if(commits){
                                    idlist = idlist.concat(commits);
                                }
                                for(var i=0;i<idlist.length;i++){
                                    _client.load(idlist[i],objectLoaded);
                                }
                                if(idlist.length === 0){
                                    callback();
                                }
                            }
                        });
                    }
                });
            };
            
            /*init*/
            if(_client.opened()){
                _init(function(){});
            } else {
                _client.open(function(err){
                    if(err){
                        //TODO na itt mi van
                    } else {
                        _init(function(){});
                    }
                });
            }
        };
        return SVGGraphCommitCtrl;
    });
