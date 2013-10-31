var Fiber = require("fibers");
var addon = require('./build/Release/addon');

var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/../../../..",
});

requirejs([
    "util/common",
    "core/tasync"
],  
function(COMMON, TASYNC){

    TASYNC.call_sync = function(){
        var fiber = Fiber.current;
        var done = TASYNC.call.apply(null,arguments);
        // Check if returned value is a TASYNC future
        if (TASYNC.isFuture(done)){
            //console.log("Returned from " + arguments[0] + " is a future")
            TASYNC.call(function(val){
                done = val;
                //console.log(done);
                fiber.run();
            }, done);
            Fiber.yield();
        }
        return done;
    };


    //TASYNC.debugcall = function(){
    //  console.log("Debug Tasync: " + arguments.length);
    //  //for(var i=0; i < arguments.length ; i++){
    //  //  console.log(arguments[i]);
    //  //}
    //  return TASYNC.call(arguments[0], arguments[1]);
    //}

    var AddonFiber = Fiber(function(){
        TASYNC.call_sync(COMMON.openDatabase);
        TASYNC.call_sync(COMMON.openProject);

        var interp = new addon.Interpreter(COMMON, TASYNC);

        // Launch interpreter
        TASYNC.call_sync(interp.invokeEx);

        TASYNC.call_sync(COMMON.closeProject);
        COMMON.closeDatabase();
    });

    function startFiber(){
        AddonFiber.run()
    }

    TASYNC.trycatch(startFiber, function (error) {
        console.log("Error caught");
        console.log(error.trace || error.stack);

        COMMON.setProgress(null);
        COMMON.closeProject();
        COMMON.closeDatabase();
    });
});

