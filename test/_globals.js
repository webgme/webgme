/**
 * Created by tamas on 1/2/15.
 */
//this file is intended to set testing related global variables no actual tests
global.COVERAGE = false;
global.TESTING = true;

//WebGME goes to global in the tests - it is global anyways
global.WebGME = require('../webgme');


//adding a local storage class to the global Namespace
var requirejs = require('requirejs'),
    Local = requirejs('storage/local'),
    Commit = requirejs('storage/commit');

global.Storage = function Storage(options){
    return  new Commit(new Local(options || {}));
};

//add log library to global
global.Log = requirejs('../src/common/LogManager');
global.Log.setFileLogPath('../test-tmp/testexecution.log');