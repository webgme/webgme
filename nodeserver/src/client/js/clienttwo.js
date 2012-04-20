define(['/common/logmanager.js','/socket.io/socket.io.js'],function(LogManager){
    LogManager.setLogLevel( LogManager.logLevels.ALL );
    LogManager.useColors( true );
    var logger = LogManager.create("Client");
    /*
    this is the main class
    it contains all the information
    it communicates with the server
    and it serves the widgets - of course not directly ;)
     */
    var Client = function(_serverlocation){

        var _storage = new Storage(this);
        var _queue = new CommandQueue(this,_storage);
        var _socket = undefined;
        var _login = undefined;
        var _password = undefined;
        var _territories ={};
        var _commandsequence = 0;
        var _self = this;
        var _project = undefined;
        var _branch = undefined;
        var _connected = false;
        var _first = true;
        var _reconnecting = false;
        var _fakereconnect = true;

        /*public interface*/
        /*message sending*/
        this.sendMessage = function(msg){
            if(_connected){
                logger.debug("clientMessage "+JSON.stringify(msg));
                _socket.emit('clientMessage',msg);
            }
            else{
                logger.debug("clientMessage not sent as server is not reachable");
            }
        };

        /*project selection and upper level functions*/
        this.connect = function(cb){


            /*main*/
            if(_socket === undefined){
                _socket = io.connect(/*_serverlocation*/);

                /*socket handling functions*/

            }

            /*socket communication*/
            _socket.on('connect', function(msg){
                console.log("kecso conn +"+_socket.socket.sessionid);
                if(_project !== undefined && _branch !== undefined && _reconnecting === false){
                    _reconnecting = true;
                    /*this is a recconection, so we have to act accordingly*/
                    reconnectToServer(function(error){
                        console.log("kecso conn -"+_socket.socket.sessionid);
                        if(error === true){
                            console.log("recconection failure :(");
                        }
                        else{
                            _connected = true;
                            /*we should send to the server our territories again!!!*/
                            resendAllTerritories();
                            _reconnecting = false;
                            _fakereconnect = true;
                        }

                    });
                }

                if(_first){
                    _first = false;
                    cb();
                }
            });
            _socket.on('error',function(msg){
                console.log("kecso error "+JSON.stringify(msg));
            });
            _socket.on('reconnecting',function(msg){
                _connected = false;
                console.log("kecso reconn "+JSON.stringify(msg));
            })

            _socket.on('serverMessage',function(msg){
                logger.debug("serverMessage "+JSON.stringify(msg));
                for(var i in msg){
                    var event = msg[i];
                    logger.debug("event "+JSON.stringify(event));
                    if(event.type === "command"){
                        _queue.commandResult(event.cid,event.success);
                    }
                    else if(event.type === "load"){
                        _storage.set(event.id,event.object);
                        shootEvent("load",event.id);
                    }
                    else if(event.type === "unload"){
                        _storage.set(event.id, undefined);
                        shootEvent("unload",event.id);
                    }
                    else if(event.type === "modify"){
                        _storage.set(event.id,event.object);
                        shootEvent("modify",event.id);
                    }
                    else if(event.type === "delete"){
                        _storage.set(event.id,null);
                        shootEvent("delete",event.id);
                    }
                }

            });
            _socket.on('clientMessageAck',function(){
            });
            _socket.on('clientMessageNack',function(error){
            });
            _socket.on('listProjectsAck',function(msg){
                console.log("listProjectsAck");
            });
            _socket.on('createProjectNack',function(msg){
                console.log("createProjectNack");
            });
            _socket.on('createProjectAck',function(msg){
                console.log("createProjectAck");
            });
            _socket.on('listBranchesAck',function(msg){
                console.log("listBranchesAck");
            });
            _socket.on('selectProjectAck',function(msg){
                console.log("selectProjectAck");
            });
            _socket.on('selectProjectNack',function(msg){
                console.log("selectProjectNack");
            });
            _socket.on('createBranchAck',function(msg){
                console.log("createBranchAck");
            });
            _socket.on('createBranchNack',function(msg){
                console.log("createBranchNack");
            });
            _socket.on('connectToBranchAck',function(msg){
                console.log("selectBranchAck");
            });
            _socket.on('connectToBranchNack',function(msg){
                console.log("selectBranchNack");
            });
        };
        this.authenticate = function(login,pwd,cb){
            _socket.on('authenticateAck',function(){
                cb();
            });
            _socket.on('authenticateNack',function(error){
                cb(error);
            });

            /*main*/
            _login = login;
            _password = pwd;
            _socket.emit('authenticate',{login:_login,pwd:_password});
        };
        this.listProjects = function(cb){
            _socket.on('listProjectsAck',function(msg){
               cb(null,msg);
            });
            _socket.on('listProjectsNack',function(error){
                cb(error);
            });

            /*main*/
            _socket.emit('listProjects');
        };
        /*this is just for test purpose till we implement the project selection widget...*/
        this.makeconnect = function(cb){
            _self.authenticate("kecso","turoburo",function(){
                _self.shortcut(cb);
            });
        };
        this.shortcut = function(cb){
            _socket.on('selectProjectAck',function(msg){
                if(_project === undefined && _branch === undefined){
                    _socket.on('connectToBranchAck',function(){
                        if(_project === undefined && _branch === undefined){
                            _project = "testproject";
                            _branch = "basetest";
                            _connected = true;
                            cb();
                        }
                    });

                    _socket.emit('connectToBranch',"basetest");
                }
            });
            /*main*/
            _socket.emit('selectProject',"testproject");
        };

        /*storage like operations*/
        this.getNode = function(id){
            if(_storage.get(id) !== undefined && _storage.get(id) !== null){
                return new ClientNode(this,id,_storage);
            }
            return _storage.get(id);
        };
        this.delNode = function(id){
            _queue.push({cid:"c"+(_commandsequence++),type:"delete",id:id});
        };

        /*territory functions*/
        /*used by the ui*/
        this.reserveTerritory = function(tid,ui){
            _territories[tid] = new Territory(_self,tid,ui);
        };
        this.addPatterns = function(tid,patterns){
            _territories[tid].addPatterns(patterns);
        };
        this.removePatterns = function(tid,patterns){
            _territories[tid].removePatterns(patterns);
        };
        this.removeTerritory = function(tid){
            _territories[tid].del();
            delete _territories[tid];
        };
        this.hasPattern = function(tid,nodeid){
            return _territories[tid].hasPattern(nodeid);
        };

        /*used by the territory*/
        this.updateTerritory = function(tid,patterns){
            _queue.push({type:"territory",cid:"c"+(_commandsequence++),id:tid,patterns:patterns});
        };

        /*clipboard functions*/
        this.copy = function(ids){
            _queue.push({type:"copy",cid:"c"+(_commandsequence++),ids:ids});
        };
        this.paste = function(id){
            _queue.push({type:"paste",cid:"c"+(_commandsequence++),id:id});
        };

        /*attribute change*/
        this.modifyNode = function(nodeid,attributename,newvalue){
            var command = {type:"modify",id:nodeid};
            command[attributename] = newvalue;
            _queue.push(command);
        };

        /*client side commander functions*/
        this.transmitEvent = function(etype,eid){
            logger.debug("Client.transmitEvent "+etype+","+eid);
            shootEvent(etype,eid);
        };
        this.getClientId = function(){
            return _socket.socket.sessionid;
        }
        /*private functions*/
        var shootEvent = function(etype,eid){
            for(var i in _territories){
                _territories[i].onEvent(etype,eid);
            }
        };
        var reconnectToServer = function(cb){
            _socket.on('selectProjectAck',function(msg){
                _socket.emit('connectToBranch',_branch);
            });
            _socket.on('connectToBranchAck',function(msg){
                cb();
            });
            _socket.on('authenticateNack',function(error){
                cb(true);
            });
            _socket.on('selectProjectNack',function(error){
                cb(true);
            });

            /*main*/
            _self.authenticate(_login,_password,function(){
                _socket.emit('selectProject',_project);
            });
        };
        var resendAllTerritories = function(){
            for(var i in _territories){
                _territories[i].reSend();
            }
        }
    };
    /*
    this class represent the queue for the commands
    it track whether each command is successfull or not
    and notifies depending
    it also controls the speed of message sending
    and it collects the command requests
     */
    var CommandQueue = function(_client,_storage){
        var _queue = {};
        var _sent = {};
        var _timer = 10000;
        var _cansend = true;
        var _commander = new LocalCommander(_client,_storage);

        /*public functions*/
        this.push = function(command){
            _commander.handleCommand(command);
            if(command.type === "territory"){
                /*these can go paralelly without cid*/
                _client.sendMessage({commands:[command]});
                return;
            }
            _queue[command.cid] = command;
            setTimeout(function(){
                commandTimeout(command.cid);
            },_timer);
            sendNextClientMessage();
        };
        this.commandResult = function(cid,success){
            /*TODO success*/
            delete _sent[cid];

            if(isSentEmpty()){
                _cansend = true;
                sendNextClientMessage();
            }
        };
        var isSentEmpty = function(){
            var counter = 0;
            for(var i in _sent){
                counter++;
            }
            if(counter === 0){
                return true;
            }
            return false;
        };
        var sendNextClientMessage = function(){
            logger.debug("trying to send next command message to server (cansend="+_cansend+",sentisempty="+isSentEmpty());
            if(_cansend ===true || isSentEmpty()){
                _cansend = true;
                var msg = {commands:[]};
                for(var i in _queue){
                    msg.commands.push(_queue[i]);
                }
                logger.debug("next command message to server "+JSON.stringify(msg));
                if(msg.commands.length>0){
                    _client.sendMessage(msg);
                    _cansend = false;
                    _sent = _queue;
                    _queue = {};
                }
            }
        };
        var commandTimeout = function(cid){
            if(_queue[cid] || _sent[cid]){
                console.log("command timeout "+cid);
            }
            delete _queue[cid];
            delete _sent[cid];

            if(isSentEmpty()){
                _cansend = true;
                sendNextClientMessage();
            }
        };
    };
    /*
    this class will represent the clients'
    commander which means it will try to do
    the given command before the real answer arrives
    TODO: it should also handle the reversing of the command
    if for some reason it fails on the server side...
     */
    var LocalCommander = function(_client,_storage){
        _clipboard = [];
        /*public functions*/
        this.handleCommand = function(command){
            logger.debug("LocalCommander.handleCommand "+JSON.stringify(command));
            if(command.type === "copy"){
                copyCommand(command);
            }
            else if(command.type === "modify"){
                modifyCommand(command);
            }
            else if(command.type === "delete"){
                deleteCommand(command);
            }
            else if(command.type === "paste"){
                pasteCommand(command);
            }
            else if(command.type === "save"){
                saveCommand(command);
            }
        };

        /*private functions*/
        var copyCommand = function(copycommand){
            _clipboard = copycommand.ids;
        };
        var modifyCommand = function(modifycommand){
            var myobject = _storage.get(modifycommand.id);
            if(myobject){
                for(var i in modifycommand){
                    if(i!=="id" && i!=="type" && i!=="cid"){
                        myobject[i] = modifycommand[i];
                    }
                }
                _storage.set(modifycommand.id,myobject);
                _client.transmitEvent("modify",modifycommand.id);
            }
        };
        var deleteCommand = function(deletecommand){
            _storage.set(deletecommand.id,null);
            _client.transmitEvent("delete",deletecommand.id);
        };
        var pasteCommand = function(pastecommand){
            var prefix = "p_"+_client.getClientId()+"_"+pastecommand.cid+"_";
            var parent = _storage.get(pastecommand.id);
            if(parent){
                for(var i in _clipboard){
                    parent.children.push(prefix+_clipboard[i]);
                }
                _storage.set(pastecommand.id,parent);
                _client.transmitEvent("modify",pastecommand.id);
            }
        };
    }
    /*
    basic storage class
    it is not used directly by the widgets
     */
    var Storage = function(_client){
        var _objects = {};

        /*public functions*/
        this.get = function(id){
            logger.debug("Storage.get "+id);
            return _objects[id];
        };
        this.set = function(id,object){
            logger.debug("Storage.set "+id+","+JSON.stringify(object));
            _objects[id] = object;
        };
    };
    /*
    this class is the object class for the widgets
    they always get objects like this
    so they cannot touch directly the data
    but only through functions
    this way all modifications will be visible
     */
    var ClientNode = function(_client,_id,_storage){

        /*public interface*/
        this.isDeleted = function(){
            if(_storage.get(_id) === null){
                return true;
            }
            return false;
        };
        this.getAttribute = function(name){
            logger.debug("ClientNode.getAttribute "+name);
            /*var object = _storage.get(_id);
            if(object[name]){
                var retval = JSON.stringify(_data[name]);
                return JSON.parse(retval);
            }
            else if(object["base"])
            return _data[name];*/
            return recursiveGetAttribute(name,_id);

        };
        this.setAttribute = function(name,value){
            logger.debug("ClientNode.setAttribute "+name+","+value);
            _client.modifyNode(_id,name,value);
        };

        /*private functions*/
        var recursiveGetAttribute = function(name,id){
            var object = _storage.get(id);
            if(object){
                if(object[name]){
                    var retval = JSON.stringify(object[name]);
                    return JSON.parse(retval);
                }
                else if(object.base){
                    return recursiveGetAttribute(name,object.base);
                }
                else{
                    return null;
                }
            }
            else{
                return undefined;
            }
        };
    };

    var Territory = function(_client,_tid,_ui){
        var _patterns = {};

        /*public interface*/
        this.addPatterns = function(patterns){
            var modified = false;
            for(var i in patterns){
                if(_patterns[i] === undefined || _patterns[i]===null){
                    modified = true;
                    _patterns[i] = patterns[i];
                }
                else if( _patterns[i] !== patterns[i]){
                    modified = true;
                    _patterns[i] = patterns[i];
                }
            }
            if(modified){
                _client.updateTerritory(_tid,_patterns);
            }
        };
        this.removePatterns = function(patterns){
            var modified = false;
            for(var i in patterns){
                if(_patterns[patterns[i]] !== undefined){
                    modified = true;
                    delete _patterns[patterns[i]];
                }
            }
            if(modified){
                _client.updateTerritory(_tid,_patterns);
            }
        };
        this.del = function(){
            _patterns={};
            _client.updateTerritory(_tid,_patterns);
        };
        this.hasPattern = function(id){
            if(_patterns[id]){
                return true;
            }
            return false;
        };
        this.onEvent = function(etype,eid){
            _ui.onEvent(etype,eid);
        };
        this.reSend = function(){
            _client.updateTerritory(_tid,_patterns);
        };
    };

    return Client;
});