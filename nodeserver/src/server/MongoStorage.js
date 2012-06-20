define(['mongodb','CommonUtil'],function(MONGO,commonUtil){
    var Storage = function(project,branch){
        var objects,
            DB = new MONGO.Db(project, new MONGO.Server(commonUtil.MongoDBLocation, commonUtil.MongoDBPort, {},{}));

        var get = function(id,cb){
            if(objects){
                objects.findOne({"_id":id},function(err,result){
                    if(err){
                        cb(err);
                    }
                    else{
                        cb(null,result.object);
                    }
                });
            }
            else{
                cb(1);
            }
        };
        var getAll = function(cb){
            if(objects){
                objects.find().toArray(function(err, items) {
                    cb(err,items);
                });
            }
            else{
                cb(1,undefined);
            }
        };
        var set = function(id,object,cb){
            if(objects){
                objects.save({"_id":id,object:object},function(err){
                    cb(err);
                });
            }
            else{
                cb(1);
            }
        };
        var del = function(id,cb){
            if(objects){
                objects.save({"_id":id,object:null},function(err){
                    cb(err);
                });
            }
            else{
                cb(1);
            }
        };
        var save = function(){
            /*TODO: currently there is no need as every change have been stored to mongo, later maybe it will have some meaning*/
        };
        var print = function(){
            /*TODO: should remove this function from storage API*/
        };

        DB.open(function(){
            DB.collection(branch,function(err,result){
                if(err){
                    logger.error("Storage cannot open given branch "+branch);
                }
                else{
                    objects = result;
                }
            });
        });

        return {
            get:get,
            set:set,
            del:del,
            print:print,
            save:save
        };
    };
    return Storage;
});
