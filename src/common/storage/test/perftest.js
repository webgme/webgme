/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

/*
 * The purpose of this test it to check the speed and test the load
 * of the storage
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "../..",
    paths: {
    }
});

requirejs([
    "util/guid",
    "storage/socketioserver",
    "storage/local",
    "storage/failsafe",
    "storage/socketioclient"],
    function(
        GUID,
        SERVER,
        LOCAL,
        FS,
        CLIENT){

        var testport = 6666,
            numOfReader = 10,
            numOfWriter = 1,
            runningTime = 10000;
        var database = new FS(new CLIENT({
            host: 'http://localhost',
            port: testport,
            timeout: 60000,
            type: 'node'
        }),
            {}),
            server = new SERVER(new LOCAL({
                database: "smoketest",
                timeout: 10000,
                local: "memory"
            }),
                {
                    port:testport
                }),
            objectData = "01010101010101010101010111",
            storage = [],
            errors = [],
            numOfReads = 0,
            numOfWrites = 0;


        function readClient(numbOfParallelReads,runningTime,callback){
            var project = null,
                canContinue = true,
                runningReads = 0;
            function readObject(err,object){
                numOfReads++;
                if(err){
                    errors.push(err);
                }
                if(canContinue){
                    var hash = "#"+storage[Math.floor((Math.random()*(storage.length-1))+1)];
                    project.loadObject(hash,readObject);
                } else {
                    if(--runningReads === 0){
                        callback();
                    }
                }
            }

            database.openProject("smoketest",function(err,p){
                if(err){
                    callback(err);
                } else {
                    project = p;
                    runningReads = numbOfParallelReads;
                    setTimeout(function(){
                        canContinue = false;
                    },runningTime);
                    for(var i=0;i<numbOfParallelReads;i++){
                        readObject(null,null);
                    }
                }
            });
        }

        function writeClient(nusOfParallelWrites,runningTime,callback){
            var project = null,
                canContinue = true,
                runningReads = 0;
            function writeObject(err){
                numOfWrites++;
                if(err){
                    errors.push(err);
                }
                if(canContinue){
                    var id = storage.length+""+Math.floor(Math.random()*1000000+1);
                    storage.push(id);
                    var object = {_id:"#"+id,data:objectData};
                    project.insertObject(object,writeObject);
                } else {
                    if(--runningReads === 0){
                        callback();
                    }
                }
            }

            database.openProject("smoketest",function(err,p){
                if(err){
                    callback(err);
                } else {
                    project = p;
                    runningReads = nusOfParallelWrites;
                    setTimeout(function(){
                        canContinue = false;
                    },runningTime);
                    for(var i=0;i<nusOfParallelWrites;i++){
                        writeObject(null);
                    }
                }
            });
        }

        function initTest(callback){
            database.openDatabase(function(err){
                if(err){
                    throw new Error('initTest failed');
                } else {
                    callback();
                }
            });
        }

        function endTest(){
            server.close();
            console.log(errors);
            console.log('metrics: #reads:',numOfReads,"#writes",numOfWrites,"#errors",errors.length);
            process.exit(0);
        }


        //start
        server.open();
        initTest(function(){
            var readercount = numOfReader,
                writercount = numOfWriter;
            for(var i=0;i<numOfWriter;i++){
                writeClient(1000,runningTime,function(){
                    console.log('writer stopped');
                });
            }
            for(i=0;i<numOfReader;i++){
                readClient(1000,runningTime,function(){
                    console.log('reader stopped');
                    if(--readercount === 0){
                        endTest();
                    }
                });
            }
        });

    });

