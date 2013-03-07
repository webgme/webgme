define([
    'commonUtil',
    'eventDispatcher',
    'core/core_',
    'storage/cache',
    'storage/failsafe',
    'storage/socketioclient'
],
    function (
        commonUtil,
        EventDispatcher,
        Core,
        Cache,
        Failsafe,
        SocketIOClient
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
                _project = null,
                _inTransaction = false,
                _core = null,
                _previousCore = null;



            //internal functions
            var commit = function(rootHash,callback){
                if(_project){
                    var commitOjb = {
                        _id     : '#007',
                        root    : rootHash,
                        parents : mycommit ? [mycommit[KEY]] : [],
                        updates : [],
                        time    : commonUtil.timestamp(),
                        message : msg,
                        name    : branch,
                        type    : "commit"
                    };
                    _project.insertObject(commitOjb,callback);
                } else {
                    callback('there is no project opened');
                }
            };

            var persist = function(callback){
                //we save the current state of our projectcore
                if(_project){
                    _project.persist()
                } else {
                    callback('there is no project opened');
                }
            };

            //event functions to relay information between users
            $.extend(self, new EventDispatcher());
            self.events = {
                "SELECTEDOBJECT_CHANGED": "SELECTEDOBJECT_CHANGED",
                "NETWORKSTATUS_CHANGED" : "NETWORKSTATUS_CHANGED",
                "ACTOR_CHANGED"         : "ACTOR_CHANGED"
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

