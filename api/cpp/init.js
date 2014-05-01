var Fiber = require("fibers");
var addon = require('./build/Release/interpreter');

var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + "/../..",
});

requirejs([
    "util/common",
    "core/tasync"
],  
function(COMMON, TASYNC){

    TASYNC.call_sync = function(){
        var fiber = Fiber.current;
        //console.log("Debug Tasync: " + arguments.length);
        //var done = TASYNC.call.apply(null,arguments); // Note: This is not the same as TASYNC.apply
        var args = Array.prototype.slice.call(arguments);
        var func = args.shift();
        //console.log("Func: ")
        //console.log(func)
        var that = args.pop();
        //console.log("That: ")
        //console.log(that)
        //console.log("Args: " + args.length)
        var done = TASYNC.apply(func, args, that);
        // Check if returned value is a TASYNC future
        if (TASYNC.isFuture(done)){
            //console.log("Returned from " + arguments[0].name + " is a future")
            TASYNC.call(function(val){
                done = val;
                //console.log(done);
                fiber.run();
            }, done);
            Fiber.yield();
        }
        return done;
    };


    var AddonFiber = Fiber(function(){
        TASYNC.call_sync(COMMON.openDatabase);
        TASYNC.call_sync(COMMON.openProject);

        var interp = new addon.Interpreter(COMMON, TASYNC);

        // Launch interpreter
        TASYNC.call_sync(interp.invokeEx,[], interp);

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

