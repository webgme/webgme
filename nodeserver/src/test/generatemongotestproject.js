var DirtyStorage = function(_projectname,_branchname){
    var _objects = undefined;

    /*mongo stuffa*/
    var _MONGO = require('mongodb');
    var _DB = new _MONGO.Db(_projectname, new _MONGO.Server('localhost', 27017, {},{}));

    /*public functions*/
    this.get = function(id,cb){
        if(_objects){
            _objects.findOne({_id:id},function(err,result){
                if(err){
                    cb(err);
                }
                else{
                    cb(null,result.object);
                }
            });
        }
        else{
            cb(1);
        }
    };
    this.set = function(id,object,cb){
        if(_objects){
            _objects.save({_id:id,object:object},function(err){
                cb(err);
            });
        }
        else{
            cb(1);
        }
    };
    this.del = function(id,cb){
        if(_objects){
            _objects.save({_id:id,object:null},function(err){
                cb(err);
            });
        }
        else{
            cb(1);
        }
    };
    /*private functions*/

    /*main*/
    _DB.open(function(){
        _DB.collection(_branchname,function(err,result){
            if(err){
                console.log("something wrong with the given branch!!!");
            }
            else{
                _objects = result;
            }
        });
    });
};

var itemNum = 100000;
var topLevel = 30;
var payload = 2;
var husi = "";
for(var i=0;i<payload;i++){
    for(var j=0;j<1024;j++){
        husi+="a";
    }
}
var created = 0;

var addChildren = function(_storage,parentid,child,cb){
    _storage.get(parentid,function(err,parent){
        if(err){
            cb(err);
        }
        else{
            parent.children.push(child._id);
            _storage.set(child._id,child,function(err){
                if(err){
                    cb(err);
                }
                else{
                    _storage.set(parentid,parent,function(err){
                        cb(err);
                    });
                }
            });
        }
    });
};

var childrenAdded = function(){
    if(++created>=itemNum){
        process.exit(0);
    }
    else{
        var next = generateObject(created);
        createObject(next.parent,next);
    }
};
var generateObject = function(index){
    var myobject = { _id: "id"+index, name: "Object" + index, children: [], parent : "root", attr : { "posX" :  Math.round(Math.random() * 1000), "posY":  Math.round(Math.random() * 1000), husi:husi }};
    if(index>=topLevel){
        myobject.parent = "id"+ Math.round(Math.random() * (index-1));
    }
    return myobject;
}
var createObject = function(parentid,object){
    addChildren(storage,parentid,object,function(err){
        if(err){
            console.log("error2");
            process.exit(0);
        }
        else{
            createdIds.push(object._id);
            childrenAdded();
        }
    });
};


/*main*/
var storage = new DirtyStorage("testproject","test");
var createdIds = [];
setTimeout(function(){
    var root = {_id: "root", name:"RootFolder", children: [] , size:"big"};
    storage.set("root",root,function(err){
        if(err){
            console.log("error1");
            process.exit(0);
        }
        else{
            var first = generateObject(created);
            createObject(first.parent,first);
        }
    })
},1000);
