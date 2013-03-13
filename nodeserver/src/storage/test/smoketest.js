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
    "storage/socketioclient",
    "storage/cache",
    "storage/log"],
    function(
        SERVER,
        LOCAL,
        FS,
        CLIENT,
        CACHE,
        LOG){

        var testport = 6666,
            server = null,
            clientOne = null,
            clientTwo = null,
            projectOne = null,
            projectTwo = null,
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

        server = new SERVER(
                    new CACHE(
                        new LOG(
                            new LOCAL({
                                        database: "smoketest",
                                        timeout: 10000,
                                        local: "memory"
                                        }),
                            {}),
                        {}),
                    {
                        port:testport
                    });

        server.open();

        clientOne = new FS(
                        new CACHE(
                            new CLIENT({
                                        host: 'http://localhost',
                                        port: testport,
                                        timeout: 60000,
                                        type: 'node'
                                        }),
                            {}),
                        {});
        clientTwo = new FS(new CLIENT({
            host: 'http://localhost',
            port: testport,
            timeout: 60000,
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

        function checkFsync(object,callback){
            object.fsyncDatabase(function(err){
                console.log('checkFsync->fsyncDatabase',err);
                if(!err){
                    callback();
                } else {
                    throw new Error('checkFsync -1- failed');
                }
            });
        }

        function checkServerClose(object,callback){
            object.getDatabaseStatus(null,function(err,oldstatus){
                console.log('checkServerClose->getDatabaseStatus-1-',err,oldstatus);
                if(!err && oldstatus){
                    if(oldstatus.indexOf('discon') === -1){
                        var canGoOn = false;
                        object.getDatabaseStatus(oldstatus,function(err,newstatus){
                            console.log('checkServerClose->getDatabaseStatus',err,newstatus);
                            if(!err && newstatus && newstatus !== oldstatus){
                                canGoOn = true;
                                setTimeout(callback,2000);
                            } else {
                                throw new Error('checkServerClose -4- failed');
                            }
                        });
                        server.close();
                        setTimeout(function(){
                            if(!canGoOn){
                                throw new Error('checkServerClose -3- failed');
                            }
                        },10000);

                    } else {
                        throw new Error('checkServerClose -2- failed');
                    }
                } else {
                    throw new Error('checkServerClose -1- failed');
                }
            });
        }

        function checkServerReopen(object,callback){
            object.getDatabaseStatus(null,function(err,oldstatus){
                console.log('checkServerReopen->getDatabaseStatus-1-',err,oldstatus);
                if(!err && oldstatus){
                    if(oldstatus.indexOf('discon') !== -1){
                        var canGoOn = false;
                        object.getDatabaseStatus(oldstatus,function(err,newstatus){
                            console.log('checkServerReopen->getDatabaseStatus',err,newstatus);
                            if(!err && newstatus && newstatus !== oldstatus){
                                canGoOn = true;
                                setTimeout(callback,1000);
                            } else {
                                throw new Error('checkServerReopen -4- failed');
                            }
                        });
                        server.open();
                        setTimeout(function(){
                            if(!canGoOn){
                                throw new Error('checkServerReopen -3- failed');
                            }
                        },60000);

                    } else {
                        throw new Error('checkServerReopen -2- failed');
                    }
                } else {
                    throw new Error('checkServerReopen -1- failed');
                }
            });
        }

        function checkObjects(project,objects,callback){
            var count = objects.length;
            function load(index){
                project.loadObject(objects[index]._id,function(err,object){
                    console.log('checkObjects->loadObject',index,err,object);
                    if(!err && object){
                        if(JSON.stringify(object) === JSON.stringify(objects[index])){
                            if(--count === 0){
                                callback();
                            }
                        } else {
                            throw new Error('checkObjects -2- failed');
                        }
                    } else {
                        throw new Error('checkObjects -1- failed');
                    }
                });
            }
            for(var i=0;i<objects.length;i++){
                load(i);
            }
        }

        function endTest(){
            console.log('successfully ending testing');
            setTimeout(function(){
                server.close();
                process.exit(0);
            },1000);
        }

        function basicConnectionTest(callback){
            connectToProject(clientOne,function(p){
                projectOne = p;
                writeObjects(projectOne,firstSetObjects,function(){
                    checkProjectNames(clientOne,['smoketest'],function(){
                        connectToProject(clientTwo,function(p){
                            projectTwo = p;
                            checkProjectNames(clientTwo,['smoketest'],function(){
                                checkFsync(clientOne,function(){
                                    checkFsync(clientTwo,function(){
                                        checkFsync(projectOne,function(){
                                            checkFsync(projectTwo,function(){
                                                checkObjects(projectOne,firstSetObjects,function(){
                                                    callback();
                                                });
                                            });
                                        });
                                    });
                                });
                            });
                        });
                    });
                });
            });
        }

        function basicServerRestartTest(callback){
            checkServerClose(clientOne,function(){
                writeObjects(projectTwo,secondSetObjects,function(){
                    projectOne.loadObject(secondSetObjects[0]._id,function(err,object){
                        console.log('basicServerCloseTest->loadObject->1',err,object);
                        if(err.indexOf('discon') !== -1){
                            checkServerReopen(projectTwo,function(){
                                projectOne.loadObject(secondSetObjects[0]._id,function(err,object){
                                    console.log('basicServerRestartTest->loadObject->2',err,object);
                                    if(!err && object){
                                        callback();
                                    } else {
                                        throw new Error('basicServerRestartTest->loadObject->2 failed');
                                    }
                                });
                            });
                        } else {
                            throw new Error('basicServerRestartTest->loadObject->1 failed');
                        }
                    });
                });
            });
        }

        function basicConnectedTest(callback){
            checkObjects(projectOne,firstSetObjects,function(){
                checkObjects(projectOne,secondSetObjects,function(){
                    checkObjects(projectTwo,firstSetObjects,function(){
                        checkObjects(projectTwo,secondSetObjects,function(){
                            callback();
                        });
                    });
                });
            });
        }

        function basicBranchTesting(callback){
            var branch = "*smoketest";
            projectOne.setBranchHash(branch,"",firstSetObjects[0]._id,function(err){
                console.log('basicBranchTesting->setBranchHash->1',err);
                if(!err){
                    projectOne.getBranchHash(branch,"",function(err,newhash){
                        console.log('basicBranchTesting->getBranchHash->1',err,newhash);
                        if(!err && newhash){
                            if(newhash === firstSetObjects[0]._id){
                                projectOne.getBranchNames(function(err,names){
                                    console.log('basicBranchTesting->getBranchNames->1',err,names);
                                    if(!err && names){
                                        if(names.length === 1 && names[0] === branch){
                                            projectOne.getBranchHash(branch,firstSetObjects[0]._id,function(err,newhash){
                                                console.log('basicBranchTesting->getBranchHash->2',err,newhash);
                                                if(!err && newhash){
                                                    if(newhash === firstSetObjects[1]._id){
                                                        projectOne.setBranchHash(branch,firstSetObjects[1]._id,"",function(err){
                                                            console.log('basicBranchTesting->setBranchHash->3',err);
                                                            if(!err){
                                                                projectTwo.getBranchNames(function(err,names){
                                                                    console.log('basicBranchTesting->getBranchNames->2',err,names);
                                                                    if(!err && names){
                                                                        if(names.length === 0){
                                                                            callback();
                                                                        } else {
                                                                            throw new Error('basicBranchTesting -11- failed');
                                                                        }
                                                                    } else {
                                                                        throw new Error('basicBranchTesting -10- failed');
                                                                    }
                                                                });
                                                            } else {
                                                                throw new Error('basicBranchTesting -9- failed');
                                                            }
                                                        });
                                                    } else {
                                                        throw new Error('basicBranchTesting -8- failed');
                                                    }
                                                } else {
                                                    throw new Error('basicBranchTesting -7- failed');
                                                }
                                            });
                                            projectTwo.setBranchHash(branch,firstSetObjects[0]._id,firstSetObjects[1]._id,function(err){
                                                console.log('basicBranchTesting->setBranchHash->2',err);
                                                if(!err){
                                                    //nothing to do we wait for return with the other client
                                                } else {
                                                    throw new Error('basicBranchTesting -6- failed');
                                                }
                                            });
                                        } else {
                                            throw new Error('basicBranchTesting -5- failed');
                                        }
                                    } else {
                                        throw new Error('basicBranchTesting -4- failed');
                                    }
                                });
                            } else {
                                throw new Error('basicBranchTesting -3- failed');
                            }
                        } else {
                            throw new Error('basicBranchTesting -2- failed');
                        }
                    });
                } else {
                    throw new Error('basicBranchTesting -1- failed');
                }
            });
        }

        function testEnding(callback){
            projectOne.closeProject(function(err){
                console.log('testEnding->closeProject->1',err);
                if(!err){
                    projectOne = null;
                    projectTwo.closeProject(function(err){
                        console.log('testEnding->closeProject->2',err);
                        if(!err){
                            projectTwo = null;
                            clientOne.closeDatabase(function(err){
                                console.log('testEnding->closeDatabase->1',err);
                                if(!err){
                                    clientTwo.deleteProject('smoketest',function(err){
                                        console.log('testEnding->deleteProject',err);
                                        if(!err){
                                            clientTwo.closeDatabase(function(err){
                                                console.log('testEnding->closeDatabase->2',err);
                                                if(!err){
                                                    callback();
                                                } else {
                                                    throw new Error('testEnding -5- failed');
                                                }
                                            });
                                        } else {
                                            throw new Error('testEnding -4- failed');
                                        }
                                    });
                                } else {
                                    throw new Error('testEnding -3- failed');
                                }
                            });
                        } else {
                            throw new Error('testEnding -2- failed');
                        }
                    });
                } else {
                    throw new Error('testEnding -1- failed');
                }
            });
        }

        function testOne(callback){
            //connecting two clients having a server restart...
            basicConnectionTest(function(){
                basicServerRestartTest(function(){
                    basicConnectedTest(function(){
                        testEnding(function(){
                            console.log('***testOne succeeded***');
                            callback();
                        });
                    });
                });
            });
        }

        function testTwo(callback){
            basicConnectionTest(function(){
                basicBranchTesting(function(){
                    testEnding(function(){
                        console.log('***testTwo succeeded***');
                        callback();
                    });
                });
            });
        }


        testOne(function(){
            testTwo(function(){
                endTest();
            });
        });
});
