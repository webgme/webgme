define([],function(){
    var KEY = "_id";
    var BID = "*#*";
    var ClientCommitInfo = function(parameters){
        var refreshId = setInterval(refreshCommits,parameters.refreshrate),
            storage = parameters.storage,
            commits = {};

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

        var refreshCommits = function(callback){
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
        };

        var getAllCommitsNow = function(callback){
            callback = callback || function(){};
            refreshCommits(function(err){
                if(err){
                    callback(err,getAllCommits());
                } else {
                    callback(null,getAllCommits());
                }
            })
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


        return {
            getCommitList : getCommitList,
            getCommitObj : getCommitObj,
            getAllCommits : getAllCommits,
            getAllCommitsNow : getAllCommitsNow,
            getCommitDifference : getCommitDifference
        }
    };
    return ClientCommitInfo;
});
