/*globals requireJS*/
/*jshint node:true, newcap:false*/
/**
 * @author lattmann / https://github.com/lattmann
 */
'use strict';

var Q = require('Q'),

    CANON = requireJS('common/util/canon'),
    REGEXP = requireJS('common/regexp');


/**
 * An in-memory implementation of backing the data for webgme.
 *
 * @param mainLogger
 * @param gmeConfig
 * @constructor
 */
function Memory(mainLogger, gmeConfig) {
    var logger = mainLogger.fork('memory'),
        db = null;

    function openDatabase(callback) {
        var deferred = Q.defer();
        logger.debug('openDatabase');

        if (db === null) {
            logger.debug('Connecting to in-memory database...');
            // connect to mongo
            db = {};
            logger.debug('Connected.');
            deferred.resolve();
        } else {
            logger.debug('Reusing in-memory database connection.');
            // we are already connected
            deferred.resolve();
        }

        return deferred.promise.nodeify(callback);
    }

    function closeDatabase(callback) {
        var deferred = Q.defer(),
            key;
        logger.debug('closeDatabase');

        if (db === null) {
            logger.debug('No in-memory database connection was established.');
            deferred.resolve();
        } else {
            logger.debug('Closing in-memory database and cleaning up...');
            for (key in db) {
                if (db.hasOwnProperty(key)) {
                    delete db[key];
                }
            }
            db = null;
            logger.debug('Closed.');
        }

        return deferred.promise.nodeify(callback);
    }

    function getProjectNames(callback) {
        var deferred = Q.defer();
        if (db) {
            deferred.resolve(Object.keys(db));
        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }
        return deferred.promise.nodeify(callback);
    }

    //function createProject(name, callback) {
    //    var deferred = Q.defer();
    //
    //    if (db) {
    //        if (db.hasOwnProperty(name)) {
    //            deferred.reject(new Error('Project already exists ' + name));
    //        } else {
    //            deferred.resolve();
    //        }
    //    } else {
    //        deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
    //    }
    //
    //    return deferred.promise.nodeify(callback);
    //}

    function deleteProject(name, callback) {
        var deferred = Q.defer();

        if (db) {
            if (db.hasOwnProperty(name)) {
                delete db[name];
                deferred.resolve();
            } else {
                deferred.reject(new Error('Project does not exist ' + name));
            }
        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(name, callback) {
        var project = null,
            deferred = Q.defer();

        logger.debug('openProject', name);


        function loadObject(hash, callback) {

        }

        function insertObject(object, callback) {

        }

        function getBranches(callback) {

        }

        function getBranchHash(branch, callback) {

        }

        function setBranchHash(branch, oldhash, newhash, callback) {

        }

        function getCommits(before, number, callback) {

        }


        if (db) {
            if (db.hasOwnProperty(name)) {
                project = db[name];
                deferred.resolve({
                    //closeProject: closeProject,
                    loadObject: loadObject,
                    insertObject: insertObject,
                    //getInfo: getInfo,
                    //setInfo: setInfo,
                    //dumpObjects: dumpObjects,
                    getBranches: getBranches,
                    getBranchHash: getBranchHash,
                    setBranchHash: setBranchHash,
                    getCommits: getCommits
                    //getCommonAncestorCommit: getCommonAncestorCommit
                });
            } else {
                deferred.reject(new Error('Project does not exist ' + name));
            }
        } else {
            deferred.reject(new Error('In-memory database has to be initialized. Call openDatabase first.'));
        }


        return deferred.promise.nodeify(callback);
    }


    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.getProjectNames = getProjectNames;

    this.createProject = createProject;
    this.deleteProject = deleteProject;
    this.openProject = openProject;
}

module.exports = Memory;