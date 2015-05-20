/*globals requireJS*/
/*jshint node:true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */
'use strict';

var ProjectCache = requireJS('common/storage/project/cache'),
    GENKEY = requireJS('common/util/key'),
    CONSTANTS = requireJS('common/storage/constants');

function UserProject(project, mainLogger, gmeConfig) {
    var logger = mainLogger.fork('project:' + project.name),
        projectCache,
    objectLoader = {
        loadObject: function (projectName, key, callback) {
            project.loadObject(key, callback);
        }
    };

    projectCache = new ProjectCache(objectLoader, project.name, logger, gmeConfig);

    this.insertObject = projectCache.insertObject;
    this.loadObject = projectCache.loadObject;
    this.ID_NAME = CONSTANTS.MONGO_ID;

    this.createCommitObject = function (parents, rootHash, user, msg) {
        user = user || 'n/a';
        msg = msg || 'n/a';

        var commitObj = {
                root: rootHash,
                parents: parents,
                updater: [user],
                time: (new Date()).getTime(),
                message: msg,
                type: 'commit'
            },
            commitHash = '#' + GENKEY(commitObj, gmeConfig);

        commitObj[CONSTANTS.MONGO_ID] = commitHash;

        return commitObj;
    };
}

module.exports = UserProject;