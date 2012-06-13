var i,
    myarguments = process.argv.splice(" "),
    objects = {},
    file,
    objectcount,
    objectWritten,
    createMongo,
    createMongoObject;

objectWritten = function(){
    if(--objectcount === 0){
        process.exit(0);
    }
};
createMongoObject = function(id){
    mongoobjects.save({_id:id,object:objects[id]},function(err){
        if(err){
            console.log("saving object "+id+" failed!!! ["+err+"]");
            process.exit();
        }
        else{
            objectWritten();
        }
    });
};
createMongo = function(){
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
                mongoobjects.remove(function(err){
                    var i;
                    if(err){
                        console.log("something wrong with the given branch!!!");
                        process.exit();
                    }
                    else{
                        for(i in objects){
                            createMongoObject(i);
                        }
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

file = require('fs').readFileSync(myarguments[2]+"_"+myarguments[3]+".tpf");
if(file){
    objects = JSON.parse(file);
}
else{
    console.log("the mentioned project and branch doesn't exists among the projectfiles!!!");
    process.exit(0);
}

objectcount = 0;
for(i in objects){
    objectcount++;
}
createMongo();



