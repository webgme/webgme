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
                        isPort : true,
                        connSrc: [],
                        connTrgt: [] };

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

    //create connection between children
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

        //first child is connected to everyone
        if (j > 0) {
            //create connection object
            var connWithFirstChild = { "_id": "conn_" + currentParent.children[0] + "_" + currentParent.children[j],
                "srcId": currentParent.children[0],
                "trgtId": currentParent.children[j],
                "directed": j % 2 === 0 ? true : false,
                "children": []};

            connWithFirstChild.name = connWithFirstChild._id;
            connWithFirstChild.parent = allParentIds[i];

            //store object in my storage
            storage[connWithFirstChild._id] =  connWithFirstChild;

            //fix the two ends of the connection
            storage[connWithFirstChild.srcId].connSrc.push(connWithFirstChild._id);
            storage[connWithFirstChild.trgtId].connTrgt.push(connWithFirstChild._id);

            childrenConnectionsIds.push(connWithFirstChild._id);
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

    //create a connection between two grandchildren of different children
    if (currentParent.children.length > 1) {
        var child1 = storage[currentParent.children[0]];
        var child2 = storage[currentParent.children[1]];

        if ((child1.children.length > 0) && (child2.children.length > 0)) {
            //create connection object
            var grandChildrenConn = { "_id": "conn_" + child1.children[0] + "_" + child2.children[0],
                "srcId": child1.children[0],
                "trgtId": child2.children[0],
                "directed": true,
                "children": []};

            grandChildrenConn.name = grandChildrenConn._id;
            grandChildrenConn.parent = allParentIds[i];

            //store object in my storage
            storage[grandChildrenConn._id] =  grandChildrenConn;

            //fix the two ends of the connection
            storage[grandChildrenConn.srcId].connSrc.push(grandChildrenConn._id);
            storage[grandChildrenConn.trgtId].connTrgt.push(grandChildrenConn._id);

            childrenConnectionsIds.push(grandChildrenConn._id);
        }
    }


    //create a connection between a grandchildren and a children of this parent
    if (currentParent.children.length > 1) {
        var child1 = storage[currentParent.children[0]];
        var child2 = storage[currentParent.children[1]];

        if (child2.children.length > 0) {
            //create connection object
            var halfGrandChildrenConn = { "_id": "conn_" + currentParent.children[0] + "_" + child2.children[0],
                "srcId": currentParent.children[0],
                "trgtId": child2.children[0],
                "directed": true,
                "children": []};

            halfGrandChildrenConn.name = halfGrandChildrenConn._id;
            halfGrandChildrenConn.parent = allParentIds[i];

            //store object in my storage
            storage[halfGrandChildrenConn._id] =  halfGrandChildrenConn;

            //fix the two ends of the connection
            storage[halfGrandChildrenConn.srcId].connSrc.push(halfGrandChildrenConn._id);
            storage[halfGrandChildrenConn.trgtId].connTrgt.push(halfGrandChildrenConn._id);

            childrenConnectionsIds.push(halfGrandChildrenConn._id);
        }
    }

    currentParent.children = currentParent.children.concat(childrenConnectionsIds);
}


storage.simplemodel = {_id: "simplemodel", name: "simple model type object", children: [], simple: true, base: "model"};
storage.model = {_id: "model", name: "model type object", children: [], model: true, base: "object"};
storage.object = {_id: "object", name: "base object type", children: [], object: true};

var fs = require('fs');
fs.writeFileSync("project.out", JSON.stringify(storage));