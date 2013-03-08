define([
    'core/assert',
    'core/lib/sha1',
    'common/CommonUtil'],
    function(ASSERT,SHA1,commonUtil){
        'use strict';

        var commit = function(_project){

            var makeCommit = function(core,rootObject,parentCommit,callback){
                ASSERT(typeof core === 'object' && typeof callback === 'function' && typeof rootObject === 'object');
                var rootHash = core.persist(rootObject);
                if(!rootHash){
                    rootHash = core.getKey(rootObject);
                }

                var commitObj = {
                    _id     : null,
                    root    : rootHash,
                    parents : parentCommit ? [parentCommit._id] : [],
                    updates : ['TODO'],
                    time    : commonUtil.timestamp(),
                    message : "TODO",
                    name    : "TODO",
                    type    : "commit"
                };

                commitObj._id = '#' + SHA1(JSON.stringify(commitObj));
                _project.insertObject(commitObj,function(err){
                    if(err){
                        callback(err);
                    } else {
                        callback(null,commitObj._id);
                    }
                });
            };

            var makeMerge = function(callback){
                callback('NIE');
            };

            return {
                makeCommit : makeCommit,
                makeMerge : makeMerge
            }
        };
        return commit;
    });
