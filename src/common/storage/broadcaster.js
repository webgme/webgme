define([ "util/assert" ], function (ASSERT) {
  "use strict";
  var Database = function(_database,_options){
    function openProject(projectName,callback) {
      var branches = {},
        project,
        getBranchHash = function (name, oldhash, callback) {
          ASSERT(typeof name === "string" && typeof callback === "function");
          ASSERT(typeof oldhash === "string" || oldhash === null);

          var tag = name + "@" + oldhash;
          var branch = branches[tag];
          if (typeof branch === "undefined") {
            branch = [ callback ];
            branches[tag] = branch;

            project.getBranchHash(name, oldhash, function (err, newhash, forkedhash) {
              if (branches[tag] === branch) {
                var cb;
                delete branches[tag];

                while ((cb = branch.pop())) {
                  cb(err, newhash, forkedhash);
                }
              }
            });
          } else {
            branch.push(callback);
          }
        },
        setBranchHash = function (name, oldhash, newhash, callback) {
          ASSERT(typeof name === "string" && typeof oldhash === "string");
          ASSERT(typeof newhash === "string" && typeof callback === "function");

          project.setBranchHash(name, oldhash, newhash, function (err) {
            if (!err) {
              var prefix = name + "@", tag;
              for (tag in branches) {
                if (tag.substr(0, prefix.length) === prefix) {
                  var cb, branch = branches[tag];
                  delete branches[tag];

                  while ((cb = branch.pop())) {
                    cb(err, newhash, null);
                  }
                }
              }
            }
            callback(err);
          });
        };

      _database.openProject(projectName, function (err, p) {
        if (err) {
          callback(err);
        } else {
          project = p;
          callback(null, {
            fsyncDatabase: project.fsyncDatabase,
            getDatabaseStatus: project.getDatabaseStatus,
            closeProject: project.closeProject,
            loadObject: project.loadObject,
            insertObject: project.insertObject,
            getInfo: project.getInfo,
            setInfo: project.setInfo,
            findHash: project.findHash,
            dumpObjects: project.dumpObjects,
            getBranchNames: project.getBranchNames,
            getBranchHash: getBranchHash,
            setBranchHash: setBranchHash,
            getCommits: project.getCommits,
            makeCommit: project.makeCommit,
            ID_NAME: project.ID_NAME
          });
        }
      });
    }

    return {
      openDatabase: _database.openDatabase,
      closeDatabase: _database.closeDatabase,
      fsyncDatabase: _database.fsyncDatabase,
      getDatabaseStatus: _database.getDatabaseStatus,
      getProjectNames: _database.getProjectNames,
      getAllowedProjectNames: _database.getAllowedProjectNames,
      getAuthorizationInfo: _database.getAuthorizationInfo,
      openProject: openProject,
      deleteProject: _database.deleteProject,
      simpleRequest: _database.simpleRequest,
      simpleResult: _database.simpleResult,
      simpleQuery: _database.simpleQuery,
      getNextServerEvent: _database.getNextServerEvent,
      getToken: _database.getToken
    };
  };

  return Database;
});
