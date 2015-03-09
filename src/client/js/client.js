/*globals define, _, requirejs, WebGMEGlobal, GME*/

define([
    'util/assert',
    'eventDispatcher',
    'util/guid',
    'core/core',
    'storage/clientstorage',
    'logManager',
    'util/url',
    'coreclient/meta',
    'coreclient/tojson',
    'coreclient/dump',
    'coreclient/dumpmore',
    'coreclient/import',
    'coreclient/copyimport',
    'coreclient/serialization',
    'core/tasync'
  ],
  function (
    ASSERT,
    EventDispatcher,
    GUID,
    Core,
    Storage,
    LogManager,
    URL,
    BaseMeta,
    ToJson,
    Dump,
    DumpMore,
    MergeImport,
    Import,
    Serialization,
    TASYNC) {

    "use strict";

    var ROOT_PATH = '';

    function COPY(object) {
      if (object) {
        return JSON.parse(JSON.stringify(object));
      }
      return null;
    }


    function getNewCore(project, gmeConfig) {
      //return new NullPointerCore(new DescriptorCore(new SetCore(new GuidCore(new Core(project)))));
      var options = {autopersist: true, usertype: 'nodejs', globConf: gmeConfig};
      return Core(project, options);
    }

    function UndoRedo(_client) {
      var
        currentModification = null,
        canDoUndo = false,
        canDoRedo = false,
        currentTarget = null,
        addModification = function (commitHash, info) {
          var newElement = {
            previous: currentModification,
            commit: commitHash,
            info: info,
            next: null
          };
          if(currentModification){
              currentModification.next = newElement;
          }
          currentModification = newElement;
        },
        undo = function (branch, callback) {
          var from, to, project;
          if (canDoUndo && currentModification && currentModification.previous) {
            project = _client.getProjectObject();
            from = currentModification.commit;
            to = currentModification.previous.commit;
            currentModification = currentModification.previous;
            currentTarget = to;
            project.setBranchHash(branch, from, to, callback);
          } else {
            callback(new Error('unable to execute undo'));
          }
        },
        redo = function (branch, callback) {
          var from, to, project;
          if (canDoRedo && currentModification && currentModification.next) {
            project = _client.getProjectObject();
            from = currentModification.commit;
            to = currentModification.next.commit;
            currentModification = currentModification.next;
            currentTarget = to;
            project.setBranchHash(branch, from, to, callback);
          } else {
            callback(new Error('unable to execute redo'));
          }
        },
        clean = function() {
          currentModification = null;
          canDoUndo = false;
          canDoRedo = false;
        },
        checkStatus = function(){
          return {
            undo: currentModification ? currentModification.previous !== null && currentModification.previous !== undefined : false,
            redo: currentModification ? currentModification.next !== null && currentModification.next !== undefined : false
          };
        },
        isCurrentTarget = function(commitHash){
          if(currentTarget === commitHash){
            currentTarget = null;
            return true;
          }
          return false;
        };

      _client.addEventListener(_client.events.UNDO_AVAILABLE,function(client,parameters){
        canDoUndo = parameters === true;
      });
      _client.addEventListener(_client.events.REDO_AVAILABLE,function(client,parameters){
        canDoRedo = parameters === true;
      });
      return {
        undo: undo,
        redo: redo,
        addModification: addModification,
        clean: clean,
        checkStatus: checkStatus,
        isCurrentTarget: isCurrentTarget
      };

    }

    function Client(_configuration) {
      var _self = this,
        logger = LogManager.create("client"),
        _database = null,
        _projectName = null,
        _project = null,
        _core = null,
        _branch = null,
        _branchState = null,
        _nodes = {},
        _metaNodes = {},
        _inTransaction = false,
        _users = {},
        _patterns = {},
        _networkStatus = '',
        _msg = "",
        _recentCommits = [],
        _viewer = false,
        _readOnlyProject = false,
        _loadNodes = {},
        _loadError = 0,
        _commitCache = null,
        _offline = false,
        _networkWatcher = null,
        _TOKEN = null,
        META = new BaseMeta(),
        _rootHash = null,
        _previousRootHash = null,
        _changeTree = null,
        _inheritanceHash = {},
        _root = null,
        _gHash = 0,
        _addOns = {},
        _constraintCallback = null,
        _redoer = null,
        _selfCommits = {},
        gmeConfig = _configuration.globConf,
        AllPlugins, AllDecorators;


      if (!_configuration.host) {
        if (window) {
          _configuration.host = window.location.protocol + "//" + window.location.host;
        } else {
          _configuration.host = "";
        }
      }
      if(typeof TESTING === 'undefined') {
        require([_configuration.host + '/listAllDecorators', _configuration.host + '/listAllPlugins'], function (d, p) {
          AllDecorators = WebGMEGlobal.allDecorators;
          AllPlugins = WebGMEGlobal.allPlugins;
        });
      } else {
        console.warn('TESTING is defined - we are not getting plugins and decorators.');
      }




      function print_nodes(pretext) {
        if (pretext) {
          console.log(pretext);
        }
        var nodes = "loaded: ";
        for (var k in _loadNodes) {
          nodes += "(" + k + "," + _loadNodes[k].hash + ")";
        }
        console.log(nodes);
        nodes = "stored: ";
        for (var k in _nodes) {
          nodes += "(" + k + "," + _nodes[k].hash + ")";
        }
        console.log(nodes);
        return;
      }

      //default configuration
        //FIXME: Are these gme options or not??
      _configuration = _configuration || {};
      _configuration.autoreconnect = _configuration.autoreconnect === null || _configuration.autoreconnect === undefined ? true : _configuration.autoreconnect;
      _configuration.reconndelay = _configuration.reconndelay || 1000;
      _configuration.reconnamount = _configuration.reconnamount || 1000;
      _configuration.autostart = _configuration.autostart === null || _configuration.autostart === undefined ? false : _configuration.autostart;

      //if( typeof GME !== 'undefined'){
      //  GME.config = GME.config || {};
      //  GME.config.keyType = _configuration.storageKeyType;
      //}
      //
      //if( typeof WebGMEGlobal !== 'undefined'){
      //  WebGMEGlobal.config = WebGMEGlobal.config || {};
      //  WebGMEGlobal.config.keyType = _configuration.storageKeyType;
      //}

      //TODO remove the usage of jquery
      //$.extend(_self, new EventDispatcher());
      var eDisp = new EventDispatcher();
      for (var i in eDisp) {
        _self[i] = eDisp[i];
      }
      _self.events = {
        "NETWORKSTATUS_CHANGED": "NETWORKSTATUS_CHANGED",
        "BRANCHSTATUS_CHANGED": "BRANCHSTATUS_CHANGED",
        "BRANCH_CHANGED": "BRANCH_CHANGED",
        "PROJECT_CLOSED": "PROJECT_CLOSED",
        "PROJECT_OPENED": "PROJECT_OPENED",

        "SERVER_PROJECT_CREATED": "SERVER_PROJECT_CREATED",
        "SERVER_PROJECT_DELETED": "SERVER_PROJECT_DELETED",
        "SERVER_BRANCH_CREATED": "SERVER_BRANCH_CREATED",
        "SERVER_BRANCH_UPDATED": "SERVER_BRANCH_UPDATED",
        "SERVER_BRANCH_DELETED": "SERVER_BRANCH_DELETED",

        "UNDO_AVAILABLE": "UNDO_AVAILABLE",
        "REDO_AVAILABLE": "REDO_AVAILABLE"
      };
      _self.networkStates = {
        'CONNECTED': "connected",
        'DISCONNECTED': "socket.io is disconnected"
      };
      _self.branchStates = {
        'SYNC': 'inSync',
        'FORKED': 'forked',
        'OFFLINE': 'offline'
      };

      function getUserId() {
        var cookies = URL.parseCookie(document.cookie);
        if (cookies.webgme) {
          return cookies.webgme;
        } else {
          return 'n/a';
        }
      }

      function newDatabase() {
        var storageOptions ={log: LogManager.create('client-storage'), host: _configuration.host},
            protocolStr;
        if(typeof TESTING !== 'undefined'){
          protocolStr = gmeConfig.server.https.enable ? 'https' : 'http';
          storageOptions.type = 'node';
          storageOptions.host = protocolStr + '://localhost';
          storageOptions.port = gmeConfig.server.port;
          storageOptions.user = 'TEST';
        } else {
          storageOptions.user = getUserId();
        }
        storageOptions.globConf = gmeConfig;
        return Storage(storageOptions);
      }

      function changeBranchState(newstate) {
        if (_branchState !== newstate) {
          _branchState = newstate;
          _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED, _branchState);
        }
      }

      function connect() {
        //this is when the user force to go online on network level
        //TODO implement :) - but how, there is no such function on the storage's API
        if (_database) {
          _database.openDatabase(function (err) {
          });
        }
      }

      //branch handling functions
      function goOffline() {
        //TODO stop watching the branch changes
        _offline = true;
        changeBranchState(_self.branchStates.OFFLINE);
      }

      function goOnline() {
        //TODO we should try to update the branch with our latest commit
        //and 'restart' listening to branch changes
        if (_offline) {
          stopRunningAddOns();
          branchWatcher(_branch);
        }
      }

      function addCommit(commitHash) {
        _commitCache.newCommit(commitHash);
        _recentCommits.unshift(commitHash);
        if (_recentCommits.length > 100) {
          _recentCommits.pop();
        }
      }

      function serverEventer() {
        var lastGuid = '',
          nextServerEvent = function (err, guid, parameters) {
            lastGuid = guid || lastGuid;
            if (!err && parameters) {
              switch (parameters.type) {
                case "PROJECT_CREATED":
                  _self.dispatchEvent(_self.events.SERVER_PROJECT_CREATED, parameters.project);
                  break;
                case "PROJECT_DELETED":
                  _self.dispatchEvent(_self.events.SERVER_PROJECT_DELETED, parameters.project);
                  break;
                case "BRANCH_CREATED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_CREATED, {project: parameters.project, branch: parameters.branch, commit: parameters.commit});
                  break;
                case "BRANCH_DELETED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_DELETED, {project: parameters.project, branch: parameters.branch});
                  break;
                case "BRANCH_UPDATED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_UPDATED, {project: parameters.project, branch: parameters.branch, commit: parameters.commit});
                  break;
              }
              return _database.getNextServerEvent(lastGuid, nextServerEvent);
            } else {
              setTimeout(function () {
                return _database.getNextServerEvent(lastGuid, nextServerEvent);
              }, 1000);
            }
          };
        _database.getNextServerEvent(lastGuid, nextServerEvent);
      }

      //addOn functions
      function startAddOnAsync(name, projectName, branchName, callback) {
        if (_addOns[name] === undefined) {
          _addOns[name] = "loading";
          _database.simpleRequest({command: 'connectedWorkerStart', workerName: name, project: projectName, branch: branchName}, function (err, id) {
            if (err) {
              delete _addOns[name];
              return callback(err);
            }

            _addOns[name] = id;
            callback(null);
          });
        }
      }

      function startAddOn(name) {
        if (_addOns[name] === undefined) {
          _addOns[name] = "loading";
          _database.simpleRequest({command: 'connectedWorkerStart', workerName: name, project: _projectName, branch: _branch}, function (err, id) {
            if (err) {
              logger.error('starting addon failed ' + err);
              delete _addOns[name];
              return logger.error(err);
            }

            logger.debug('started addon ' + name + ' ' + id);
            _addOns[name] = id;
          });
        }

      }

      function queryAddOn(name, query, callback) {
        if (!_addOns[name] || _addOns[name] === "loading") {
          return callback(new Error('no such addOn is ready for queries'));
        }
        _database.simpleQuery(_addOns[name], query, callback);
      }

      function stopAddOn(name, callback) {
        if (_addOns[name] && _addOns[name] !== "loading") {
          _database.simpleResult(_addOns[name], callback);
          delete _addOns[name];
        } else {
          callback(_addOns[name] ? new Error("addon loading") : null);
        }
      }

      //generic project related addOn handling
      function updateRunningAddOns(root) {
        var neededAddOns = _core.getRegistry(root, "usedAddOns"),
          i,
          runningAddOns = getRunningAddOnNames();
        neededAddOns = neededAddOns ? neededAddOns.split(" ") : [];
        for (i = 0; i < neededAddOns.length; i++) {
          if (!_addOns[neededAddOns[i]]) {
            startAddOn(neededAddOns[i]);
          }
        }
        for (i = 0; i < runningAddOns.length; i++) {
          if (neededAddOns.indexOf(runningAddOns[i]) === -1) {
            stopAddOn(runningAddOns[i], function (err) {
            });
          }
        }
      }

      function stopRunningAddOns() {
        var i,
          keys = Object.keys(_addOns),
          callback = function (err) {
            if (err) {
                logger.error("stopAddOn" + err);
            }
          };
        for (i = 0; i < keys.length; i++) {
          stopAddOn(keys[i], callback);
        }
      }

      function getRunningAddOnNames() {
        var i,
          names = [],
          keys = Object.keys(_addOns);
        for (i = 0; i < keys.length; i++) {
          if (_addOns[keys[i]] !== 'loading') {
            names.push(keys[i]);
          }
        }
        return names;
      }

      //core addOns
      function startCoreAddOnsAsync(project, branch, callback) {
        var needed = 2,
          error = null,
          icb = function (err) {
            error = error || err;
            if (--needed === 0) {
              callback(error);
            }
          };

        startHistoryAsync(project, branch, icb);
        startConstraintAsync(project, branch, icb);
      }

      //history
      function startHistoryAsync(project, branch, callback) {
        if (_addOns['HistoryAddOn'] && _addOns['HistoryAddOn'] !== 'loading') {
          stopAddOn('HistoryAddOn', function (err) {
            if (err) {
              callback(err);
            } else {
              startAddOnAsync('HistoryAddOn', project, branch, callback);
            }
          });
        } else {
          startAddOnAsync('HistoryAddOn', project, branch, callback);
        }
      }

      function getDetailedHistoryAsync(callback) {
        if (_addOns['HistoryAddOn'] && _addOns['HistoryAddOn'] !== 'loading') {
          queryAddOn('HistoryAddOn', {}, callback);
        } else {
          callback(new Error('history information is not available'));
        }
      }

      //constraint
      function startConstraintAsync(project, branch, callback) {
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          stopAddOn('ConstraintAddOn', function (err) {
            if (err) {
              callback(err);
            } else {
              startAddOnAsync('ConstraintAddOn', project, branch, callback);
            }
          });
        } else {
          startAddOnAsync('ConstraintAddOn', project, branch, callback);
        }
      }

      function validateProjectAsync(callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkProject'}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function validateModelAsync(path, callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkModel', path: path}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function validateNodeAsync(path, callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkNode', path: path}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function setValidationCallback(cFunction) {
        if (typeof cFunction === 'function' || cFunction === null) {
          _constraintCallback = cFunction;
        }
      }

      //core addOns end

      function tokenWatcher() {
        var token = null,
          refreshToken = function () {
            _database.getToken(function (err, t) {
              if (!err) {
                token = t || "_";
              }
            });
          },
          getToken = function () {
            return token;
          };

        setInterval(refreshToken, 10000); //maybe it could be configurable
        refreshToken();

        //TODO check if this is okay to set it here
        if(typeof WebGMEGlobal !== 'undefined') {
           WebGMEGlobal.getToken = getToken;
        }
        return {
          getToken: getToken
        };
      }

      function branchWatcher(branch, callback) {
        ASSERT(_project);
        callback = callback || function () {
        };
        var myCallback = function(err){
          myCallback = function(){};
          callback(err);
        };
        var redoerNeedsClean = true;
        var branchHashUpdated = function (err, newhash, forked) {
          var doUpdate = false;
          if (branch === _branch && !_offline) {
            if (!err && typeof newhash === 'string') {
              if (newhash === '') {
                logger.warning('The current branch ' + branch + ' have been deleted!');
                //we should open a viewer with our current commit...
                var latestCommit = _recentCommits[0];
                viewerCommit(latestCommit, function (err) {
                  if (err) {
                    logger.error('Current branch ' + branch + ' have been deleted, and unable to open the latest commit ' + latestCommit + '! [' + JSON.stringify(err) + ']');
                  }
                });
              } else {
                if(_redoer.isCurrentTarget(newhash)){
                  addCommit(newhash);
                  doUpdate = true;
                } else if(!_selfCommits[newhash] || redoerNeedsClean){
                  redoerNeedsClean = false;
                  _redoer.clean();
                  _redoer.addModification(newhash,"branch initial");
                  _selfCommits={};
                  _selfCommits[newhash] = true;
                  doUpdate = true;
                  addCommit(newhash);
                }
                var redoInfo = _redoer.checkStatus(),
                  canUndo = false,
                  canRedo = false;

                if(_selfCommits[newhash]){
                  if(redoInfo.undo) {
                    canUndo = true;
                  }
                  if(redoInfo.redo) {
                    canRedo = true;
                  }
                }
                _self.dispatchEvent(_self.events.UNDO_AVAILABLE, canUndo);
                _self.dispatchEvent(_self.events.REDO_AVAILABLE, canRedo);

                if(doUpdate){
                  _project.loadObject(newhash, function (err, commitObj) {
                    if (!err && commitObj) {
                      loading(commitObj.root,myCallback);
                    } else {
                      setTimeout(function () {
                        _project.loadObject(newhash, function (err, commitObj) {
                          if (!err && commitObj) {
                            loading(commitObj.root,myCallback);
                          } else {
                            console.log("second load try failed on commit!!!", err);
                          }
                        });
                      }, 1000);
                    }
                  });
                }

                //branch status update
                if (_offline) {
                  changeBranchState(_self.branchStates.OFFLINE);
                } else {
                  if (forked) {
                    changeBranchState(_self.branchStates.FORKED);
                  }
                }

                return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);

                /*if(redoerNeedsClean || !_selfCommits[newhash]){
                  redoerNeedsClean = false;
                  _redoer.clean();
                  _redoer.addModification(newhash,"branch initial");
                  _selfCommits={};_selfCommits[newhash] = true;
                };
                var redoInfo = _redoer.checkStatus(),
                  canUndo = false,
                  canRedo = false;

                if(_selfCommits[newhash]){
                  if(redoInfo.undo) {
                    canUndo = true;
                  }
                  if(redoInfo.redo) {
                    canRedo = true;
                  }
                }
                _self.dispatchEvent(_self.events.UNDO_AVAILABLE, canUndo);
                _self.dispatchEvent(_self.events.REDO_AVAILABLE, canRedo);


                if (/*_recentCommits.indexOf(newhash) === -1/_recentCommits.indexOf(newhash) !== 0) {

                  addCommit(newhash);

                  //TODO here we have to start with a syncronous root object load...
                  _project.loadObject(newhash, function (err, commitObj) {
                    if (!err && commitObj) {
                      loading(commitObj.root);
                    } else {
                      setTimeout(function () {
                        _project.loadObject(newhash, function (err, commitObj) {
                          if (!err && commitObj) {
                            loading(commitObj.root);
                          } else {
                            console.log("second load try failed on commit!!!", err);
                          }
                        });
                      }, 1000);
                    }
                  });
                }

                if (callback) {
                  myCallback = callback;
                  callback = null;
                  myCallback();
                }

                //branch status update
                if (_offline) {
                  changeBranchState(_self.branchStates.OFFLINE);
                } else {
                  if (forked) {
                    changeBranchState(_self.branchStates.FORKED);
                  }
                  /* else {
                   changeBranchState(_self.branchStates.SYNC);
                   }/
                }

                return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);*/
              }
            } else {
              myCallback(null);
              return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
            }
          } else {
            myCallback(null);
          }
        };

        if (_branch !== branch) {
          _branch = branch;
          _viewer = false;
          _offline = false;
          _recentCommits = [""];
          _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
          changeBranchState(_self.branchStates.SYNC);
          _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
        } else {
          if (_offline) {
            _viewer = false;
            _offline = false;
            changeBranchState(_self.branchStates.SYNC);
            _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
          } else {
            callback(null);
          }
        }
      }

      function networkWatcher() {
        _networkStatus = "";
        var running = true;
        //FIXME: Are these gme options or not??
        var autoReconnect = _configuration.autoreconnect ? true : false;
        var reConnDelay = _configuration.reconndelay || 1000;
        var reConnAmount = _configuration.reconnamount || 1000;
        var reconnecting = function () {
          var counter = 0;
          var timerId = setInterval(function () {
            if (counter < reConnAmount && _networkStatus === _self.networkStates.DISCONNECTED && running) {
              _database.openDatabase(function (err) {
              });
              counter++;
            } else {
              clearInterval(timerId);
            }
          }, reConnDelay);
        };
        var dbStatusUpdated = function (err, newstatus) {
          if (running) {
            if (!err && newstatus && _networkStatus !== newstatus) {
              _networkStatus = newstatus;
              if (_networkStatus === _self.networkStates.DISCONNECTED && autoReconnect) {
                reconnecting();
              }
              _self.dispatchEvent(_self.events.NETWORKSTATUS_CHANGED, _networkStatus);
            }
            return _database.getDatabaseStatus(_networkStatus, dbStatusUpdated);
          }
          return;
        };
        var stop = function () {
          running = false;
        }
        _database.getDatabaseStatus('', dbStatusUpdated);

        return {
          stop: stop
        };
      }

      function commitCache() {
        var _cache = {},
          _timeOrder = [];

        function clearCache() {
          _cache = {};
          _timeOrder = [];
        }

        function addCommit(commitObject) {
          if (_cache[commitObject._id]) {
            //already in the cache we do not have to do anything
            return;
          } else {
            _cache[commitObject._id] = commitObject;
            var index = 0;
            while (index < _timeOrder.length && _cache[_timeOrder[index]].time > commitObject.time) {
              index++;
            }
            _timeOrder.splice(index, 0, commitObject._id);
          }
          return;
        }

        function getNCommitsFrom(commitHash, number, callback) {
          var fillCache = function (time, number, cb) {
            _project.getCommits(time, number, function (err, commits) {
              if (!err && commits) {
                for (var i = 0; i < commits.length; i++) {
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
          var returnNCommitsFromHash = function (hash, num, cb) {
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
          var cacheFilled = function (err) {
            if (err) {
              callback(err);
            } else {
              returnNCommitsFromHash(commitHash, number, callback);
            }
          };


          if (commitHash) {
            if (_cache[commitHash]) {
              //we can be lucky :)
              var index = _timeOrder.indexOf(commitHash);
              if (_timeOrder.length > index + number) {
                //we are lucky
                cacheFilled(null);
              } else {
                //not that lucky
                fillCache(_cache[_timeOrder[_timeOrder.length - 1]].time, number - (_timeOrder.length - (index + 1)), cacheFilled);
              }
            } else {
              //we are not lucky enough so we have to download the commit
              _project.loadObject(commitHash, function (err, commitObject) {
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
          } else {
            _project.loadObject(commitHash, function (err, commitObj) {
              if (!err && commitObj) {
                addCommit(commitObj);
              }
              return;
            });
          }
        }

        return {
          getNCommitsFrom: getNCommitsFrom,
          clearCache: clearCache,
          newCommit: newCommit
        };
      }

      function viewLatestCommit(callback) {
        _commitCache.getNCommitsFrom(null, 1, function (err, commits) {
          if (!err && commits && commits.length > 0) {
            viewerCommit(commits[0][_project.ID_NAME], callback)
          } else {
            logger.error('Cannot get latest commit! [' + JSON.stringify(err) + ']');
            callback(err);
          }
        });
      }

      function openProject(name, callback) {
        //this function cannot create new project
        ASSERT(_database);
        var waiting = 1,
          innerCallback = function (err) {
            error = error || err;
            if (--waiting === 0) {
              if (error) {
                logger.error('The branch ' + firstName + ' of project ' + name + ' cannot be selected! [' + JSON.stringify(error) + ']');
              }
              callback(error);
            }
          },
          firstName = null,
          error = null;
        _database.getProjectNames(function (err, names) {
          if (err) {
            return callback(err);
          }
          if (names.indexOf(name) !== -1) {
            _database.openProject(name, function (err, p) {
              if (!err && p) {
                _database.getAuthorizationInfo(name, function (err, authInfo) {
                  _readOnlyProject = authInfo ? (authInfo.write === true ? false : true) : true;
                  _project = p;
                  _projectName = name;
                  _inTransaction = false;
                  _nodes = {};
                  _metaNodes = {};
                  _core = getNewCore(_project, gmeConfig);
                  META.initialize(_core, _metaNodes, saveRoot);
                  if (_commitCache) {
                    _commitCache.clearCache();
                  } else {
                    _commitCache = commitCache();
                  }
                  _self.dispatchEvent(_self.events.PROJECT_OPENED, _projectName);

                  //check for master or any other branch
                  _project.getBranchNames(function (err, names) {
                    if (!err && names) {

                      if (names['master']) {
                        firstName = 'master';
                      } else {
                        firstName = Object.keys(names)[0] || null;
                      }

                      if (firstName) {
                        stopRunningAddOns();
                        branchWatcher(firstName, innerCallback);
                        //startCoreAddOnsAsync(_projectName,firstName,innerCallback);
                      } else {
                        //we should try the latest commit
                        viewLatestCommit(callback);
                      }
                    } else {
                      //we should try the latest commit
                      viewLatestCommit(callback);
                    }
                  });
                });
              } else {
                logger.error('The project ' + name + ' cannot be opened! [' + JSON.stringify(err) + ']');
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no such project'));
          }

        });
      }

      //internal functions
      function cleanUsersTerritories() {
        for (var i in _users) {
          var events = [];
          for (var j in _users[i].PATHS) {
            events.push({etype: 'unload', eid: j});
          }
          // TODO events.push({etype:'complete',eid:null});


          _users[i].FN(events);
          _users[i].PATTERNS = {};
          _users[i].PATHS = {};
          _users[i].SENDEVENTS = true;
        }
      }

      function reLaunchUsers() {
        for (var i in _users) {
          if (_users[i].UI.reLaunch) {
            _users[i].UI.reLaunch();
          }
        }
      }

      function closeOpenedProject(callback) {
        callback = callback || function () {
        };
        var returning = function (e) {
          var oldProjName = _projectName;
          _projectName = null;
          _inTransaction = false;
          _core = null;
          _nodes = {};
          _metaNodes = {};
          //_commitObject = null;
          _patterns = {};
          _msg = "";
          _recentCommits = [];
          _previousRootHash = null;
          _rootHash = null;
          _viewer = false;
          _readOnlyProject = false;
          _loadNodes = {};
          _loadError = 0;
          _offline = false;
          cleanUsersTerritories();
          if (oldProjName) {
            //otherwise there were no open project at all
            _self.dispatchEvent(_self.events.PROJECT_CLOSED, oldProjName);
          }

          callback(e);
        };
        if (_branch) {
          //otherwise the branch will not 'change'
          _self.dispatchEvent(_self.events.BRANCH_CHANGED, null);
        }
        _branch = null;
        if (_project) {
          var project = _project;
          _project = null;
          project.closeProject(function (err) {
            //TODO what if for some reason we are in transaction???
            returning(err);
          });
        } else {
          returning(null);
        }
      }

      function createEmptyProject(project, callback) {
        var core = getNewCore(project, gmeConfig),
          root = core.createNode(),
          rootHash = '',
          commitHash = '';
        core.persist(root,function(err){
          rootHash = core.getHash(root);
          commitHash = project.makeCommit([],rootHash,'project creation commit',function(err){
            project.setBranchHash('master',"",commitHash, function (err) {
                    callback(err, commitHash);
                });
          });
        });

      }

      //loading functions
      function getStringHash(node) {
        //TODO there is a memory issue with the huge strings so we have to replace it with something
        return _gHash++;
        /*
         var datas = _core.getDataForSingleHash(node),
         i,hash="";
         for(i=0;i<datas.length;i++){
         hash+=datas[i];
         }
         return hash;
         */

      }

        function getInheritanceChain(node){
            var ancestors = [];
            node = _core.getBase(node);
            while(node){
                ancestors.push(_core.getPath(node));
                node = _core.getBase(node);
            }
            return ancestors;
        }

      function _getModifiedNodes(newerNodes){
            var modifiedNodes = [];
            for(var i in _nodes){
                if(newerNodes[i]){
                    if(newerNodes[i].hash !== _nodes[i].hash && _nodes[i].hash !== ""){
                        modifiedNodes.push(i);
                    }
                }
            }
            return modifiedNodes;
        }
        function isInChangeTree(path){
            var pathArray = path.split("/"),
                diffObj = _changeTree,
                index = 0,
                found = false;

            pathArray.shift();
            if(pathArray.length === 0){
                found = true;
            }

            if(!diffObj){
                return false;
            }

            while(index<pathArray.length && !found){
                if(diffObj[pathArray[index]]){
                    diffObj = diffObj[pathArray[index]];
                    if(++index === pathArray.length){
                        found = true;
                    }
                } else {
                    index = pathArray.length;
                }
            }

            
                if(found && diffObj){
                  if(diffObj.removed !== undefined){
                    return false;
                  }
                  if(diffObj.reg || diffObj.attr || diffObj.pointer || diffObj.set || diffObj.meta || diffObj.childrenListChanged){
                      return true;
                  }
                }
            

            return false;
        }
        /*function getModifiedNodes(newerNodes){
            var modifiedNodes = [],
                keys = Object.keys(newerNodes),
                i,found,
                inheritanceArray;
            for(i=0;i<keys.length;i++){
                found = false;
                inheritanceArray = getInheritanceChain(newerNodes[keys[i]].node);
                inheritanceArray.unshift(keys[i]);
                while(inheritanceArray.length > 0 && !found){
                    if(isInChangeTree(inheritanceArray.shift())){
                        found = true;
                        modifiedNodes.push(keys[i]);
                    }
                }
            }

            return modifiedNodes;
        }*/
        function getModifiedNodes(newerNodes) {
            var modifiedNodes = [];
            for (var i in _nodes) {
                if (newerNodes[i]) {
                    if (newerNodes[i].hash !== _nodes[i].hash && _nodes[i].hash !== "") {
                        modifiedNodes.push(i);
                    }
                }
            }
            return modifiedNodes;
        }


      //this is just a first brute implementation it needs serious optimization!!!
      function fitsInPatternTypes(path, pattern) {
        if (pattern.items && pattern.items.length > 0) {
          for (var i = 0; i < pattern.items.length; i++) {
            if (META.isTypeOf(path, pattern.items[i])) {
              return true;
            }
          }
          return false;
        } else {
          return true;
        }
      }

      function patternToPaths(patternId, pattern, pathsSoFar) {
        if (_nodes[patternId]) {
          pathsSoFar[patternId] = true;
          if (pattern.children && pattern.children > 0) {
            var children = _core.getChildrenPaths(_nodes[patternId].node);
            var subPattern = COPY(pattern);
            subPattern.children--;
            for (var i = 0; i < children.length; i++) {
              if (fitsInPatternTypes(children[i], pattern)) {
                patternToPaths(children[i], subPattern, pathsSoFar);
              }
            }
          }
        } else {
          _loadError++;
        }

      }

      function userEvents(userId, modifiedNodes) {
        var newPaths = {};
        var startErrorLevel = _loadError;
        for (var i in _users[userId].PATTERNS) {
          if (_nodes[i]) { //TODO we only check pattern if its root is there...
            patternToPaths(i, _users[userId].PATTERNS[i], newPaths);
          }
        }

        if (startErrorLevel !== _loadError) {
          return; //we send events only when everything is there correctly
        }
        var events = [];

        //deleted items
        for (i in _users[userId].PATHS) {
          if (!newPaths[i]) {
            events.push({etype: 'unload', eid: i});
          }
        }


        //added items
        for (i in newPaths) {
          if (!_users[userId].PATHS[i]) {
            events.push({etype: 'load', eid: i});
          }
        }

        //updated items
        for (i = 0; i < modifiedNodes.length; i++) {
          if (newPaths[modifiedNodes[i]]) {
            events.push({etype: 'update', eid: modifiedNodes[i]});
          }
        }

        _users[userId].PATHS = newPaths;


        //this is how the events should go
        if (events.length > 0) {
          if (_loadError > startErrorLevel) {
            events.unshift({etype: 'incomplete', eid: null});
          } else {
            events.unshift({etype: 'complete', eid: null});
          }
        } else {
          events.unshift({etype: 'complete', eid: null});
        }
        _users[userId].FN(events);
      }

      function storeNode(node, basic) {
        //basic = basic || true;
        if (node) {
          var path = _core.getPath(node);
          _metaNodes[path] = node;
          if (_nodes[path]) {
            //TODO we try to avoid this
          } else {
            _nodes[path] = {node: node, hash: ""/*,incomplete:true,basic:basic*/};
            //_inheritanceHash[path] = getInheritanceChain(node); TODO this only needed when real eventing will be reintroduce
          }
          return path;
        }
        return null;
      }

      function _loadChildrenPattern(core, nodesSoFar, node, level, callback) {
        var path = core.getPath(node);
        _metaNodes[path] = node;
        if (!nodesSoFar[path]) {
          nodesSoFar[path] = {node: node, incomplete: true, basic: true, hash: getStringHash(node)};
        }
        if (level > 0) {
          if (core.getChildrenRelids(nodesSoFar[path].node).length > 0) {
            core.loadChildren(nodesSoFar[path].node, function (err, children) {
              if (!err && children) {
                var missing = children.length;
                var error = null;
                for (var i = 0; i < children.length; i++) {
                  loadChildrenPattern(core, nodesSoFar, children[i], level - 1, function (err) {
                    error = error || err;
                    if (--missing === 0) {
                      callback(error);
                    }
                  });
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }

      //partially optimized
      function loadChildrenPattern(core, nodesSoFar, node, level, callback) {
        var path = core.getPath(node),
          childrenPaths = core.getChildrenPaths(node),
          childrenRelids = core.getChildrenRelids(node),
          missing = childrenPaths.length,
          error = null,
          i;
        _metaNodes[path] = node;
        if (!nodesSoFar[path]) {
          nodesSoFar[path] = {node: node, incomplete: true, basic: true, hash: getStringHash(node)};
        }
        if (level > 0) {
          if (missing > 0) {
            for (i = 0; i < childrenPaths.length; i++) {
              if (nodesSoFar[childrenPaths[i]]) {
                loadChildrenPattern(core, nodesSoFar, nodesSoFar[childrenPaths[i]].node, level - 1, function (err) {
                  error = error || err;
                  if (--missing === 0) {
                    callback(error);
                  }
                });
              } else {
                core.loadChild(node, childrenRelids[i], function (err, child) {
                  if (err || child === null) {
                    error = error || err;
                    if (--missing === 0) {
                      callback(error);
                    }
                  } else {
                    loadChildrenPattern(core, nodesSoFar, child, level - 1, function (err) {
                      error = error || err;
                      if (--missing === 0) {
                        callback(error);
                      }
                    });
                  }
                });
              }
            }
          } else {
            callback(error);
          }
        } else {
          callback(error);
        }
      }

      function loadPattern(core, id, pattern, nodesSoFar, callback) {
        var base = null;
        var baseLoaded = function () {
          if (pattern.children && pattern.children > 0) {
            var level = pattern.children;
            loadChildrenPattern(core, nodesSoFar, base, level, callback);
          } else {
            callback(null);
          }
        };

        if (nodesSoFar[id]) {
          base = nodesSoFar[id].node;
          baseLoaded();
        } else {
          base = null;
          if (_loadNodes[ROOT_PATH]) {
            base = _loadNodes[ROOT_PATH].node;
          } else if (_nodes[ROOT_PATH]) {
            base = _nodes[ROOT_PATH].node;
          }
          core.loadByPath(base, id, function (err, node) {
            if (!err && node && !core.isEmpty(node)) {
              var path = core.getPath(node);
              _metaNodes[path] = node;
              if (!nodesSoFar[path]) {
                nodesSoFar[path] = {node: node, incomplete: false, basic: true, hash: getStringHash(node)};
              }
              base = node;
              baseLoaded();
            } else {
              callback(err);
            }
          });
        }
      }

      function orderStringArrayByElementLength(strArray) {
        var ordered = [],
          i, j, index;

        for (i = 0; i < strArray.length; i++) {
          index = -1;
          j = 0;
          while (index === -1 && j < ordered.length) {
            if (ordered[j].length > strArray[i].length) {
              index = j;
            }
            j++;
          }

          if (index === -1) {
            ordered.push(strArray[i]);
          } else {
            ordered.splice(index, 0, strArray[i]);
          }
        }
        return ordered;
      }
      function getEventTree(oldRootHash,newRootHash,callback){
                var error = null,
                    sRoot = null,
                    tRoot = null,
                    start = new Date().getTime(),
                    loadRoot = function(hash,root){
                        _core.loadRoot(hash,function(err,r){
                            error = error || err;
                            if(sRoot === null && hash === oldRootHash){
                                sRoot = r;
                            } else {
                                tRoot = r;
                            }
                            if(--needed === 0){
                                rootsLoaded();
                            }
                        });

                    },
                    rootsLoaded = function(){
                        if(error){
                            return callback(error);
                        }
                        _core.generateLightTreeDiff(sRoot,tRoot,function(err,diff){
              //console.log('genDiffTree',new Date().getTime()-start);
              //console.log('diffTree',JSON.stringify(diff,null,2));
                            callback(err,diff);
                        });
                    },
                    needed = 2;
                loadRoot(oldRootHash,sRoot);
                loadRoot(newRootHash,tRoot);
        }

        function loadRoot(newRootHash,callback){
            //with the newer approach we try to optimize a bit the mechanizm of the loading and try to get rid of the paralellism behind it
            var patterns = {},
                orderedPatternIds = [],
                error = null,
                i, j,keysi,keysj,
                loadNextPattern = function(index){
                    if(index<orderedPatternIds.length){
                        loadPattern(_core,orderedPatternIds[index],patterns[orderedPatternIds[index]],_loadNodes,function(err){
                            error = error || err;
                            loadNextPattern(index+1);
                        });
                    } else {
                        callback(error);
                    }
                };
            _loadNodes = {};
            _loadError = 0;

        //gathering the patterns
        keysi = Object.keys(_users);
        for (i = 0; i < keysi.length; i++) {
          keysj = Object.keys(_users[keysi[i]].PATTERNS);
          for (j = 0; j < keysj.length; j++) {
            if (patterns[keysj[j]]) {
              //we check if the range is bigger for the new definition
              if (patterns[keysj[j]].children < _users[keysi[i]].PATTERNS[keysj[j]].children) {
                patterns[keysj[j]].children = _users[keysi[i]].PATTERNS[keysj[j]].children;
              }
            } else {
              patterns[keysj[j]] = _users[keysi[i]].PATTERNS[keysj[j]];
            }
          }
        }
        //getting an ordered key list
        orderedPatternIds = Object.keys(patterns);
        orderedPatternIds = orderStringArrayByElementLength(orderedPatternIds);


        //and now the one-by-one loading
        _core.loadRoot(newRootHash, function (err, root) {
          ASSERT(err || root);
          _root = root;
          error = error || err;
          if (!err) {
            //TODO here is the point where we can start / stop our addOns - but we will not wait for them to start
            updateRunningAddOns(root);
            _loadNodes[_core.getPath(root)] = {node: root, incomplete: true, basic: true, hash: getStringHash(root)};
            _metaNodes[_core.getPath(root)] = root;
            if (orderedPatternIds.length === 0 && Object.keys(_users) > 0) {
              //we have user, but they do not interested in any object -> let's relaunch them :D
              callback(null);
              reLaunchUsers();
            } else {
                var _loadPattern = TASYNC.throttle(TASYNC.wrap(loadPattern), 1);
                var fut = TASYNC.lift(
                    orderedPatternIds.map(function (pattern, index) {
                        return TASYNC.apply(_loadPattern, [_core, pattern, patterns[pattern], _loadNodes], this);
                    }));
                TASYNC.unwrap(function() { return fut; })(callback);
            }
          } else {
            callback(err);
          }
        });
      }

      //this is just a first brute implementation it needs serious optimization!!!
      function loading(newRootHash,callback){
        var finalEvents = function () {
          var modifiedPaths;
          modifiedPaths = getModifiedNodes(_loadNodes);
          _nodes = _loadNodes;
          _loadNodes = {};
          for (var i in _users) {
            userEvents(i, modifiedPaths);
          }
          callback(null);
        };
        callback = callback || function(err){};
        _previousRootHash = _rootHash;
        _rootHash = newRootHash;
        /*if(_previousRootHash){
          getEventTree(_previousRootHash,_rootHash,function(err,diffTree){
            if(err){
              _rootHash = null;
              callback(err);
            } else {
              _changeTree = diffTree;
              loadRoot(newRootHash,function(err){
                if(err){
                  _rootHash = null;
                  callback(err);
                } else {
                  finalEvents();
                }
              });
            }
          });

        } else {
          loadRoot(newRootHash,function(err){
            if(err){
              _rootHash = null;
              callback(err);
            } else {
              finalEvents();
            }
          });
        }*/
          loadRoot(newRootHash,function(err){
              if(err){
                  _rootHash = null;
                  callback(err);
              } else {
                  finalEvents();
              }
          });
      }

      function saveRoot(msg, callback) {
        callback = callback || function () {
        };
        if (!_viewer && !_readOnlyProject) {
          if (_msg) {
            _msg += "\n" + msg;
          } else {
            _msg += msg;
          }
          if (!_inTransaction) {
            ASSERT(_project && _core && _branch);
            _core.persist(_nodes[ROOT_PATH].node, function (err) {
            });
            var newRootHash = _core.getHash(_nodes[ROOT_PATH].node);
            var newCommitHash = _project.makeCommit([_recentCommits[0]], newRootHash, _msg, function (err) {
              //TODO now what??? - could we end up here?
            });
            _msg = "";
            addCommit(newCommitHash);
            _selfCommits[newCommitHash] = true;
            _redoer.addModification(newCommitHash,"");
            _project.setBranchHash(_branch, _recentCommits[1], _recentCommits[0], function (err) {
              //TODO now what??? - could we screw up?
              loading(newRootHash);
              callback(err);
            });
            //loading(newRootHash);
          }
        } else {
          _msg = "";
        }
      }

      function getActiveProject() {
        return _projectName;
      }

      function getAvailableProjectsAsync(callback) {
        if (_database) {
          _database.getProjectNames(callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getViewableProjectsAsync(callback) {
        if (_database) {
          _database.getAllowedProjectNames(callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getProjectAuthInfoAsync(projectname, callback) {
        if (_database) {
          _database.getAuthorizationInfo(projectname, callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getFullProjectListAsync(callback) {
        _database.getProjectNames(function (err, names) {
          if (!err && names) {
            var wait = names.length || 0;
            var fullList = {};
            if (wait > 0) {
              var getProjectAuthInfo = function (name, cb) {
                _database.getAuthorizationInfo(name, function (err, authObj) {
                  if (!err && authObj) {
                    fullList[name] = authObj;
                  }
                  cb(err);
                });
              };

              for (var i = 0; i < names.length; i++) {
                getProjectAuthInfo(names[i], function (err) {
                  if (--wait === 0) {
                    callback(null, fullList);
                  }
                });
              }
            } else {
              callback(null, {});
            }
          } else {
            callback(err, {});
          }
        });
      }

      function selectProjectAsync(projectname, callback) {
        if (_database) {
          if (projectname === _projectName) {
            callback(null);
          } else {
            closeOpenedProject(function (err) {
              //TODO what can we do with the error??
              openProject(projectname, function (err) {
                //TODO is there a meaningful error which we should propagate towards user???
                if(!err){
                  reLaunchUsers();
                }
                callback(err);
              });
            });
          }
        } else {
          callback(new Error('there is no open database connection!!!'));
        }
      }

      function createProjectAsync(projectname, projectInfo, callback) {
        if (_database) {
          getAvailableProjectsAsync(function (err, names) {
            if (!err && names) {
              if (names.indexOf(projectname) === -1) {
                _database.openProject(projectname, function (err, p) {
                  if (!err && p) {
                    createEmptyProject(p, function (err, commit) {
                      if (!err && commit) {
                        //TODO currently this is just a hack
                        p.setInfo(projectInfo || {
                          visibleName:projectname,
                          description:"project in webGME",
                          tags:{}
                        },function(err){
                          callback(err);
                        });
                      } else {
                        callback(err);
                      }
                    });
                  } else {
                    callback(err);
                  }
                });
              } else {
                //TODO maybe the selectProjectAsync could be called :)
                callback('the project already exists!');
              }
            } else {
              callback(err);
            }
          });
        } else {
          callback(new Error('there is no open database connection!'));
        }

      }

      function deleteProjectAsync(projectname, callback) {
        if (_database) {
          if (projectname === _projectName) {
            closeOpenedProject();
          }
          _database.deleteProject(projectname, callback);

        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      //branching functionality
      function getBranchesAsync(callback) {
        if (_database) {
          if (_project) {
            _project.getBranchNames(function (err, names) {
              if (!err && names) {
                var missing = 0;
                var branchArray = [];
                var error = null;
                var getBranchValues = function (name) {
                  _project.getBranchHash(name, '#hack', function (err, newhash, forked) {
                    if (!err && newhash) {
                      var element = {name: name, commitId: newhash};
                      if (forked) {
                        element.sync = false;
                      } else {
                        element.sync = true;
                      }
                      branchArray.push(element);
                    } else {
                      error = error || err;
                    }

                    if (--missing === 0) {
                      callback(error, branchArray);
                    }
                  });
                };

                for (var i in names) {
                  missing++;
                }
                if (missing > 0) {
                  for (i in names) {
                    getBranchValues(i);
                  }
                } else {
                  callback(null, branchArray);
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no opened database connection!'));
        }
      }

      function viewerCommit(hash, callback) {
        //no project change
        //we stop watching branch
        //we create the core
        //we use the existing territories
        //we set viewer mode, so there will be no modification allowed to send to server...
        _branch = null;
        _viewer = true;
        _recentCommits = [hash];
        _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
        _project.loadObject(hash, function (err, commitObj) {
          if (!err && commitObj) {
            loading(commitObj.root, callback);
          } else {
            logger.error('Cannot view given ' + hash + ' commit as it\'s root cannot be loaded! [' + JSON.stringify(err) + ']');
            callback(err);
          }
        });
      }

      function selectCommitAsync(hash, callback) {
        //this should proxy to branch selection and viewer functions
        if (_database) {
          if (_project) {
            viewerCommit(hash, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function selectBranchAsync(branch, callback) {
        var waiting = 1,
          error = null,
          innerCallback = function (err) {
            error = error || err;
            if (--waiting === 0) {
              callback(error);
            }
          }
        if (_database) {
          if (_project) {
            _project.getBranchNames(function (err, names) {
              if (err) {
                return callback(err);
              }

              if (names[branch]) {
                stopRunningAddOns();
                branchWatcher(branch, innerCallback);
                //startCoreAddOnsAsync(_projectName,branch,innerCallback);
              } else {
                callback(new Error('there is no such branch!'));
              }

            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getCommitsAsync(commitHash, number, callback) {
        if (_database) {
          if (_project) {
            ASSERT(_commitCache);
            if (commitHash === undefined) {
              commitHash = null;
            }
            _commitCache.getNCommitsFrom(commitHash, number, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getActualCommit() {
        return _recentCommits[0];
      }

      function getActualBranch() {
        return _branch;
      }

      function getActualNetworkStatus() {
        return _networkStatus;
      }

      function getActualBranchStatus() {
        return _branchState;
      }

      function createBranchAsync(branchName, commitHash, callback) {
        //it doesn't changes anything, just creates the new branch
        if (_database) {
          if (_project) {
            _project.setBranchHash(branchName, '', commitHash, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function deleteBranchAsync(branchName, callback) {
        if (_database) {
          if (_project) {
            _project.getBranchHash(branchName, '', function (err, newhash, forkedhash) {
              if (!err && newhash) {
                if (forkedhash) {
                  _project.setBranchHash(branchName, newhash, forkedhash, function (err) {
                    if (!err) {
                      changeBranchState(_self.branchStates.SYNC);
                    }
                    callback(err);
                  });
                } else {
                  _project.setBranchHash(branchName, newhash, '', callback);
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function commitAsync(params, callback) {
        if (_database) {
          if (_project) {
            var msg = params.message || '';
            saveRoot(msg, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function connectToDatabaseAsync(options, callback) {
        var oldcallback = callback;
        callback = function (err) {
          _TOKEN = tokenWatcher();
          reLaunchUsers();
          oldcallback(err);
        }; //we add tokenWatcher start at this point
        options = options || {};
        callback = callback || function () {
        };
        options.open = (options.open !== undefined || options.open !== null) ? options.open : false;
        options.project = options.project || null;
        if (_database) {
          //we have to close the current
          closeOpenedProject(function () {
          });
          _database.closeDatabase(function () {
          });
          _networkStatus = "";
          changeBranchState(null);
        }
        _database = newDatabase();

        _database.openDatabase(function (err) {
          if (!err) {
            if (_networkWatcher) {
              _networkWatcher.stop();
            }
            _networkWatcher = networkWatcher();
            serverEventer();

            if (options.open) {
              if (options.project) {
                openProject(options.project, callback);
              } else {
                //default opening routine
                _database.getProjectNames(function (err, names) {
                  if (!err && names && names.length > 0) {
                    openProject(names[0], callback);
                  } else {
                    logger.error('Cannot get project names / There is no project on the server');
                    callback(err);
                  }
                });
              }
            } else {
              callback(null);
            }
          } else {
            logger.error('Cannot open database');
            callback(err);
          }
        });
      }

      //MGA
      function copyMoreNodes(parameters, msg) {
        var pathestocopy = [];
        if (typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
          for (var i in parameters) {
            if (i !== "parentId") {
              pathestocopy.push(i);
            }
          }

          msg = msg || 'copyMoreNodes(' + pathestocopy + ',' + parameters.parentId + ')';
          if (pathestocopy.length < 1) {
          } else if (pathestocopy.length === 1) {
            var newNode = _core.copyNode(_nodes[pathestocopy[0]].node, _nodes[parameters.parentId].node);
            storeNode(newNode);
            if (parameters[pathestocopy[0]]) {
              for (var j in parameters[pathestocopy[0]].attributes) {
                _core.setAttribute(newNode, j, parameters[pathestocopy[0]].attributes[j]);
              }
              for (j in parameters[pathestocopy[0]].registry) {
                _core.setRegistry(newNode, j, parameters[pathestocopy[0]].registry[j]);
              }
            }
            saveRoot(msg);
          } else {
            copyMoreNodesAsync(pathestocopy, parameters.parentId, function (err, copyarr) {
              if (err) {
                //rollBackModification();
              }
              else {
                for (var i in copyarr) {
                  if (parameters[i]) {
                    for (var j in parameters[i].attributes) {
                      _core.setAttribute(copyarr[i], j, parameters[i].attributes[j]);
                    }
                    for (j in parameters[i].registry) {
                      _core.setRegistry(copyarr[i], j, parameters[i].registry[j]);
                    }
                  }
                }
                saveRoot(msg);
              }
            });
          }
        } else {
          console.log('wrong parameters for copy operation - denied -');
        }
      }


      function copyMoreNodesAsync(nodePaths, parentPath, callback) {
        var checkPaths = function () {
          var result = true;
          for (var i = 0; i < nodePaths.length; i++) {
            result = result && (_nodes[nodePaths[i]] && typeof _nodes[nodePaths[i]].node === 'object');
          }
          return result;
        };

        if (_nodes[parentPath] && typeof _nodes[parentPath].node === 'object' && checkPaths()) {
          var helpArray = {},
            subPathArray = {},
            parent = _nodes[parentPath].node,
            returnArray = {};

          //creating the 'from' object
          var tempFrom = _core.createNode({parent: parent, base: _core.getTypeRoot(_nodes[nodePaths[0]].node)});
          //and moving every node under it
          for (var i = 0; i < nodePaths.length; i++) {
            helpArray[nodePaths[i]] = {};
            helpArray[nodePaths[i]].origparent = _core.getParent(_nodes[nodePaths[i]].node);
            helpArray[nodePaths[i]].tempnode = _core.moveNode(_nodes[nodePaths[i]].node, tempFrom);
            subPathArray[_core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
            delete _nodes[nodePaths[i]];
          }

          //do the copy
          var tempTo = _core.copyNode(tempFrom, parent);

          //moving back the temporary source
          for (var i = 0; i < nodePaths.length; i++) {
            helpArray[nodePaths[i]].node = _core.moveNode(helpArray[nodePaths[i]].tempnode, helpArray[nodePaths[i]].origparent);
            storeNode(helpArray[nodePaths[i]].node);
          }

          //gathering the destination nodes
          _core.loadChildren(tempTo, function (err, children) {
            if (!err && children && children.length > 0) {
              for (i = 0; i < children.length; i++) {
                if (subPathArray[_core.getRelid(children[i])]) {
                  var newNode = _core.moveNode(children[i], parent);
                  storeNode(newNode);
                  returnArray[subPathArray[_core.getRelid(children[i])]] = newNode;
                } else {
                  console.log('635 - should never happen!!!');
                }
              }
              _core.deleteNode(tempFrom);
              _core.deleteNode(tempTo);
              callback(null, returnArray);
            } else {
              //clean up the mess and return
              _core.deleteNode(tempFrom);
              _core.deleteNode(tempTo);
              callback(err, {});
            }
          });
        }
      }

      function _copyMoreNodes(parameters) {
        //now we will use the multiple copy function of the core
        var nodes = [],
          copiedNodes,
          i, j, paths, keys,
          parent = _nodes[parameters.parentId].node,
          resultMap = {};
        keys = Object.keys(parameters);
        keys.splice(keys.indexOf('parentId'), 1);
        paths = keys;
        for (i = 0; i < paths.length; i++) {
          nodes.push(_nodes[paths[i]].node);
        }

        copiedNodes = _core.copyNodes(nodes, parent);

        for (i = 0; i < paths.length; i++) {
          keys = Object.keys(parameters[paths[i]].attributes || {});
          for (j = 0; j < keys.length; j++) {
            _core.setAttribute(copiedNodes[i], keys[j], parameters[paths[i]].attributes[keys[j]]);
          }

          keys = Object.keys(parameters[paths[i]].registry || {});
          for (j = 0; j < keys.length; j++) {
            _core.setRegistry(copiedNodes[i], keys[j], parameters[paths[i]].registry[keys[j]]);
          }
        }


        //creating the result map and storing the nodes to our cache, so the user will know which path became which
        for (i = 0; i < paths.length; i++) {
          resultMap[paths[i]] = storeNode(copiedNodes[i]);
        }

        return resultMap;
      }

      function moveMoreNodes(parameters) {
        var pathsToMove = [],
          returnParams = {};
        for (var i in parameters) {
          if (i !== 'parentId') {
            pathsToMove.push(i);
          }
        }

        if (pathsToMove.length > 0 && typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
          for (var i = 0; i < pathsToMove.length; i++) {
            if (_nodes[pathsToMove[i]] && typeof _nodes[pathsToMove[i]].node === 'object') {
              var newNode = _core.moveNode(_nodes[pathsToMove[i]].node, _nodes[parameters.parentId].node);
              returnParams[pathsToMove[i]] = _core.getPath(newNode);
              if (parameters[pathsToMove[i]].attributes) {
                for (var j in parameters[pathsToMove[i]].attributes) {
                  _core.setAttribute(newNode, j, parameters[pathsToMove[i]].attributes[j]);
                }
              }
              if (parameters[pathsToMove[i]].registry) {
                for (var j in parameters[pathsToMove[i]].registry) {
                  _core.setRegistry(newNode, j, parameters[pathsToMove[i]].registry[j]);
                }
              }

              delete _nodes[pathsToMove[i]];
              storeNode(newNode, true);
            }
          }
        }

        return returnParams;
      }

      function createChildren(parameters, msg) {
        //TODO we also have to check out what is happening with the sets!!!
        var result = {},
          paths = [],
          nodes = [], node,
          parent = _nodes[parameters.parentId].node,
          names, i, j, index, keys, pointer,
          newChildren = [], relations = [];

        //to allow 'meaningfull' instantiation of multiple objects we have to recreate the internal relations - except the base
        paths = Object.keys(parameters);
        paths.splice(paths.indexOf('parentId'), 1);
        for (i = 0; i < paths.length; i++) {
          node = _nodes[paths[i]].node;
          nodes.push(node);
          pointer = {};
          names = _core.getPointerNames(node);
          index = names.indexOf('base');
          if (index !== -1) {
            names.splice(index, 1);
          }

          for (j = 0; j < names.length; j++) {
            index = paths.indexOf(_core.getPointerPath(node, names[j]));
            if (index !== -1) {
              pointer[names[j]] = index;
            }
          }
          relations.push(pointer);
        }

        //now the instantiation
        for (i = 0; i < nodes.length; i++) {
          newChildren.push(_core.createNode({parent: parent, base: nodes[i]}));
        }

        //now for the storage and relation setting
        for (i = 0; i < paths.length; i++) {
          //attributes
          names = Object.keys(parameters[paths[i]].attributes || {});
          for (j = 0; j < names.length; j++) {
            _core.setAttribute(newChildren[i], names[j], parameters[paths[i]].attributes[names[j]]);
          }
          //registry
          names = Object.keys(parameters[paths[i]].registry || {});
          for (j = 0; j < names.length; j++) {
            _core.setRegistry(newChildren[i], names[j], parameters[paths[i]].registry[names[j]]);
          }

          //relations
          names = Object.keys(relations[i]);
          for (j = 0; j < names.length; j++) {
            _core.setPointer(newChildren[i], names[j], newChildren[relations[i][names[j]]]);
          }

          //store
          result[paths[i]] = storeNode(newChildren[i]);

        }

        msg = msg || 'createChildren(' + JSON.stringify(result) + ')';
        saveRoot(msg);
        return result;
      }


      function startTransaction(msg) {
        if (_core) {
          _inTransaction = true;
          msg = msg || 'startTransaction()';
          saveRoot(msg);
        }
      }

      function completeTransaction(msg, callback) {
        _inTransaction = false;
        if (_core) {
          msg = msg || 'completeTransaction()';
          saveRoot(msg, callback);
        }
      }

      function setAttributes(path, name, value, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setAttribute(_nodes[path].node, name, value);
          msg = msg || 'setAttribute(' + path + ',' + name + ',' + value + ')';
          saveRoot(msg);
        }
      }

      function delAttributes(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delAttribute(_nodes[path].node, name);
          msg = msg || 'delAttribute(' + path + ',' + name + ')';
          saveRoot(msg);
        }
      }

      function setRegistry(path, name, value, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setRegistry(_nodes[path].node, name, value);
          msg = msg || 'setRegistry(' + path + ',' + ',' + name + ',' + value + ')';
          saveRoot(msg);
        }
      }

      function delRegistry(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delRegistry(_nodes[path].node, name);
          msg = msg || 'delRegistry(' + path + ',' + ',' + name + ')';
          saveRoot(msg);
        }
      }

      function deleteNode(path, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.deleteNode(_nodes[path].node);
          //delete _nodes[path];
          msg = msg || 'deleteNode(' + path + ')';
          saveRoot(msg);
        }
      }

      function delMoreNodes(paths, msg) {
        if (_core) {
          for (var i = 0; i < paths.length; i++) {
            if (_nodes[paths[i]] && typeof _nodes[paths[i]].node === 'object') {
              _core.deleteNode(_nodes[paths[i]].node);
              //delete _nodes[paths[i]];
            }
          }
          msg = msg || 'delMoreNodes(' + paths + ')';
          saveRoot(msg);
        }
      }

      function createChild(parameters, msg) {
        var newID;

        if (_core) {
          if (typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
            var baseNode = null;
            if (_nodes[parameters.baseId]) {
              baseNode = _nodes[parameters.baseId].node || baseNode;
            }
            var child = _core.createNode({parent: _nodes[parameters.parentId].node, base: baseNode, guid: parameters.guid, relid: parameters.relid});
            if (parameters.position) {
              _core.setRegistry(child, "position", { "x": parameters.position.x || 100, "y": parameters.position.y || 100});
            } else {
              _core.setRegistry(child, "position", { "x": 100, "y": 100});
            }
            storeNode(child);
            newID = _core.getPath(child);
            msg = msg || 'createChild(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')';
            saveRoot(msg);
          }
        }

        return newID;
      }

      function makePointer(id, name, to, msg) {
        if (to === null) {
          _core.setPointer(_nodes[id].node, name, to);
        } else {


          _core.setPointer(_nodes[id].node, name, _nodes[to].node);
        }

        msg = msg || 'makePointer(' + id + ',' + name + ',' + to + ')';
        saveRoot(msg);
      }

      function delPointer(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setPointer(_nodes[path].node, name, undefined);
          msg = msg || 'delPointer(' + path + ',' + name + ')';
          saveRoot(msg);
        }
      }


      //MGAlike - set functions
      function addMember(path, memberpath, setid, msg) {
        if (_nodes[path] &&
          _nodes[memberpath] &&
          typeof _nodes[path].node === 'object' &&
          typeof _nodes[memberpath].node === 'object') {
          _core.addMember(_nodes[path].node, setid, _nodes[memberpath].node);
          msg = msg || 'addMember(' + path + ',' + memberpath + ',' + setid + ')';
          saveRoot(msg);
        }
      }

      function removeMember(path, memberpath, setid, msg) {
        if (_nodes[path] &&
          typeof _nodes[path].node === 'object') {
          _core.delMember(_nodes[path].node, setid, memberpath);
          msg = msg || 'removeMember(' + path + ',' + memberpath + ',' + setid + ')';
          saveRoot(msg);
        }
      }

      function setMemberAttribute(path, memberpath, setid, name, value, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setMemberAttribute(_nodes[path].node, setid, memberpath, name, value);
          msg = msg || 'setMemberAttribute(' + path + "," + memberpath + "," + setid + "," + name + "," + value + ")";
          saveRoot(msg);
        }
      }

      function delMemberAttribute(path, memberpath, setid, name, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delMemberAttribute(_nodes[path].node, setid, memberpath, name);
          msg = msg || 'delMemberAttribute(' + path + "," + memberpath + "," + setid + "," + name + ")";
          saveRoot(msg);
        }
      }

      function setMemberRegistry(path, memberpath, setid, name, value, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setMemberRegistry(_nodes[path].node, setid, memberpath, name, value);
          msg = msg || 'setMemberRegistry(' + path + "," + memberpath + "," + setid + "," + name + "," + value + ")";
          saveRoot(msg);
        }
      }

      function delMemberRegistry(path, memberpath, setid, name, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delMemberRegistry(_nodes[path].node, setid, memberpath, name);
          msg = msg || 'delMemberRegistry(' + path + "," + memberpath + "," + setid + "," + name + ")";
          saveRoot(msg);
        }
      }

      function createSet(path, setid, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.createSet(_nodes[path].node, setid);
          msg = msg || 'createSet(' + path + "," + setid + ")";
          saveRoot(msg);
        }
      }

      function deleteSet(path, setid, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.deleteSet(_nodes[path].node, setid);
          msg = msg || 'deleteSet(' + path + "," + setid + ")";
          saveRoot(msg);
        }
      }


      function setBase(path, basepath) {
        /*if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
         _core.setRegistry(_nodes[path].node,'base',basepath);
         saveRoot('setBase('+path+','+basepath+')');
         }*/
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object' && _nodes[basepath] && typeof _nodes[basepath].node === 'object') {
          _core.setBase(_nodes[path].node, _nodes[basepath].node);
          saveRoot('setBase(' + path + ',' + basepath + ')');
        }
      }

      function delBase(path) {
        /*if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
         _core.delRegistry(_nodes[path].node,'base');
         saveRoot('delBase('+path+')');
         }*/
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setBase(_nodes[path].node, null);
          saveRoot('delBase(' + path + ')');
        }
      }


      //constraint functions
      function setConstraint(path, name, constraintObj) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setConstraint(_nodes[path].node, name, constraintObj);
          saveRoot('setConstraint(' + path + ',' + name + ')');
        }
      }

      function delConstraint(path, name) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delConstraint(_nodes[path].node, name);
          saveRoot('delConstraint(' + path + 'name' + ')');
        }
      }

      //territory functions
      function addUI(ui, fn, guid) {
        ASSERT(fn);
        ASSERT(typeof fn === 'function');
        guid = guid || GUID();
        _users[guid] = {type: 'notused', UI: ui, PATTERNS: {}, PATHS: {}, SENDEVENTS: true, FN: fn};
        return guid;
      }

      function removeUI(guid) {
        delete _users[guid];
      }

      function _updateTerritoryAllDone(guid, patterns, error) {
        if (_users[guid]) {
          _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
          if (!error) {
            userEvents(guid, []);
          }
        }
      }

      function updateTerritory(guid, patterns) {
        if (_users[guid]) {
          if (_project) {
            if (_nodes[ROOT_PATH]) {
              //TODO: this has to be optimized
              var missing = 0;
              var error = null;

              var patternLoaded = function (err) {
                error = error || err;
                if (--missing === 0) {
                  //allDone();
                  _updateTerritoryAllDone(guid, patterns, error);
                }
              };

              //EXTRADTED OUT TO: _updateTerritoryAllDone
              /*var allDone = function(){
               if(_users[guid]){
               _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
               if(!error){
               userEvents(guid,[]);
               }
               }
               };*/
              for (var i in patterns) {
                missing++;
              }
              if (missing > 0) {
                for (i in patterns) {
                  loadPattern(_core, i, patterns[i], _nodes, patternLoaded);
                }
              } else {
                //allDone();
                _updateTerritoryAllDone(guid, patterns, error);
              }
            } else {
              //something funny is going on
              if (_loadNodes[ROOT_PATH]) {
                //probably we are in the loading process, so we should redo this update when the loading finishes
                //setTimeout(updateTerritory,100,guid,patterns);
              } else {
                //root is not in nodes and has not even started to load it yet...
                _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
              }
            }
          } else {
            //we should update the patterns, but that is all
            _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
          }
        }
      }

      //getNode
      function getNode(_id) {

        var setNames = {
          VALIDCHILDREN: 'ValidChildren',
          VALIDSOURCE: 'ValidSource',
          VALIDDESTINATION: 'ValidDestination',
          VALIDINHERITOR: 'ValidInheritor',
          GENERAL: 'General'
        };

        var getParentId = function () {
          return storeNode(_core.getParent(_nodes[_id].node)); //just for sure, as it may missing from the cache
        };

        var getId = function () {
          return _id;
        };

        var getGuid = function () {
          return _core.getGuid(_nodes[_id].node);
        };

        var getChildrenIds = function () {
          return _core.getChildrenPaths(_nodes[_id].node);
        };

        var getBaseId = function () {
          return storeNode(_core.getBase(_nodes[_id].node)); //just for sure, maybe the base is missing from the cache
        };

        var getInheritorIds = function () {
          return [];
        };

        var getAttribute = function (name) {
          return _core.getAttribute(_nodes[_id].node, name);
        };
        var getOwnAttribute = function (name) {
          return _core.getOwnAttribute(_nodes[_id].node, name);
        };

        var getEditableAttribute = function (name) {
          var value = _core.getAttribute(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };
        var getOwnEditableAttribute = function (name) {
          var value = _core.getOwnAttribute(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };

        var getRegistry = function (name) {
          return _core.getRegistry(_nodes[_id].node, name);
        };
        var getOwnRegistry = function (name) {
          return _core.getOwnRegistry(_nodes[_id].node, name);
        };

        var getEditableRegistry = function (name) {
          var value = _core.getRegistry(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };
        var getOwnEditableRegistry = function (name) {
          var value = _core.getOwnRegistry(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };

        var getPointer = function (name) {
          //return _core.getPointerPath(_nodes[_id].node,name);
          if (name === 'base') {
            //base is a special case as it complicates with inherited children
            return {to: _core.getPath(_core.getBase(_nodes[_id].node)), from: []};
          }
          return {to: _core.getPointerPath(_nodes[_id].node, name), from: []};
        };
        var getOwnPointer = function (name) {
          return {to: _core.getOwnPointerPath(_nodes[_id].node, name), from: []};
        };

        var getPointerNames = function () {
          return _core.getPointerNames(_nodes[_id].node);
        };
        var getOwnPointerNames = function () {
          return _core.getOwnPointerNames(_nodes[_id].node);
        };

        var getAttributeNames = function () {
          return _core.getAttributeNames(_nodes[_id].node);
        };
        var getOwnAttributeNames = function () {
          return _core.getOwnAttributeNames(_nodes[_id].node);
        };


        var getRegistryNames = function () {
          return _core.getRegistryNames(_nodes[_id].node);
        };
        var getOwnRegistryNames = function () {
          return _core.getOwnRegistryNames(_nodes[_id].node);
        };

        //SET
        var getMemberIds = function (setid) {
          return _core.getMemberPaths(_nodes[_id].node, setid);
        };
        var getSetNames = function () {
          return _core.getSetNames(_nodes[_id].node);
        };
        var getMemberAttributeNames = function (setid, memberid) {
          return _core.getMemberAttributeNames(_nodes[_id].node, setid, memberid);
        };
        var getMemberAttribute = function (setid, memberid, name) {
          return _core.getMemberAttribute(_nodes[_id].node, setid, memberid, name);
        };
        var getEditableMemberAttribute = function (setid, memberid, name) {
          var attr = _core.getMemberAttribute(_nodes[_id].node, setid, memberid, name);
          if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
          }
          return null;
        };

        var getMemberRegistryNames = function (setid, memberid) {
          return _core.getMemberRegistryNames(_nodes[_id].node, setid, memberid);
        };
        var getMemberRegistry = function (setid, memberid, name) {
          return _core.getMemberRegistry(_nodes[_id].node, setid, memberid, name);
        };
        var getEditableMemberRegistry = function (setid, memberid, name) {
          var attr = _core.getMemberRegistry(_nodes[_id].node, setid, memberid, name);
          if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
          }
          return null;
        };

        //META
        var getValidChildrenTypes = function () {
          //return getMemberIds('ValidChildren');
          return META.getValidChildrenTypes(_id);
        };


        //constraint functions
        var getConstraintNames = function () {
          return _core.getConstraintNames(_nodes[_id].node);
        };
        var getOwnConstraintNames = function () {
          return _core.getOwnConstraintNames(_nodes[_id].node);
        };
        var getConstraint = function (name) {
          return _core.getConstraint(_nodes[_id].node, name);
        };
        //ASSERT(_nodes[_id]);

        var printData = function () {
          //probably we will still use it for test purposes, but now it goes officially into printing the node's json representation
          ToJson(_core, _nodes[_id].node, "", 'guid', function (err, jNode) {
            console.log('node in JSON format[status = ', err, ']:', jNode);
          });
        };

        var toString = function () {
          return _core.getAttribute(_nodes[_id].node, 'name') + ' (' + _id + ')';
        };

        var getCollectionPaths = function (name) {
          return _core.getCollectionPaths(_nodes[_id].node, name);
        };

        if (_nodes[_id]) {
          return {
            getParentId: getParentId,
            getId: getId,
            getGuid: getGuid,
            getChildrenIds: getChildrenIds,
            getBaseId: getBaseId,
            getInheritorIds: getInheritorIds,
            getAttribute: getAttribute,
            getEditableAttribute: getEditableAttribute,
            getRegistry: getRegistry,
            getEditableRegistry: getEditableRegistry,
            getOwnAttribute: getOwnAttribute,
            getOwnEditableAttribute: getOwnEditableAttribute,
            getOwnRegistry: getOwnRegistry,
            getOwnEditableRegistry: getOwnEditableRegistry,
            getPointer: getPointer,
            getPointerNames: getPointerNames,
            getAttributeNames: getAttributeNames,
            getRegistryNames: getRegistryNames,
            getOwnAttributeNames: getOwnAttributeNames,
            getOwnRegistryNames: getOwnRegistryNames,
            getOwnPointer: getOwnPointer,
            getOwnPointerNames: getOwnPointerNames,

            //SetFunctions
            getMemberIds: getMemberIds,
            getSetNames: getSetNames,
            getMemberAttributeNames: getMemberAttributeNames,
            getMemberAttribute: getMemberAttribute,
            getEditableMemberAttribute: getEditableMemberAttribute,
            getMemberRegistryNames: getMemberRegistryNames,
            getMemberRegistry: getMemberRegistry,
            getEditableMemberRegistry: getEditableMemberRegistry,

            //META functions
            getValidChildrenTypes: getValidChildrenTypes,

            //constraint functions
            getConstraintNames: getConstraintNames,
            getOwnConstraintNames: getOwnConstraintNames,
            getConstraint: getConstraint,

            printData: printData,
            toString: toString,

            getCollectionPaths: getCollectionPaths

          };
        }

        return null;

      }

      //export and import functions
      function exportItems(paths, callback) {
        var nodes = [];
        for (var i = 0; i < paths.length; i++) {
          if (_nodes[paths[i]]) {
            nodes.push(_nodes[paths[i]].node);
          } else {
            callback('invalid node');
            return;
          }
        }

        //DumpMore(_core,nodes,"",'guid',callback);
        _database.simpleRequest({command: 'dumpMoreNodes', name: _projectName, hash: _rootHash || _core.getHash(_nodes[ROOT_PATH].node), nodes: paths}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            _database.simpleResult(resId, callback);
          }
        });
      }


      function getExportItemsUrlAsync(paths, filename, callback) {
        _database.simpleRequest({command: 'dumpMoreNodes', name: _projectName, hash: _rootHash || _core.getHash(_nodes[ROOT_PATH].node), nodes: paths}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
          }
        });
      }

      function getExternalInterpreterConfigUrlAsync(selectedItemsPaths, filename, callback) {
        var config = {};
        config.host = window.location.protocol + "//" + window.location.host;
        config.project = _projectName;
        config.token = _TOKEN.getToken();
        config.selected = plainUrl({command: 'node', path: selectedItemsPaths[0] || ""});
        config.commit = URL.addSpecialChars(_recentCommits[0] || "");
        config.root = plainUrl({command: 'node'});
        config.branch = _branch
        _database.simpleRequest({command: 'generateJsonURL', object: config}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
          }
        });
      }

      function getExportLibraryUrlAsync(libraryRootPath, filename, callback) {
        var command = {};
        command.command = 'exportLibrary';
        command.name = _projectName;
        command.hash = _rootHash || _core.getHash(_nodes[ROOT_PATH].node);
        command.path = libraryRootPath;
        if (command.name && command.hash) {
          _database.simpleRequest(command, function (err, resId) {
            if (err) {
              callback(err);
            } else {
              callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
            }
          });
        } else {
          callback(new Error('there is no open project!'));
        }
      }

      function updateLibraryAsync(libraryRootPath, newLibrary, callback) {
        Serialization.import(_core, _nodes[libraryRootPath].node, newLibrary, function (err, log) {
          if (err) {
            return callback(err);
          }

          saveRoot("library update done\nlogs:\n" + log, callback);
        });
      }

      function addLibraryAsync(libraryParentPath, newLibrary, callback) {
        startTransaction("creating library as a child of " + libraryParentPath);
        var libraryRoot = createChild({parentId: libraryParentPath, baseId: null}, "library placeholder");
        Serialization.import(_core, _nodes[libraryRoot].node, newLibrary, function (err, log) {
          if (err) {
            return callback(err);
          }

          completeTransaction("library update done\nlogs:\n" + log, callback);
        });
      }

      function dumpNodeAsync(path, callback) {
        if (_nodes[path]) {
          Dump(_core, _nodes[path].node, "", 'guid', callback);
        } else {
          callback('unknown object', null);
        }
      }

      function importNodeAsync(parentPath, jNode, callback) {
        var node = null;
        if (_nodes[parentPath]) {
          node = _nodes[parentPath].node;
        }
        Import(_core, _nodes[parentPath].node, jNode, function (err) {
          if (err) {
            callback(err);
          } else {
            saveRoot('importNode under ' + parentPath, callback);
          }
        });
      }

      function mergeNodeAsync(parentPath, jNode, callback) {
        var node = null;
        if (_nodes[parentPath]) {
          node = _nodes[parentPath].node;
        }
        MergeImport(_core, _nodes[parentPath].node, jNode, function (err) {
          if (err) {
            callback(err);
          } else {
            saveRoot('importNode under ' + parentPath, callback);
          }
        });
      }

      function createProjectFromFileAsync(projectname, jProject, callback) {
        //if called on an existing project, it will ruin it!!! - although the old commits will be untouched
        //TODO somehow the export / import should contain the INFO field so the tags and description could come from it
        createProjectAsync(projectname, {}, function (err) {
          selectProjectAsync(projectname, function (err) {
            Serialization.import(_core, _root, jProject, function (err) {
              if (err) {
                return callback(err);
              }

              saveRoot("library have been updated...", callback);
            });
          });
        });
      }

      function plainUrl(parameters) {
        //setting the default values
        parameters.command = parameters.command || 'etf';
        parameters.path = parameters.path || "";
        parameters.project = parameters.project || _projectName;

        if (!parameters.root && !parameters.branch && !parameters.commit) {
          if (_rootHash) {
            parameters.root = _rootHash;
          } else if (_nodes && _nodes[ROOT_PATH]) {
            parameters.root = _core.getHash(_nodes[ROOT_PATH].node);
          } else {
            parameters.branch = _branch || 'master';
          }
        }

        //now we compose the URL
        if (window && window.location) {
          var address = window.location.protocol + '//' + window.location.host + '/rest/' + parameters.command + '?';
          address += "&project=" + URL.addSpecialChars(parameters.project);
          if (parameters.root) {
            address += "&root=" + URL.addSpecialChars(parameters.root);
          } else {
            if (parameters.commit) {
              address += "&commit=" + URL.addSpecialChars(parameters.commit);
            } else {
              address += "&branch=" + URL.addSpecialChars(parameters.branch);
            }
          }

          address += "&path=" + URL.addSpecialChars(parameters.path);

          if (parameters.output) {
            address += "&output=" + URL.addSpecialChars(parameters.output);
          }

          return address;
        }

        return null;

      }

      function getDumpURL(parameters) {
        parameters.output = parameters.output || "dump_url.out";
        return plainUrl(parameters);
      }

      function getProjectObject() {
        return _project;
      }

      function getAvailableInterpreterNames() {
        var names = [];
        var valids = _nodes[ROOT_PATH] ? _core.getRegistry(_nodes[ROOT_PATH].node, 'validPlugins') || "" : "";
        valids = valids.split(" ");
        for (var i = 0; i < valids.length; i++) {
          if (AllPlugins.indexOf(valids[i]) !== -1) {
            names.push(valids[i]);
          }
        }
        return names;
      }

      function runServerPlugin(name, context, callback) {
        _database.simpleRequest({command: 'executePlugin', name: name, context: context}, callback);
      }

      function getAvailableDecoratorNames() {
        return AllDecorators;
      }

      function getFullProjectsInfoAsync(callback) {
        _database.simpleRequest({command: 'getAllProjectsInfo'}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      function setProjectInfoAsync(projectId,info,callback){
        _database.simpleRequest({command:'setProjectInfo',projectId:projectId,info:info},function(err,rId){
          if(err){
            return callback(err);
          }
          _database.simpleResult(rId,callback);
        })
      }

      function getProjectInfoAsync(projectId,callback){
        _database.simpleRequest({command:'getProjectInfo',projectId:projectId},function(err,rId){
          if(err){
            return callback(err);
          }
          _database.simpleResult(rId,callback);
        })
      }

      function getAllInfoTagsAsync(callback){
        _database.simpleRequest({command:'getAllInfoTags'},function(err,rId){
          if(err){
            return callback(err);
          }
          _database.simpleResult(rId,callback);
        })
      }

      function createGenericBranchAsync(project, branch, commit, callback) {
        _database.simpleRequest({command: 'setBranch', project: project, branch: branch, old: '', new: commit}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      function deleteGenericBranchAsync(project, branch, commit, callback) {
        _database.simpleRequest({command: 'setBranch', project: project, branch: branch, old: commit, new: ''}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      //TODO probably it would be a good idea to put this functionality to server
      function getBaseOfCommits(one,other,callback){
        _project.getCommonAncestorCommit(one,other,callback);
      }
      //TODO probably this would also beneficial if this would work on server as well
      function getDiffTree(from,to,callback){
        var needed = 2,error = null,
          core = getNewCore(_project, gmeConfig),
          fromRoot={root:{},commit:from},
          toRoot={root:{},commit:to},
          rootsLoaded = function(){
            if(error){
              return callback(error,{});
            }
            _core.generateTreeDiff(fromRoot.root,toRoot.root,callback);
          },
          loadRoot = function(root){
            _project.loadObject(root.commit,function(err,c){
              error = error || ( err || c ? null : new Error('no commit object was found'));
              if(!err && c){
                core.loadRoot(c.root,function(err,r){
                  error = error || ( err || r ? null : new Error('no root was found'));
                  root.root = r;
                  if(--needed === 0){
                    rootsLoaded();
                  }
                });
              } else {
                if(--needed === 0){
                  rootsLoaded();
                }
              }
            });
          };
        loadRoot(fromRoot);
        loadRoot(toRoot);

      }

      function getConflictOfDiffs(base,extension){
        return _core.tryToConcatChanges(base,extension);
      }
      function getResolve(resolveObject){
        return _core.applyResolution(resolveObject);
      }
      //TODO move to server
      function applyDiff(branch,baseCommitHash,branchCommitHash,parents,diff,callback){
        _project.loadObject(baseCommitHash,function(err,cObject){
          var core = getNewCore(_project, gmeConfig);
          if(!err && cObject){
            core.loadRoot(cObject.root,function(err,root){
              if(!err && root){
                core.applyTreeDiff(root,diff,function(err){
                  if(err){
                    return callback(err);
                  }

                  core.persist(root,function(err){
                    if(err){
                      return callback(err);
                    }

                    var newHash = _project.makeCommit(parents,core.getHash(root),"merging",function(err){
                      if(err){
                        return callback(err);
                      }
                      _project.setBranchHash(branch,branchCommitHash,newHash,callback);
                    });
                  });
                });
              } else {
                callback(err || new Error('no root was found'));
              }
            });
          } else {
            callback(err || new Error('no commit object was found'));
          }
        });
      }

      function merge(whereBranch,whatCommit,whereCommit,callback){
        ASSERT(_project && typeof whatCommit === 'string' && typeof whereCommit === 'string' && typeof callback === 'function');
        _project.getCommonAncestorCommit(whatCommit,whereCommit,function(err,baseCommit){
          if(!err && baseCommit){
            var base,what,where,baseToWhat,baseToWhere,rootNeeds = 3,error = null,
            rootsLoaded = function(){
                var needed = 2,error = null;
                _core.generateTreeDiff(base,what,function(err,diff){
                  error = error || err;
                  baseToWhat = diff;
                  if(--needed===0){
                    if(!error){
                      diffsGenerated();
                    } else {
                      callback(error);
                    }
                  }
                });
                _core.generateTreeDiff(base,where,function(err,diff){
                  error = error || err;
                  baseToWhere = diff;
                  if(--needed===0){
                    if(!error){
                      diffsGenerated();
                    } else {
                      callback(error);
                    }
                  }
                });
              },
              diffsGenerated = function(){
                var conflict = _core.tryToConcatChanges(baseToWhere,baseToWhat);
                console.log('conflict object',conflict);
                if(conflict.items.length === 0){
                  //no conflict
                  callback(null,conflict);
                  /*
                  _core.applyTreeDiff(base,conflict.merge,function(err){
                    if(err){
                      return callback(err);
                    }
                    _core.persist(base,function(err){
                      if(err){
                        callback(err);
                      } else {
                        var newHash = _project.makeCommit([whatCommit,whereCommit],_core.getHash(base), "merging", function(err){
                          if(err){
                            callback(err);
                          } else {
                            _project.setBranchHash(whereBranch,whereCommit,newHash,callback);
                          }
                        });
                      }
                    });
                  });*/
                } else {
                  callback(null,conflict);
                }
                /*var endingWhatDiff = _core.concatTreeDiff(baseToWhere,baseToWhat),
                  endingWhereDiff = _core.concatTreeDiff(baseToWhat,baseToWhere);
                console.log('kecso endingwhatdiff',endingWhatDiff);
                console.log('kecso endingwherediff',endingWhereDiff);
                if(_core.isEqualDifferences(endingWhereDiff,endingWhatDiff)){
                  _core.applyTreeDiff(base,endingWhatDiff,function(err){
                    if(err){
                      callback(err);
                    } else {
                      _core.persist(base,function(err){
                        if(err){
                          callback(err);
                        } else {
                          var newHash = _project.makeCommit([whatCommit,whereCommit],_core.getHash(base), "merging", function(err){
                            if(err){
                              callback(err);
                            } else {
                              console.log('setting branch hash after merge');
                              _project.setBranchHash(whereBranch,whereCommit,newHash,callback);
                            }
                          });
                        }
                      });
                    }

                  });
                } else {
                  callback(new Error('there is a conflict...'),{
                    baseObject:base,
                    baseCommit:baseCommit,
                    branch: whereBranch,
                    mine:endingWhereDiff,
                    mineCommit: whereCommit,
                    theirs:endingWhatDiff,
                    theirsCommit:whatCommit,
                    conflictItems:_core.getConflictItems(endingWhereDiff,endingWhatDiff)});
                }*/
              };

              _project.loadObject(baseCommit,function(err,baseCommitObject){
                error = error || err;
                if(!error && baseCommitObject){
                  _core.loadRoot(baseCommitObject.root,function(err,r){
                    error = error || err;
                    base = r;
                    if(--rootNeeds === 0){
                      if(!error){
                        rootsLoaded();
                      } else {
                        callback(error);
                      }
                    }
                  });
                } else {
                  error = error || new Error('cannot load common ancestor commit');
                  if(--rootNeeds === 0){
                    callback(error);
                  }
                }
              });
              _project.loadObject(whatCommit,function(err,whatCommitObject){
                error = error || err;
                if(!error && whatCommitObject){
                  _core.loadRoot(whatCommitObject.root,function(err,r){
                    error = error || err;
                    what = r;
                    if(--rootNeeds === 0){
                      if(!error){
                        rootsLoaded();
                      } else {
                        callback(error);
                      }
                    }
                  });
                } else {
                  error = error || new Error('cannot load the commit to merge');
                  if(--rootNeeds === 0){
                    callback(error);
                  }
                }
              });
              _project.loadObject(whereCommit,function(err,whereCommitObject){
                error = error || err;
                if(!error && whereCommitObject){
                  _core.loadRoot(whereCommitObject.root,function(err,r){
                    error = error || err;
                    where = r;
                    if(--rootNeeds === 0){
                      if(!error){
                        rootsLoaded();
                      } else {
                        callback(error);
                      }
                    }
                  });
                } else {
                  error = error || new Error('cannot load the commit to merge into');
                  if(--rootNeeds === 0){
                    callback(error);
                  }
                }
              });
          } else {
            callback(err || new Error('we cannot locate common ancestor commit!!!'));
          }
        });
      }

      function resolve(baseObject,mineDiff,branch,mineCommit,theirsCommit,resolvedConflictItems,callback){
        mineDiff = _core.applyResolution(mineDiff,resolvedConflictItems);
        _core.applyTreeDiff(baseObject,mineDiff,function(err){
          if(err){
            callback(err);
          } else {
            _core.persist(baseObject,function(err){
              if(err){
                callback(err);
              } else {
                var newHash = _project.makeCommit([theirsCommit,mineCommit],_core.getHash(baseObject), "merging", function(err){
                  if(err){
                    callback(err);
                  } else {
                    console.log('setting branch hash after merge');
                    _project.setBranchHash(branch,mineCommit,newHash,callback);
                  }
                });
              }
            });
          }
        });
      }
      //initialization
      function initialize() {
        _database = newDatabase();
        _database.openDatabase(function (err) {
          if (!err) {
            _networkWatcher = networkWatcher();
            serverEventer();
            _database.getProjectNames(function (err, names) {
              if (!err && names && names.length > 0) {
                var projectName = null;
                  //FIXME: Who sets this project?
                if (_configuration.project && names.indexOf(_configuration.project) !== -1) {
                  projectName = _configuration.project;
                } else {
                  projectName = names[0];
                }
                openProject(projectName, function (err) {
                  if (err) {
                    logger.error('Problem during project opening:' + JSON.stringify(err));
                  }
                });
              } else {
                logger.error('Cannot get project names / There is no project on the server');
              }
            });
          } else {
            logger.error('Cannot open database');
          }
        });
      }
      //FIXME: Who sets this configuration?
      if (_configuration.autostart) {
        initialize();
      }
      _redoer = new UndoRedo({
          //eventer
          events: _self.events,
          networkStates: _self.networkStates,
          branchStates: _self.branchStates,
          _eventList: _self._eventList,
          _getEvent: _self._getEvent,
          addEventListener: _self.addEventListener,
          removeEventListener: _self.removeEventListener,
          removeAllEventListeners: _self.removeAllEventListeners,
          dispatchEvent: _self.dispatchEvent,
          getProjectObject: getProjectObject});

      return {
        //eventer
        events: _self.events,
        networkStates: _self.networkStates,
        branchStates: _self.branchStates,
        _eventList: _self._eventList,
        _getEvent: _self._getEvent,
        addEventListener: _self.addEventListener,
        removeEventListener: _self.removeEventListener,
        removeAllEventListeners: _self.removeAllEventListeners,
        dispatchEvent: _self.dispatchEvent,
        connect: connect,

        getUserId: getUserId,

        //projects, branch, etc.
        getActiveProjectName: getActiveProject,
        getAvailableProjectsAsync: getAvailableProjectsAsync,
        getViewableProjectsAsync: getViewableProjectsAsync,
        getFullProjectListAsync: getFullProjectListAsync,
        getProjectAuthInfoAsync: getProjectAuthInfoAsync,
        connectToDatabaseAsync: connectToDatabaseAsync,
        selectProjectAsync: selectProjectAsync,
        createProjectAsync: createProjectAsync,
        deleteProjectAsync: deleteProjectAsync,
        getBranchesAsync: getBranchesAsync,
        selectCommitAsync: selectCommitAsync,
        getCommitsAsync: getCommitsAsync,
        getActualCommit: getActualCommit,
        getActualBranch: getActualBranch,
        getActualNetworkStatus: getActualNetworkStatus,
        getActualBranchStatus: getActualBranchStatus,
        createBranchAsync: createBranchAsync,
        deleteBranchAsync: deleteBranchAsync,
        selectBranchAsync: selectBranchAsync,
        commitAsync: commitAsync,
        goOffline: goOffline,
        goOnline: goOnline,
        isProjectReadOnly: function () {
          return _readOnlyProject;
        },
        isCommitReadOnly: function () {
          return _viewer;
        },

        //MGA
        startTransaction: startTransaction,
        completeTransaction: completeTransaction,
        setAttributes: setAttributes,
        delAttributes: delAttributes,
        setRegistry: setRegistry,
        delRegistry: delRegistry,
        copyMoreNodes: copyMoreNodes,
        moveMoreNodes: moveMoreNodes,
        delMoreNodes: delMoreNodes,
        createChild: createChild,
        createChildren: createChildren,
        makePointer: makePointer,
        delPointer: delPointer,
        addMember: addMember,
        removeMember: removeMember,
        setMemberAttribute: setMemberAttribute,
        delMemberAttribute: delMemberAttribute,
        setMemberRegistry: setMemberRegistry,
        delMemberRegistry: delMemberRegistry,
        createSet: createSet,
        deleteSet: deleteSet,

        setBase: setBase,
        delBase: delBase,

        //we simply propagate the functions of META
        getMeta: META.getMeta,
        setMeta: META.setMeta,
        getChildrenMeta: META.getChildrenMeta,
        setChildrenMeta: META.setChildrenMeta,
        getChildrenMetaAttribute: META.getChildrenMetaAttribute,
        setChildrenMetaAttribute: META.setChildrenMetaAttribute,
        getValidChildrenItems: META.getValidChildrenItems,
        updateValidChildrenItem: META.updateValidChildrenItem,
        removeValidChildrenItem: META.removeValidChildrenItem,
        getAttributeSchema: META.getAttributeSchema,
        setAttributeSchema: META.setAttributeSchema,
        removeAttributeSchema: META.removeAttributeSchema,
        getPointerMeta: META.getPointerMeta,
        setPointerMeta: META.setPointerMeta,
        getValidTargetItems: META.getValidTargetItems,
        updateValidTargetItem: META.updateValidTargetItem,
        removeValidTargetItem: META.removeValidTargetItem,
        deleteMetaPointer: META.deleteMetaPointer,
        getOwnValidChildrenTypes: META.getOwnValidChildrenTypes,
        getOwnValidTargetTypes: META.getOwnValidTargetTypes,
        isValidChild: META.isValidChild,
        isValidTarget: META.isValidTarget,
        isValidAttribute: META.isValidAttribute,
        getValidChildrenTypes: META.getValidChildrenTypes,
        getValidTargetTypes: META.getValidTargetTypes,
        hasOwnMetaRules: META.hasOwnMetaRules,
        filterValidTarget: META.filterValidTarget,
        isTypeOf: META.isTypeOf,
        getValidAttributeNames: META.getValidAttributeNames,
        getOwnValidAttributeNames: META.getOwnValidAttributeNames,
        getMetaAspectNames: META.getMetaAspectNames,
        getOwnMetaAspectNames: META.getOwnMetaAspectNames,
        getMetaAspect: META.getMetaAspect,
        setMetaAspect: META.setMetaAspect,
        deleteMetaAspect: META.deleteMetaAspect,
        getAspectTerritoryPattern: META.getAspectTerritoryPattern,

        //end of META functions

        //decorators
        getAvailableDecoratorNames: getAvailableDecoratorNames,
        //interpreters
        getAvailableInterpreterNames: getAvailableInterpreterNames,
        getProjectObject: getProjectObject,
        runServerPlugin: runServerPlugin,

        //JSON functions
        exportItems: exportItems,
        getExportItemsUrlAsync: getExportItemsUrlAsync,
        getExternalInterpreterConfigUrlAsync: getExternalInterpreterConfigUrlAsync,
        dumpNodeAsync: dumpNodeAsync,
        importNodeAsync: importNodeAsync,
        mergeNodeAsync: mergeNodeAsync,
        createProjectFromFileAsync: createProjectFromFileAsync,
        getDumpURL: getDumpURL,
        getExportLibraryUrlAsync: getExportLibraryUrlAsync,
        updateLibraryAsync: updateLibraryAsync,
        addLibraryAsync: addLibraryAsync,
        getFullProjectsInfoAsync: getFullProjectsInfoAsync,
        createGenericBranchAsync: createGenericBranchAsync,
        deleteGenericBranchAsync: deleteGenericBranchAsync,
        setProjectInfoAsync: setProjectInfoAsync,
        getProjectInfoAsync: getProjectInfoAsync,
        getAllInfoTagsAsync: getAllInfoTagsAsync,

        //constraint
        setConstraint: setConstraint,
        delConstraint: delConstraint,

        //coreAddOn functions
        validateProjectAsync: validateProjectAsync,
        validateModelAsync: validateModelAsync,
        validateNodeAsync: validateNodeAsync,
        setValidationCallback: setValidationCallback,
        getDetailedHistoryAsync: getDetailedHistoryAsync,
        getRunningAddOnNames: getRunningAddOnNames,

        //territory functions for the UI
        addUI: addUI,
        removeUI: removeUI,
        updateTerritory: updateTerritory,
        getNode: getNode,

        //undo - redo
        undo: _redoer.undo,
        redo: _redoer.redo,

        //merge
        getBaseOfCommits: getBaseOfCommits,
        getDiffTree: getDiffTree,
        getConflictOfDiffs: getConflictOfDiffs,
        applyDiff: applyDiff,
        merge: merge,
        getResolve: getResolve,
        resolve: resolve
      };
    }

    return Client;
  });
