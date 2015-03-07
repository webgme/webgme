/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define(["util/assert", "util/guid"], function (ASSERT, GUID) {
  "use strict";
  var BRANCH_OBJ_ID = '*branch*';
  var BRANCH_STATES = {
    SYNC: 'sync',
    FORKED: 'forked',
    DISCONNECTED: 'disconnected',
    AHEAD: 'ahead'
  };

  function Database(_database, options) {
    ASSERT(typeof options === "object" && typeof _database === "object");
    var gmeConfig = options.globConf;
    options.failsafe = options.failsafe || "memory";
    options.failsafefrequency = options.failsafefrequency || 10000;
    options.timeout = options.timeout || 10000;

    var exceptionErrors = [], fsId = "FS", dbId = options.database || "noID", SEPARATOR = "$", STATUS_CONNECTED = "connected", pendingStorage = {}, storage = null;

    function loadPending() {
      for (var i = 0; i < storage.length; i++) {
        if (storage.key(i).indexOf(fsId) === 0) {
          var keyArray = storage.key(i).split(SEPARATOR);
          ASSERT(keyArray.length === 4);
          if (keyArray[1] === dbId) {
            var object = JSON.parse(storage.getItem(storage.key(i)));
            pendingStorage[keyArray[2]] = object;
          }
        }
      }
      for (i in pendingStorage) {
        if (!pendingStorage[i][BRANCH_OBJ_ID]) {
          pendingStorage[i][BRANCH_OBJ_ID] = {};
        }
      }
    }

    function savePending() {
      //TODO maybe some check would be good, but not necessarily
      for (var i in pendingStorage) {
        storage.setItem(fsId + SEPARATOR + dbId + SEPARATOR + i, JSON.stringify(pendingStorage[i]));
      }
    }

    function openDatabase(callback) {
      if (options.failsafe === "local" && localStorage) {
        storage = localStorage;
      } else if (options.failsafe === "session" && sessionStorage) {
        storage = sessionStorage;
      } else if (options.failsafe === "memory") {
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
            this.keys.push(key);
            this.length++;
          },
          key: function (index) {
            return this.keys[index];
          }
        };
      }

      if (storage) {
        loadPending();
        setInterval(savePending, options.failsafefrequency);
        _database.openDatabase(callback);
      } else {
        callback(new Error('cannot initialize fail safe storage'));
      }
    }

    function openProject(projectName, callback) {
      var project = null;
      var inSync = true;
      _database.openProject(projectName, function (err, proj) {
        if (!err && proj) {
          project = proj;
          if (!pendingStorage[projectName]) {
            pendingStorage[projectName] = {};
            pendingStorage[projectName][BRANCH_OBJ_ID] = {};
          }
          callback(null, {
            fsyncDatabase: project.fsyncDatabase,
            getDatabaseStatus: project.getDatabaseStatus,
            closeProject: project.closeProject,
            loadObject: loadObject,
            insertObject: insertObject,
            getInfo: project.getInfo,
            setInfo: project.setInfo,
            findHash: project.findHash,
            dumpObjects: project.dumpObjects,
            getBranchNames: getBranchNames,
            getBranchHash: getBranchHash,
            setBranchHash: setBranchHash,
            getCommits: project.getCommits,
            makeCommit: project.makeCommit,
            getCommonAncestorCommit: project.getCommonAncestorCommit,
            ID_NAME: project.ID_NAME
          });
        } else {
          callback(err, project);
        }
      });

      function synchronise(callback) {
        if (pendingStorage[projectName]) {
          var objects = [];
          var count = 0;
          var savingObject = function (object, cb) {
            project.insertObject(object, function (err) {
              if (err) {
                if (!pendingStorage[projectName]) {
                  pendingStorage[projectName] = {};
                }
                pendingStorage[projectName][object._id] = object;
              }
              cb();
            });
          };
          var objectProcessed = function () {
            if (--count === 0) {
              callback();
            }
          };

          for (var i in pendingStorage[projectName]) {
            if (i !== BRANCH_OBJ_ID) {
              objects.push(pendingStorage[projectName][i]);
            }
          }
          var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID];
          pendingStorage[projectName] = {};
          pendingStorage[projectName][BRANCH_OBJ_ID] = branchObj;

          //synchronizing the branches
          var aheadBranches = [];
          for (i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
            if (pendingStorage[projectName][BRANCH_OBJ_ID][i].state === BRANCH_STATES.DISCONNECTED) {
              if (pendingStorage[projectName][BRANCH_OBJ_ID][i].local.length > 0) {
                pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.AHEAD;
                //we try to save our local head
                aheadBranches.push(i);
              } else {
                pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.SYNC;
              }
            }
          }

          count = objects.length + aheadBranches.length;
          for (i = 0; i < aheadBranches.length; i++) {
            synchroniseBranch(aheadBranches[i], objectProcessed);
          }
          for (i = 0; i < objects.length; i++) {
            savingObject(objects[i], objectProcessed);
          }
          if (objects.length === 0) {
            callback();
          }
        } else {
          callback();
        }
      }

      function synchroniseBranch(branchname, callback) {
        var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branchname];
        project.getBranchHash(branchname, branchObj.local[0], function (err, newhash, forked) {
          if (!err && newhash) {
            var index = branchObj.unackedSentHashes.indexOf(newhash);
            if (index !== -1) {
              // the server will catch up eventually...
            } else if (branchObj.local.indexOf(newhash) !== -1) {
              project.setBranchHash(branchname, newhash, branchObj.local[0], callback);
            } else {
              //we forked
              branchObj.state = BRANCH_STATES.FORKED;
              branchObj.fork = newhash;
              callback(null);
            }
          } else {
            callback(err);
          }
        });
      }

      function errorMode() {
        if (inSync) {
          inSync = false;
          for (var i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
            if (pendingStorage[projectName][BRANCH_OBJ_ID][i].state !== BRANCH_STATES.FORKED) {
              pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.DISCONNECTED;
            }
          }
          var checkIfAvailable = function (err, newstate) {
            if (newstate === STATUS_CONNECTED) {
              synchronise(function () {
                inSync = true;
              });
            } else {
              project.getDatabaseStatus(newstate, checkIfAvailable);
            }
          };
          project.getDatabaseStatus(null, checkIfAvailable);
        }
      }

      function loadObject(hash, callback) {
        project.loadObject(hash, function (err, object) {
          if (!err && object) {
            callback(null, object);
          } else {
            errorMode();
            if (exceptionErrors.indexOf(err) !== -1) {
              callback(err, object);
            } else {
              if (pendingStorage[projectName] && pendingStorage[projectName][hash]) {
                callback(null, pendingStorage[projectName][hash]);
              } else {
                callback(err, object);
              }
            }
          }
        });
      }

      function insertObject(object, callback) {
        project.insertObject(object, function (err) {
          if (err) {
            errorMode();
            if (exceptionErrors.indexOf(err) !== -1) {
              callback(err);
            } else {
              //TODO have to check if the id is already taken...
              if (!pendingStorage[projectName]) {
                pendingStorage[projectName] = {};
              }
              pendingStorage[projectName][object._id] = object;
              callback(null);
            }
          } else {
            callback(err);
          }
        });
      }

      function getBranchNames(callback) {
        project.getBranchNames(function (err, names) {
          //we need the locally stored names either way
          var locals = {};
          for (var i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
            if (pendingStorage[projectName][BRANCH_OBJ_ID][i].local.length > 0) {
              locals[i] = pendingStorage[projectName][BRANCH_OBJ_ID][i].local[0];
            } else if (pendingStorage[projectName][BRANCH_OBJ_ID][i].fork === null && pendingStorage[projectName][BRANCH_OBJ_ID][i].remote !== null) {
              locals[i] = pendingStorage[projectName][BRANCH_OBJ_ID][i].remote;
            }
          }

          if (err) {
            errorMode();
            if (exceptionErrors.indexOf(err) !== -1) {
              callback(err);
            } else {
              callback(null, locals);
            }
          } else {
            for (i in names) {
              if (!locals[i]) {
                locals[i] = names[i];
              } else if (locals[i] === pendingStorage[projectName][BRANCH_OBJ_ID][i].remote) {
                locals[i] = names[i];
              }
            }
            callback(err, locals);
          }
        });
      }

      function getBranchHash(branch, oldhash, callback) {
        if (!pendingStorage[projectName][BRANCH_OBJ_ID][branch]) {
          pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {
            local: [],
            fork: null,
            state: BRANCH_STATES.SYNC,
            remote: null
          };
        }
        var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

        if (branchObj.state === BRANCH_STATES.SYNC || branchObj.state === BRANCH_STATES.AHEAD) {
          project.getBranchHash(branch, oldhash, function (err, newhash, forkedhash) {
            if (!err && newhash) {
              branchObj.remote = newhash;
            }
            switch (branchObj.state) {
              case BRANCH_STATES.SYNC:
                callback(err, newhash, forkedhash);
                break;
              case BRANCH_STATES.AHEAD:
                if (err) {
                  callback(err, newhash, forkedhash);
                } else {
                  var index = branchObj.unackedSentHashes.indexOf(newhash);
                  if (newhash && index !== -1) {
                    callback(err, newhash, forkedhash);
                  } else {
                    //we forked!!!
                    branchObj.state = BRANCH_STATES.FORKED;
                    branchObj.fork = newhash;
                    callback(null, branchObj.local[0], branchObj.fork);
                  }
                }
                break;
              case BRANCH_STATES.DISCONNECTED:
                callback(null, branchObj.local[0], branchObj.fork);
                break;
              default://forked
                callback(null, branchObj.local[0], branchObj.fork);
                break;
            }
          });
        } else {
          //served locally
          ASSERT((branchObj.local[0] && branchObj.local[0] !== "") || branchObj.remote);
          var myhash = null;
          if (branchObj.local[0]) {
            myhash = branchObj.local[0];
          } else {
            myhash = branchObj.remote;
          }

          if (myhash === oldhash) {
            setTimeout(function () {
              callback(null, oldhash, branchObj.fork);
            }, options.timeout);
          } else {
            callback(null, myhash, branchObj.fork);
          }

        }
      }

      function setBranchHash(branch, oldhash, newhash, callback) {
        ASSERT(typeof oldhash === 'string' && typeof newhash === 'string');
        if (!pendingStorage[projectName][BRANCH_OBJ_ID][branch]) {
          pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {
            local: [],
            fork: null,
            state: BRANCH_STATES.SYNC
          };
        }
        var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

        var returnFunction = function (err) {
          if (!err) {
            var index = branchObj.local.indexOf(newhash);
            ASSERT(index !== -1 || branchObj.state === BRANCH_STATES.SYNC);
            if (index !== -1) {
              branchObj.local.splice(index, branchObj.local.length - index);
            }
            index = branchObj.unackedSentHashes.indexOf(newhash);
            if (index !== -1) {
              branchObj.unackedSentHashes.splice(index + 1, branchObj.unackedSentHashes.length);
            }
            if (branchObj.local.length === 0) {
              branchObj.state = BRANCH_STATES.SYNC;
            }
          } else {
            /*//we go to disconnected state
             ASSERT(branchObj.local.length > 0);
             if(branchObj.state !== BRANCH_STATES.DISCONNECTED){
             branchObj.state = BRANCH_STATES.DISCONNECTED;
             var reSyncBranch = function(err,newhash,forkedhash){
             if(!err && newhash){
             if(branchObj.local.indexOf(newhash) === -1){
             //we forked
             branchObj.fork = newhash;
             branchObj.state = BRANCH_STATES.FORKED;
             } else {
             setBranchHash(branch,newhash,branchObj.local[0],function(){});
             }
             } else {
             //timeout or something not correct, so we should retry
             project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
             }
             };
             project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
             }*/
            //we have ancountered an error
            errorMode();
          }
        };

        switch (branchObj.state) {
          case BRANCH_STATES.SYNC:
            ASSERT(branchObj.local.length === 0);
            branchObj.state = BRANCH_STATES.AHEAD;
            branchObj.local = [newhash, oldhash];
            branchObj.unackedSentHashes = [newhash, oldhash];
            project.setBranchHash(branch, oldhash, newhash, returnFunction);
            callback(null);
            return;
          case BRANCH_STATES.AHEAD:
            ASSERT(branchObj.local.length > 0);
            if (oldhash === branchObj.local[0]) {
              branchObj.local.unshift(newhash);
              branchObj.unackedSentHashes.unshift(newhash);
              project.setBranchHash(branch, oldhash, newhash, returnFunction);
              callback(null);
            } else {
              callback(new Error("branch hash mismatch"));
            }
            return;
          case BRANCH_STATES.DISCONNECTED:
            /*ASSERT(branchObj.local.length > 0 || branchObj.remote);
             if(oldhash === branchObj.local[0] || oldhash === branchObj.remote){
             if(branchObj.local.length === 0){
             branchObj.local = [newhash,oldhash];
             } else {
             branchObj.local.unshift(newhash);
             }
             callback(null);
             } else {
             callback(new Error("branch hash mismatch"));
             }*/
            if (branchObj.local.length === 0) {
              branchObj.local = [newhash, oldhash];
              callback(null);
            } else {
              if (oldhash === branchObj.local[0]) {
                branchObj.local.unshift(newhash);
                callback(null);
              } else {
                callback(new Error("branch hash mismatch"));
              }
            }
            return;
          default: //BRANCH_STATES.FORKED
            ASSERT(branchObj.local.length > 0 && branchObj.fork);
            if (oldhash === branchObj.local[0]) {
              if (branchObj.fork === newhash) {
                //clearing the forked leg
                branchObj.fork = null;
                branchObj.state = BRANCH_STATES.SYNC;
                branchObj.local = [];
              } else {
                branchObj.local.unshift(newhash);
              }
              callback(null);
            } else {
              callback(new Error("branch hash mismatch"));
            }
            return;
        }
      }
    }

    return {
      openDatabase: openDatabase,
      closeDatabase: _database.closeDatabase,
      fsyncDatabase: _database.fsyncDatabase,
      getProjectNames: _database.getProjectNames,
      getAllowedProjectNames: _database.getAllowedProjectNames,
      getAuthorizationInfo: _database.getAuthorizationInfo,
      getDatabaseStatus: _database.getDatabaseStatus,
      openProject: openProject,
      deleteProject: _database.deleteProject,
      simpleRequest: _database.simpleRequest,
      simpleResult: _database.simpleResult,
      simpleQuery: _database.simpleQuery,
      getNextServerEvent: _database.getNextServerEvent,
      getToken: _database.getToken
    };
  }

  return Database;
});
