/*globals*/
/*jshint node:true, mocha:true*/
/**
 * @author kecso / https://github.com/kecso
 */
//these tests intended to ensure that every used feature of mongodb and its used client is work as expected

var tGlobals = require('../../_globals.js');
describe('mongo database', function () {
    'use strict';
    var db,
        collection,
        collectionName = 'mongotest___test',
        fsyncDatabase = function (callback) {

            var error = null,
                synced = 0,
                conns,

                i;

            function fsyncConnection(conn) {
                db.command({getLastError: 1}, {connection: conn},
                    function (err/*, result*/) {
                        error = error || err;
                        synced += 1;
                        if (synced === conns.length) {
                            callback(error);
                        }
                    });
            }

            conns = db.serverConfig.allRawConnections();
            if (conns instanceof Array && conns.length >= 1) {
                for (i = 0; i < conns.length; ++i) {
                    fsyncConnection(conns[i]);
                }
            } else {
                callback(new Error('not connected'));
            }
        };

    before(function (done) {
        tGlobals.mongodb.MongoClient.connect('mongodb://127.0.0.1/mongotest', {
            'w': 1,
            'native-parser': true,
            'auto_reconnect': true,
            'poolSize': 20,
            socketOptions: {keepAlive: 1}
        }, function (err, d) {
            if (!err && d) {
                db = d;

                db.collection(collectionName, function (err, result) {
                    if (err) {
                        done(err);
                    } else {
                        collection = result;
                        done();
                    }
                });
            } else {
                db = null;
                done(err);
            }
        });
    });
    after(function (done) {
        db.dropCollection(collectionName, function (/*err*/) {
            db.close(done);
        });
    });
    it('insert some objects and in a parallel insertion uses fsync and checks if really everything is in place',
        function (done) {
            var i,
                filler = '',
                normalItemCount = 100,
                error = null,
                addObject = function (/*index*/) {
                    collection.insert({data: filler}, function (err) {
                        error = error || err;
                        normalItemCount -= 1;
                        if (normalItemCount === 0) {
                            finishedAll();
                        }
                    });
                },
                finishedAll = function () {
                    done(error);
                };
            for (i = 0; i < 1000; i++) {
                filler += String.fromCharCode(Math.floor(Math.random() * 255));
            }

            for (i = 0; i < 99; i++) {
                addObject(i);
            }
            fsyncDatabase(function (err) {
                error = error || err;
                collection.insert({data: filler, extra: 'should be the last element'}, function (err) {
                    error = error || err;
                    normalItemCount -= 1;
                    if (normalItemCount === 0) {
                        finishedAll();
                    } else {
                        error = new Error('fsync not functioning!!! ' + normalItemCount);
                    }
                });
            });
        });
});