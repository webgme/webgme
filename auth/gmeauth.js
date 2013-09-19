/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ ],function(){
    function gmeAuthorization(_udm,_session){
        function authorization(sessionId,projectName,type,callback){
            _session.getSessionUser(sessionId,function(err,userId){
                if(!err && userId){
                    if(type === 'create'){
                        _udm.getUser(userId,function(err,data){
                            if(!err && data){
                                callback(null,data.create);
                            } else {
                                callback(err,false);
                            }
                        });
                    } else {
                        _udm.getUserProject(userId,projectName,function(err,data){
                            if(!err && data){
                                callback(null,data[type]);
                            } else {
                                callback(err,false);
                            }
                        });
                    }
                } else {
                    err = err || 'wrong session';
                    callback(err,false);
                }
            });
        }
        return {
            authorization: authorization
        }
    }
    return gmeAuthorization;
});
