/**
 * node src/bin/import_project.js myProjectName myProject.json
 *
 * Created by tkecskes on 8/6/2014.
 */
var requirejs = require("requirejs");
requirejs.config({
    nodeRequire: require,
    baseUrl: __dirname + '/../',
    paths: {
        "storage": "common/storage",
        "core": "common/core",
        "util": "common/util",
        "coreclient": "common/core/users"
    }
}),
    Core = requirejs('core/core'),
    Storage = requirejs('storage/serveruserstorage'),
    Serialization = requirejs('coreclient/serialization'),
    FS = require('fs');

/**
 * Imports an exported webgme-project into the database.
 * @param {string} projectname - name of imported project (if already exist in db it will be overwritten!)
 * @param {Object} jProject - Project object (in export/import format).
 * @param {Object} [options] - settings for mongodb.
 * @param {function} done - called when import is done (with err if failing).
 */
function importProject(projectname, jProject, options, done) {
        'use strict';
        var opts = options || {},
            mongoip = opts.mongoip || "127.0.0.1",
            mongoport = opts.mongoport || 27017,
            mongodb = opts.mongodb || "multi",
            storage = null,
            project = null;

        var finish = function(err){
            if(project){
                project.closeProject();
            }
            if(storage){
                storage.closeDatabase();
            }
            done(err);
        };

        storage = new Storage({'host':mongoip, 'port':mongoport, 'database':mongodb});
        storage.openDatabase(function(err){
            if(!err){
                storage.openProject(projectname,function(err,p){
                    if(!err){
                        project = p;
                        var core = new Core(project,{corerel:2});
                        var root = core.createNode({parent:null,base:null});
                        Serialization.import(core,root,jProject,function(err){
                            if(err){
                                console.log("some error happened during import:",err);
                                finish(err);
                            } else {
                                core.persist(root,function(err){});
                                var rhash = core.getHash(root);
                                var chash = project.makeCommit([],rhash,"project imported by \'create_project_from_file\'",function(err){});
                                project.getBranchHash("master","#hack",function(err,oldhash){
                                    if(!err){
                                        project.setBranchHash("master",oldhash,chash,function(err){
                                            if(!err){
                                                console.log("the file have been imported to master branch");
                                                finish();
                                            } else {
                                                console.log("problem setting the branch...");
                                                finish(err);
                                            }
                                        });
                                    } else {
                                        console.log("problem getting the branch set...");
                                        finish(err);
                                    }
                                });
                            }
                        });
                    } else {
                        console.log('unable to reach project object - check your parameters and your database');
                        finish(err);
                    }
                });
            } else {
                console.log("unable to open database - check your parameters and your connection to your database server");
                finish(err);
            }
        });
    };

module.exports.importProject = importProject;

if (require.main === module) {
    var cmdOptions = {
        projectname: process.argv[2],
        projectfilepath: process.argv[3],
        mongoip: process.argv[4],
        mongoport: process.argv[5],
        mongodb: process.argv[6]
    };
    if (cmdOptions.projectname && cmdOptions.projectfilepath) {
        var jProject = JSON.parse(FS.readFileSync(cmdOptions.projectfilepath,'utf-8'));
        importProject(cmdOptions.projectname, jProject, cmdOptions, function (err) {
            if (err) {
                console.error('Importing' + cmdOptions.projectfilepath + ' failed with error: ' + err.toString());
            } else {
                console.log('Done!');
            }
        });
    } else {
        console.log("proper usage: node import_project.js <ip of your database server> <port of your database server> <name of your database> <name of the project> <file to import>");
    }
}