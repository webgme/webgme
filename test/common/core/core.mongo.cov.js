/**
 * Created by tamas on 12/31/14.
 */
//these test intended to increase the test coverage on mongo module
require('../../_globals.js');

describe('Core#Mongo#Coverage',function(){
    var FS = require('fs'),
        storage = new global.WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi',log:global.Log.create('mongoLog')}),
        requirejs = require('requirejs'),
        CANON = requirejs('../src/common/util/canon');

  it('fails to connect to database',function(done){
    this.timeout(20000);
    storage = new global.WebGME.serverUserStorage({host:'127.0.0.1',port:65535,database:'multi',log:global.Log.create('mongoLog')});
    storage.openDatabase(function(err){
      if(!err){
        done(new Error('connection should have been failed'));
      }
      done();
    });
  });
  it('try double database closing',function(done){
    storage = new global.WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi',log:global.Log.create('mongoLog')});
    storage.openDatabase(function(err){
      if(err){
        return done(err);
      }
      storage.closeDatabase(function(err){
        if(err){
          return done(err);
        }
        storage.closeDatabase(done);
      });
    });
  });
});
