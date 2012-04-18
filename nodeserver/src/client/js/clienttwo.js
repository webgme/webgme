define(['/socket.io/socket.io.js'],function(){
    /*
    this is the main class
    it contains all the information
    it communicates with the server
    and it serves the widgets - of course not directly ;)
     */
    var Client = function(_serverlocation){

        var _storage = new Storage(this);
        var _queue = new CommandQueue(this);
        var _socket = undefined;
        var _login = undefined;
        var _password = undefined;
        var _territories ={};
        var _commandsequence = 0;

        /*socket communication*/
        _socket.on('serverMessage',function(msg){
            for(var i in msg){
                var event = msg[i];
                if(event.type = "command"){
                    _queue.commandResult(event.cid,event.success);
                }
                else if(event.type = "load"){

                }
            }

        });
        _socket.on('clientMessageAck',function(){

        });
        _socket.on('clientMessageNack',function(error){

        });

        _socket.on('connect', function(){
            console.log("connect");
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


        /*public interface*/
        /*message sending*/
        this.sendMessage = function(msg){
            _socket.emit('clientMessage',msg);
        };

        /*project selection and upper level functions*/
        this.connect = function(cb){
            _socket.on('connect', function(msg){
                cb();
            });

            /*main*/
            if(_socket === undefined){
                _socket = io.connect(_serverlocation);
            }
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
        this.shortcut = function(cb){
            _socket.on('selectProjectAck',function(msg){
                _socket.on('connectToBranchAck',function(){
                    cb();
                });

                _socket.emit('connectToBranch',"test");
            });
            /*main*/
            _socket.emit('selectProject',"testproject");
        };

        /*storage like operations*/
        this.getNode = function(id){
            return new ClientNode(this,_storage.get(id));
        };
        this.delNode = function(id){

        };

        /*territory functions*/
        /*used by the ui*/
        this.reserveTerritory = function(tid,ui){
            _territories[tid] = new Territory(this,tid,ui);
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
    };
    /*
    this class represent the queue for the commands
    it track whether each command is successfull or not
    and notifies depending
    it also controls the speed of message sending
    and it collects the command requests
     */
    var CommandQueue = function(_client){
        var _queue = {};
        var _sent = {};
        var _timer = 10000;
        var _cansend = true;

        /*public functions*/
        this.push = function(command){
            _queue[command.cid] = command;
            setTimeout(function(){
                commandTimeout(command.cid);
            },_timer);
            sendNextClientMessage();
        };
        this.commandResult = function(cid,success){
            /*TODO success*/
            delete _sent[cid];
            var counter = 0;
            for(var i in _sent){
                counter++;
            }
            if(counter===0){
                _cansend = true;
                sendNextClientMessage();
            }
        };
        var sendNextClientMessage = function(){
            if(_cansend){
                var msg = {commands:[]};
                for(var i in _queue){
                    msg.commands.push(_queue[i]);
                }
                if(msg.length>0){
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
        };
    };
    /*
    basic storage class
    it is not used directly by the widgets
     */
    var Storage = function(_client){
        var _objects = {};

        /*public functions*/
        this.get = function(id){
            return _objects[id];
        };
        this.set = function(id,object){
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
    var ClientNode = function(_client,_data){

        /*public interface*/
        this.isDeleted = function(){
            if(_data === null){
                return true;
            }
            return false;
        };
        this.getAttribute = function(name){
            if(_data[name]){
                var retval = JSON.stringify(_data[name]);
                return JSON.parse(retval);
            }
            return _data[name];

        };
        this.setAttribute = function(name,value){
            /*TODO*/
            _client.modifyNode(_data._id,name,value);
        };
    };

    var Territory = function(_client,_tid,_ui){
        var _patterns = {};

        /*public interface*/
        this.addPatterns = function(patterns){
            var modified = false;
            for(var i in patterns){
                if(_patterns[i] === undefined){
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
        }
    };

    return Client;
});