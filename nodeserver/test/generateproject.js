var itemNum = 100000;
var topLevel = 30;
var i = 0;
var j = 0;

var storage = {};
var entityIds = [];
var rootChildren = [];

for (i = 0; i < itemNum; i += 1) {
    //generate obejct
    var myId = "id" + i;
    var myObject = {    _id: myId,
                        name: "Object" + i,
                        children: [],
                        parent : "root",
                        attr : { "posX" :  Math.round(Math.random() * 1000), "posY":  Math.round(Math.random() * 1000) },
                        base: "simplemodel",
                        connSrc: [],
                        connTrgt: []};

    if (i > topLevel) {
        //pick a parent for it randomly
        var rndParentPos = Math.floor(Math.random() * (i - 1));

        var parentEntityId = entityIds[rndParentPos];

        //set its parent
        myObject.parent = parentEntityId;

        //add it to its parent's children list
        storage[parentEntityId].children.push(myId);

        if (rndParentPos > topLevel / 2) {
            /*overiding base attribute*/
            myObject.object = false;
        }

    } else {
        rootChildren.push(myId);
    }

    //store object in my storage
    storage[myId] =  myObject;
    entityIds.push(myId);
}

storage.root  = {_id: "root", name: "RootFolder", children: rootChildren, size: "big"};

//iterate through each parent and create connections between its children
var allParentIds = entityIds.concat(["root"]);
for (i = 0; i < allParentIds.length; i += 1) {
    var childrenConnectionsIds = [];

    var currentParent = storage[allParentIds[i]];

    for (j = 0; j < Math.floor(currentParent.children.length / 2); j += 1) {

        if (j === 0) {
            //first child is always connected to itself
            var selfConn = { "_id": "conn_" + currentParent.children[0] + "_" + currentParent.children[0],
                "srcId": currentParent.children[0],
                "trgtId": currentParent.children[0],
                "directed": true,
                "children": []};

            selfConn.name = selfConn._id;
            selfConn.parent = allParentIds[i];

            //store object in my storage
            storage[selfConn._id] =  selfConn;

            //fix the two ends of the connection
            storage[selfConn.srcId].connSrc.push(selfConn._id);
            storage[selfConn.trgtId].connTrgt.push(selfConn._id);

            childrenConnectionsIds.push(selfConn._id);
        }

        //create connection object
        var newConn = { "_id": "conn_" + currentParent.children[j] + "_" + currentParent.children[currentParent.children.length - 1 - j],
            "srcId": currentParent.children[j],
            "trgtId": currentParent.children[currentParent.children.length - 1 - j],
            "directed": j % 2 === 0 ? true : false,
            "children": []};

        newConn.name = newConn._id;
        newConn.parent = allParentIds[i];

        //store object in my storage
        storage[newConn._id] =  newConn;

        //fix the two ends of the connection
        storage[newConn.srcId].connSrc.push(newConn._id);
        storage[newConn.trgtId].connTrgt.push(newConn._id);

        childrenConnectionsIds.push(newConn._id);
    }

    currentParent.children = currentParent.children.concat(childrenConnectionsIds);
}


storage.simplemodel = {_id: "simplemodel", name: "simple model type object", children: [], simple: true, base: "model"};
storage.model = {_id: "model", name: "model type object", children: [], model: true, base: "object"};
storage.object = {_id: "object", name: "base object type", children: [], object: true};

var fs = require('fs');
fs.writeFileSync("project.out", JSON.stringify(storage));