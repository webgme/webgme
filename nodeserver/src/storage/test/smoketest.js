/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

/*
 * The purpose of this test it to check the basic functionality of storage.
 * It should always use as many layers as possible and should run in node.
 * It should be a single point to run as test so it should start both
 * the server and the client sides.
 */

var requirejs = require("requirejs");

requirejs.config({
    nodeRequire: require,
    baseUrl: "../..",
    paths: {
    }
});

requirejs([
    "storage/socketioserver",
    "storage/local",
    "storage/failsafe",
    "storage/socketioclient"],
    function(
        SERVER,
        LOCAL,
        FS,
        CLIENT){

        var server = null,
            clientOne = null,
            clientTwo = null,
            firstSetObjects = [
                {_id:'#0',data:"one"},
                {_id:'#1',data:"two"},
                {_id:'#2',data:"three"},
                {_id:'#3',data:"four"},
                {_id:'#4',data:"five"},
                {_id:'#5',data:"six"},
                {_id:'#6',data:"seven"},
                {_id:'#7',data:"eight"},
                {_id:'#8',data:"nine"},
                {_id:'#9',data:"ten"}
            ],
            secondSetObjects = [
                {_id:'#00',data:"one"},
                {_id:'#01',data:"two"},
                {_id:'#02',data:"three"},
                {_id:'#03',data:"four"},
                {_id:'#04',data:"five"},
                {_id:'#05',data:"six"},
                {_id:'#06',data:"seven"},
                {_id:'#07',data:"eight"},
                {_id:'#08',data:"nine"},
                {_id:'#09',data:"ten"}
            ];

        server = new SERVER(new LOCAL({
            database: "smoketest",
            timeout: 10000,
            local: "memory"
        }),
            {
                port:888
            });

        server.open();

        clientOne = new FS(new CLIENT({
            host: 'http://localhost',
            port: '888',
            timeout: 10000,
            type: 'node'
        }),
            {});
        clientTwo = new FS(new CLIENT({
            host: 'http://localhost',
            port: '888',
            timeout: 10000,
            type: 'node'
        }),
            {});

        function connectToProject(client,callback){
            client.openDatabase(function(err){
                console.log('connectToProject->openDatabase',err);
                if(!err){
                    client.openProject('smoketest',function(err,project){
                        console.log('connectToProject->openProject',err,project);
                        if(!err && project){
                            callback(project);
                        } else {
                            throw new Error('connectToProject -2- failed');
                        }
                    });
                } else {
                    throw new Error('connectToProject -1- failed');
                }
            });
        }

        function writeObjects(project,objects,callback){
            var counter = objects.length;
            for(var i=0;i<objects.length;i++){
                project.insertObject(objects[i],function(err){
                    console.log('writeObjects->insertObject',err);
                    if(!err){
                        if(--counter === 0){
                            callback();
                        }
                    } else {
                        throw new Error('writeObjects -1- failed');
                    }
                });
            }
        }

        function checkProjectNames(client,reference,callback){
            client.getProjectNames(function(err,names){
                console.log('checkProjectNames->getProjectNames',err,names);
                if(!err && names){
                    if(reference.length === names.length){
                        for(var i=0;i<reference.length;i++){
                            if(reference[i] !== names[i]){
                                throw new Error('checkProjectNames -3- failed');
                            }
                        }
                        callback();
                    } else {
                        throw new Error('checkProjectNames -2- failed');
                    }
                } else {
                    throw new Error('checkProjectNames -1- failed');
                }
            });
        }

        connectToProject(clientOne,function(projectOne){
            writeObjects(projectOne,firstSetObjects,function(){
                checkProjectNames(clientOne,['smoketest'],function(){
                    connectToProject(clientTwo,function(projectTwo){
                        checkProjectNames(clientTwo,['smoketest'],function(){
                           console.log('test succeeded');
                            setTimeout(function(){server.close();throw 'finished';},1000);
                        });
                    });
                });
            });
        });
});
