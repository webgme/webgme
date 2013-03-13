define(['commonUtil'],function(commonUtil){
    var KEY = "_id";
    var BID = "*#*";
    var COPY = commonUtil.copy;
    var ClientCommitInfo = function(parameters){
        var refreshCommitId = null,
            refreshBranchId = null,
            storage = parameters.storage,
            master = parameters.master,
            project = parameters.project,
            commits = {},
            branches = {};

        var getCommitList = function(){
            var returnlist = [];
            for(var i in commits){
                returnlist.push(i);
            }
            return returnlist;
        };
        var getCommitObj = function(commitid){
            return commits[commitid];
        };
        var getAllCommits = function(){
            var returnlist = [];
            for(var i in commits){
                returnlist.push(commits[i]);
            }
            return returnlist;
        };
        var getBranches = function(){
            var returnlist = [];
            for(var i in branches){
                returnlist.push(branches[i]);
            }
            return returnlist;

        };

        /*var refreshCommits = function(callback){
            callback = callback || function(){};
            storage.find({type:'commit'},function(err,findobjects){
                if(err){
                    console.log("cannot update commit list due to: "+err);
                } else {
                    commits={};
                    for(var i=0;i<findobjects.length;i++){
                        commits[findobjects[i][KEY]] = findobjects[i];
                    }

                }
                callback(err);
            });
        };*/
        var refresh = function(callback){
            callback = callback || function(){};
            storage.load("*#*master",function(err,branch){
                if(!err && branch){
                    branches = {};
                    branches[branch[KEY]] = branch;
                    storage.load(branch.commit,function(err,commit){
                        if(!err && commit){
                            commits = {};
                            commits[commit[KEY]] = commit;
                        } else {
                            callback(err);
                        }
                    });
                    callback(null);
                } else {
                    callback(err);
                }
            });
        };

        var refreshCommits = function(callback){
            refresh(callback);
        };
        var refreshBranches = function(callback){
            refresh(callback);
        };
        /*var refreshBranches = function(callback){
            callback = callback || function(){};
            storage.find({type:'branch'},function(err,findobjects){
                if(err){
                    console.log("cannot update branch list due to: "+err);
                } else {
                    var oldbranches = COPY(branches);
                    branches={};
                    for(var i=0;i<findobjects.length;i++){
                        branches[findobjects[i][KEY]] = findobjects[i];
                    }
                    for(i in oldbranches){
                        if(!branches[i]){
                            master.remoteDeleteBranch(project,oldbranches[i].name);
                        }
                    }
                }
                callback(err);
            });
        };*/

        var getAllCommitsNow = function(callback){
            callback = callback || function(){};
            refreshCommits(function(err){
                if(err){
                    callback(err,getAllCommits());
                } else {
                    callback(null,getAllCommits());
                }
            });
        };

        var getBranchesNow = function(callback){
            callback = callback || function(){};
            refreshBranches(function(err){
                if(err){
                    callback(err,getBranches());
                } else {
                    callback(null,getBranches());
                }
            });
        };

        var produceCommitTimeline = function(commitid){
            var timeline = {};
            timeline[commitid] = 0;
            if(commits[commitid]){
                for(var i=0;i<commits[commitid].parents.length;i++){
                    var parentline = produceCommitTimeline(commits[commitid].parents[i]);
                    for(var j in parentline){
                        timeline[j] = parentline[j]+1;
                    }
                }
            }

            return timeline;
        };
        var getCommitDifference = function(commitid,callback){
            getAllCommitsNow(function(err,commitobjects){
                if(commits[commitid]){
                    storage.load(BID+commits[commitid].name,function(err,branch){
                       if(!err && branch){
                           //here comes the real counting
                           if(branch.commit === commitid){
                               callback(null,0);
                           } else {
                               //ok here comes the real counting...
                               var myline = produceCommitTimeline(commitid);
                               var serverline = produceCommitTimeline(branch.commit);
                               if(myline[branch.commit]){
                                   //we are ahead of the server
                                   callback(null,myline[branch.commit]);
                               } else {
                                   var mindist = null;
                                   var mincommit = null;
                                   for(var i in myline){
                                       if(serverline[i]){
                                           if(mindist === null || serverline[i]<mindist){
                                               mindist = serverline[i];
                                               mincommit = i;
                                           }
                                       }
                                   }
                                   //we are behind the server...
                                   callback(null,(-1)*mindist);
                               }
                           }
                       } else {
                           callback('no branch info is available');
                       }
                    });
                } else {
                    callback('commit not found');
                }
            });
        };

        var isFastForward = function(commit,ancestor,callback){
            var myAncestor = function(commitid,ancestorid){
                if(commits[commitid]){
                    var index = commits[commitid].parents.indexOf(ancestorid);
                    var size = commits[commitid].parents.length;
                    if(size>0){
                        if(index>-1){
                            return true;
                        } else {
                            var parentsvalue = false;
                            for(var i=0;i<size;i++){
                                parentsvalue = parentsvalue || myAncestor(commits[commitid].parents[i],ancestorid);
                            }
                            return parentsvalue;
                        }
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            };

            if(commit === ancestor){
                callback(null,true);
            } else {
                getBranchesNow(function(err){
                    if(err){
                        callback(err);
                    } else {
                        if(commits[commit] && commits[ancestor]){
                            callback(null,myAncestor(commit,ancestor));
                        } else {
                            callback(null,false);
                        }
                    }
                });
            }
        };

        //refreshCommitId = setInterval(refreshCommits,parameters.refreshrate);
        //refreshBranchId = setInterval(refreshBranches,parameters.refreshrate);
        //TODO not the nicest to initialize the values this way, but should work for now
        getBranchesNow();
        getAllCommitsNow();


        return {
            getCommitList : getCommitList,
            getCommitObj : getCommitObj,
            getAllCommits : getAllCommits,
            getAllCommitsNow : getAllCommitsNow,
            getCommitDifference : getCommitDifference,
            getBranches : getBranches,
            getBranchesNow : getBranchesNow,
            isFastForward: isFastForward
        }
    };
    return ClientCommitInfo;
});
