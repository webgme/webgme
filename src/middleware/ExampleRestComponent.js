define(['logManager'],function(logManager){
    //here you can define global variables for your middleware
    var counter = 0,
        gmeConfig, //global config is passed by standaloneserver.js
        logger = logManager.create('exampleRExtraST'); //how to define your own logger which will use the global settings
    var exampleRExtraST = function(req,res,next){
        counter++;
        if(counter%10){
            logger.info(JSON.stringify(config,null,2));
        }

        //next should be always called / the response should be sent otherwise this thread will stop without and end
        res.send(200);
    };
    var setup = function (_gmeConfig) { //it has to be done this way, but this is probably a placeholder for later option parameters...
        gmeConfig = _gmeConfig;
        return exampleRExtraST;
    };
    return setup;
});

