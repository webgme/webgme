var io = require('socket.io').listen(888);
var MONGO = require('mongodb');


io.sockets.on('connection', function (socket) {
    var idregexp = new RegExp("^[#0-9a-zA-Z_]*$");
    var database = null;
    var collection = null;
    socket.on('open', function (callback) {
        database = new MONGO.Db('test', new MONGO.Server('129.59.104.16',27017));
        var abort = function (err) {
            self.database.close();
            self.database = null;
            callback(err);
        };

        database.open(function (err1) {
            if( err1 ) {
                abort(err1);
            }
            else {
                database.collection('storage', function (err2, result) {
                    if( err2 ) {
                        abort(err2);
                    }
                    else {
                        collection = result;
                        callback(null);
                    }
                });
            }
        });
    });
    socket.on('load',function(key,callback){
        collection.findOne({
            _id: key
        }, callback);
    });
    socket.on('save',function(node,callback){
        collection.save(node, callback);
    });
    socket.on('remove',function(key,callback){
        collection.remove({
            _id: key
        }, callback);
    });
    socket.on('close',function(callback){
        database.lastError({
            fsync: true
        }, function (err, data) {
            database.close(function () {
                collection = null;
                database = null;
                if( callback ) {
                    callback();
                }
            });
        });
    });
    socket.on('removeAll',function(callback){
        collection.remove(function(err){
            callback(err);
        });
    });
    socket.on('searchId',function(beginning,callback){
        if( !idregexp.test(beginning) ) {
            callback("mongodb id " + beginning + " not valid");
        }
        else {
            collection.find({
                _id: {
                    $regex: "^" + beginning
                }
            }, {
                limit: 2
            }).toArray(function (err, docs) {
                    if( err ) {
                        callback(err);
                    }
                    else if( docs.length === 0 ) {
                        callback("mongodb id " + beginning + " not found");
                    }
                    else if( docs.length !== 1 ) {
                        callback("mongodb id " + beginning + " not unique");
                    }
                    else {
                        callback(null, docs[0]._id);
                    }
                });
        }
    });
    socket.on('dumpAll',function(callback){
        collection.find().each(function (err, item) {
            if( err || item === null ) {
                callback(err);
            }
            else {
                console.log(item);
            }
        });
    })
});
