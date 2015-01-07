/**
 * Created by tkecskes on 1/6/2015.
 */
define([
  './sha1',
  './zssha1',
  './assert',
  './canon',
  './asmcryptosha1' //->asmCrypto
],function(SHA1,ZS,ASSERT,CANON){

  var keyType = null;
  var ZSSHA = new ZS();
  function rand320Bits(){
    //#4ca8ccec576284f66055d9f6c1a571d48a70902c
    var result = "", i,code;
    for (i = 0; i < 40; i++) {
      code = Math.floor(Math.random() * 16);
      code = code > 9 ? code+87 : code+48;
      result += String.fromCharCode(code);
    }
    return result;
  }
  return function KeyGenerator(object){
    if(keyType === null){
      //TODO setting the type of the key
      //keyType = 'plainSHA1';
      keyType = 'asmSHA1';
    }

    ASSERT(typeof keyType === 'string');

    switch (keyType){
      case 'rand320Bits':
        return rand320Bits();
        break;
      case 'asmSHA1':
        return asmCrypto.SHA1.hex(CANON.stringify(object));
        break;
      case 'ZSSHA':
        return ZSSHA.getHash(CANON.stringify(object));
      default: //plainSHA1
        return SHA1(CANON.stringify(object));
        break;
    }
  }
});