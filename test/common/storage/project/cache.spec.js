/**
 * @author kecso / https://github.com/kecso
 */
/*jshint node:true, mocha:true*/

var testFixture = require('../../../_globals.js');

describe('storage cache', function () {
    'use strict';
    var gmeAuth,
        logger = testFixture.logger.fork('storageCache'),
        gmeConfig = testFixture.getGmeConfig(),
        Q = testFixture.Q,
        expect = testFixture.expect,
        CONSTANTS = testFixture.requirejs('common/storage/constants'),
        Cache = testFixture.requirejs('common/storage/project/cache'),
        MockStorage = function (options) {
            var waitForIt = {};
            this.loadObject = function (projectId, key, callback) {
                if (options.waitForIt) {
                    waitForIt[projectId + key] = callback;
                } else {
                    setTimeout(function () {
                        callback(new Error('ouch'));
                    }, options.timeout || 10);
                }
            };
            this.sendThisBack = function (projectId, key, err, object) {
                setTimeout(function () {
                    var callback = waitForIt[projectId + key] || function () {
                        };

                    delete waitForIt[projectId + key];
                    callback(err, object);
                }, options.timeout || 10);
            };
            this.loadPaths = function (projectId, pathsInfo, excludes, callback) {
                if (options.waitForIt) {
                    waitForIt[projectId + 'loadPaths'] = callback;
                } else {
                    setTimeout(function () {
                        callback(new Error('ouchPaths'));
                    }, options.timeout || 10);
                }
            }
        };

    it('should have all the goo functions', function () {
        var cache = new Cache(null, 'noId', logger, gmeConfig);
        expect(Object.keys(cache)).to.include.members(['loadObject', 'insertObject', 'insertPatchObject']);
    });

    it('should insert then read an object', function (done) {
        var cache = new Cache(null, 'noId', logger, gmeConfig);

        cache.insertObject({_id: 'one', value: 'two'});
        Q.nfcall(cache.loadObject, 'one')
            .then(function (result) {
                expect(result).to.eql({_id: 'one', value: 'two'});
            })
            .nodeify(done);
    });

    it('should insert an object, then insert a patch based on that one', function (done) {
        var cache = new Cache(null, 'noId', logger, gmeConfig);

        cache.insertObject({_id: 'one', value: 'two'});
        cache.insertPatchObject({_id: 'two', patch: [{op: 'add', path: '/other', value: 'three'}], base: 'one'});
        Q.nfcall(cache.loadObject, 'two')
            .then(function (result) {
                expect(result).to.eql({_id: 'two', value: 'two', other: 'three'});
            })
            .nodeify(done);
    });

    it('should respond to all calls when the object is received from the storage', function (done) {
        var mock = new MockStorage({waitForIt: true}),
            projectId = 'noId',
            object = {_id: 'one', value: 'two'},
            cache = new Cache(mock, projectId, logger, gmeConfig);

        Q.allDone([
            Q.nfcall(cache.loadObject, 'one'),
            Q.nfcall(cache.loadObject, 'one'),
            Q.nfcall(cache.loadObject, 'one')
        ])
            .then(function (results) {
                expect(results).to.have.length(3);
                expect(results).to.eql([object, object, object]);
            })
            .nodeify(done);

        //we send the object to the mock
        mock.sendThisBack(projectId, 'one', null, object);

    });

    it('should insert an object, then ignore a patch object with bad operation', function (done) {
        var mock = new MockStorage({}),
            cache = new Cache(mock, 'noId', logger, gmeConfig);

        cache.insertObject({_id: 'one', value: 'two'});
        cache.insertPatchObject({_id: 'two', patch: [{op: 'bad', path: '/other', value: 'three'}], base: 'one'});
        Q.nfcall(cache.loadObject, 'two')
            .then(function (result) {
                done(new Error('object should not be in cache!'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouch');
                done();
            });
    });

    it('should insert an object, then ignore a patch object whose base is not in cache', function (done) {
        var mock = new MockStorage({}),
            cache = new Cache(mock, 'noId', logger, gmeConfig);

        cache.insertObject({_id: 'one', value: 'two'});
        cache.insertPatchObject({_id: 'two', patch: [{op: 'add', path: '/other', value: 'three'}], base: 'nobase'});
        Q.nfcall(cache.loadObject, 'two')
            .then(function (result) {
                done(new Error('object should not be in cache!'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouch');
                done();
            });
    });

    it('should ignore a bad patch object', function (done) {
        var mock = new MockStorage({}),
            cache = new Cache(mock, 'noId', logger, gmeConfig);

        cache.insertObject({_id: 'one', value: 'two'});
        cache.insertPatchObject({_id: 'two', patch: [{op: 'add', path: '/other', value: 'three'}]});
        Q.nfcall(cache.loadObject, 'two')
            .then(function (result) {
                done(new Error('object should not be in cache!(1)'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouch');

                cache.insertPatchObject({patch: [{op: 'add', path: '/other', value: 'three'}], base: 'one'});
                return Q.nfcall(cache.loadObject, 'two');
            })
            .then(function (result) {
                done(new Error('object should not be in cache!(2)'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouch');

                cache.insertPatchObject({_id: 'two', base: 'one'});
                return Q.nfcall(cache.loadObject, 'two');
            })
            .then(function (result) {
                done(new Error('object should not be in cache!(3)'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouch');

                done();
            })
            .done();
    });

    it('should remove the object from \'missing\' ' +
        'when inserted and not respond when the load finishes from the storage', function (done) {
        var mock = new MockStorage({waitForIt: true}),
            projectId = 'pId',
            cache = new Cache(mock, projectId, logger, gmeConfig),
            object = {_id: 'one', value: 'otherOne'},
            storageObject = {_id: 'one', value: 'two'};

        Q.nfcall(cache.loadObject, 'one')
            .then(function (result) {
                expect(result).to.eql(object);
            })
            .catch(function (err) {
                done(err);
            });

        setTimeout(function () {
            cache.insertObject(object);
            mock.sendThisBack(projectId, 'one', null, storageObject);
            setTimeout(function () {
                done();
            }, 50);
        }, 10);
    });

    it('should handle loadPaths error arriving from storage', function (done) {
        var mock = new MockStorage({}),
            cache = new Cache(mock, 'noId', logger, gmeConfig);

        Q.nfcall(cache.loadPaths, 'one', ['/one', '/two'])
            .then(function () {
                done(new Error('should have failed'));
            })
            .catch(function (err) {
                expect(err).not.to.equal(null);
                expect(err.message).to.equal('ouchPaths');
                done();
            })
            .done();
    });
});