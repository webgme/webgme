define(['mongodb','./../common/CommonUtil'],function(MONGO,commonUtil){
    var KEY ="_id";
    var Storage = function(project,branch){
        var objects = null,
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
                    var i,
                        retval;
                    retval={};
                    for(i=0;i<items.length;i++){
                        retval[items[i][KEY]] = items[i].object;
                    }
                    cb(err,retval);
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
        var open = function(callback){
            if(objects === null){
                setTimeout(function(){
                    callback(null);
                },2000);
            }
            else{
                callback(null);
            }
        };
        var removeAll = function(callback){
            objects.remove(function(err){
                callback(err);
            });
        };
        var opened = function(){
            if(objects === null){
                return false;
            }
            return true;
        };
        var close = function(){
            /*TODO the opening closing functions should be implemented correctly*/
            return;
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
            get       : get,
            getAll    : getAll,
            set       : set,
            del       : del,
            print     : print,
            save      : save,
            open      : open,
            removeAll : removeAll,
            opened    : opened,
            close     : close
        };
    };
    return Storage;
});
