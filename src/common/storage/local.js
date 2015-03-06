/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["util/assert"], function (ASSERT) {
  "use strict";

  var PROJECT_REGEXP = new RegExp("^[0-9a-zA-Z_]*$");
  var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");
  var BRANCH_REGEXP = new RegExp("^\\*[0-9a-zA-Z_]*$");
  var SEPARATOR = '$';
  var STATUS_UNREACHABLE = "storage unreachable";
  var STATUS_CONNECTED = "connected";
  var PROJECT_INFO_ID = '*info*';

  function Database(options) {
    ASSERT(typeof options === "object");

    options.host = options.host || "localhost";
    options.port = options.port || 27017;
    options.database = options.database || "webgme";
    options.timeout = options.timeout || 1000000;
    options.local = options.local || "memory";

    var storage = null,
      database = options.database,
      storageOk = false;

    if (options.local === "memory") {
      storageOk = true;
      storage = {
        length: 0,
        keys: [],
        data: {},
        getItem: function (key) {
          ASSERT(typeof key === "string");
          return this.data[key];
        },
        setItem: function (key, object) {
          ASSERT(typeof key === "string" && typeof object === "string");
          this.data[key] = object;
          if (this.keys.indexOf(key) === -1) {
            this.keys.push(key);
            this.length++;
          }
        },
        removeItem: function (key) {
          ASSERT(typeof key === "string");
          delete this.data[key];
          var index = this.keys.indexOf(key);
          if (index > -1) {
            this.keys.splice(index, 1);
            this.length--;
          }
        },
        key: function (index) {
          return this.keys[index];
        }
      };
    } else {
      if (options.local === "local") {
        if (localStorage) {
          storageOk = true;
          storage = localStorage;
        }
      }
      if (options.local == "session") {
        if (sessionStorage) {
          storageOk = true;
          storage = sessionStorage;
        }
      }
    }

    function openDatabase(callback) {
      ASSERT(typeof callback === "function");
      if (!storageOk) {
        callback(new Error('the expected storage is unavailable'));
      } else {
        callback(null);
      }
    }

    function closeDatabase(callback) {
      if (typeof callback === "function") {
        callback();
      }
    }

    function fsyncDatabase(callback) {
      ASSERT(typeof callback === "function");
      callback();
    }

    function getDatabaseStatus(oldstatus, callback) {
      ASSERT(typeof callback === "function" && (typeof oldstatus === "string" || oldstatus === null));
      if (oldstatus !== STATUS_UNREACHABLE) {
        callback(null, STATUS_CONNECTED);
      } else {
        setTimeout(callback, options.timeout, null, STATUS_CONNECTED);
      }
    }

    function getProjectNames(callback) {
      ASSERT(typeof callback === "function");

      var names = [];
      for (var i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        var keyArray = key.split(SEPARATOR);
        ASSERT(keyArray.length === 3);
        if (keyArray[0] === database) {
          if (names.indexOf(keyArray[1]) === -1) {
            ASSERT(PROJECT_REGEXP.test(keyArray[1]));
            names.push(keyArray[1]);
          }
        }
      }
      callback(null, names);
    }

    function deleteProject(project, callback) {
      ASSERT(typeof project === "string" && typeof callback === "function");
      ASSERT(PROJECT_REGEXP.test(project));

      var i, namesToRemove = [];
      for (i = 0; i < storage.length; i++) {
        var key = storage.key(i);
        var keyArray = key.split(SEPARATOR);
        ASSERT(keyArray.length === 3);
        if (keyArray[0] === database) {
          if (keyArray[1] === project) {
            namesToRemove.push(key);
          }
        }
      }

      for (i = 0; i < namesToRemove.length; i++) {
        storage.removeItem(namesToRemove[i]);
      }
      callback(null);
    }

    function openProject(project, callback) {
      ASSERT(typeof callback === "function");
      ASSERT(typeof project === "string" && PROJECT_REGEXP.test(project));

      callback(null, {
        fsyncDatabase: fsyncDatabase,
        getDatabaseStatus: getDatabaseStatus,
        closeProject: closeProject,
        loadObject: loadObject,
        insertObject: insertObject,
        getInfo: getInfo,
        setInfo: setInfo,
        findHash: findHash,
        dumpObjects: dumpObjects,
        getBranchNames: getBranchNames,
        getBranchHash: getBranchHash,
        setBranchHash: setBranchHash,
        getCommits: getCommits,
                getCommonAncestorCommit: getCommonAncestorCommit,
        ID_NAME: "_id"
      });

      function closeProject(callback) {
        if (typeof callback === "function") {
          callback(null);
        }
      }

      function loadObject(hash, callback) {
        ASSERT(typeof hash === "string" && HASH_REGEXP.test(hash));

        var object = storage.getItem(database + SEPARATOR + project + SEPARATOR + hash);
        if (object) {
          object = JSON.parse(object);
        }
        callback(null, object);
      }

      function insertObject(object, callback) {
        ASSERT(object !== null && typeof object === "object");
        ASSERT(typeof object._id === "string" && HASH_REGEXP.test(object._id));

        try {
          storage.setItem(database + SEPARATOR + project + SEPARATOR + object._id, JSON.stringify(object));
        } catch (e) {
          callback(e);
        }
        callback(null);
      }

      function getInfo(callback) {
        ASSERT(typeof callback === 'function');
        var info = storage.getItem(database + SEPARATOR + project + SEPARATOR + PROJECT_INFO_ID);
        if(info){
          info = JSON.parse(info);
        }
        callback(null,info);
      }

      function setInfo(info, callback) {
        ASSERT(typeof info === 'object' && typeof callback === 'function');
        try {
          storage.setItem(database + SEPARATOR + project + SEPARATOR + PROJECT_INFO_ID, JSON.stringify(object));
        } catch (e) {
          callback(e);
        }
        callback(null);
      }

      function findHash(beginning, callback) {
        ASSERT(typeof beginning === "string" && typeof callback === "function");

        if (!HASH_REGEXP.test(beginning)) {
          callback(new Error("hash " + beginning + " not valid"));
        }
        else {
          var found = 0,
            fullKey = "";
          for (var i = 0; i < storage.length; i++) {
            if (storage.key(i).indexOf(database + SEPARATOR + project + SEPARATOR + beginning) === 0) {
              found++;
              fullKey = storage.key(i);
              if (found > 1) {
                break;
              }
            }
          }
          switch (found) {
            case 0:
              callback(new Error("hash " + beginning + " not found"));
              break;
            case 1:
              var keyArray = fullKey.split(SEPARATOR);
              ASSERT(keyArray.length === 3);
              callback(null, keyArray[2]);
              break;
            default:
              callback(new Error("hash " + beginning + " not unique"));
              break;
          }
        }
      }

      function dumpObjects(callback) {
        ASSERT(typeof callback === "function");

        callback();
      }

      function getBranchNames(callback) {
        ASSERT(typeof callback === "function");

        var branchNames = [];
        for (var i = 0; i < storage.length; i++) {
          var keyArray = storage.key(i).split(SEPARATOR);
          ASSERT(keyArray.length === 3);
          if (BRANCH_REGEXP.test('*'+ keyArray[2])) {
            if (keyArray[0] === database && keyArray[1] === project) {
              branchNames.push(keyArray[2]);
            }
          }
        }
        callback(null, branchNames);
      }

      function getBranchHash(branch, oldhash, callback) {
        ASSERT(typeof branch === "string" && BRANCH_REGEXP.test('*'+ branch));
        ASSERT(typeof oldhash === "string" && (oldhash === "" || HASH_REGEXP.test(oldhash)));
        ASSERT(typeof callback === "function");

        var hash = storage.getItem(database + SEPARATOR + project + SEPARATOR + branch);
        if (hash) {
          hash = JSON.parse(hash);
        }
        hash = (hash && hash.hash) || "";
        if (hash !== oldhash) {
          callback(null, hash, null);
        } else {
          setTimeout(function () {
            hash = storage.getItem(database + SEPARATOR + project + SEPARATOR + branch);
            if (hash) {
              hash = JSON.parse(hash);
            }
            hash = (hash && hash.hash) || "";
            callback(null, hash, null);
          }, options.timeout);
        }
      }

      function setBranchHash(branch, oldhash, newhash, callback) {
        ASSERT(typeof branch === "string" && BRANCH_REGEXP.test(branch));
        ASSERT(typeof oldhash === "string" && (oldhash === "" || HASH_REGEXP.test(oldhash)));
        ASSERT(typeof newhash === "string" && (newhash === "" || HASH_REGEXP.test(newhash)));
        ASSERT(typeof callback === "function");

        var hash = storage.getItem(database + SEPARATOR + project + SEPARATOR + branch);
        if (hash) {
          hash = JSON.parse(hash);
        }
        hash = (hash && hash.hash) || "";

        if (oldhash === newhash) {
          if (oldhash === hash) {
            callback(null);
          } else {
            callback('branch has mismatch');
          }
        } else {
          if (oldhash === hash) {
            if (newhash === "") {
              storage.removeItem(database + SEPARATOR + project + SEPARATOR + branch);
            } else {
              storage.setItem(database + SEPARATOR + project + SEPARATOR + branch, JSON.stringify({
                _id: branch,
                hash: newhash
              }));
            }
            callback(null);
          } else {
            callback('branch has mismatch');
          }
        }
      }

      function getCommits(before, number, callback) {
        ASSERT(typeof callback === 'function');
        var finds = [];
        for (var i = 0; i < storage.length; i++) {
          if (storage.key(i).indexOf(database + SEPARATOR + project + SEPARATOR) === 0) {
            var object = JSON.parse(storage.getItem(storage.key(i)));
            if (object.type === 'commit' && object.time < before) {
              finds.push(object);
              if (finds.length === number) {
                return callback(null, finds);
              }
            }
          }
        }
        callback(null, finds);
      }

            function getCommonAncestorCommit(commitA, commitB, callback) {
                var ancestorsA = {},
                    ancestorsB = {},
                    newAncestorsA = [],
                    newAncestorsB = [],
                    getAncestors = function (commits, ancestorsSoFar, next) {
                        var i, j, newCommits = [],commit;
                        for (i = 0; i < commits.length; i++) {
                            commit = storage.getItem(database + SEPARATOR + project + SEPARATOR + commits[i]);
                            if (commit) {
                                commit = JSON.parse(commit);
                                for(j=0;j<commit.parents.length;j++){
                                    if (newCommits.indexOf(commit.parents[i]) === -1) {
                                        newCommits.push(commit.parents[i]);
                                    }
                                    ancestorsSoFar[commit.parents[i]] = true;
                                }
                            }
                        }
                        next(newCommits);
                    },
                    checkForCommon = function () {
                        var i;
                        for (i = 0; i < newAncestorsA.length; i++) {
                            if (ancestorsB[newAncestorsA[i]]) {
                                //we got a common parent so let's go with it
                                return newAncestorsA[i];
                            }
                        }
                        for (i = 0; i < newAncestorsB.length; i++) {
                            if (ancestorsA[newAncestorsB[i]]) {
                                //we got a common parent so let's go with it
                                return newAncestorsB[i];
                            }
                        }
                        return null;
                    },
                    loadStep = function () {
                        var candidate = checkForCommon(),
                            needed = 2,
                            bothLoaded = function () {
                                if (newAncestorsA.length > 0 || newAncestorsB.length > 0) {
                                    loadStep();
                                } else {
                                    callback('unable to find common ancestor commit', null);
                                }
                            };
                        if (candidate) {
                            return callback(null, candidate);
                        }
                        getAncestors(newAncestorsA, ancestorsA, function (nCommits) {
                            newAncestorsA = nCommits || [];
                            if (--needed === 0) {
                                bothLoaded();
                            }
                        });
                        getAncestors(newAncestorsB, ancestorsB, function (nCommits) {
                            newAncestorsB = nCommits || [];
                            if (--needed === 0) {
                                bothLoaded();
                            }
                        });
                    };

                //initializing
                ancestorsA[commitA] = true;
                newAncestorsA = [commitA];
                ancestorsB[commitB] = true;
                newAncestorsB = [commitB];
                loadStep();

            }

    }

    return {
      openDatabase: openDatabase,
      closeDatabase: closeDatabase,
      fsyncDatabase: fsyncDatabase,
      getDatabaseStatus: getDatabaseStatus,
      getProjectNames: getProjectNames,
      openProject: openProject,
      deleteProject: deleteProject
    };
  }

  return Database;
});

