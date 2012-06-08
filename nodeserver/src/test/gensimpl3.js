var objectCounter = 0;
var payload = "";
var objects = {};
var emptyObject = function(){
    return { _id:"obj"+objectCounter++,
        attributes:{"name":"default","payload":payload, "isPort":true},
        registry:{ "position" : { "x" : Math.round(Math.random() * 1000), "y":  Math.round(Math.random() * 1000)} },
        relations:{parentId:null,
            childrenIds:[],
            baseId:null,
            inheritorIds:[]
        },
        pointers:{}
    }
};
var generatePayload = function(size){
    var i,
        j;
    payload="";
    for(i=0;i<size;i++){
        for(j=0;j<1024;j++){
            payload+="a";
        }
    }
};
var easyBase = function(){
    var object, connection;
    object = emptyObject();
    object._id = "object";
    object.relations.inheritorIds.push("connection");
    objects["object"] = object;
    connection = emptyObject();
    connection._id = "connection";
    connection.relations.baseId = "object";
    objects["connection"] = connection;
    return object;
};
var generateBase = function(length){
    var i,
        previousobject=null,
        currentobject;
    for(i=0;i<length;i++){
        currentobject = emptyObject();
        currentobject.attributes.bazis = "turoburo";
        if(previousobject){
            currentobject.relations.baseId = previousobject._id;
            previousobject.relations.inheritorIds.push = currentobject._id;
        }
        objects[currentobject._id] = currentobject;
        previousobject = currentobject;
    }
    return currentobject;
};

var rGenerateTree = function(level,maxlevel,maxchildren){
    var i,
        root,
        children;
    root = emptyObject();
    if(level === 0){
        root._id = "root";
    }
    root.relations.baseId = commonbase._id;
    commonbase.relations.inheritorIds.push(root._id);
    if(level<maxlevel){
        for(i=0;i<maxchildren;i++){
            children = rGenerateTree(level+1,maxlevel,maxchildren);
            children.relations.parentId = root._id;
            root.relations.childrenIds.push(children._id);
        }
    }
    objects[root._id] = root;
    return root;
};





/*main*/
var i,
    fs = require('fs'),
    arguments = process.argv.splice(" "),
    commonbase,
    root;
if(arguments.length !== 6){
    console.log("usage: gensimpl3 filename numoflevels numofchildren sizeofpayload");
    process.exit(0);
}
generatePayload(Number(arguments[5]));
commonbase = /*generateBase(Number(arguments[6]))*/ easyBase();
root = rGenerateTree(0,Number(arguments[3]),Number(arguments[4]));
fs.writeFileSync(arguments[2]+".tpf", JSON.stringify(objects));
console.log(objectCounter+" object have been created!");
process.exit(0);
