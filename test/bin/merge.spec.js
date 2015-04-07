/* jshint node:true, mocha:true */
/**
 * @author kecso / https://github.com/kecso
 */

var testFixture = require('../_globals.js'),
    gmeConfig = testFixture.getGmeConfig();
describe('merge CLI test', function () {
    'use strict';
    var filename = require('path').normalize('src/bin/merge.js'),
        mergeCli = require('../../src/bin/merge'),
        storageParams = {
            globConf: gmeConfig,
            log: testFixture.Logger.createWithGmeConfig('merge CLI test:storage', gmeConfig)
        },
        database = new testFixture.WebGME.serverUserStorage(storageParams),
        projectName = 'mergeCliTest',
        oldProcessExit = process.exit,
        oldConsoleLog = console.log,
        oldConsoleError = console.error,
        oldProcessStdoutWrite = process.stdout.write,
        oldConsoleWarn = console.warn,
        suppressLogAndExit = function(saveBuffer){
            process.exit = function (code) {
                // TODO: would be nice to send notifications for test
                if(saveBuffer){
                    saveBuffer.code = code;
                }
            };
            console.log = function () {
                //oldConsoleLog(args);
                var i;
                if(saveBuffer){
                    saveBuffer.log = saveBuffer.log || '';
                    for(i=0;i<arguments.length;i++){
                        saveBuffer.log += arguments[i]+' ';
                    }
                    saveBuffer.log +='\n';
                }
            };
            console.error = function () {
                //oldConsoleError(args);
                var i;
                if(saveBuffer){
                    saveBuffer.error = saveBuffer.error || '';
                    for(i=0;i<arguments.length;i++){
                        saveBuffer.error += arguments[i]+' ';
                    }
                    saveBuffer.error +='\n';
                }
            };
            console.warn = console.error;
            process.stdout.write = function () {
                var i;
                if(saveBuffer){
                    saveBuffer.log = saveBuffer.log || '';
                    for(i=0;i<arguments.length;i++){
                        saveBuffer.log += arguments[i]+' ';
                    }
                    saveBuffer.log +='\n';
                }
            };
        },
        restoreLogAndExit = function(){
            console.log = oldConsoleLog;
            console.error = oldConsoleError;
            console.warn = oldConsoleWarn;
            process.stdout.write = oldProcessStdoutWrite;
            process.exit = oldProcessExit;
        },
        addTest = function(parameters){
            it(parameters.id,function(done){
                var buffer = {log:'',error:'',code:0};
                suppressLogAndExit(buffer);
                mergeCli.main(['node',filename,parameters.params ])
                    .then(function () {
                        restoreLogAndExit();
                        buffer.code.should.be.eql(parameters.code || 0);
                        buffer.error.should.be.empty;
                        if(parameters.out){
                            buffer.log.should.contain(parameters.out);
                        }
                        done();
                    })
                    .catch(function (err) {
                        restoreLogAndExit();
                        if (err instanceof SyntaxError) {
                            done();
                        } else {
                            done(err);
                        }
                    });
            });
        };
    before(function(done){
        var oldDone = done,
            applyChanges = function(){
                var needed = 2,
                    error = null,
                    applied = function(err){
                        error = error || err;
                        if(--needed === 0){
                            oldDone(error);
                        }
                    };
                applyChange('./test/bin/merge/masterDiff.json','master',applied);
                applyChange('./test/bin/merge/otherDiff.json','other',applied);
            }, applyChange = function(filePath,branch,next){
                var nodeApplyPatch = testFixture.childProcess.spawn('node', ['./src/bin/apply.js', filePath, '-m',gmeConfig.mongo.uri, '-p',projectName, '-t',branch]),
                    stdoutData,
                    err;

                nodeApplyPatch.stdout.on('data', function (data) {
                    stdoutData = stdoutData || '';
                    stdoutData += data.toString();
                    //console.log(data.toString());
                });

                nodeApplyPatch.stderr.on('data', function (data) {
                    err = err || '';
                    err += data.toString();
                    //console.log(data.toString());
                });

                nodeApplyPatch.on('close', function (code) {
                    next(code ? new Error('error during patch application: '+ (err || code)) : null);
                });
            };
        database.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }

            done = function (error) {
                database.closeDatabase(function (err) {
                    oldDone(error || err);
                });
            };
            database.deleteProject(projectName,function(err){
                if(err){
                    done(err);
                    return;
                }
                database.openProject(projectName, function (err, project) {
                    if (err) {
                        done(err);
                        return;
                    }

                    var core = new testFixture.WebGME.core(project,{globConf:gmeConfig}),
                        root = core.createNode(),
                        jsonProject = JSON.parse(testFixture.fs.readFileSync('./test/bin/merge/base.json')),
                        commitHash;

                    testFixture.WebGME.serializer.import(core,root,jsonProject,function(err){
                        if(err){
                            done(err);
                            return;
                        }
                        //now creating the start commit and make it the basis of two branches -master- and -other-
                        core.persist(root,function(err){
                            if(err){
                                done(err);
                                return;
                            }
                            commitHash = project.makeCommit([],core.getHash(root),'initial commit',function(err){
                                if(err){
                                    done(err);
                                    return;
                                }
                                project.setBranchHash('master','',commitHash,function(err){
                                    if(err){
                                        done(err);
                                        return;
                                    }
                                    project.setBranchHash('other','',commitHash,function(err){
                                        if(err){
                                            done(err);
                                            return;
                                        }
                                        applyChanges();
                                    });
                                });
                            });
                        });
                    });
                });
            });
        });
    });
    after(function(done){
        database.openDatabase(function (err) {
            if (err) {
                done(err);
                return;
            }
            database.deleteProject(projectName, function (err) {
                database.closeDatabase(done);
            });
        });
    });

    it('should have a main', function () {
        mergeCli.should.have.property('main');
        mergeCli.should.have.property('merge');
    });
    addTest({id:'-h prints out help text',params:'-h',out:'Usage: merge [options]'});
    addTest({id:'--help prints out help text',params:'--help',out:'Usage: merge [options]'});
    addTest({id:'empty parameter list is faulty',params:'',out:'project identifier'});
    addTest({id:'missing mine parameter',params:'-p '+projectName,out:'my branch/commit parameter',code:1});
    addTest({id:'invalid mine parameter',params:'-p '+projectName+' -M faulty@name',out:'invalid \'mine\''});
    addTest({id:'missing theirs parameter',params:'-p '+projectName+' -M other',out:'their branch/commit',code:1});
    addTest({id:'invalid mine parameter',params:'-p '+projectName+' -M other -T fault@all',out:'invalid \'theirs\''});
    addTest({id:'console output of the merge',params:'-p '+projectName+' -M other -T master',out:'diff base->mine:'});
    addTest({id:'automerge',params:'-p '+projectName+' -M other -T master -a',out:'was successfully updated with the merged result'});
});