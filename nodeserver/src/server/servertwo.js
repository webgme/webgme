/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*COMMON FUNCTIONS*/
var insertIntoArray = function(list,item){
    if (list instanceof Array){
        if(list.indexOf(item) === -1){
            list.push(item);
        }
    }
};
var removeFromArray = function(list,item){
    if (list instanceof Array){
        var position = list.indexOf(item);
        if(position !== -1){
            list.splice(position,1);
        }
    }
};
var mergeArrays = function(one,two){
    var three = [];
    for(var i in one){
        three.push(one[i]);
    }
    for(var i in two){
        if(one.indexOf(two[i]) === -1){
            three.push(two[i]);
        }
    }
    return three;
};

/*COMMON INCLUDES*/
var fs = require('fs');
/*
represents the static HTTP server and the socket.io server
it accepts the connections
serves the static file requests
 */
var Server = function(_port){
    var _connectedsockets = [];
    var http = require('http').createServer(httpGet);
    var io = require('socket.io').listen(http);
    io.set('log level', 1); // reduce logging
    var _librarian = new Librarian();
    var _server = this;


    var _clientSourceFolder = "/../client";

    http.listen(_port);
    function httpGet(req, res){
        console.log("httpGet - start - "+req.url);
        if(req.url==='/'){
            req.url = '/index.html';
        }
        fs.readFile(__dirname + _clientSourceFolder +req.url, function(err,data){
            if(err){
                res.writeHead(500);
                return res.end('Error loading ' + req.url);
            }
            if(req.url.indexOf('.js')>0){
                console.log("sending back js :"+req.url);
                res.writeHead(200, {
                    'Content-Length': data.length,
                    'Content-Type': 'application/x-javascript' });

            } else if (req.url.indexOf('.css')>0) {
                console.log("sending back css :"+req.url);
                res.writeHead(200, {
                    'Content-Length': data.length,
                    'Content-Type': 'text/css' });

            }
            else{
                res.writeHead(200);
            }
            res.end(data);
        });
    };

    io.sockets.on('connection', function(socket){
        _connectedsockets.push(new BasicSocket(socket,_librarian));
    });
};
/*
it represents the entity which knows about all the
projects and all the branches on the server
it can connect a BasicSocket to a Project
which finally made the BasicSocket to a Client...
 */
var Librarian = function(_server){
    var _basedir = "../projects";
    var _projects = [];
    /*public functions*/
    this.getAvailableProjects = function(){
        var directory = fs.readdirSync(_basedir);
        var projects = [];
        for(var i in directory){
            if(directory[i].indexOf('.') === -1){
                projects.push(directory[i]);
            }
        }
        return projects;
    };
    this.createProject = function(project){
        try{
            fs.mkdirSync(_basedir+"/"+project);
            return true;
        }
        catch(e){
            return false;
        }
    };
    this.getActiveBranches = function(project){
    	var branches = {};
        for(var i in _projects){
            var info = _projects[i].getProjectInfo();
            if(info.project === project){
                branches[info.branch] = true;
            }
        }
        var directory = fs.readdirSync(_basedir+"/"+project);
        for(var i in directory){
            if(directory[i].indexOf(".bif") !== -1){
                var branch = directory[i].substr(0,directory[i].indexOf(".bif"));
                if(branches[branch] === undefined){
                    branches[branch] = false;
                }
            }
        }
        return branches;
    };
    this.createBranch = function(project,branch){
        var branches = this.getActiveBranches(project);
        if(branches[branch] === undefined){
            var file = fs.openSync(_basedir+"/"+project+"/"+branch+".bif",'w');
            if(file){
                fs.closeSync(file);
                return true;
            }
            else{
                return false;
            }

        }
        else{
            return false;
        }
    };
    this.connectToBranch = function(project,branch){
        for(var i in _projects){
            var info = _projects[i].getProjectInfo();
            if(info.project === project && info.branch === branch){
                return _projects[i];
            }
        }
        var branches = this.getActiveBranches(project);
        if(branches[branch] === undefined){
            return undefined;
        }
        /*create a new project*/
        var project = createProject(project,branch);
        return project;
    };
    this.disconnect = function(){

    };
    /*private functions*/
    var createProject = function(project,branch){
        var project = new Project(project,branch);
        _projects.push(project);
        return project;
    };
};
/*
this class represents an active branch of a real project
 */
var Project = function(_project,_branch){
    var _clients = {};
    var _territories = {};
    var _transactionQ = new TransactionQueue(this);
    var _storage = new Storage();

    /*public functions*/
    this.getProjectInfo = function(){
        return {project:_project,branch:_branch};
    };
    this.addClient = function(socket,id){
        var client = new Client(socket,id,this);
        _clients[id] = client;
        return true;
    };

    /*message handling*/
    this.onClientMessage = function(msg){
        _transactionQ.onClientMessage(msg);
    };
    this.onProcessMessage = function(msg,cb){
        setTimeout(function(){
            cb(msg);
        },1000);
    };
    this.onUpdateTerritory = function(cid,tid,newpatterns){
        if(_territories[tid] === undefined){
            var territory = new Territory(_clients[cid],tid);
            territory.attachStorage(new ReadStorage(_storage));
            _territories[tid] = territory;
        }
        _territories[tid].updatePatterns(newpatterns);
    };
};
/*
this type of socket is only good for selecting a
project and connecting to it
creating a new branch or connecting to an existing one
 */
var BasicSocket = function(_iosocket,_librarian,_id){
    var _login         = "";
    var _pwd           = "";
    var _project       = undefined;
    var _branch        = undefined;
    var _authenticated = false;
    /*basic socket messages*/
    _iosocket.on('authenticate',function(msg){
        _login = msg.login;
        _pwd = msg.pwd;
        authenticate();
        if(_authenticated){
            _iosocket.emit('authenticateAck');
        }
        else{
            _iosocket.emit('authenticateNack');
        }
    });
    _iosocket.on('listProjects',function(msg){
    	var projects = _librarian.getAvailableProjects();
    	_iosocket.emit('listProjectsAck',projects);
    });
    _iosocket.on('createProject',function(msg){
    	if(_librarian.createProject(msg)){
    		_project = msg;
    		_branch = undefined;
    		_iosocket.emit('createProjectAck');
    	}
    	else{
    		_project = undefined;
    		_branch = undefined;
    		_iosocket.emit('createProjectNack');
    	}
    });
    _iosocket.on('selectProject',function(msg){
    	var projects = _librarian.getAvailableProjects();
    	if(projects.indexOf(msg) !== -1){
    		_project = msg;
    		_branch = undefined;
    		_iosocket.emit('selectProjectAck');
    	}
    	else{
    		_project = undefined;
    		_branch = undefined;
    		_iosocket.emit('selectProjectNack');
    	}
    });
    _iosocket.on('listBranches',function(msg){
    	var branches = {};
        if(_project){
            branches = _librarian.getActiveBranches(_project);
        }
    	_iosocket.emit('listBranchesAck',branches);
    });
    _iosocket.on('createBranch',function(msg){
    	if(_librarian.createBranch(_project,msg)){
    		_branch = msg;
    		_iosocket.emit('createBranchAck');
    	}
    	else{
    		_branch = undefined;
    		_iosocket.emit('createBranchNack');
    	}
    });
    _iosocket.on('connectToBranch',function(msg){
        _branch = msg;
        var project = _librarian.connectToBranch(_project,_branch);
        if(project){
            if(project.addClient(_iosocket,_id)){
                _iosocket.emit('connectToBranchAck');
            }
            else{
                _iosocket.emit('connectToBranchNack');
            }
        }
        else{
            _iosocket.emit('connectToBranchNack');
        }
    });
    

    /*public functions*/
    this.getId = function(){
        return _id;
    };
    /*private functions*/
    var authenticate = function(){
        _authenticated = true;
    };
};
/*
this class represents the attached socket
it is directly related to a given Project
 */
var Client = function(_iosocket,_id,_project){
    var _objects = {};
    /*message handlings*/
    _iosocket.on('clientMessage',function(msg){
        /*you have to simply put it into the transaction queue*/
        _project.onClientMessage(msg);
        _iosocket.emit('clientMessageAck');
    });
    _iosocket.on('serverMessageAck',function(msg){
        /*we are happy :)*/
    });
    _iosocket.on('serverMessageNack',function(msg){
        /*we are not that happy but cannot do much*/
        console.log("client: "+_id+" - serverMessageNack");
    });

    /*public functions*/
    this.onUpdateTerritory = function(added,removed){
        var msg = [];
        for(var i in added){
            if(_objects[i] === undefined){
                _objects[i] = 1;
                var additem = {}; additem.type = 'load'; additem.id = i; additem.object = added[i];
                msg.push(additem);
            }
            _objects[i]++;
        }
        for(var i in removed){
            if(_objects[i] === undefined){
                /*was already removed*/
            }
            else{
                _objects[i]--;
                if(objects[i]<=0){
                    delete objects[i];
                    var delitem = {}; delitem.type = 'unload'; delitem.id = i;
                    msg.push(delitem);
                }
            }
        }
        _iosocket.emit('serverMessage',msg);
    };
};
/*
this class represents the transaction queue of a
project, it queues all the requests from all the clients
and serialize them, then proccess them one by one
 */
var TransactionQueue = function(_project){
    var _queue = [];
    var _canwork = true;
    //var _sequence = 0;

    /*public functions*/
    this.onClientMessage = function(msg){
        /*we simply put the message into the queue*/
        _queue.push(msg);
    };

    /*private functions*/
    var processNextMessage = function(){
        if(_canwork && _queue.length>0){
            _project.onProcessMessage(_queue[0],messageHandled);
            _canwork = false;
        }
    };
    var messageHandled = function(data){
        /*this is the callback function of the message procesing*/
        /*the data should contain evrything which needed for responding*/
        _queue.shift();
        _canwork = true;
        processNextMessage();
    }

};
/*
this class shows some objects and the
rules from which the server can figure out
which exact objects are important to the given
requestor...
Every client can have many Territory
 */
var Territory = function(_client,_id){
    var _patterns = {};
    var _previouslist = [];
    var _currentlist = [];
    var _readstorage = undefined;

    /*public functions*/
    /*synchronous functions*/
    this.getLoadList = function(){
        var loadlist = [];
        for(var i in _currentlist){
            if(_previouslist.indexOf(_currentlist[i]) === -1){
                loadlist.push(_currentlist[i]);
            }
        }
        return loadlist;
    };
    this.getUnloadList = function(){
        var unloadlist = [];
        for(var i in _previouslist){
            if(_currentlist.indexOf(_previouslist[i]) === -1){
                unloadlist.push(_previouslist[i]);
            }
        }
        return unloadlist;
    };
    this.inTerritory = function(id){
        return (_currentlist.indexOf(id) !== -1);
    };
    this.getId = function(){
        return _id;
    };
    this.attachStorage = function(storage){
        _readstorage = storage;
    };
    this.detachStorage = function(){
        _readstorage = undefined;
    };
    /*asynchronous functions*/
    this.updatePatterns = function(newpatterns){
        /*if it called without parameter
        it means a simple refresh
         */
        if(newpatterns){
            _patterns = newpatterns;
        }
        /* we copy the currentlist to
        the previouslist
         */
        _previouslist = [];
        while(_currentlist.length>0){
            _previouslist.push(_currentlist.shift());
        }

        var patternProcessed = function(pid){
            completed[pid] = true;

            /*check if every pattern have been processed*/
            for(var i in completed){
                if(completed[i] === false){
                    return;
                }
            }
            /*we are ready, so we can call the callback ;)*/
            var removedids = this.getUnloadList();
            for(var i in removedids){
                removed[removedids[i]] = null;
            }
            _client.onUpdateTerritory(added,removed);
        };
        var ruleProcessed = function(){

        };


        /*the real processing*/
        var completed = {};
        var added = {};
        var removed = {};

        for(var i in _patterns){
            completed[i] = false;
        };
        for(var i in _patterns){
        }


    };
    /*private functions*/
    var processPattern = function(pattern){
        var patternobjects = [];
        for(var i in pattern){
            if(i !== 'id' && i!== 'self'){
                var rule = {}; rule[i] = pattern[i];
                var ruleobjects =[];
                processRule(pattern.id,rule,ruleobjects);
                patternobjects = mergeArrays(patternobjects,ruleobjects);
            }
        }
    };
    var processRule = function(currentid,rule,objectssofar){
        /*first we check if we found a loop*/
        if(objectssofar.indexOf(currentid) !== -1){
            return;
        }
        /*get the object*/
        _readstorage.get(currentid,function(err,object){
            if(err){
                console.log("shit happens "+err);
            }
            else{
                objectssofar.push(object._id);
                for(var i in rule){
                    if(rule[i] instanceof Number){
                        if(rule[i] === 0){
                            return;
                        }
                        else{
                            rule[i]--;
                        }
                    }
                    else{
                        /*the default is the R which means recursive*/
                    }

                    if(object[i]){
                        if(object[i] instanceof Array){
                            for(var j in object[i]){
                                processRule(object[i][j],rule,objectssofar);
                            }
                        }
                        else{
                            processRule(object[i],rule,objectssofar);
                        }
                    }
                }
            }

        });
    };
};
/*
this is the storage class
every active Project has one...
 */
var Storage = function(){
    var _objects = {};
    var _save = {};

    /*public functions*/
    this.get = function(id,cb){
      setTimeout(cb(null,_objects[id]),1000);
    };
    this.save = function(cb){
        _save = {};
        for(var i in _objects){
            var temp = JSON.stringify(_objects[i]);
            _save[i] = JSON.parse(temp);
        }
        setTimeout(cb(),1000);
        /*now we can start the real saving*/
    };
    this.set = function(id,object,cb){
        _objects[id] = object;
        setTimeout(cb(),1000);
    }
    /*private functions*/
};
var ReadStorage = function(_storage){
    /*interface type object for read-only clients*/
    /*public functions*/
    this.get = function(id,cb){
        _storage.get(id,cb);
    };
}


/*MAIN*/
var server = new Server(8081);
