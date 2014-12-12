/**
 * Created by tkecskes on 12/12/2014.
 */

var WebGME = require('../webgme');

describe('Core',function(){
  describe('.Basic',function(){
    describe('.Connect',function(){
      it('should fail to connect to nonexistent db', function(done){
        var config = webGMEGlobal.getConfig(),
          my = new WebGME.serverUserStorage({host:'118.119.120.121',port:'6789',database:'none'});
        try{
          my.openDatabase(function(err){
            console.log(err);
            if(!err){
              done(new Error('no failure!!!'));
            } else {
              console.log(err);
              done();
            }
          });
        } catch(e) {
          console.log(e);
          done();
        }

      });
    });
  });
});