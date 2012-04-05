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
        lfd = fs.openSync(timeStampNoFormat()+".log", 'a', 666);
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
};
var readSubTree = function(root){
    mystorage.getOne({_id:root},timeStampInt,function(err,result,query,starttime){
        var time = timeStampInt-starttime;
        log("{"+result._id+"} returned in "+time+"ms");
        for(var i in result.children){
            readSubTree(result.children[i]);
        }
        if(--COUNTER == 0){
            exitProgram();
        }
    });
};

/*paralel functions*/
var createLotOfObjectsParalelly = function(howmany){
    for(var i=0;i<howmany;i++){
        mystorage.set(createObject(i,sizeofobjects),paralelObjectCreated);
    }
};
var paralelObjectCreated = function(id){
    log("object "+id+" paralelly created...");
};
var readLotOfObjectsParalellyOneByOne = function(howmany){
    for(var i=0;i<howmany;i++){
        mystorage.getOne({_id:i},timeStampInt(),paralelObjectRead);
    }
};
var readLotOfObjectsParalellyInTens = function(howmany){
    for(var i=0;i<howmany;i+=10){
        mystorage.get({$or:[{_id:i},{_id:i+1},{_id:i+2},{_id:i+3},{_id:i+4},{_id:i+5},{_id:i+6},{_id:i+7},{_id:i+8},{_id:i+9}]},paralelObjectRead);
    }
}
var paralelObjectRead = function(err,result,query,starttime){
    log("object have been loaded paralelly");
    if(err){
        log("something was wrong during the load "+err);
    }
    else{
        var time=timeStampInt()-starttime
        log("object: "+JSON.stringify(query)+" time was: "+time);
    }
}

/*sequential tries...*/
var createLotOfObjectsSequentially = function(howmany){
    var i=0;
    var creationDone = function(){
        log("sequentially created object:"+i);
        i++;
        if(i<howmany){
            mystorage.set(bigObject(i),creationDone);
        }
        else{
            log("sequential creation have been done");
            exitProgram();
        }
    };
    mystorage.set(bigObject(i),creationDone);
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


/*MAIN*/
log(" ... "+timeStampNoFormat());
var numofobjects = 10000;
var sizeofobjects = 1;
var mystorage = new MongoStorage();
mystorage.onOpen = function(){
    mystorage.clear();
    //createLotOfObjectsParalelly(numofobjects);
    //readLotOfObjectsParalellyOneByOne(numofobjects);
    COUNTER = 0;
    createSubTree("root");
    readSubTree("root");
};
