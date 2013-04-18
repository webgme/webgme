define([
    'util/assert',
    'util/sha1'],
    function(ASSERT,SHA1){
        'use strict';

        var BRANCH_ID = "*";

        function commit(_project,_options){

            function getBranchNames(callback){
                _project.getBranchNames(function(err,rawnames){
                    if(!err && rawnames){
                        for(var i in rawnames){
                            rawnames[i.replace(BRANCH_ID,'')] = rawnames[i];
                            delete rawnames[i];
                        }
                    }
                    callback(err,rawnames);
                });
            }

            function getBranchHash(branch,oldhash,callback){
                var branchId = BRANCH_ID+branch;
                _project.getBranchHash(branchId,oldhash,callback);
            }

            function setBranchHash(branch,oldhash,newhash,callback){
                var branchId = BRANCH_ID+branch;
                _project.setBranchHash(branchId,oldhash,newhash,callback);
            }

            function makeCommit(branch,parents,roothash,msg){
                var branchId = BRANCH_ID+branch;
                parents = parents || [];
                msg = msg || "n/a";

                var commitObj = {
                    _id     : "",
                    root    : roothash,
                    parents : parents,
                    updater : ['TODO'],
                    time    : (new Date()).getTime(),
                    message : msg,
                    name    : branch,
                    type    : "commit"
                };

                commitObj._id = '#' + SHA1(JSON.stringify(commitObj));
                _project.insertObject(commitObj,function(err){
                    //TODO there is nothing we can do with this...
                });
                return commitObj._id;
            }

            return {
                commit: makeCommit,
                getBranchNames: getBranchNames,
                getBranchHash: getBranchHash,
                setBranchHash: setBranchHash
            };
        }
        return commit;
    });
