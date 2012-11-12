define([],function(){
    var KEY = "_id";
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

        var refreshCommits = function(){
            storage.find({type:'commit'},function(err,findobjects){
                if(err){
                    console.log("cannot update commit list due to: "+err);
                } else {
                    commits={};
                    for(var i=0;i<findobjects.length;i++){
                        commits[findobjects[i][KEY]] = findobjects[i];
                    }
                }
            });
        };


        return {
            getCommitList : getCommitList,
            getCommitObj : getCommitObj,
            getAllCommits : getAllCommits
        }
    };
    return ClientCommitInfo;
});
