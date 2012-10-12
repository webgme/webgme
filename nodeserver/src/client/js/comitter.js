/*
IF:
selectBranch
updateBranch
commit

functions needed from user:
rootupdated

 */
define(['commonUtil',"core/lib/sha1"],
    function(commonUtil,SHA1){
        var Comitter = function(storage){
            var BID = "*";
            var actualbranchinfo = null;
            var currentbranchname = null;
            var currentupdfunc = null;

            var getBranches = function(callback){
                storage.find({type:"branch"},function(err,nodes){
                    if(err){
                        callback(err);
                    } else {
                        if(nodes && nodes.length>0){
                            var branches = [];
                            for(var i=0;i<nodes.length;i++){
                                branches.push(nodes[i].name);
                            }
                            callback(null,branches);
                        } else {
                            callback("no branches were found");
                        }
                    }
                });
            };

            var poll = function(node){
                if(currentupdfunc){
                    storage.requestPoll(currentbranchname,poll);
                    actualbranchinfo = node;
                    currentupdfunc(node.root[node.root.length-1]);
                }
            };

            var selectBranch = function(branchname,updfunc){
                currentbranchname = branchname;
                currentupdfunc = updfunc;
                storage.requestPoll(branchname,poll);
                storage.load(BID+branchname,function(err,node){
                    if(!err && node){
                        actualbranchinfo = node;
                        updfunc(node.root[node.root.length-1]);
                    }
                });
            };

            var updateRoot = function(rootkey,callback){
                if(actualbranchinfo){
                    var myroot = JSON.parse(JSON.stringify(actualbranchinfo));
                    myroot.root.push(rootkey);
                    storage.save(myroot,function(err){
                        if(err){
                            callback(err);
                        } else {
                            actualbranchinfo = myroot;
                            callback(null);
                        }
                    });
                } else {
                    callback("no branch is used");
                }
            };

            var commit = function(callback){

                var mycommit = JSON.parse(JSON.stringify(actualbranchinfo));
                var lastroothash = mycommit.root.pop();
                mycommit.root = lastroothash;
                mycommit["_id"] = false;
                var key = SHA1(JSON.stringify(mycommit));
                mycommit["_id"] = "#"+key;
                storage.save(mycommit,function(err){
                    if(err){
                        callback(err);
                    } else {
                        var newbranchhead = {
                            _id     : mycommit["_id"],
                            root    : lastroothash,
                            parents : ["#"+key],
                            updates : [],
                            start   : null,
                            end     : null,
                            message : "",
                            name    : mycommit.name,
                            type    : "branch"
                        };
                        storage.save(newbranchhead,function(err){
                            if(err){
                                callback(err);
                            } else {
                                callback(null);
                            }
                        });
                    }
                });
            };

            return {
                selectBranch           : selectBranch,
                updateRoot             : updateRoot,
                commit                 : commit,
                getBranches            : getBranches
            }
        };

        return Comitter;
    });
