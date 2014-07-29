var FS = require('fs');
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + '/..',
    paths: {
        "core":"core",
        "logManager": "common/LogManager",
        "util": "util",
        "storage": "storage"
    }
});

requirejs(['logManager',
    'storage/socketioserver',
    'storage/cache',
    'storage/mongo',
    'storage/log',
    'storage/socketioclient'],function(
    logManager,
    Server,
    Cache,
    Mongo,
    Log,
    Client){

    var logLevel = logManager.logLevels.ALL;
    var logPath = 'D:/GIT/testserver.log';
    logManager.setLogLevel(logLevel);
    logManager.useColors(true);
    logManager.setFileLogPath(logPath);

    var logger = logManager.create("test-server");

    var http = require('http').createServer(function(req, res){
        logger.debug("HTTP REQ - "+req.url);

        if(req.url.indexOf('/test.html') === 0){
            testPageHandler(req,res);
        } else {
            if(req.url==='/'){
                req.url = '/index.html';
            }

            var dirname = __dirname;
            if(dirname.charAt(dirname.length-1) !== '/') {
                dirname += '/';
            }
            dirname += "./../";

            if (!(  req.url.indexOf('/common/') === 0 ||
                req.url.indexOf('/util/') === 0 ||
                req.url.indexOf('/storage/') === 0 ||
                req.url.indexOf('/core/') === 0 ||
                req.url.indexOf('/user/') === 0 ||
                req.url.indexOf('/config/') === 0 ||
                req.url.indexOf('/bin/') === 0)){
                dirname += "client";
            }


            FS.readFile(dirname +req.url, function(err,data){
                if(err){
                    res.writeHead(500);
                    logger.error("Error getting the file:" + dirname +req.url);
                    return res.end('Error loading ' + req.url);
                }

                if(req.url.indexOf('.js')>0){
                    logger.debug("HTTP RESP - "+req.url);
                    res.writeHead(200, {
                        'Content-Length': data.length,
                        'Content-Type': 'application/x-javascript' });

                } else if (req.url.indexOf('.css')>0) {
                    logger.debug("HTTP RESP - "+req.url);
                    res.writeHead(200, {
                        'Content-Length': data.length,
                        'Content-Type': 'text/css' });

                }
                else{
                    res.writeHead(200);
                }
                res.end(data);
            });
        }
    }).listen(888);

    var storage = new Server(new Log(new Cache(new Mongo({
        host: '127.0.0.1',
        port: 27017,
        database: 'test'
    }),{}),{log:logManager.create('test-storage')}),{port:9889,logger:logManager.create('test-storage-socket.io')});
    storage.open();

    var _database = new Log(new Client({
        host:'http://localhost',
        port:'9889',
        type:'node'}),{log:logManager.create('test-transfer-out')}),
        _databaseOpened = false,
        _projects = {},
        _references  = {},
        _clientData = {};

    var testPageHandler = function(req,res){
        if(req.url === '/test.html'){
            //initial get, we should respond with the page itself
            FS.readFile(__dirname +'/../client'+ req.url, function(err,data){
                if(err){

                } else {
                    res.writeHead(200, {
                        'Content-Length': data.length,
                        'Content-Type': 'text/html' });
                    res.end(data);
                }
            });
        } else {
            //we got some request
            var command = req.url.slice(11).split('*_*');
            console.log(command);
            switch(command[0]){
                case 'delay':
                    if(command[1] && _clientData[command[1]]){
                        if(command[2] && command[2]>=0 && command[2]<=10000){
                            _clientData[command[1]].delay = Number(command[2]);
                        }
                    }
                    break;
                case 'block':
                    if(command[1] && _clientData[command[1]]){
                        io.sockets.clients().forEach(function (socket){
                            if(socket.id === command[1]){
                                socket.disconnect();
                                delete _clientData[command[1]];
                            }
                        });
                    }
                    break;
            }
            testPageResponse(res);
        }
    };
    var testPageResponse = function(res){
        var data = [];
        for(var i in _clientData){
            data.push({id:i,delay:_clientData[i].delay,blocked:_clientData[i].blocked,address:_clientData[i].address,port:_clientData[i].port});
        }
        data = JSON.stringify(data);
        console.log(data);
        res.writeHead(200, {
            'Content-Length': data.length,
            'Content-Type': 'text/plain' });
        res.end(data);
    };

    //server like stufa
    var io = require('socket.io').listen(http);
    io.set('logger',logManager.create('test-transfer-in'));

    var addClient = function(id,project){
        if(!_references[project]){
            _references[project] = [];
        }
        if(_references[project].indexOf(id) === -1){
            _references[project].push(id);
        }
    };

    var checkDatabase = function(client,callback){
        //we add the delay here
        if(_clientData[client] && _clientData[client].delay>0){
            var oldcallback = callback;
            callback = function(err){
                setTimeout(function(){
                    oldcallback(err);
                },_clientData[client].delay);
            };
        }
        if(_databaseOpened){
            callback();
        } else {
            _database.openDatabase(function(err){
                if(err){
                    callback(err);
                } else {
                    _databaseOpened = true;
                    callback(null);
                }
            });
        }
    };

    var checkProject = function(client,project,callback){
        //we add the delay here
        if(_clientData[client] && _clientData[client].delay>0){
            var oldcallback = callback;
            callback = function(err){
                setTimeout(function(){
                    oldcallback(err);
                },_clientData[client].delay);
            };
        }
        if(_projects[project]){
            addClient(client,project);
            callback(null);
        } else {
            _database.openProject(project,function(err,proj){
                if(!err && proj){
                    _projects[project] = proj;
                    addClient(client,project);
                    callback(null);
                } else {
                    callback(err);
                }
            });
        }
    };

    io.sockets.on('connection',function(socket){
        _clientData[socket.id] = {blocked:false,delay:0,address:socket.manager.handshaken[socket.id].address.address,port:socket.manager.handshaken[socket.id].address.port};

        socket.on('openDatabase', function(callback){
            checkDatabase(socket.id,callback);
        });

        socket.on('closeDatabase', function(callback){
            _databaseOpened = false;
            _database.closeDatabase(callback);
        });

        socket.on('fsyncDatabase', function(callback){
            checkDatabase(socket.id,function(err){
                if(err){
                    callback(err);
                } else {
                    _database.fsyncDatabase(callback);
                }
            });
        });

        socket.on('getProjectNames', function(callback){
            checkDatabase(socket.id,function(err){
                if(err){
                    callback(err);
                } else {
                    _database.getProjectNames(callback);
                }
            });
        });

        socket.on('deleteProject', function(projectName,callback){
            _database.deleteProject(projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    //TODO what to do with the object itself???
                    callback(null);
                }
            });
        });

        socket.on('openProject', function(projectName,callback){
            if(_projects[projectName]){
                addClient(socket.id,projectName);
                callback(null,_projects[projectName]);
            } else {
                _database.openProject(projectName,function(err,project){
                    if(!err && project){
                        _projects[projectName] = project;
                        addClient(socket.id,projectName);
                        callback(null,_projects[projectName]);
                    } else {
                        callback(err);
                    }
                });
            }
        });

        socket.on('getDatabaseStatus', function(oldstatus,callback){
            checkDatabase(socket.id,function(err){
                if(err){
                    callback(err);
                } else {
                    _database.getDatabaseStatus(oldstatus,callback);
                }
            });
        });

        socket.on('closeProject', function(projectName,callback){
            callback = callback || function() {};
            checkProject(socket.id,projectName,function(err){
                if(err) {
                    callback(err);
                } else {
                    var index = _references[projectName].indexOf(socket.id);
                    _references[projectName].splice(index,1);
                    if(_references[projectName].length === 0){
                        delete _references[projectName];
                        var proj = _projects[projectName];
                        delete _projects[projectName];
                        proj.closeProject(callback);
                    } else {
                        callback(null);
                    }
                }
            });
        });

        socket.on('loadObject', function(projectName,hash,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].loadObject(hash,callback);
                }
            });
        });

        socket.on('insertObject', function(projectName,object,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].insertObject(object,callback);
                }
            });
        });

        socket.on('findHash', function(projectName,beginning,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].findHash(beginning,callback);
                }
            });
        });

        socket.on('dumpObjects', function(projectName,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].dumpObjects(callback);
                }
            });
        });
        socket.on('getBranchNames', function(projectName,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].getBranchNames(callback);
                }
            });
        });
        socket.on('getBranchHash', function(projectName,branch,oldhash,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].getBranchHash(branch,oldhash,callback);
                }
            });
        });
        socket.on('setBranchHash', function(projectName,branch,oldhash,newhash,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].setBranchHash(branch,oldhash,newhash,callback);
                }
            });
        });
        socket.on('getCommits',function(projectName,before,number,callback){
            checkProject(socket.id,projectName,function(err){
                if(err){
                    callback(err);
                } else {
                    _projects[projectName].getCommits(before,number,callback);
                }
            });
        });

        socket.on('disconnect',function(){
            var todelete = [];
            for(var i in _references){
                if(_projects[i]){
                    var index = _references[i].indexOf(socket.id);
                    if(index>-1){
                        _references[i].splice(index,1);
                        if(_references[i].length === 0){
                            todelete.push(i);
                            var proj = _projects[i];
                            delete _projects[i];
                            proj.closeProject(null);
                        }
                    }
                } else {
                    todelete.push(i);
                }
            }

            for(i=0;i<todelete.length;i++){
                delete _references[todelete[i]];
            }

            delete _clientData[socket.id];
        });
    });

});
