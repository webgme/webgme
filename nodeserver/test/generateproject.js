var itemNum = 100000;
var topLevel = 30;

var storage = {};
var entityIds = [];
var rootChildren = [];

for ( var i = 0; i < itemNum; i++ ) {
    //generate obejct
    var myId = "id" + i;
    var myObject = { _id: myId, name: "Object" + i, children: [], parent : "root", attr : { "posX" : Math.random() * 1000, "posY": Math.random() * 1000 } };

    if ( i > topLevel  ) {
        //pick a parent for it randomly
        var rndParentPos = Math.floor(Math.random()* (i - 1) );

        var parentEntityId = entityIds[ rndParentPos ];

        //set its parent
        myObject.parentId = parentEntityId;

        //add it to its parent's children list
        storage[ parentEntityId ].children.push(myId);
    } else {
        rootChildren.push( myId );
    }

    //store object in my storage
    storage[myId] =  myObject;
    entityIds.push( myId );
}

storage["root"]  = {_id: "root", name:"RootFolder", children: rootChildren , size:"big"};

var fs = require('fs');
fs.writeFileSync("project.out",JSON.stringify(storage));