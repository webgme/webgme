/*jshint node:true, mocha:true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

var testFixture = require('../_globals');

describe('manage webhooks cli', function () {
    'use strict';

    var gmeConfig = testFixture.getGmeConfig(),
        expect = testFixture.expect,
        main = require('../../src/bin/manage_webhooks').main,
        gmeAuth,
        store,
        owner = gmeConfig.authentication.guestAccount,
        projectName = 'manage_webhooks',
        projectId;

    before(function (done) {
        testFixture.clearDBAndGetGMEAuth(gmeConfig)
            .then(function (gmeAuth__) {
                gmeAuth = gmeAuth__;
                store = gmeAuth.metadataStorage;
                return store.addProject(owner, projectName);
            })
            .then(function (projectId_) {
                projectId = projectId_;
            })
            .nodeify(done);
    });

    beforeEach(function (done) {
        store.updateProjectHooks(projectId, {}, done);
    });

    after(function (done) {
        gmeAuth.unload(done);
    });

    it('should list all [node, f.js, listAll, projectName]', function (done) {
        main(['node', 'f.js', 'listAll', projectName])
            .then(function (res) {
                expect(res).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should fail to list all [node, f.js, listAll, doesNotExist]', function (done) {
        main(['node', 'f.js', 'listAll', 'doesNotExist'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such project');
            })
            .nodeify(done);
    });

    it('should fail to list all w faulty mongouri [node, f.js, listAll, doesNotExist, -m, uri]', function (done) {
        main(['node', 'f.js', 'listAll', 'doesNotExist', '-m', 'uri'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('mongodb scheme');
            })
            .nodeify(done);
    });

    it('should list specific hook [node, f.js, list, projectName, hookId]', function (done) {
        store.addProjectHook(projectId, 'myHook', {url: 'http'})
            .then(function () {
                return main(['node', 'f.js', 'list', projectName, 'myHook']);
            })
            .then(function (res) {
                expect(res.url).to.equal('http');
            })
            .nodeify(done);
    });

    it('should fail to list hook that does not exist [node, f.js, list, projectName, doesNotExist]', function (done) {
        main(['node', 'f.js', 'list', projectName, 'doesNotExist'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    it('should fail to add hook with faulty event [node, f.js, add, projectName, myHook, -e, ff]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'myHook', 'http', '-e', 'ff'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('not among valid events');
            })
            .nodeify(done);
    });

    it('should add a hook [node, f.js, add, projectName, myHook, ..]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'myHook', 'http'])
            .then(function (res) {
                expect(res.events).to.deep.equal([]);
                expect(res.active).to.equal(true);
                expect(typeof res.description).to.equal('string');
            })
            .nodeify(done);
    });

    it('should add a hook 2 [node, f.js, add, projectName, myHook, ..]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'myHook', 'http', '-e', 'COMMIT'])
            .then(function (res) {
                expect(res.events).to.deep.equal(['COMMIT']);
                expect(res.active).to.equal(true);
                expect(typeof res.description).to.equal('string');
            })
            .nodeify(done);
    });

    it('should add a hook 3 [node, f.js, add, projectName, myHook, ..]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'myHook', 'http', '-e', 'COMMIT,TAG_CREATED'])
            .then(function (res) {
                expect(res.events).to.deep.equal(['COMMIT', 'TAG_CREATED']);
                expect(res.active).to.equal(true);
                expect(typeof res.description).to.equal('string');
            })
            .nodeify(done);
    });

    it('should add a hook 4 [node, f.js, add, projectName, myHook, ..]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'myHook', 'http', '-e', 'all'])
            .then(function (res) {
                expect(res.events).to.equal('all');
                expect(res.active).to.equal(true);
                expect(typeof res.description).to.equal('string');
            })
            .nodeify(done);
    });

    it('should update a hook 1 [node, f.js, update, projectName, myHook, ..]', function (done) {
        store.addProjectHook(projectId, 'myHook', {url: 'http'})
            .then(function () {
                return main(['node', 'f.js', 'update', projectName, 'myHook', '--url', 'https']);
            })
            .then(function (res) {
                expect(res.events).to.deep.equal([]);
                expect(res.active).to.equal(true);
                expect(typeof res.description).to.equal('string');
                expect(res.url).to.equal('https');
            })
            .nodeify(done);
    });

    it('should update a hook 2 [node, f.js, update, projectName, myHook, ..]', function (done) {
        store.addProjectHook(projectId, 'myHook', {url: 'http'})
            .then(function () {
                return main(['node', 'f.js', 'update', projectName, 'myHook', '-a']);
            })
            .then(function (res) {
                expect(res.events).to.deep.equal([]);
                expect(res.active).to.equal(false);
                expect(typeof res.description).to.equal('string');
                expect(res.url).to.equal('http');
            })
            .nodeify(done);
    });

    it('should update a hook 3 [node, f.js, update, projectName, myHook, ..]', function (done) {
        store.addProjectHook(projectId, 'myHook', {url: 'http', events: 'all'})
            .then(function () {
                return main(['node', 'f.js', 'update', projectName, 'myHook', '-e']);
            })
            .then(function (res) {
                expect(res.events).to.deep.equal([]);
                expect(typeof res.description).to.equal('string');
                expect(res.url).to.equal('http');
            })
            .nodeify(done);
    });

    it('should fail to update hook if does not exist [node, f.js, update, projectName, doesNotExist]', function (done) {
        main(['node', 'f.js', 'update', projectName, 'doesNotExist', '-d'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    it('should and and remove hook [node, f.js, remove, projectName, hookId]', function (done) {
        main(['node', 'f.js', 'add', projectName, 'hookId', 'http'])
            .then(function (data) {
                expect(data.url).to.equal('http');
                return main(['node', 'f.js', 'remove', projectName, 'hookId']);
            })
            .then(function (data) {
                expect(data).to.deep.equal({});
                return main(['node', 'f.js', 'listAll', projectName]);
            })
            .then(function (data) {
                expect(data).to.deep.equal({});
            })
            .nodeify(done);
    });

    it('should fail to remove hook if does not exist [node, f.js, remove, projectName, doesNotExist]', function (done) {
        main(['node', 'f.js', 'remove', projectName, 'doesNotExist'])
            .then(function () {
                throw new Error('Should have failed!');
            })
            .catch(function (err) {
                expect(err.message).to.include('no such hook');
            })
            .nodeify(done);
    });

    describe('help printouts', function () {
        // Code copied from usermanger.spec.js
        var oldProcessExit = process.exit,
            oldConsoleLog = console.log,
            oldConsoleError = console.error,
            oldProcessStdoutWrite = process.stdout.write,
            i,
            helpForCommands = [
                'listAll',
                'list',
                'add',
                'update',
                'remove'
            ],
            addTest,

            suppressLogAndExit = function () {
                process.exit = function (code) {
                    console.log(code);
                };
                console.log = function () {
                    //console.info(arguments);
                };
                console.error = function () {
                    //console.info(arguments);
                };
                process.stdout.write = function () {
                };
            },
            restoreLogAndExit = function () {
                console.log = oldConsoleLog;
                console.error = oldConsoleError;
                process.stdout.write = oldProcessStdoutWrite;
                process.exit = oldProcessExit;
            };


        addTest = function (helpForCommand) {
            it('should print help for ' + helpForCommand, function (done) {
                suppressLogAndExit();

                main(['node', 'manage_webhooks.js', helpForCommand, '--help'])
                    .then(function () {
                        restoreLogAndExit();
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

        for (i = 0; i < helpForCommands.length; i += 1) {
            addTest(helpForCommands[i]);
        }

        it('should print help when passed as option', function (done) {
            suppressLogAndExit();

            main(['node', 'manage_webhooks.js', '--help'])
                .then(function () {
                    restoreLogAndExit();
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

        it('should print help if no script arguments passed', function (done) {
            suppressLogAndExit();

            main(['node', 'manage_webhooks.js'])
                .then(function () {
                    restoreLogAndExit();
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
    });
});