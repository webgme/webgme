define([
    'js/Client/Client',
    'socket.io/socket.io.js'
],
    function(CL){
        'use strict';

        var ClientProxy = function(options){
            var proxy = null,
                projects = {};

            var _createClient = function(projectname,callback){
                proxy.emit('getProject',projectname,function(err,projns){
                    if(err || projns === null || projns === undefined){
                        callback(err);
                    } else {
                        options.projsrv = location.host+projns;
                        options.projectname = projectname;
                        var client = new CL(options);
                        projects[projectname] = client;
                        callback(null,projects[projectname]);
                    }
                });
            };

            var getClient = function(projectname,callback){
                projectname = projectname || options.defaultproject;
                if(projects[projectname]){
                    callback(null,projects[projectname]);
                } else {
                    if(proxy === null){
                        var tempproxy = io.connect(options.proxy,options.options);
                        tempproxy.on('connect',function(){
                            proxy = tempproxy;
                            if(callback){
                                var tc = callback;
                                callback = null;
                                _createClient(projectname,tc);
                            }
                        });
                    } else {
                        _createClient(projectname,callback);
                    }
                }
            };

            return {
                getClient : getClient
            }
        };

        return ClientProxy;
    }
);
