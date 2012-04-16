/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*
 * Server client message interface description:
 *
 * pattern:{id:"basenodeid",'referencename':(0-10)/"r"} - referencename is the name of the attribute which should be followed
 * command:
 *  territoryCommand:{type:"territory",id:"territoryid",patterns:["pattern"]}
 *  copyCommand:{type:"copy",id:["objectids"]}
 *  pasteCommand:{type:"paste",id:"parentid"}
 *
 *
 * clientMessage:{ commands:["command"]}
 * transactionMsg:{client:"client's id", msg: "clientMessage"}
 *
 */
/*COMMON FUNCTIONS*/
/*
simply add the item to the list
whatching that items should be exclusive
it return true if it was a new item
flase if it was already there
 */
var insertIntoArray = function(list,item){
    if (list instanceof Array){
        if(list.indexOf(item) === -1){
            list.push(item);
            return true;
        }
        return false;
    }
    return false;
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
var numberToDword = function(number){
    var str = number.toString(16);
    while(str.length<8){
        str = "0"+str;
    }
    return str;
}

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
        _connectedsockets.push(new BasicSocket(socket,_librarian,socket.handshake.query.t));
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
            if(fs.writeFileSync(_basedir+"/"+project+"/"+branch+".bif","{}")){
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
        var basedir = _basedir+"/"+project;
        var project = new Project(project,branch,basedir);
        _projects.push(project);
        return project;
    };
};
/*
this class represents an active branch of a real project
 */
var Project = function(_project,_branch,_basedir){
    var _clients = {};
    var _territories = {};
    var _transactionQ = new TransactionQueue(this);
    var _storage = new Storage(_project,_branch,_basedir);

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
    this.onProcessMessage = function(cid,commands,cb){
        setTimeout(function(){
            cb("");
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
        var clientmsg = {}; clientmsg.client = _id; clientmsg.msg = msg;
        _project.onClientMessage(clientmsg);
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
        console.log("kecso "+JSON.stringify(added));
        console.log("kecso "+JSON.stringify(removed));
        var msg = [];
        for(var i in added){
            if(_objects[i] === undefined){
                _objects[i] = 1;
                var additem = {}; additem.type = 'load'; additem.id = i; additem.object = added[i];
                msg.push(additem);
            }
            else{
                _objects[i]++;
            }
        }
        for(var i in removed){
            if(_objects[i] === undefined){
                /*was already removed*/
            }
            else{
                _objects[i]--;
                if(_objects[i]<=0){
                    delete _objects[i];
                    var delitem = {}; delitem.type = 'unload'; delitem.id = i;
                    msg.push(delitem);
                }
            }
        }
        if(msg.length>0){
            _iosocket.emit('serverMessage',msg);
        }
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
        processNextMessage();
    };

    /*private functions*/
    var processNextMessage = function(){
        if(_canwork && _queue.length>0){
            /*
            we go throuhg the message and search for the territory update
            items, as they are only readings they can go paralelly
            so we send them each to the proper place...
             */
            var territorymsg = _queue[0];
            var cid = territorymsg.client;
            var updatecommands = [];
            for(var i in territorymsg.msg.commands){
                /*
                TODO
                we should collect the same territory updates as they overwrite
                each other but they should be not that many ;)
                 */
                if(territorymsg.msg.commands[i].type === 'territory'){
                    _project.onUpdateTerritory(cid,territorymsg.msg.commands[i].id,territorymsg.msg.commands[i].patterns);
                }
                else{
                    updatecommands.push(territorymsg.msg.commands[i]);
                }
            }
            if(updatecommands.length>0){
                _project.onProcessMessage(cid,updatecommands,messageHandled);
                _canwork = false;
            }
            else{
                messageHandled(); /*this message contained only reading, so we finished processing ;)*/
            }
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
        var clist = [];
        var plist = [];
        var added = {};
        var removed = {};
        for(var i in _currentlist){
            plist.push(_currentlist[i]);
        }
        if(newpatterns === undefined){
            newpatterns={};
            for(var i in _patterns){
                var rule = {};
                for(var j in _patterns[i]){
                    rule[j] = _patterns[i][j];
                }
                newpatterns[i] = rule;
            }
        }
        else{
            for(var i in newpatterns){
                for(var j in newpatterns[i]){
                    if(newpatterns[i][j] !== 'r'){
                        newpatterns[i][j]++;
                    }
                }
            }
        }
        var progress = {};
        for(var i in newpatterns){
            progress[i] = false;
        }


        /*inner functions for handling patterns and rules*/
        var updateComplete = function(){
            /*
            this is the function which called when the whole
            update process is completed
            at this point the clist complete
            and the added list are complete as well
             */
            _previouslist = plist;
            _currentlist = clist;
            _patterns = newpatterns;
            for(var i in plist){
                if(clist.indexOf(plist[i]) === -1){
                    removed[plist[i]] = null; /*no need for the object itself to unload*/
                }
            }
            _client.onUpdateTerritory(added,removed);
        };
        var patternComplete = function(id){
            /*
            this function called when a single pattern
            have been fully processed
            it is called with the basenodeid, so the
            progress can be updated and if every pattern have been
            updated it can call the updateComplete function
             */
            progress[id] = true;
            for(var i in progress){
                if(progress[i] === false){
                    return;
                }
            }
            updateComplete();
        };
        var processPattern = function(basenodeid, rule){
            /*
            this is not the recurse real proessing function
            as we need namespace for our pattern related data
            to count when we really processed all the rules
             */
            var patterncounter = 0;
            var rulechains = {}; /*we will check for the loops with the help of this*/
            for(var i in rule){
                rulechains[i] = [];
            }

            var processing = function(id,rulename,innerrule){
                /*
                this is the recursive call
                 */
                patterncounter++;
                _readstorage.get(id,function(error,object){
                    if(error){
                        /*
                        we stop as some error encountered
                         */
                        if(--patterncounter === 0){
                            patternComplete(basenodeid);
                        }
                    }
                    else{
                        /*check if we should put this object to added*/
                        insertIntoArray(clist,object._id);
                        if(plist.indexOf(object._id) === -1){
                            added[object._id] = object;
                        }
                        if(insertIntoArray(rulechains[rulename],object._id)){
                            /*no loop yet we can go on*/
                            var myrule = {};
                            myrule[rulename] = innerrule[rulename];
                            if(myrule[rulename] !== 'r'){
                                myrule[rulename]--;
                            }
                            /*check if we reached the end*/
                            if(myrule[rulename] === 0){
                                if(--patterncounter === 0){
                                    patternComplete(basenodeid);
                                }
                            }
                            else{
                                /*we should follow the rule still*/
                                if(object[rulename]){
                                    if(object[rulename] instanceof Array){
                                        /*we should call all 'children' recursively*/
                                        var haselement = false;
                                        for(var child in object[rulename]){
                                            haselement = true;
                                            processing(object[rulename][child],rulename,myrule);
                                        }
                                        if(!haselement){
                                            /*this is the end of the chain*/
                                            if(--patterncounter === 0){
                                                patternComplete(basenodeid);
                                            }
                                        }
                                        else{
                                            --patterncounter;
                                        }
                                    }
                                    else{
                                        process(object[rulename],rulename,myrule);
                                        --patterncounter;
                                    }
                                }
                                else{
                                    /*this is the end of the chain*/
                                    if(--patterncounter === 0){
                                        patternComplete(basenodeid);
                                    }
                                }
                            }
                        }
                        else{
                            /*there is a loop so we finished with this chain*/
                            if(--patterncounter === 0){
                                patternComplete(basenodeid);
                            }
                        }

                    }
                });
            };

            for(var i in rule){
                /*we should follow all the different rules*/
                processing(basenodeid,i,rule);
            }
        };

        /*main*/
        for(var i in newpatterns){
            processPattern(i,newpatterns[i]);
        }
    };
    /*private functions*/
};
/*
this is the storage class
every active Project has one...
 */
var Storage = function(_projectname,_branchname,_basedir){
    var _objects = {};
    var _branch = undefined;
    var _current = undefined;

    /*public functions*/
    this.get = function(id,cb){
        setTimeout(function(){
            if(_objects[id]){
                cb(null,_objects[id]);
            }
            else{
                cb("noitemfound",null);
            }
        },1000);
    };
    this.save = function(cb){
        saveRevision(true);
        setTimeout(cb(),1000);
        /*now we can start the real saving*/
    };
    this.set = function(id,object,cb){
        _objects[id] = object;
        setTimeout(cb(),1000);
    };
    /*private functions*/
    var initialize = function(){
        _branch = fs.readFileSync(_basedir+"/"+_branchname+".bif");
        _branch = JSON.parse(_branch) || {};
        if(_branch.revisions && _branch.revisions.length > 0){
            loadRevision(_branch.revisions[_branch.revisions.length-1]);
            reserveRevision();
        }
        else{
            _branch.revisions = [];
            _objects = {};
            reserveRevision();
        }
    };
    var reserveRevision = function(){
        var directory = fs.readdirSync(_basedir);
        var maxrevision = 0;
        for(var i in directory){
            if(directory[i].indexOf(".rdf") !== -1){
                if(maxrevision<Number("0x"+directory[i].substr(0,8))){
                    maxrevision = Number("0x"+directory[i].substr(0,8));
                }
            }
        }
        maxrevision++;
        if(fs.writeFileSync(_basedir+"/"+numberToDword(maxrevision)+".rdf",JSON.stringify(_objects))){
            /*fine*/
            _current = maxrevision;
            updateBranchInfo();
        }
        else{
            /*shit happens*/
        }
    };
    var loadRevision = function(revision){
        _objects = fs.readFileSync(_basedir+"/"+numberToDword(revision)+".rdf");
        _objects = JSON.parse(_objects) || {};
    };
    var updateBranchInfo = function(){
        if(_branch.revisions === undefined){
            _branch.revisions = [];
        }
        _branch.revisions.push(_current);
        if(fs.writeFileSync(_basedir+"/"+_branchname+".bif",JSON.stringify(_branch))){
            /*fine*/
        }
        else{
            /*shit happens*/
        }
    };
    var saveRevision = function(neednew){
        if(_current === undefined){
            return;
        }
        /*first saving the data file*/
        if(fs.writeFilesync(_basedir+"/"+numberToDword(_current)+".rdf",JSON.stringify(_objects))){
            if(neednew){
                reserveRevision();
            }
        }
        else{
            /*shit happens*/
        }

    };

    /*main*/
    initialize();
    setInterval(saveRevision,5000); /*timed savings*/
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
