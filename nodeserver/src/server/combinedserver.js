var FS = require('fs');
var LOGMANAGER = require('./../common/LogManager.js');
var commonUtil = require('./../common/CommonUtil.js');
LOGMANAGER.setLogLevel( LOGMANAGER.logLevels.ALL/*1*/ );
LOGMANAGER.useColors( true );
var logger = LOGMANAGER.create( "server" );
var MONGO = require('mongodb');

var Server = function(parameters){
    var http = require('http').createServer(function(req, res){
        logger.debug("HTTP REQ - "+req.url);

        if(req.url==='/'){
            req.url = '/index.html';
        }

        if (req.url.indexOf('/common/') === 0 ) {
            clientsrcfolder = "/..";
        } else {
            clientsrcfolder = "/../client";
        }

        if(req.url.indexOf('/core/') === 0) {
            logger.debug("req.url");
            clientsrcfolder = "/../../../corejs";
        }

        FS.readFile(__dirname + clientsrcfolder +req.url, function(err,data){
            if(err){
                res.writeHead(500);
                logger.error("Error getting the file:" +__dirname + clientsrcfolder +req.url);
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
    }),
        io = require('socket.io').listen(http);

    io.set('log level', 1); // reduce logging
    http.listen(parameters.port);


    var datafileserver = io.of('/datafile');
    var datamongoserver = io.of('/datamongo');
    var rootserver = io.of('/root');
    var logserver = io.of('/log');
    var opened = false;
    var idregexp = new RegExp("^[#0-9a-zA-Z_]*$");
    var mongodatabase = null;
    var mongocollection = null;
    var mongoopened = false;

    datamongoserver.on('connection',function(socket){
        log("["+socket.id+"][DATASRV] connection");
        socket.on('open', function (callback) {
            log("["+socket.id+"][DATASRV] open()");
            if(mongoopened){
                callback(null);
            } else {
                mongodatabase = new MONGO.Db(parameters.mongodatabase, new MONGO.Server(parameters.mongoip,parameters.mongoport));
                var abort = function (err) {
                    mongodatabase.close();
                    mongodatabase = null;
                    callback(err);
                };

                mongodatabase.open(function (err1) {
                    if( err1 ) {
                        abort(err1);
                    }
                    else {
                        mongodatabase.collection(parameters.mongocollection, function (err2, result) {
                            if( err2 ) {
                                abort(err2);
                            }
                            else {
                                mongocollection = result;
                                mongoopened = true;
                                callback(null);
                            }
                        });
                    }
                });
            }
        });
        socket.on('load',function(key,callback){
            log("["+socket.id+"][DATASRV] load("+JSON.stringify(key)+")");
            mongocollection.findOne({
                _id: key
            }, callback);
        });
        socket.on('save',function(node,callback){
            log("["+socket.id+"][DATASRV] save("+JSON.stringify(node)+")");
            mongocollection.save(node, callback);
        });
        socket.on('remove',function(key,callback){
            log("["+socket.id+"][DATASRV] remove("+JSON.stringify(key)+")");
            mongocollection.remove({
                _id: key
            }, callback);
        });
        socket.on('close',function(callback){
            log("["+socket.id+"][DATASRV] close()");
            mongodatabase.lastError({
                fsync: true
            }, function (err, data) {
                mongodatabase.close(function () {
                    mongocollection = null;
                    mongodatabase = null;
                    if( callback ) {
                        callback();
                    }
                    socket.disconnect();
                });
            });
        });
        socket.on('removeAll',function(callback){
            log("["+socket.id+"][DATASRV] removeAll()");
            mongocollection.remove(function(err){
                callback(err);
            });
        });
        socket.on('searchId',function(beginning,callback){
            log("["+socket.id+"][DATASRV] searchId("+JSON.stringify(beginning)+")");
            if( !idregexp.test(beginning) ) {
                callback("mongodb id " + beginning + " not valid");
            }
            else {
                mongocollection.find({
                    _id: {
                        $regex: "^" + beginning
                    }
                }, {
                    limit: 2
                }).toArray(function (err, docs) {
                        if( err ) {
                            callback(err);
                        }
                        else if( docs.length === 0 ) {
                            callback("mongodb id " + beginning + " not found");
                        }
                        else if( docs.length !== 1 ) {
                            callback("mongodb id " + beginning + " not unique");
                        }
                        else {
                            callback(null, docs[0]._id);
                        }
                    });
            }
        });
        socket.on('dumpAll',function(callback){
            log("["+socket.id+"][DATASRV] dumpAll()");
            mongocollection.find().each(function (err, item) {
                if( err || item === null ) {
                    callback(err);
                }
                else {
                    console.log(item);
                }
            });
        });
        socket.on('fsync',function(callback){
            mongodatabase.lastError({
                fsync: true,
                j: true
            }, function (err, data) {
                callback(err || data[0].err);
            });
        });
    });
    datafileserver.on('connection',function(socket){
        socket.on('open', function (callback) {
            if(opened){
                callback(null);
            }
            else{
                var filepath = "../test/"+parameters.branchfile;
                FS.readFile(filepath, 'utf8', function (err, data) {
                    if(err){
                        callback(err);
                    }
                    else{
                        storage = JSON.parse(data) || {};
                        opened = true;
                        setInterval(function(){
                            FS.writeFileSync(filepath, JSON.stringify(storage), 'utf8');
                        },10000);
                        callback(null);
                    }
                });
            }
        });
        socket.on('load',function(key,callback){
            if(storage[key]){
                callback(null,storage[key]);
            }
            else{
                callback("missing object",null);
            }
        });
        socket.on('save',function(node,callback){
            try{
                storage[node._id] = node;
                callback(null);
            }
            catch(e){
                callback("wrong object");
            }
        });
        socket.on('remove',function(key,callback){
            if(storage[key]){
                delete storage[key];
                callback(null);
            }
            else{
                callback("missing object");
            }
        });
        socket.on('close',function(callback){
            fs.writeFileSync(filepath, JSON.stringify(storage), 'utf8');
            opened = false;
            storage = null;
            if(callback){
                callback(null);
            }
        });
        socket.on('removeAll',function(callback){
            storage = {};
            callback(null);
        });
        socket.on('searchId',function(beginning,callback){
            callback(null,null);
        });
        socket.on('dumpAll',function(callback){
            console.log("storage dump...:");
            console.log(JSON.stringify(storage));
            console.log("storage dump end");
        });
    });
    rootserver.on('connection',function(socket){
        log("["+socket.id+"][ROOTSRV] connection");
        if(currentRoot){
            socket.emit('newRoot',currentRoot);
        }

        socket.on('modifyRoot',function(oldroot,newroot){
            log("["+socket.id+"][ROOTSRV] modifyRoot("+JSON.stringify(oldroot)+","+JSON.stringify(newroot)+")");
            console.log("ROOT "+newroot+" arrived from "+socket.id);
            internaldataconn.emit('load',"***root***",function(err,root){
                if(err){
                    console.log("error during database update 1");
                } else {
                    root = root || {_id:"***root***",value:[]};
                    if(root.value[0] === oldroot || root.value[0] === null || root.value[0] === undefined){
                        if(newroot){
                            root.value.unshift(newroot);
                            internaldataconn.emit('save',root,function(err){
                                if(err){
                                    console.log("error during database update 2 - "+err);
                                } else {
                                    currentRoot = newroot;
                                    socket.broadcast.emit('newRoot',newroot);
                                    socket.emit('newRoot',newroot);
                                }
                            });
                        } else {
                            console.log("not valid new root!!!");
                        }
                    } else {
                        console.log("wrong old root "+oldroot+" != "+root.value[0]);
                        socket.emit('newRoot',root.value[0]);
                    }
                }
            });
        });
        socket.on('undoRoot',function(){
            log("["+socket.id+"][ROOTSRV] undoRoot()");
            console.log(" UNDO ROOT arrived from "+socket.id);
            internaldataconn.emit('load',"***root***",function(err,root){
                if(err){
                    console.log("error during database update 3");
                } else {
                    root = root || {_id:"***root***",value:[]};
                    if(root.value.length > 1){
                        root.value.shift();
                        var newroot = root.value[0];
                        internaldataconn.emit('save',root,function(err){
                            if(err){
                                console.log("error during database update 4 - "+err);
                            } else {
                                currentRoot = newroot;
                                socket.broadcast.emit('newRoot',newroot);
                                socket.emit('newRoot',newroot);
                            }
                        });

                    } else {
                        console.log("already at the earliest root!!!");
                    }
                }
            });
        });

    });
    logserver.on('connection',function(socket){
        socket.on('log',function(msg){
            if(parameters.logging){
                if(parameters.logfile){
                    FS.appendFileSync("../test/"+parameters.logfile,"["+socket.id+"] "+msg+"\n","utf8");
                } else{
                    console.log("["+socket.id+"] "+msg);
                }
            }
        });
    });
    var internaldataconn = require('socket.io-client').connect('http://localhost:'+parameters.port+parameters.mongosrv);
    var internallogconn = null;
    var canlog = false;
    var currentRoot = null;
    var rootHistory = [];

    internaldataconn.emit('open',function(err){
        setInterval(function(){
            if(currentRoot === null){
                internaldataconn.emit('load',"***root***",function(err,rootkey){
                    if(err){

                    }
                    else{
                        if(rootkey){
                            currentRoot = rootkey.value[0] || null;
                        }
                    }
                });
            }
        },1000);
    });

    var log = function(msg){
        if(parameters.logging){
            if(canlog){
                internallogconn.emit('log',msg);
            } else {
                if(internallogconn === null){
                    internallogconn = require('socket.io-client').connect('http://localhost:'+parameters.port+parameters.logsrv);
                    internallogconn.on('connect',function(){
                        canlog = true;
                        log(msg);
                    });
                }
            }
        }
    };
};

var server = new Server(commonUtil.combinedserver);


