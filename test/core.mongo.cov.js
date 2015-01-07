/**
 * Created by tamas on 12/31/14.
 */
//these test intended to increase the test coverage on mongo module
require('./_globals.js');
var WebGME = require('../webgme'),
  FS = require('fs'),
  storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi'}),
  requirejs = require('requirejs');
CANON = requirejs('../src/common/util/canon');

describe('Core#Mongo#Coverage',function(){
  it('fails to connect to database',function(done){
    this.timeout(20000);
    storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:110011,database:'multi'});
    storage.openDatabase(function(err){
      if(!err){
        done(new Error('connection should have been failed'));
      }
      done();
    });
  });
  it('try double database closing',function(done){
    storage = new WebGME.serverUserStorage({host:'127.0.0.1',port:27017,database:'multi'});
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