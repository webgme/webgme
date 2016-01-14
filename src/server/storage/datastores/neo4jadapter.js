/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Neo4j
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var neo4j = require('node-neo4j'),
    Q = require('q'),
    Neo4jProject = require('./neo4jproject');

// Data structure (for projectId guest+test):
// guest+test = hashMap(objectHash, objectStr)
// guest+test:branches = hashMap(branchName, branchHash)
// guest+test:commits = hashMap(objectHash, timestamp)

/**
 * @param mainLogger
 * @param gmeConfig
 * @constructor
 * @todo Finalize implementation
 * @ignore
 */
function Neo4jAdapter(mainLogger, gmeConfig) {
    var self = this,
        connectionCnt = 0,
        connectDeferred,
        disconnectDeferred,
        logger = mainLogger.fork('Neo4jAdapter');

    this.client = null;
    this.logger = logger;
    this.CONSTANTS = {
        PROJECT_LABEL: 'Project',
        PART_OF_PROJECT: 'PartOf',
        DATA_OBJECT_ID: 'ID',
        DATA_OBJECT_LABEL: 'DataObject',
        COMMIT_OBJECT_LABEL: 'CommitObject',
        BRANCH_LABEL: 'Branch'
    };

    function openDatabase(callback) {
        var query,
            client;
        connectionCnt += 1;
        logger.debug('openDatabase, connection counter:', connectionCnt);

        if (connectionCnt === 1) {
            if (self.client === null) {
                logger.debug('Connecting to database...');
                connectDeferred = Q.defer();
                //self.client = new neo4j.GraphDatabase(gmeConfig.storage.database.options);
                client = new neo4j('http://localhost:7474');
                query = 'CREATE CONSTRAINT ON (project:' + self.CONSTANTS.PROJECT_LABEL + ') ' +
                    'ASSERT project.projectId IS UNIQUE';
                //TODO: Ensure that the constraint is not saved over and over.
                Q.ninvoke(client, 'cypherQuery', query)
                    .then(function () {
                        self.client = client;
                        disconnectDeferred = null;
                        connectDeferred.resolve();
                    })
                    .catch(connectDeferred.reject);
            } else {
                logger.debug('Count is 1 but neo4j is not null');
            }
        } else {
            // we are already connected
            logger.debug('Reusing neo4j connection.');
        }

        return connectDeferred.promise.nodeify(callback);
    }

    function closeDatabase(callback) {
        connectionCnt -= 1;
        logger.debug('closeDatabase, connection counter:', connectionCnt);

        if (connectionCnt < 0) {
            logger.error('connection counter became negative, too many closeDatabase. Setting it to 0.', connectionCnt);
            connectionCnt = 0;
        }

        if (!disconnectDeferred) {
            disconnectDeferred = Q.defer();
        }

        if (connectionCnt === 0) {
            if (self.client) {
                logger.debug('Closing connection to neo4j...');
                self.client = null;
                logger.debug('Closed.');
                disconnectDeferred.resolve();
            } else {
                disconnectDeferred.resolve();
            }
        } else {
            logger.debug('Connections still alive.');
        }

        return disconnectDeferred.promise.nodeify(callback);
    }

    function deleteProject(projectId, callback) {
        var deferred = Q.defer();

        if (self.client) {
            Q.ninvoke(self.client, 'deleteNodesWithLabelsAndProperties', self.CONSTANTS.PROJECT_LABEL, {
                projectId: projectId
            })
                .then(function (result) {
                    if (result > 0) {
                        deferred.resolve(true);
                    } else {
                        deferred.reject(false);
                    }
                })
                .catch(deferred.reject);
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(projectId, callback) {
        var deferred = Q.defer(),
            query;

        logger.debug('openProject', projectId);

        if (self.client) {
            query = 'MATCH (project:' + self.CONSTANTS.PROJECT_LABEL + ' {projectId:"' + projectId + '"})' +
                'RETURN project';
            Q.ninvoke(self.client, 'cypherQuery', query)
                .then(function (result) {
                    logger.debug('openProject, result', result);
                    if (result.data.length > 0) {
                        deferred.resolve(new Neo4jProject(projectId, self));
                    } else {
                        deferred.reject(new Error('Project does not exist ' + projectId));
                    }
                })
                .catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function createProject(projectId, callback) {
        var deferred = Q.defer();

        logger.debug('createProject', projectId);

        if (self.client) {
            Q.ninvoke(self.client, 'insertNode', {projectId: projectId}, self.CONSTANTS.PROJECT_LABEL)
                .then(function (result) {
                    deferred.resolve(new Neo4jProject(projectId, self, result._id));
                })
                .catch(function (err) {
                    if (err.message.indexOf('already exists with label Project and property') > -1) {
                        deferred.reject(new Error('Project already exists ' + projectId));
                    } else {
                        deferred.reject(err);
                    }
                });
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function renameProject(projectId, newProjectId, callback) {
        var deferred = Q.defer();

        if (self.client) {
            deferred.reject(new Error('Not Implemented!'));
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function duplicateProject(projectId, newProjectId, callback) {
        var deferred = Q.defer();

        if (self.client) {
            deferred.reject(new Error('Not Implemented!'));
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    this.openDatabase = openDatabase;
    this.closeDatabase = closeDatabase;

    this.openProject = openProject;
    this.deleteProject = deleteProject;
    this.createProject = createProject;
    this.renameProject = renameProject;
    this.duplicateProject = duplicateProject;
}

module.exports = Neo4jAdapter;
