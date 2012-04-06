/*common functions*/
var timeStamp = function(){
    var date = new Date();
    return date.getFullYear()+"."+(date.getMonth()+1)+"."+date.getDate()+" - "+date.getHours()+":"+date.getMinutes()+":"+date.getSeconds()+"."+date.getMilliseconds();
};
var timeStampNoFormat = function(){
    var date = new Date();
    return "d"+date.getFullYear()+date.getMonth()+date.getDate()+date.getHours()+date.getMinutes()+date.getSeconds()+date.getMilliseconds();
};
var timeStampInt = function(){
    var date = new Date();
    return Date.parse(date)+date.getMilliseconds();
};
var lfd = undefined;
var fs = require('fs');
var log = function(text){
    if(lfd){
        fs.writeSync(lfd,"["+timeStamp()+"] "+text+"\n");
    }
    else{
        lfd = fs.openSync(timeStampNoFormat()+".log", 'a');
        log(text);
    }
}
var DB = require('mongodb').Db;
var SERVER = require('mongodb').Server;

var MongoStorage = function(){
    log("mongostorage creation have been started");
    var _db = new DB('mongotest', new SERVER('localhost', 27017, {auto_reconnect:true},{}));
    log("mongostorage db created");
    var self = this;
    var _collection = undefined;
    log("mongostorage opening db");
    _db.open(function(){
        log("mongostorage db opened");
        log("mongostorage opening collection");
        _db.collection('testcoll',function(err,result){
            log("mongostorage collection opening returned");
            if(err){
                log("error during collection opening: "+err);
            }
            else{
                _collection = result;
                log("mongostorage creation finished");
                self.onOpen();
            }
        });
    });

    /*public functions*/
    this.onOpen = function(){
        log("mongostorage have been opened");
    };
    this.clear = function(){
        log("clear started")
        if(_collection){
            _collection.remove(function(err){
                log("clear returned from db");
                if(err){
                    log("clear have been failed: "+err);
                }
            });
        }
        else{
            log("collection is not exist");
        }
    };
    this.set = function(object, cb){
        log("mongoset start - object:"+JSON.stringify(object._id));
        _collection.save(object, function(err){
            log("mongoset save returned");
            if(err){
                log("mongoset error: "+err);
                cb(err);
            }
            else{
                cb(object._id);
            }
        });
    };
    this.get = function(query, cb){
        log("mongoget start - query: "+JSON.stringify(query));
        _collection.find(query,function(err,result){
            log("mongoget gives back result");
            if(err){
                log("mongoget error: "+err);
                cb(err);
            }
            else{
                cb(null,result);
            }

        });
    };
    this.getOne = function(query,starttime,cb){
        log("mongogetone start - query: "+JSON.stringify(query));
        _collection.findOne(query,function(err,result){
            if(err){
                log("mongogetone error: "+err);
                cb(err);
            }
            else{
                cb(null,result,query,starttime);
            }
        });

    };
};

/*tree like functioning*/
var DEPTH = 3;
var CHILDREN = 3;
var PAYLOAD = 1;
var COUNTER = 0;
var numOfNodes = function(){
	var retval=1;
	var leaf=1;
	for(var i=0;i<DEPTH;i++){
		leaf = leaf*CHILDREN;
		retval +=leaf;
	}
	return retval;
};
var MAX = numOfNodes();
var READSTART = 0;
var READEND = 0;
var CREATESTART = 0;
var CREATEEND = 0;
var createSubTree = function(root){
    var level = root.split('_').length-1;
    var object = createObject(root,PAYLOAD);
    object.children = [];
    if(level<DEPTH){
        for(var i =0;i<CHILDREN;i++){
            object.children.push(root+"_"+i);
        }
        mystorage.set(object,treeItemCreated);
        for(var i=0;i<CHILDREN;i++){
            createSubTree(root+"_"+i);
        }
    }
    else{
        /*leaf*/
        mystorage.set(object,treeItemCreated);
    }
};
var treeItemCreated = function(id){
    log("{"+id+"} have been created");
    COUNTER++;
    if(COUNTER==MAX){
    	CREATEEND = timeStampInt();
    }
};
var readSubTree = function(root){
    mystorage.getOne({_id:root},timeStampInt(),function(err,result,query,starttime){
    	if(err){
    		log("ooops "+query);
    	}
    	else{    		
	        var time = timeStampInt()-starttime;
	        log("{"+result._id+"} returned in "+time+"ms");
	        for(var i in result.children){
	            readSubTree(result.children[i]);
	        }
	        if(--COUNTER == 0){
	        	READEND = timeStampInt();
	        	printTreeResults();
	            exitProgram();
	        }
    	}
    });
};
var objecthusi = {};
var createObject = function(id,size){
    var object = {_id:id,name:"n"+id,husi:""};
    if(objecthusi[size]){
        object.husi = objecthusi[size];
    }
    else{
        for(var i=0;i<size;i++){
            for(var j=0;j<1024;j++){
                object.husi+="a";
            }
        }
        objecthusi[size] = object.husi;
    }
    return object;
}
var exitProgram = function(){
    if(lfd){
        log("exiting program");
        fs.closeSync(lfd);
    }
    /*terminating the test*/
    process.exit(0);
};
var printTreeResults = function(){
	var text = "testing parameters: depth="+DEPTH+", children="+CHILDREN+", payload="+PAYLOAD;
	text    += "\n";
	text    += "testing results: creation time="+(CREATEEND-CREATESTART)+"ms, read time="+(READEND-READSTART)+"ms";
	log("testing parameters: depth="+DEPTH+", children="+CHILDREN+", payload="+PAYLOAD);
	log("testing results: creation time="+(CREATEEND-CREATESTART)+"ms, read time="+(READEND-READSTART)+"ms");
	console.log(text);
};
var printHelpText = function(){
	console.log("wrong parameters!!!");
	console.log("proper usage: node mongotestserver.js depth(1-) children(1-) payload(1-100)");
	exitProgram();
};

/*MAIN*/
var parameters = process.argv.splice(" ");
if(parameters.length != 5){
	printHelpText();
}
DEPTH=parseInt(parameters[2]);
CHILDREN=parseInt(parameters[3]);
PAYLOAD=parseInt(parameters[4]);
if(!(DEPTH>0 && CHILDREN>0 && PAYLOAD>0 && PAYLOAD<101)){
	printHelpText();
}
MAX = numOfNodes();
var mystorage = new MongoStorage();
mystorage.onOpen = function(){
    mystorage.clear();
    COUNTER = 0;
    CREATESTART = timeStampInt();
    createSubTree("root");
    READSTART = timeStampInt();
    readSubTree("root");
};
