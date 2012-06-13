var objects = {},
    mongoobjects,
    myarguments = process.argv.splice(" "),
    readMongo;
readMongo = function(){
    var MONGO = require('mongodb');
    var DB = new MONGO.Db(myarguments[2], new MONGO.Server('localhost', 27017, {},{}));

    /*main*/
    DB.open(function(){
        DB.collection(myarguments[3],function(err,result){
            if(err){
                console.log("something wrong with the given branch!!!");
                process.exit();
            }
            else{
                mongoobjects = result;
                mongoobjects.find({}).toArray(function(err,items){
                    var i;
                    if(err){
                        console.log("unable to get objects!!!");
                        process.exit(0);
                    }
                    else{
                        for(i=0;i<items.length;i++){

                            objects[items[i]._id] = items[i].object;
                        }
                        require('fs').writeFileSync(myarguments[2]+"_"+myarguments[3]+".tpf",JSON.stringify(objects),"utf8");
                        process.exit(0);
                    }
                });
            }
        });
    });
};

/*main*/
if(myarguments.length !== 4){
    console.log("usage: file2mongo projectname branchname");
    process.exit(0);
}

readMongo();
