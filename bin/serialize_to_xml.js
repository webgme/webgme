/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

if (typeof define !== "function") {
    var requirejs = require("requirejs");

    requirejs.config({
        nodeRequire: require,
        baseUrl: __dirname + "/.."
    });

    requirejs([ "util/common", "util/assert", "core/tasync", "bin/serialize_to_xml" ], function (COMMON, ASSERT, TASYNC, serializer) {
        "use strict";

        TASYNC.trycatch(main, function (error) {
            console.log(error.trace || error.stack);

            COMMON.setProgress(null);
            COMMON.closeProject();
            COMMON.closeDatabase();
        });
        var _commit = null,
            _startHash = null,
            _branch = null,
            _projectName = null,
            _outFile = null;

        function main () {
            var args = COMMON.getParameters(null);

            if (args.length < 1 || COMMON.getParameters("help") !== null) {
                console.log("Usage: node parse_xme.js <xmlfile> [options]");
                console.log("");
                console.log("Parses a GME xme file and stores it int a WEBGME database. Possible options:");
                console.log("");
                console.log("  -mongo [database [host [port]]]\topens a mongo database");
                console.log("  -proj <project>\t\t\tselects the given project");
                console.log("  -branch <branch>\t\t\tthe branch to serialize");
                console.log("  -hash <hash>\t\t\t\tthe root hash to serialize");
                console.log("  -commit <hash>\t\t\tthe commit hash to serialize");
                console.log("  -help\t\t\t\t\tprints out this help message");
                console.log("");
                return;
            }

            _outFile = args[0];

            _branch = COMMON.getParameters("branch");
            if (_branch) {
                _branch = _branch[0] || "parsed";
            }
            _startHash = COMMON.getParameters("hash");
            if(_startHash){
                _startHash = _startHash[0];
            }
            _projectName = COMMON.getParameters("proj");
            if(_projectName){
                _projectName = _projectName[0];
            }
            _commit = COMMON.getParameters('commit');
            if(_commit){
                _commit = _commit[0];
            }

            var done = TASYNC.call(COMMON.openDatabase);
            done = TASYNC.call(COMMON.openProject, done);
            var core = TASYNC.call(COMMON.getCore, done);
            if(!_startHash){
                if(_branch){
                    _startHash = TASYNC.call(getRootHashOfBranch,_branch,done);
                    TASYNC.call(settingCommitHashOfBranch,_branch,done);
                } else if(_commit){
                    _startHash = TASYNC.call(getRootHashOfCommit,_commit,done);
                } else {
                    done = TASYNC.call(COMMON.closeProject, done);
                    done = TASYNC.call(COMMON.closeDatabase, done);
                    return done;
                }
            }
            done = TASYNC.call(serializer,core,_startHash,_outFile);
            done = TASYNC.call(function(object){
                console.log('the root after serializing and normalizing:',object);
                console.log('the commit hash what we modified:',_commit);
                if(_commit){
                    //we should make a commit
                    var newCommit = makeCommit(_outFile,object,_commit);
                    if(_branch){
                        //we also should update the branch
                        return TASYNC.call(writeBranch,newCommit);
                    } else {
                        return null;
                    }
                } else {
                    return null;
                }
            },done);
            done = TASYNC.call(COMMON.closeProject, done);
            done = TASYNC.call(COMMON.closeDatabase, done);
            return done;
        }

        function makeCommit (xmlfile, rootHash, commitHash) {
            var project = COMMON.getProject();
            return project.makeCommit([commitHash], rootHash, "normalizing during serialization to " + xmlfile);
        }
        function getRootHashOfBranch (branch){
            var project = COMMON.getProject();
            var commitHash = project.getBranchHash(branch,null);
            var done = TASYNC.call(project.loadObject,commitHash);
            done = TASYNC.call(function(object){
                console.log('getRootHashOfBranch',branch,object.root);
                _branch = branch;
                return object.root;
            },done);
            return done;
        }

        function settingCommitHashOfBranch (branch){
            var project = COMMON.getProject();
            var cHash = project.getBranchHash(branch,null);
            return TASYNC.call(function(hash){
                _commit = hash;
                return hash;
            },cHash);
        }

        function getRootHashOfCommit (commit){
            var project = COMMON.getProject();
            return TASYNC.call(function(object){
                console.log('getRootHashOfCommit',commit,object.root);
                return object.root;
            },TASYNC.call(project.loadObject,commit));
        }

        function writeBranch (hash) {
            var project = COMMON.getProject();
            var done = project.setBranchHash(_branch, _commit, hash);
            return TASYNC.call(function () {
                console.log("Commit " + hash + " written to branch " + _branch);
            }, done);
        }

    });

    return;
}

define([ "util/assert", "core/tasync", "util/common", 'fs', 'storage/commit', 'storage/cache', 'storage/mongo', 'core/core' ], function (ASSERT, TASYNC, COMMON,fs,Commit,Cache,Mongo,Core) {
// attributes reserved for easier JSON to XML conversion
// _type : show the type of the XML tag
// _attr : object which contain all the attributes of the XML node
// _empty : true/false show if the object has inner content or not (if not it will be written in <tag/> form
// _children : [] - ordered list of inner XML objects
// _string : if this tag exists then the inner part of the XML object will be this string
    var _nodes = [];
    var _prefix = "*&*";
    var _idCounter = {
        atom:0,
        model:0,
        connection:0,
        folder:0
    };
    //XML object attributes
    var registry = {
        guid: "guid",
        created: "cdate",
        modified: "mdate",
        version: "version",
        metaname: "metaname",
        metaguid: "metaguid",
        metaversion: "metaversion",
        id: "id",
        relid: "relid",
        kind: "kind",
        role: "role",
        isinstance: "isinstance",
        isprimary: "isprimary"
    };
    var webOnly = ['position','isPort','isConnection','metameta','author','comment'];
    function initJsonObject(gmeNode){
        var initJ = {};
        initJ._type = theCore.getRegistry(gmeNode,'metameta');
        initJ._empty = false;
        initJ._children = [];
        initJ._attr = {};


        for(var i in registry){
            var value = theCore.getRegistry(gmeNode,i);
            if(value !== undefined && value !== null){
                initJ._attr[registry[i]] = value;
            }
        }

        //now we should add the children to the node
        //first come the name
        //then the registry nodes
        //then the attributes

        //name
        initJ._children.push({
            _type:"name",
            _empty:false,
            _string:theCore.getAttribute(gmeNode,'name')
        });

        //comment and author
        if(initJ._type === 'project'){
            initJ._children.push({
                _type:'comment',
                _empty:false,
                _string:theCore.getRegistry(gmeNode,'comment') || ""
            });
            initJ._children.push({
                _type:'author',
                _empty:false,
                _string:theCore.getRegistry(gmeNode,'author') || ""
            });
        }

        //regnodes
        initJ._children = initJ._children.concat(createRegistryObject(gmeNode));

        //attributes
        var attrNames = theCore.getAttributeNames(gmeNode);
        for(i=0;i<attrNames.length;i++){
            if(attrNames[i] !== 'name'){
                initJ._children.push({
                    _type:"attribute",
                    _empty:false,
                    _attr:{
                        kind:attrNames[i]
                    },
                    _children:[
                        {
                            _type:"value",
                            _empty:false,
                            _string:theCore.getAttribute(gmeNode,attrNames[i])
                        }
                    ]
                });
            }
        }

        return initJ;
    }
    function registryToChildrenArray(registryObj){
        ASSERT(typeof registryObj === 'object' );
        var regJSON = [];
        for(var i in registryObj){
            if(i !== '_value'){
                var length = regJSON.push({
                    _type:"regnode",
                    _empty:false,
                    _attr:{
                        name:i
                    },
                    _children:[]
                });

                regJSON[length-1]._children = registryToChildrenArray(registryObj[i]);
                regJSON[length-1]._children.unshift({
                    _type:"value",
                    _empty:false,
                    _string: (registryObj[i]._value === null || registryObj[i]._value === undefined) ? "" : registryObj[i]._value
                });
            }
        }
        return regJSON;
    }
    function createRegistryObject(gmeNode){
        var regNames = theCore.getRegistryNames(gmeNode);
        var regObject = {};
        for(i=0;i<regNames.length;i++){
            if((registry[regNames[i]] === undefined || registry[regNames[i]] === null)&& webOnly.indexOf(regNames[i]) === -1){
                var nameArray = regNames[i].split('/');
                var tObj = regObject;
                for(var j=0;j<nameArray.length;j++){
                    if(tObj[nameArray[j]]){
                        tObj = tObj[nameArray[j]];
                    } else {
                        tObj[nameArray[j]] = {};
                        tObj = tObj[nameArray[j]];
                    }
                }
                tObj._value = theCore.getRegistry(gmeNode,regNames[i]);
            }
        }

        //no we should convert into the correct JSON form
        var regChildren = registryToChildrenArray(regObject);
        return regChildren;
    }
    function fullJsonToString(jsonObject,indent){
        if(jsonObject === null){
            return "";
        }
        ASSERT(jsonObject._type);
        var outString = indent;

        //starting with the type of the object
        outString += "<"+jsonObject._type;

        //adding XML attributes
        if(jsonObject._attr){
            for(var i in jsonObject._attr){
                outString += " "+i+"=\""+jsonObject._attr[i]+"\"";
            }
        }

        //checking _empty
        if(jsonObject._empty){
            outString += "/>\n";
            return outString;
        }

        //checking _string
        if(jsonObject._string !== undefined && jsonObject._string !== null){
            outString += ">"+jsonObject._string+"</"+jsonObject._type+">\n";
            return outString;
        }
        outString += ">\n";

        //creating children texts
        if(jsonObject._children){
            ASSERT(jsonObject._children.length);
            for(i=0;i<jsonObject._children.length;i++){
                outString+=fullJsonToString(jsonObject._children[i],indent+"  ");
            }
        }

        outString += indent+"</"+jsonObject._type+">\n";
        return outString;
    }
    function partialJsonToString(jsonObject,indent){
        ASSERT(jsonObject._type);
        var outString = indent;

        //starting with the type of the object
        outString += "<"+jsonObject._type;

        //adding XML attributes
        if(jsonObject._attr){
            for(var i in jsonObject._attr){
                outString += " "+i+"=\""+jsonObject._attr[i]+"\"";
            }
        }

        //checking _empty
        if(jsonObject._empty){
            outString += "/>\n";
            return outString;
        }

        //checking _string
        if(jsonObject._string !== undefined && jsonObject._string !== null){
            outString += ">"+jsonObject._string+"</"+jsonObject._type+">\n";
            return outString;
        }
        outString += ">\n";

        //creating children texts
        if(jsonObject._children){
            ASSERT(jsonObject._children.length);
            for(i=0;i<jsonObject._children.length;i++){
                outString+=fullJsonToString(jsonObject._children[i],indent+"  ");
            }
        }

        //in this version we are not closing the object
        //outString += indent+"</"+jsonObject._type+">\n";
        return outString;
    }
    function closeJsonToString(jsonObject,indent){
        return indent+"</"+jsonObject._type+">\n";
    }
    function createXMLStart(){
        return "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n<!DOCTYPE project SYSTEM \"mga.dtd\">\n\n"
    }

    function serialize(corr,rootHash,outPath,projectName,callback){
        //temporary hack
        console.log('serialize',(new Date()));
        var myStorage = new Commit(new Cache(new Mongo({
            database: 'test',
            host: 'localhost',
            port:27017
        }), {}));
        myStorage.openDatabase(function(err){
            if(!err){
                myStorage.openProject(projectName,function(err,project){
                    if(!err && project){
                        var mycore = new Core(project, {
                            autopersist: true
                        });
                        _serialize(mycore,rootHash,outPath,callback);
                    }
                });
            }
        });
    }

    //new TASYNC compatible functions
    function connectionToJson(object){
        var src = theCore.loadPointer(object,'source');
        var dst = theCore.loadPointer(object,'target');
        return TASYNC.call(function(s,d){
            if(theCore.isValidNode(s) && theCore.isValidNode(d)){
                var sRefPort;
                if(theCore.getRegistry(s,'metameta') === 'refport'){
                    sRefPort = theCore.loadPointer(s,'source');
                } else {
                    sRefPort = null;
                }
                var dRefPort;
                if(theCore.getRegistry(d,'metameta') === 'refport'){
                    dRefPort = theCore.loadPointer(d,'target');
                } else {
                    dRefPort = null;
                }
                return TASYNC.call(function(s,sP,d,dP){
                    if((sP === null || theCore.isValidNode(sP)) && (dP === null || theCore.isValidNode(dP))){
                        var jsonObject = initJsonObject(object);
                        if(sP){
                            var sA = theCore.getParent(s);
                            jsonObject._children.push({
                                _type:'connpoint',
                                _empty:true,
                                _attr:{
                                    role:"src",
                                    target:theCore.getRegistry(sP,'id'),
                                    refs:theCore.getRegistry(sA,'id')
                                }
                            });
                        } else {
                            jsonObject._children.push({
                                _type:'connpoint',
                                _empty:true,
                                _attr:{
                                    role:"src",
                                    target:theCore.getRegistry(s,'id')
                                }
                            });
                        }
                        if(dP){
                            var dA = theCore.getParent(d);
                            jsonObject._children.push({
                                _type:'connpoint',
                                _empty:true,
                                _attr:{
                                    role:"dst",
                                    target:theCore.getRegistry(dP,'id'),
                                    refs:theCore.getRegistry(dA,'id')
                                }
                            });
                        } else {
                            jsonObject._children.push({
                                _type:'connpoint',
                                _empty:true,
                                _attr:{
                                    role:"dst",
                                    target:theCore.getRegistry(d,'id')
                                }
                            });
                        }
                        return jsonObject;
                    } else {
                        return null;
                    }
                },s,sRefPort,d,dRefPort);
            } else {
                console.log('hiba',object);
                return null;
            }
        },src,dst);
    }
    function objectIdScanningSync(object){
        var metameta = theCore.getRegistry(object,'metameta');
        switch (metameta){
            case 'folder':
            case 'atom':
            case 'model':
            case 'connection':
            case 'reference':
            case 'set':
                var path = theCore.getPath(object);
                var id = theCore.getRegistry(object,'id');
                var wId = theCore.getRelid(object);
                var relId = theCore.getRegistry(object,'relid');
                ASSERT(path && id && wId && relId);
                var idArr = id.split('-');
                ASSERT(idArr.length === 3);

                if(Number(wId) === Number(relId)){
                    theIds[idArr[1]].ids[Number('0x'+idArr[2])] = path;
                    theIds[idArr[1]].paths[path] = true;
                }
                if(!theIds[idArr[1]].ids[Number('0x'+idArr[2])]){
                    theIds[idArr[1]].ids[Number('0x'+idArr[2])] = path;
                    theIds[idArr[1]].paths[path] = true;
                }
                if(Number('0x'+idArr[2]) > theIds[idArr[1]].max){
                    theIds[idArr[1]].max = Number('0x'+idArr[2]);
                }
                break;
        }
    }
    function relIdScanningSync(objectArray){
        var relIds = {};
        var generate = [];
        var max = 0;
        for(var i=0;i<objectArray.length;i++){
            var rId = theCore.getRegistry(objectArray[i],'relid');
            var wId = theCore.getRelid(objectArray[i]);

            if(rId !== null && rId !== undefined){
                if(Number(rId) > max){
                    max = Number(rId);
                }

                if(Number(rId) === Number(wId)){
                    //original node
                    if(relIds[rId]){
                        generate.push(relIds[rId]);
                    }
                    relIds[rId] = i;

                } else {
                    if(relIds[rId]){
                        generate.push(i);
                    } else {
                        relIds[rId] = i;
                    }
                }
            }
        }

        for(var i=0;i<generate.length;i++){
            theCore.setRegistry(objectArray[generate[i]],'relid','0x'+(++max).toString(16));
        }
    }
    function idChecking(object){
        var children = theCore.loadChildren(object);

        objectIdScanningSync(object);

        return TASYNC.call(function(objectArray){

            relIdScanningSync(objectArray);

            var done;
            for(var i=0;i<objectArray.length;i++){
                done = TASYNC.call(idChecking,objectArray[i],done);
            }
            return done;
        },children);
    }
    function padding(length){
        var pad = '';
        for(var i=0;i<length;i++){
            pad+='0';
        }
        return pad;
    }
    function idReallocationSync(object){
        var needId = false;
        var idType = "";
        switch(theCore.getRegistry(object,'metameta')){
            case 'folder':
                needId = true;
                idType = '006a';
                break;
            case 'atom':
                needId = true;
                idType = '0066';
                break;
            case 'model':
                needId = true;
                idType = '0065';
                break;
            case 'connection':
                needId = true;
                idType = '0068';
                break;
            case 'reference':
                needId = true;
                idType = '0067';
                break;
            case 'set':
                needId = true;
                idType = '0069';
                break;
        }
        if(needId){
            if(!theIds[idType].paths[theCore.getPath(object)]){
                //we need to allocate a new id for the node
                var maxIdEnd = (++theIds[idType].max).toString(16);
                var newId = 'id-'+idType+'-'+padding(8-maxIdEnd.length)+maxIdEnd;
                theCore.setRegistry(object,'id',newId);
                //these nodes needs new GUIDs as well, so let's generate them
                var newGuid = 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
                    var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
                    return v.toString(16);
                });
                theCore.setRegistry(object,'guid','{'+newGuid+'}');
            }
        }
    }
    function persist (root) {
        console.log("Waiting for objects to be saved ...");
        var done = theCore.persist(root);
        var hash = theCore.getHash(root);
        return TASYNC.join(hash, done);
    }

    var theCore;
    var theNodes = [];
    var thePaths = [];
    var theString = "";
    var theIds = {
        '0065':{max:0,ids:{},paths:{}},
        '0066':{max:0,ids:{},paths:{}},
        '0067':{max:0,ids:{},paths:{}},
        '0068':{max:0,ids:{},paths:{}},
        '0069':{max:0,ids:{},paths:{}},
        '006a':{max:0,ids:{},paths:{}}
    };

    function getChildren(object,indent){

        idReallocationSync(object);
        var children = theCore.loadChildren(object);
        //object tasks pre children loading
        switch(theCore.getRegistry(object,'metameta')){
            case 'connection':
                var jsonObject = connectionToJson(object);
                var done = TASYNC.call(function(obj){
                    theString += fullJsonToString(obj,indent);
                    return;
                },jsonObject);
                return done;
            case 'refport':
                //we deal these kind of nodes during connection handling
                return;
            default:
                var jsonObject = initJsonObject(object);
                theString += partialJsonToString(jsonObject,indent);

                //handling children
                var done = TASYNC.call(function(objectArray){
                    var mydone;
                    for(var i=0;i<objectArray.length;i++){
                        theNodes.push(objectArray[i]);
                        thePaths.push(theCore.getPath(objectArray[i]));
                        mydone = TASYNC.call(getChildren,objectArray[i],indent+"  ",mydone);
                    }
                    return mydone;
                },children);

                //post-children tasks
                done = TASYNC.call(function(){
                    theString += closeJsonToString(jsonObject,indent);
                },done);

                return done;
        }
    }
    function serialize(core,hash,outPath){
        theCore = core;
        var root = core.loadRoot(hash);
        theString += createXMLStart();

        var done = TASYNC.call(idChecking,root);
        done = TASYNC.call(getChildren,root,"  ",done);
        done = TASYNC.call(function(){
            //console.log(thePaths);
            fs.writeFileSync(outPath,theString);
            return;
        },done);
        done = TASYNC.call(persist,root,done);
        return done;
    }

    //return TASYNC.wrap(serialize);
    return serialize;
});
