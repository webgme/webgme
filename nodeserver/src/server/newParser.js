
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
    var inRegistry = false;
    var inValue = false;
    var currentreg = null;
    var regpath = [];
    var connPoints = [];
    var OBJBASE = null;
    var CONNBASE = null;

    var rPrintReg = function(node){
        CORE.loadChildren(node,function(err,children){
            if(err){
                console.log("bugl32");
            }
            else{
                var i;
                for(i=0;i<children.length;i++){
                    rPrintReg(children[i]);
                }
            }
        })
    };
    var printRegistries = function(){
        CORE.loadRoot("root",function(err,root){
            if(err){
                console.log("bugl31");
            }
            else{
                rPrintReg(root);
            }
        });
    }
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
        var newNode = function(id,base){
            var i;
            currentNode = CORE.createNode(currentNode,base,id);
            CORE.setAttribute(currentNode,"name","noname");
            for(i in node.attributes){
                CORE.setAttribute(currentNode,i,node.attributes[i]);
            }
            registry = {"emptycounter":0};
            reglevel = 0;
            currentreg = registry;
            regpath = [];
        };
        // same object as above
        //console.log("open "+node.name);
        switch(node.name){
            case "name":
                inName = true;
                break;
            case "project":
                newNode("root");
                /*creating base objects -- metameta if you like it so*/
                OBJBASE = CORE.createNode(currentNode,null,"object");
                CONNBASE = CORE.createNode(currentNode,null,"connection");
                break;
            case "comment":
                inComment = true;
                break;
            case "author":
                inAuthor = true;
                break;
            case "folder":
                newNode(node.attributes.id,null);
                break;
            case "regnode":
                if(registry === null){
                    registry = {};
                    regpath = [];
                    currentreg = registry;
                }
                var regname;
                if(node.attributes.name === ""){
                    regname = "noname"+registry.emptycounter++;
                }
                else{
                    regname = node.attributes.name;
                }

                currentreg[regname] = {};
                regpath.push(regname);
                currentreg = currentreg[regname];
                inRegistry = true;
                break;
            case "value":
                inValue = true;
                break;
            case "attribute":
                newNode(null,OBJBASE);
                break;
            case "atom":
                newNode(node.attributes.id,OBJBASE);
                break;
            case "connection":
                newNode(node.attributes.id,CONNBASE);
                break;
            case "connpoint":
                connPoints.push({connection:CORE.getStringPath(currentNode),name:node.attributes.role === "src" ? "source":"target",target:node.attributes.target});
                break;
            case "set":
                newNode(node.attributes.id,OBJBASE);
                break;
            case "model":
                newNode(node.attributes.id,OBJBASE);
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

        if(inValue){
            if(inRegistry){
                currentreg.value = text;
            }
            else{
                CORE.setAttribute(currentNode,"value",text);
            }
        }
    });
    saxStream.on("closetag", function (tagname){
        var closeNode = function(isConnect){
            var i;
            CORE.setRegistry(currentNode,"position",{ "x" : Math.round(Math.random() * 1000), "y":  Math.round(Math.random() * 1000)});
            //CORE.setRegistry(currentNode,"isConnection",isConnect);
            currentNode = CORE.getParent(currentNode);
        };
        var setRegistry = function(){
            delete registry.emptycounter;
            for(i in registry){
                CORE.setRegistry(currentNode,i,registry[i]);
            }
        };
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
                closeNode(false);
                break;
            case "regnode":
                var i,
                    tempreg;
                tempreg=registry;
                for(i=0;i<regpath.length-1;i++){
                    tempreg = tempreg[regpath[i]];
                }
                currentreg = tempreg;
                regpath.pop();
                if(regpath.length === 0){
                    inRegistry = false;
                    setRegistry();
                    registry = null;
                }
                break;
            case "value":
                if(inValue){
                    inValue = false;
                }
                else{
                    console.log("bugl207");
                }
                break;
            case "attribute":
                closeNode(false);
                break;
            case "atom":
                closeNode(false);
                break;
            case "connection":
                closeNode(true);
                break;
            case "connpoint":
                /*nothing to do*/
                break;
            case "set":
                closeNode(false);
                break;
            case "model":
                closeNode(false);
                break;
            default:
            //console.log(JSON.stringify(node));
        }
    });

    saxStream.on("end",function(){
        CORE.persist(currentNode,function(err){
            printRegistries();
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
