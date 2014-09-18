var webGME = require('../../../../webgme.js'),
    cli = require('commander'),
    CONFIG = webGMEGlobal.getConfig(),
    TASYNC = require('../tasync.js'),
    FS = require('fs'),
    sConfig = {
        host: CONFIG.mongoip,
        port: CONFIG.mongoport,
        database: CONFIG.mongodatabase,
        log:{
            error: function(){},
            debug: function(){}
        }
    },
    database = webGME.serverUserStorage(sConfig),
    project = null,
    testProjectName = "__test__"+new Date().getTime(),
    core = null,
    commit,
    oldcommit,
    inputProject,
    outputProject,
    root = null,
    rootHash,
    inputScript,
    guidToPath = {},
    pathToGuid = {};

var execute = function(){
        openDatabase();
    },
    openDatabase = function(){
        database.openDatabase(function(err){
            if(err){
                errorDuringTest(err);
            } else {
                importInitialProject();
            }
        });
    },
    importInitialProject = function(){
        console.log('importing initial project');
        try{
            inputProject = JSON.parse(FS.readFileSync(cli.input,'utf8'));
        } catch(e) {
            errorDuringTest(e);
        }
        database.openProject(testProjectName,function(err,p) {
            if (err || !p) {
                return errorDuringTest(err || new Error('project not created'));
            }

            project = p;
            core = new webGME.core(project);
            root = core.createNode();
            webGME.serializer.import(core,root,inputProject,function(err,log){
                console.log('importing log:\n '+log);
                if(err){
                    return errorDuringTest(err);
                }
                core.persist(root,function(){
                    oldcommit = commit;
                    rootHash = core.getHash(root);
                    commit = project.makeCommit([oldcommit],rootHash,'initial test project import',function(err){
                        project.setBranchHash('master','',commit,function(err){
                            if(err){
                                return errorDuringTest(err);
                            }

                            console.log('initial project have been imported ',commit);
                            runScriptOnProject();
                        });
                    });
                });
            });
        });
    },
    buildConversionMap = function(node,callback){
        var children,
            loadNextChildSubTree = function(index){
                if(index<children.length){
                    buildConversionMap(children[index],function(err){
                        if(err){
                            return callback(err);
                        }

                        loadNextChildSubTree(index+1);
                    });
                } else {
                    callback(null);
                }
            };

        guidToPath[core.getGuid(node)] = core.getPath(node);
        pathToGuid[core.getPath(node)] = core.getGuid(node);
        core.loadChildren(node,function(err,c){
            if(err){
                return callback(err);
            }

            children = c;
            loadNextChildSubTree(0);
        });
    },
    runScriptOnProject = function(){
        console.log('executing test script');
        buildConversionMap(root,function(err){
            if(err){
                return errorDuringTest(err);
            }

            console.log(guidToPath,pathToGuid);

            try{
                inputScript = JSON.parse(FS.readFileSync(cli.script,'utf8')) || [];
            } catch(e) {
                errorDuringTest(e);
            }

            var error = null,
                index = 0,
                eCommand = function(){
                    if(index < inputScript.length){
                        executeScriptCommand(inputScript[index],eExecuted);
                    } else {
                        if(error){
                            return errorDuringTest(error);
                        }

                        //TODO we should run the check first
                        core.persist(root,function(){
                            oldcommit = commit;
                            rootHash = core.getHash(root);
                            commit = project.makeCommit([oldcommit],rootHash,'initial test project import',function(err){
                                project.setBranchHash('master',oldcommit,commit,function(err){
                                    if(err){
                                        return errorDuringTest(err);
                                    }

                                    console.log('script have been executed',commit);
                                    checkProject();
                                });
                            });
                        });
                    }
                },
                eExecuted = function(err){
                    error = error || err;
                    index++;
                    eCommand();
                };

            eCommand();
        });
    },
    executeScriptCommand = function(commandObject,callback){
        var _callback = callback;
        callback = function(err){
            console.log('command executed with result:',err);
            _callback(err);
        };
        console.log('executing script command ',commandObject);
        switch (commandObject.command){
            case 'create node':
                var parent,base,
                    needed = 2,
                    error = null,
                    newnode,
                    allReady = function(){
                        if(error){
                            return callback(error);
                        }
                        newnode = core.createNode({parent:parent,base:base,guid:commandObject.guid});
                        pathToGuid[core.getPath(newnode)] = core.getGuid(newnode);
                        guidToPath[core.getGuid(newnode)] = core.getPath(newnode);
                        callback(null);
                    };
                core.loadByPath(root,guidToPath[commandObject.parent],function(err,p){
                    if(err || !p){
                        error = error || err || new Error('parent does not exists in the project')
                    }
                    parent = p;
                    if(--needed === 0){
                        allReady();
                    }
                });
                core.loadByPath(root,guidToPath[commandObject.base],function(err,b){
                    if(err || !b){
                        error = error || err || new Error('base does not exists in the project')
                    }
                    base = b;
                    if(--needed === 0){
                        allReady();
                    }
                });
                break;
        }
    },
    checkProject = function(){
        console.log('check result of the test');
        webGME.serializer.export(core,root,function(err,resultProject){
            if(err || !resultProject){
                return errorDuringTest(err || new Error('json object does not generated'));
            }

            try{
                outputProject = JSON.parse(FS.readFileSync(cli.output,'utf8'));
            } catch(e) {
                errorDuringTest(e);
            }


            if(webGME.canon.stringify(outputProject.nodes) === webGME.canon.stringify(resultProject.nodes)){
                console.log('the test was successfull!!!');
                cleanAndEndTest();
            } else {
                errorDuringTest(new Error('there is a mismatch between the result and the expected output!!! - failed'));
            }


        });
    },
    errorDuringTest = function(error){
        if(project){
            database.deleteProject(testProjectName);
        }
        database.closeDatabase(function(err){
            throw error;
        });
    },
    cleanAndEndTest = function(){
        if(project){
            database.deleteProject(testProjectName,function(err){});
        }
        database.closeDatabase(function(err){
        });
    };

//the Command Line Interface setup
cli
    .version('0.0.1')
    .option('-i, --input [string]', 'Input project json')
    .option('-s, --script [string]', 'Test script json')
    .option('-o, --output [string]', 'The expected output of the test')
    .parse(process.argv);

execute();
