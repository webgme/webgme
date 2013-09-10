/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define([ ],function(){
    function udmPass(_udm){

        function findUser(username,callback){
            _udm.getUser(username,function(err,userData){
                if(err){
                    callback(err);
                } else {
                    var authUser = {};
                    authUser.id = username;
                    authUser.pass = userData.pass;
                    callback(null,authUser);
                }
            });
        }
        _udm.initialize(function(){});

        return {
            findUser : findUser
        }
    }
    return udmPass;
});

