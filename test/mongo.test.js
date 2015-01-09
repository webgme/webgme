/**
 * Created by tamas on 1/9/15.
 */
//these tests intended to ensure that every used feature of mongodb and its used client is work as expected

describe('MONGO',function(){
  var MONGO = require('mongodb'),
    db,collection,collName = 'mongotest___test',
    fsyncDatabase = function(callback) {

      var error = null;
      var synced = 0;

      /*function fsyncConnection (conn) {
        db.lastError({
          fsync: true
        }, {
          connection: conn
        }, function (err, res) {
          // ignoring the last error, just forcing all commands through
          error = error || err;

          if (++synced === conns.length) {
            callback(error);
          }
        });
      }*/
      function fsyncConnection (conn) {
        db.command({ getLastError: 1 },{connection:conn},
          function(err,result){
            //TODO we ignore the result right now
            error = error || err;
            if (++synced === conns.length) {
              callback(error);
            }
          });
      }

      var conns = db.serverConfig.allRawConnections();
      if (conns instanceof Array && conns.length >= 1) {
        for ( var i = 0; i < conns.length; ++i) {
          fsyncConnection(conns[i]);
        }
      } else {
        callback(new Error("not connected"));
      }
    };
  before(function(done){
    MONGO.MongoClient.connect("mongodb://127.0.0.1/mongotest",{
      'w':1,
      'native-parser':true,
      'auto_reconnect': true,
      'poolSize': 20,
      socketOptions: {keepAlive: 1}
    },function(err,d){
      if(!err && d){
        db = d;

        for(var i in db){
          console.warn('DB - ',i);
        }
        db.collection(collName, function (err, result) {
          if (err) {
            done(err);
          } else {
            collection = result;
            done();
          }
        });
      } else {
        db = null;
        done(err);
      }
    });
  });
  after(function(done){
    db.dropCollection(collName, function (err) {
      db.close(done);
    });
  });
  it('insert some objects and in a parallel insertion uses fsync and checks if really everything is in place',function(done){
    var i,filler="",normalItemCount = 100,error=null,
      addObject = function(index){
        console.warn('object insertion started ',index);
        collection.insert({data:filler},function(err){
          console.warn('object insertion returned ',index);
          error = error ||err;
          if(--normalItemCount === 0){
            finishedAll();
          }
        });
      },
      finishedAll = function(){
        done(error);
      };
    for(i=0;i<1000;i++){
      filler+=String.fromCharCode(Math.floor(Math.random()*255));
    }

    for(i=0;i<99;i++){
      addObject(i);
    }
    fsyncDatabase(function(err){
      error = error || err;
      collection.insert({data:filler,extra:'should be the last element'},function(err){
        error = error || err;
        if(--normalItemCount !== 0){
          error = new Error('fsync not functioning!!! '+normalItemCount);
        } else {
          finishedAll();
        }
      });
    });
  });
  it('insert some object paralelly then checks if the order really gets mixed',function(done){
    var i,filler="",normalItemCount = 101,error=null,
      addObject = function(index){
        console.warn('object insertion started ',index);
        collection.insert({data:filler},function(err){
          console.warn('object insertion returned ',index);
          error = error ||err;
          if(--normalItemCount === 0){
            finishedAll();
          }
        });
      },
      finishedAll = function(){
        done(error);
      };
    for(i=0;i<1000;i++){
      filler+=String.fromCharCode(Math.floor(Math.random()*255));
    }

    for(i=0;i<100;i++){
      addObject(i);
    }
    console.warn('special start');
    collection.insert({data:filler,extra:'should get a mixed order'},function(err){
      console.warn('special finished');
      error = error || err;
      if(--normalItemCount === 0){
        error = new Error('insertions do not get mixed'+normalItemCount);
        finishedAll();
      }
    });
  });
});