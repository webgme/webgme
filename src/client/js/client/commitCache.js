/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';

    function commitCache(_clientGlobal) {
        var _cache = {},
            _timeOrder = [];

        function clearCache() {
            _cache = {};
            _timeOrder = [];
        }

        function addCommit(commitObject) {
            var index;

            if (!_cache[commitObject._id]) {
                _cache[commitObject._id] = commitObject;
                index = 0;
                while (index < _timeOrder.length && _cache[_timeOrder[index]].time > commitObject.time) {
                    index++;
                }
                _timeOrder.splice(index, 0, commitObject._id);
            }
        }

        function getNCommitsFrom(commitHash, number, callback) {
            var fillCache,
                returnNCommitsFromHash,
                cacheFilled,
                index;

            fillCache = function (time, number, cb) {
                _clientGlobal.project.getCommits(time, number, function (err, commits) {
                    var i;
                    if (!err && commits) {
                        for (i = 0; i < commits.length; i++) {
                            addCommit(commits[i]);
                        }
                        cb(null);
                    } else {
                        //we cannot get new commits from the server
                        //we should use our very own ones
                        cb(null);
                    }
                });
            };
            returnNCommitsFromHash = function (hash, num, cb) {
                //now we should have all the commits in place
                var index = _timeOrder.indexOf(hash),
                    commits = [];
                if (index > -1 || hash === null) {
                    if (hash === null) {
                        index = 0;
                    } else {
                        index++;

                    }
                    while (commits.length < num && index < _timeOrder.length) {
                        commits.push(_cache[_timeOrder[index]]);
                        index++;
                    }
                    cb(null, commits);
                } else {
                    cb('cannot found starting commit');
                }
            };
            cacheFilled = function (err) {
                if (err) {
                    callback(err);
                } else {
                    returnNCommitsFromHash(commitHash, number, callback);
                }
            };


            if (commitHash) {
                if (_cache[commitHash]) {
                    //we can be lucky :)
                    index = _timeOrder.indexOf(commitHash);
                    if (_timeOrder.length > index + number) {
                        //we are lucky
                        cacheFilled(null);
                    } else {
                        //not that lucky
                        fillCache(_cache[_timeOrder[_timeOrder.length - 1]].time,
                            number - (_timeOrder.length - (index + 1)),
                            cacheFilled);
                    }
                } else {
                    //we are not lucky enough so we have to download the commit
                    _clientGlobal.project.loadObject(commitHash, function (err, commitObject) {
                        if (!err && commitObject) {
                            addCommit(commitObject);
                            fillCache(commitObject.time, number, cacheFilled);
                        } else {
                            callback(err);
                        }
                    });
                }
            } else {
                //initial call
                fillCache((new Date()).getTime(), number, cacheFilled);
            }
        }

        function newCommit(commitHash) {
            if (_cache[commitHash]) {
                return;
            }

            _clientGlobal.project.loadObject(commitHash, function (err, commitObj) {
                if (!err && commitObj) {
                    addCommit(commitObj);
                }

            });
        }

        _clientGlobal.commitCache = {
            getNCommitsFrom: getNCommitsFrom,
            clearCache: clearCache,
            newCommit: newCommit
        };
    }

    return commitCache;
});