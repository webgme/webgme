var itemNum = 100000;
var topLevel = 30;

var storage = {};
var entityIds = [];
var rootChildren = [];

for ( var i = 0; i < itemNum; i++ ) {
    //generate obejct
    var myId = "id" + i;
    var myObject = { _id: myId, name: "Object" + i, children: [], parent : "root", attr : { "posX" :  Math.round(Math.random() * 1000), "posY":  Math.round(Math.random() * 1000) }, base:"simplemodel" };

    if ( i > topLevel  ) {
        //pick a parent for it randomly
        var rndParentPos = Math.floor(Math.random()* (i - 1) );

        var parentEntityId = entityIds[ rndParentPos ];

        //set its parent
        myObject.parent = parentEntityId;

        //add it to its parent's children list
        storage[ parentEntityId ].children.push(myId);

        if(rndParentPos>topLevel/2){
            /*overiding base attribute*/
            myObject.object = false;
        }

    } else {
        rootChildren.push( myId );
    }

    //store object in my storage
    storage[myId] =  myObject;
    entityIds.push( myId );
}

storage["root"]  = {_id: "root", name:"RootFolder", children: rootChildren , size:"big"};
storage["simplemodel"] = {_id: "simplemodel", name:"simple model type object", children: [] , simple:true, base:"model"};
storage["model"] = {_id: "model", name:"model type object", children: [] , model:true , base:"object"};
storage["object"] = {_id: "object", name:"base object type", children: [] , object:true};

var fs = require('fs');
fs.writeFileSync("project.out",JSON.stringify(storage));