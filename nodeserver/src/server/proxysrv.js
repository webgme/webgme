define([ "core/assert","common/CommonUtil","server/projsrv","socket.io"], function (ASSERT,CU,PROJ,IO) {
    "use strict";
    var ProxyServer = function(options){
        ASSERT((options.io && options.namespace) || options.port);
        console.log("kecso "+options.projects);
        var _socket = null;
        var _self = this;
        var _selfid = null;
        var _projects = {};

        var _log = options.log || function(txt){ console.log(txt);};
        var log = function(txt,socketid){
            var prefix = _selfid;
            prefix += socketid === null ? "" : "["+socketid+"]";
            _log(prefix+txt);
        };


        if(options.io){
            _socket = options.io.of(options.namespace);
            _selfid = "[PRSRV-"+options.namespace+"]";
        } else {
            _socket = IO.listen(options.port);
            _selfid = "[PRSRV-"+options.port+"]";
        }

        _socket.on('connection',function(socket){
            log("connection arrived",socket.id);

            socket.on('availableProjects',function(callback){
                callback(null,options.projects);
            });

            socket.on('getProject',function(project,callback){
                if(options.projects.indexOf(project) === -1){
                    callback("unknown project");
                } else {
                    if(_projects[project]){
                        callback(null,_projects[project].info);
                    } else {
                        var projguid = "/"+CU.guid();
                        var project = new PROJ({
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
                        _projects[project] = {info: projguid, project:project};
                        callback(null,_projects[project].info);
                    }
                }
            });
        });
    };
    return ProxyServer;
});

