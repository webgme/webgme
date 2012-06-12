var objectCounter = 0;
var payload = "";
var objects = {};
var emptyObject = function(){
    return { _id:"obj"+objectCounter,
        attributes:{"name":"obj"+objectCounter++,"payload":payload},
        registry:{  "position" : { "x" : Math.round(Math.random() * 1000), "y":  Math.round(Math.random() * 1000)},
                    "isConnection" : false},
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
    object.attributes.isPort = true;
    objects["object"] = object;
    connection = emptyObject();
    connection._id = "connection";
    connection.relations.baseId = "object";
    connection.registry.isConnection = true;
    connection.attributes.isPort = false;
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
//all the objects are generated, create connection
console.log("root.relations.childrenIds.length: " + root.relations.childrenIds.length);
var rootChildren = root.relations.childrenIds.length;
for (i = 0; i < rootChildren; i++) {
    //console.log("i: " + i);
    var connId = "conn_" + root.relations.childrenIds[0] + "_" + root.relations.childrenIds[i];
    var connObject = emptyObject();
    connObject._id = connId;
    connObject.attributes.name = connId;
    connObject.relations.baseId = "connection";
    connObject.relations.inheritorIds.push(connId);
    connObject.attributes.directed = true;

    //set parent
    connObject.relations.parentId = root._id;
    root.relations.childrenIds.push(connId);

    //set source and target
    connObject.pointers.source = { "to": root.relations.childrenIds[0], "from": [] };
    connObject.pointers.target = { "to": root.relations.childrenIds[i], "from": [] };

    var sourceFrom = objects[root.relations.childrenIds[0]].pointers.source || { "to" : null, "from" : [] };
    sourceFrom.from.push(connId);
    objects[root.relations.childrenIds[0]].pointers.source = sourceFrom;

    var targetFrom = objects[root.relations.childrenIds[i]].pointers.target || { "to" : null, "from" : [] };
    targetFrom.from.push(connId);
    objects[root.relations.childrenIds[i]].pointers.target = targetFrom;

    objects[connId] = connObject;
}



fs.writeFileSync(arguments[2]+".tpf", JSON.stringify(objects));
console.log(objectCounter+" object have been created!");
process.exit(0);
