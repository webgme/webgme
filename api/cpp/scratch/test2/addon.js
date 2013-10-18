var addon = require('./build/Release/addon');

function testcallback(callback, t){
    setTimeout(callback, t);
}

console.log("Called now")
addon(testcallback);
testcallback(function(){console.log("Called later")}, 1000);
