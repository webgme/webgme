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
            var selectBranch = function(branchname,callback){
                storage.load(BID+branchname,function(err,branch){
                    if(err){
                        callback(err);
                    } else {
                        if(branch && branch.root.length>0){
                            actualbranchinfo = branch;
                            callback(null,actualbranchinfo.root[actualbranchinfo.root.length-1]);
                        } else {
                            callback("no branch found");
                        }
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

            var setRootUpdatedFunction = function(rootUpdated){
                if(storage){
                    storage.getUpdated(rootUpdated);
                }
            };

            return {
                selectBranch            : selectBranch,
                updateRoot              : updateRoot,
                commit                  : commit,
                setRootUpdatedFunction : setRootUpdatedFunction
            }
        };

        return Comitter;
    });
