define([
    'commonUtil',
    'eventDispatcher',
    'core/core_',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient',
    'js/NewClient/commit'
],
    function (
        commonUtil,
        EventDispatcher,
        Core,
        Cache,
        Failsafe,
        SocketIOClient,
        Commit
        ) {

        var ClientMaster = function(){

            var self = this,
                _database = new Failsafe(
                    new Cache(
                        new SocketIOClient({
                        }),
                        {}
                    ),
                    {}
                ),
                _projectName = null,
                _project = null,
                _commit = null,
                _inTransaction = false,
                _core = null,
                _previousCore = null,
                _previousObjects = {},
                _objects = {},
                _commitObject = null,
                _previousCommitObject = null,
                _branch = null,
                _previousBranch = null;



            //internal functions
            var closeOpenedProject = function(callback){
                var returning = function(e){
                    _projectName = null;
                    _project = null;
                    _commit = null;
                    _inTransaction = false;
                    _core = null;
                    _previousCore = null;
                    _previousObjects = {};
                    _objects = {};
                    _commitObject = null;
                    _previousCommitObject = null;
                    _branch = null;
                    _previousBranch = null;
                    callback(e);
                };
                if(_project){
                    _project.closeProject(function(err){
                        //TODO what if for some reason we are in transaction???
                        returning(err);
                    });
                } else {
                    returning(e);
                }
            };
            var createEmptyProject = function(project,callback){
                var core = new Core(project,{});
                var commit = new Commit(project);
                var root = core.createNode();
                core.setRegistry(root,"isConnection",false);
                core.setRegistry(root,"position",{ "x": 0, "y": 0});
                core.setAttribute(root,"name","ROOT");
                core.setRegistry(root,"isMeta",false);

                commit.makeCommit(core,root,null,function(err,commitHash){
                    if(!err && commitHash){
                        project.setBranchHash('*master',null,commitHash,function(err){
                            if(!err){
                                callback(null,commitHash);
                            } else {
                                callback(err);
                            }
                        });
                    } else {
                        callback(err);
                    }
                });
            };

            //event functions to relay information between users
            $.extend(self, new EventDispatcher());
            self.events = {
                "SELECTEDOBJECT_CHANGED": "SELECTEDOBJECT_CHANGED",
                "NETWORKSTATUS_CHANGED" : "NETWORKSTATUS_CHANGED",
                "ACTOR_CHANGED"         : "ACTOR_CHANGED",
                "PROJECT_CLOSED"        : "PROJECT_CLOSED",
                "PROJECT_OPENED"        : "PROJECT_OPENED"
            };
            self.setSelectedObjectId = function (objectId) {
                if (objectId !== selectedObjectId) {
                    selectedObjectId = objectId;
                    self.dispatchEvent(self.events.SELECTEDOBJECT_CHANGED, selectedObjectId);
                }
            };
            self.clearSelectedObjectId = function () {
                self.setSelectedObjectId(null);
            };


            //project and commit selection functions
            self.getActiveProject = function () {
                return _projectName;
            };
            self.getAvailableProjectsAsync = function (callback) {
                _database.getProjectNames(callback);
            };
            self.selectProjectAsync = function (projectname,callback) {
                //we assume that every project has a master branch and we
                //open that...
                if(projectname === _projectName){
                    callback(null);
                } else {
                    closeOpenedProject(function(err){
                        //TODO what can we do with the error??
                        _database.openProject(projectname,function(err,p){
                            if(!err && p){
                                _projectName = projectname;
                                _project = p;
                                _commit = new Commit(p);
                                _project.getBranchHash('*master',null,function(err,newhash){
                                    if(!err && newhash){
                                        _project.loadObject(newhash,function(err,commit){
                                            if(!err && commit){
                                                _commitObject = commit;
                                                _branch = '*master';
                                                //TODO check it more deeply

                                            } else {
                                                closeOpenedProject(function(err2){
                                                    callback(err);
                                                });
                                            }
                                        });
                                    } else {
                                        closeOpenedProject(function(err2){
                                            callback(err);
                                        });
                                    }
                                });
                            } else {
                                callback(err);
                            }
                        });
                    });
                }
            };
            self.createProjectAsync = function(projectname,callback){
                self.getAvailableProjectsAsync(function(err,names){
                    if(!err && names){
                        if(names.indexOf(projectname) === -1){
                            _database.openProject(projectname,function(err,p){
                                if(!err && p){
                                    createEmptyProject(p,function(err,commit){
                                        if(!err && commit){
                                            closeOpenedProject(function(err){
                                                //TODO what is with error???
                                                _projectName = projectname;
                                                _project = p;
                                                _commit = new Commit(p);
                                                _commitObject = commit;
                                                _branch = '*master';
                                            });
                                        } else {
                                            callback(err);
                                        }
                                    });
                                } else {
                                    callback(err);
                                }
                            });
                        } else {
                            //TODO maybe the selectProjectAsync could be called :)
                            callback('the project already exists!');
                        }
                    } else {
                        callback(err);
                    }
                });
            };
            self.deleteProjectAsync = function(projectname,callback){
                if(projectname === _projectName){
                    closeOpenedProject();
                }
                _database.deleteProject(projectname,callback);
            };
            self.selectCommitAsync = function (commitid, callback) {
                callback('NIE');
            };

            self.getCommitsAsync = function (callback) {
                callback('NIE');
            };
            self.getCommitObj = function (commitid) {
                callback('NIE');
            };
            self.getActualCommit = function () {
                return _commitObject;
            };
            self.getActualBranch = function () {
                return _branch;
            };
            self.getBranchesAsync = function (callback) {
                callback('NIE');
            };
            self.getRootKey = function () {
                if(_core && _objects['root']){
                    _core.getKey(_objects['root']);
                } else {
                    return null;
                }
            };
            self.commitAsync = function (parameters, callback) {
                callback = callback || function () {
                };
                if (activeProject) {
                    if (parameters.branch && parameters.branch !== self.getActualBranch()) {
                        if (!projectsinfo[activeProject].branches[parameters.branch]) {
                            storages[activeProject].createBranch(parameters.branch, function (err) {
                                if (err) {
                                    callback(err);
                                } else {
                                    var commitkey = parameters.commit ? parameters.commit : activeActor.getCurrentCommit();
                                    var commit = commitInfos[activeProject].getCommitObj(commitkey);
                                    projectsinfo[activeProject].branches[parameters.branch] = {
                                        actor:new ClientProject({
                                            storage:storages[activeProject],
                                            master:self,
                                            id:null,
                                            userstamp:'todo',
                                            commit:commit,
                                            branch:parameters.branch,
                                            readonly:false,
                                            logger:logger
                                        }),
                                        commit:commitkey
                                    };
                                    activateActor(projectsinfo[activeProject].branches[parameters.branch].actor, null, function () {
                                        activeActor.commit('initial commit', callback);
                                    });
                                }
                            });
                        } else {
                            callback('the branch already exists');
                        }
                    } else {
                        if (activeActor) {
                            activeActor.commit(parameters.message, callback);
                        }
                    }
                }
            };
            self.deleteBranchAsync = function (branchname, callback) {
                if (activeProject) {
                    if (projectsinfo[activeProject].branches[branchname]) {
                        //first we kill the actor if there is any on that branch
                        if (projectsinfo[activeProject].branches[branchname].actor) {
                            projectsinfo[activeProject].branches[branchname].actor.dismantle();
                            projectsinfo[activeProject].branches[branchname].actor = null;
                        }

                        delete projectsinfo[activeProject].branches[branchname];
                        if (projectsinfo[activeProject].currentbranch === branchname) {
                            projectsinfo[activeProject].currentbranch = null;
                        }
                    }
                    //whether we have info about the branch or not, we should try to delete it from the server
                    storages[activeProject].deleteBranch(branchname, function (err) {
                        if (err) {
                            console.log('branch deletion failed... -' + err);
                        }
                        callback(err);
                    });
                } else {
                    callback('there is no active branch');
                }
            };
            self.remoteDeleteBranch = function (projectname, branchname) {
                //this function is called when it turned out that some other user deleted some branch
                if (projectsinfo[projectname]) {
                    if (projectsinfo[projectname].branches[branchname]) {
                        if (projectsinfo[projectname].branches[branchname].actor) {
                            projectsinfo[projectname].branches[branchname].actor.dismantle();
                            projectsinfo[projectname].branches[branchname].actor = null;
                        }
                        delete projectsinfo[projectname].branches[branchname];
                        if (projectsinfo[projectname].currentbranch === branchname) {
                            projectsinfo[projectname].currentbranch = null;
                        }
                    }
                }
            };

            //relayed project functions
            //kind of a MGA
            self.startTransaction = function () {
                if (_project) {
                    _inTransaction = true;
                }
            };
            self.completeTransaction = function () {
                if (_project) {
                    _inTransaction = false;

                }
            };
            self.setAttributes = function (path, name, value) {
                if (_project) {
                    _project.setAttributes(path, name, value);
                }
            };
            self.setRegistry = function (path, name, value) {
                if (_project) {
                    _project.setRegistry(path, name, value);
                }
            };
            self.copyNodes = function (ids) {
                if (_project) {
                    _project.copyNodes(ids);
                }
            };
            self.pasteNodes = function (parentpath) {
                if (_project) {
                    _project.pasteNodes(parentpath);
                }
            };
            self.deleteNode = function (path) {
                if (_project) {
                    _project.deleteNode(path);
                }
            };
            self.delMoreNodes = function (pathes) {
                if (_project) {
                    _project.delMoreNodes(pathes);
                }
            };
            self.createChild = function (parameters) {
                if (_project) {
                    _project.createChild(parameters);
                }
            };
            self.createSubType = function (parent, base) {
                if (activeActor) {
                    activeActor.createSubType(parent.base);
                }
            };
            self.makePointer = function (id, name, to) {
                if (activeActor) {
                    activeActor.makePointer(id, name, to);
                }
            };
            self.delPointer = function (path, name) {
                if (activeActor) {
                    activeActor.delPointer(path, name);
                }
            };
            self.makeConnection = function (parameters) {
                if (activeActor) {
                    activeActor.makeConnection(parameters);
                }
            };
            self.intellyPaste = function (parameters) {
                if (activeActor) {
                    activeActor.intellyPaste(parameters);
                }
            };

            //MGAlike - set functions
            self.addMember = function (path, memberpath, setid) {
                if (activeActor) {
                    activeActor.addMember(path, memberpath, setid);
                }
            };
            self.removeMember = function (path, memberpath, setid) {
                if (activeActor) {
                    activeActor.removeMember(path, memberpath, setid);
                }
            };
        };

        var ClientProject = function(){

        };

        var SETTOREL = commonUtil.setidtorelid;
        var RELTOSET = commonUtil.relidtosetid;
        var ISSET = commonUtil.issetrelid;
        var ClientNode = function(parameters){
            var self = this,
                node = parameters.node,
                core = parameters.core,
                actor = parameters.actor,
                ownpath = core.getStringPath(node);

            var getParentId = function(){
                var parent = core.getParent(node);
                if(parent){
                    var parentpath = core.getStringPath(parent);
                    if(parentpath === ""){
                        parentpath = "root";
                    }
                    return parentpath;
                } else {
                    return null;
                }
            };
            var getId = function(){
                return getClientNodePath(node);
            };
            var getChildrenIds = function(){
                var childrenin = core.getChildrenPaths(node);
                var childrenrelids = core.getChildrenRelids(node);
                var childrenout = [];
                for(var i=0;i<childrenin.length;i++){
                    if(!ISSET(childrenrelids[i])){
                        childrenout.push(childrenin[i]);
                    }
                }
                return childrenout;
            };
            var getBaseId = function(){
                if(core.getRegistry(node,"isConnection") === true){
                    return "connection";
                } else {
                    return "object";
                }
            };
            var getInheritorIds = function(){
                return null;
            };
            var getAttribute = function(name){
                return core.getAttribute(node,name);
            };
            var getRegistry = function(name){
                return core.getRegistry(node,name);
            };
            var getPointer = function(name){
                return {to:core.getPointerPath(node,name),from:[]};
            };
            var getPointerNames = function(){
                return core.getPointerNames(node);
            };
            var getAttributeNames = function(){
                return core.getAttributeNames(node);
            };
            var getRegistryNames = function(){
                return core.getRegistryNames(node);
            };

            var getClientNodePath = function(){
                var path = ownpath;
                if(path === ""){
                    path = "root";
                }
                return path;
            };

            //SET
            var getMemberIds = function(setid){
                setid = SETTOREL(setid);
                return actor.getMemberIds(getClientNodePath(),setid);
            };
            var getSetNames = function(){
                var childrenin = core.getChildrenRelids(node);
                var childrenout = [];
                for(var i=0;i<childrenin.length;i++){
                    if(ISSET(childrenin[i])){
                        var setid = RELTOSET(childrenin[i]);
                        if(setid){
                            childrenout.push(setid);
                        }
                    }
                }
                return childrenout;
            };
            var getSetIds = function(){
                var childrenin = core.getChildrenPaths(node);
                var childrenrelids = core.getChildrenRelids(node);
                var childrenout = [];
                for(var i=0;i<childrenin.length;i++){
                    if(ISSET(childrenrelids[i])){
                        childrenout.push(childrenin[i]);
                    }
                }
                return childrenout;
            };
            //META
            var getValidChildrenTypes = function(){
                return getMemberIds('ValidChildren');
            };

            var printData = function(){
                //TODO it goes to console now...
                console.log("###node###"+ownpath);
                var mynode = {};
                mynode.node = node;
                var mysets = getSetIds();
                mynode.sets = {};
                for(var i=0;i<mysets.length;i++){
                    mynode.sets[mysets[i]] = getMemberIds(mysets[i]);
                }
                console.dir(mynode);

            };

            var isSetNode = function(){
                var relid = core.getRelid(node);
                return ISSET(relid);
            };

            return {
                getParentId : getParentId,
                getId       : getId,
                getChildrenIds : getChildrenIds,
                getBaseId : getBaseId,
                getInheritorIds : getInheritorIds,
                getAttribute : getAttribute,
                getRegistry : getRegistry,
                getPointer : getPointer,
                getPointerNames : getPointerNames,
                getAttributeNames : getAttributeNames,
                getRegistryNames : getRegistryNames,
                //helping functions
                printData : printData,
                isSetNode : isSetNode,
                //META functions
                getValidChildrenTypes : getValidChildrenTypes,
                getMemberIds          : getMemberIds,
                getSetIds             : getSetIds,
                getSetNames           : getSetNames,
            }
        };

        return ClientMaster;
    });

