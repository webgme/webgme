/*this module will contain the storage functions, now it is based on mongodb*/
var Db = require('mongodb').Db;
var Server = require('mongodb').Server;

Storage = function(){
	this.db = new Db('mongo-webgme-storage', new Server('localhost', 27017, {auto_reconnect:true},{}));
	var self = this;
	this.db.open(function(){});
};

Storage.prototype.getCollection = function(name, callback){
	this.db.collection(name, function(err,result){
		if(err){
			callback(err);
		}
		else{
			callback(null,result);
		}
	});
};
Storage.prototype.put = function(hash,object,callback){
	this.getCollection('objects', function(err,result){
		if(err){
			callback();
		}
		else{
			var dbobj={};dbobj._id=hash;dbobj.object=object;
			result.save(dbobj, callback);
		}
	});
};

Storage.prototype.get = function(hash,callback){
	this.getCollection('objects', function(err,result){
		if(err){
			callback(undefined);
		}
		else{
			result.findOne({_id:hash},function(err, res){
				if(err){
					callback(undefined);
				}
				else{
					callback(res.object);
				}
			});
		}
	});
};

Storage.prototype.putRoot = function(hash, callback){
	this.put("root",hash,callback);
};

Storage.prototype.getRoot = function(callback){
	var self = this;
	this.get("root", function(result){
		self.get(result, function(root){
			callback(root);
		});
	});
};

exports.Storage = Storage;
