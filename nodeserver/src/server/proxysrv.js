define([ "core/assert","common/CommonUtil","server/projsrv","mongodb","socket.io"], function (ASSERT,CU,PROJ,MONGODB,IO) {
    "use strict";
    var ProxyServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        var _socket = null,
            _selfid = null,
            _projects = {};

        var _log = options.log || function(txt){ console.log(txt);};
        var log = function(txt,socketid){
            var prefix = _selfid;
            prefix += socketid === null ? "" : "["+socketid+"]";
            _log(prefix+txt);
        };

        var getAvailableProjects = function(callback){
            var db = new MONGODB.Db(options.mongo.database, new MONGODB.Server(options.mongo.host,options.mongo.port), {w:1});
            db.open(function(err){
                if(err){
                    callback(err,[]);
                } else {
                    db.collectionNames(function (err,collections) {
                        if(err){
                            callback(err,[]);
                            db.close();
                        } else {
                            var names = [];
                            for(var i=0;i<collections.length;i++){
                                var collectionname = collections[i].name.substring(collections[i].name.indexOf(".") + 1);
                                if(collectionname.indexOf('system') === -1 && collectionname.indexOf('.') === -1){
                                    names.push(collectionname);
                                }
                            }
                            callback(null,names);
                            db.close();
                        }
                    });
                }
            });
        };

        if(options.io){
            _socket = options.io.of(options.namespace);
            _selfid = "[PRSRV-"+options.namespace+"]";
        } else {
            _socket = IO.listen(options.port);
            _selfid = "[PRSRV-"+options.port+"]";
        }

        //functions for the clients
        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);

            socket.on('availableProjects',function(callback){
                getAvailableProjects(callback);
            });
            socket.on('createProject',function(projectname,callback){
                var db = new MONGODB.Db(options.mongo.database, new MONGODB.Server(options.mongo.host,options.mongo.port), {w:1});
                db.open(function(err){
                    if(err){
                        callback(err);
                    } else {
                        db.createCollection(projectname,function(err,collection){
                            callback(err);
                            db.close();
                        });
                    }
                });
            });

            socket.on('deleteProject',function(projectname,callback){
                var db = new MONGODB.Db(options.mongo.database, new MONGODB.Server(options.mongo.host,options.mongo.port), {w:1});
                db.open(function(err){
                    if(err){
                        callback(err);
                    } else {
                        db.collection(projectname,function(err,collection){
                            if(err){
                                db.close();
                                callback(err);
                            } else {
                                if(_projects[projectname]){
                                    var namespace = _projects[projectname].info;
                                    _projects[projectname].project.close();
                                    delete _socket.manager.namespaces[namespace];
                                    delete _projects[projectname];
                                }
                                collection.drop();
                                db.close();
                                callback(null);
                            }
                        });
                    }
                });
            });

            socket.on('getProject',function(project,callback){
                getAvailableProjects(function(err,projects){
                    if(err){
                        callback(err);
                    } else {
                        if(projects.indexOf(project) === -1){
                            callback("unknown project");
                        } else {
                            if(_projects[project]){
                                callback(null,_projects[project].info);
                            } else {
                                var projguid = "/"+CU.guid();
                                var proj = new PROJ({close : close},{
                                    io        : options.io,
                                    namespace : projguid,
                                    options   : options.options,
                                    mongo     : {
                                        database   : options.mongo.database,
                                        host       : options.mongo.host,
                                        port       : options.mongo.port,
                                        collection : project,
                                        options    : options.mongo.options
                                    }
                                });
                                _projects[project] = {info: projguid, project:proj};
                                callback(null,_projects[project].info);
                            }
                        }
                    }
                });
            });
        });

        //functions for the projects
         var close = function(project){
            //this notification comes from the projectserver
            //that it has been automatically closed (due to last client disconnection
            _projects[project].project.close();
            delete _projects[project];
        };

        return {
            close : close
        }
    };
    return ProxyServer;
});

