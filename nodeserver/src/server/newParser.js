
var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require
});

var FS = require("fs");

requirejs(["./FileStorage.js","./FlatCore.js","./sax.js"],function(fst,fc,sax){
    var storage = new fst("mytest","start");
    var CORE = new fc(storage);
    var saxStream = sax.createStream(true,{trim: true});
    var currentNode = null;
    var parentNode = null;
    var inName = false;
    var inComment = false;
    var inAuthor = false;
    var registry = null;
    var regLevel = 0;
    var connPoints = [];

    saxStream.on("error", function (e) {
        // unhandled errors will throw, since this is a proper node
        // event emitter.
        console.error("error!", e)
        // clear the error
        this._parser.error = null
        this._parser.resume()
    });
    saxStream.on("opentag", function (node) {
        var i;
        var newNode = function(id){
            var i;
            currentNode = CORE.createNode(currentNode,null,id);
            CORE.setAttribute(currentNode,"name","noname");
            for(i in node.attributes){
                CORE.setAttribute(currentNode,i,node.attributes[i]);
            }
        };
        // same object as above
        console.log("open "+node.name);
        switch(node.name){
            case "name":
                inName = true;
                break;
            case "project":
                newNode("root");
                break;
            case "comment":
                inComment = true;
                break;
            case "author":
                inAuthor = true;
                break;
            case "folder":
                newNode(node.attributes.id);
                break;
            case "regnode":
                break;
            case "value":
                break;
            case "attribute":
                newNode();
                break;
            case "atom":
                newNode(node.attributes.id);
                break;
            case "connection":
                newNode(node.attributes.id);
                break;
            case "connpoint":
                connPoints.push({connection:CORE.getStringPath(currentNode),name:node.attributes.role,target:node.attributes.target});
                break;
            case "set":
                newNode(node.attributes.id);
                break;
            case "model":
                newNode(node.attributes.id);
                break;
            default:
                //console.log(JSON.stringify(node));
        }

    });

    saxStream.on("text",function(text){
        if(inName){
            CORE.setAttribute(currentNode,"name",text);
        }

        if(inComment){
            CORE.setAttribute(currentNode,"comment",text);
        }

        if(inAuthor){
            CORE.setAttribute(currentNode,"author",text);
        }

    });
    saxStream.on("closetag", function (tagname){
        var makeConn = function(connitem){
            CORE.loadByPath(connitem.connection,function(err,conn){
                if(err){
                    console.log("bugl106");
                }
                else{
                    CORE.loadByPath(connitem.target,function(err,target){
                        if(err){
                            console.log("bugl109");
                        }
                        else{
                            CORE.setPointer(conn,connitem.name,target);
                        }
                    });
                }
            });
        };
        var makeConnPoints = function(){
            var i;
            for(i=0;i<connPoints.length;i++){
                makeConn(connPoints[i]);
            }
        };
        switch(tagname){
            case "name":
                if(inName){
                    inName = false;
                }
                else{
                    console.log("bugl74");
                }
                break;
            case "project":
                makeConnPoints();
                break;
            case "comment":
                if(inComment){
                    inComment = false;
                }
                else{
                    console.log("bugl95");
                }
                break;
            case "author":
                if(inAuthor){
                    inAuthor = false;
                }
                else{
                    console.log("bugl110");
                }
                break;
            case "folder":
                currentNode = CORE.getParent(currentNode);
                break;
            case "regnode":
                break;
            case "value":
                break;
            case "attribute":
                currentNode = CORE.getParent(currentNode);
                break;
            case "atom":
                currentNode = CORE.getParent(currentNode);
                break;
            case "connection":
                currentNode = CORE.getParent(currentNode);
                break;
            case "connpoint":
                /*nothing to do*/
                break;
            case "set":
                currentNode = CORE.getParent(currentNode);
                break;
            case "model":
                currentNode = CORE.getParent(currentNode);
                break;
            default:
            //console.log(JSON.stringify(node));
        }
    });

    saxStream.on("end",function(){
        CORE.persist(currentNode,function(err){
            process.exit(0);
        });
    });

    var filename = process.argv[2];
    if( !filename ) {
        console.log("Usage: node parser.js <file.xml>");
        process.exit(0);
    }

    var stream = FS.createReadStream(filename);

    stream.on("error", function (err) {
        exit(err.code === "ENOENT" ? "File not found: " + filename : "Unknown file error: "
            + JSON.stringify(err));
    });

    stream.on("open", function () {
        console.log("Parsing xml file ...");
        stream.pipe(saxStream);
    });

});
