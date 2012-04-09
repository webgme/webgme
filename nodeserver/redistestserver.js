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
};

var redis = require("redis"),
    client = redis.createClient();

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
};
var createSubTree = function(root){
    var level = root.split('_').length-1;
    var object = createObject(root,PAYLOAD);
    object.children = [];
    if(level<DEPTH){
        for(var i =0;i<CHILDREN;i++){
            object.children.push(root+"_"+i);
        }
        client.set(object._id,JSON.stringify(object),treeItemCreated);
        for(var i=0;i<CHILDREN;i++){
            createSubTree(root+"_"+i);
        }
    }
    else{
        /*leaf*/
        client.set(object._id,JSON.stringify(object),treeItemCreated);
    }
};
var treeItemCreated = function(err,result){
    if(err){
        log("ajjaj");
        log(err);
    }
    else{
        COUNTER++;
        if(COUNTER==MAX){
            CREATEEND = timeStampInt();
        }
    }
};
var readSubTree = function(root){
    client.get(root,function(err,result){
        if(err){
            log("na megint ajjajj");
        }
        else{
            var obj = JSON.parse(result);
            COUNTER--;
            if(COUNTER===0){
                READEND = timeStampInt();
                /*this is the end*/
                printTreeResults();
                exitProgram();
            }
            else{
                for(var i in obj.children){
                    readSubTree(obj.children[i]);
                }
            }
        }

    });
};
var DEPTH = 3;
var CHILDREN = 3;
var PAYLOAD = 1;
var COUNTER = 0;
var MAX = 0;
var READSTART = 0;
var READEND = 0;
var CREATESTART = 0;
var CREATEEND = 0;
var numOfNodes = function(){
    var retval=1;
    var leaf=1;
    for(var i=0;i<DEPTH;i++){
        leaf = leaf*CHILDREN;
        retval +=leaf;
    }
    return retval;
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
    console.log("proper usage: node redistestserver.js depth(1-) children(1-) payload(1-100)");
    exitProgram();
};
var exitProgram = function(){
    if(lfd){
        log("exiting program");
        fs.closeSync(lfd);
    }
    /*terminating the test*/
    process.exit(0);
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

CREATESTART = timeStampInt();
createSubTree("root");
READSTART = timeStampInt();
readSubTree("root");