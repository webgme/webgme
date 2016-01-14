/*jshint node:true, newcap:false*/

/**
 * @module Server:Storage:Dynamo
 * @author pmeijer / https://github.com/pmeijer
 */

'use strict';

var AWS = require('aws-sdk'),
    Q = require('q'),
    DynamoProject = require('./dynamoproject');

// Data structure (for projectId guest+test):
// guest+test = hashMap(objectHash, objectStr)
// guest+test:branches = hashMap(branchName, branchHash)
// guest+test:commits = hashMap(objectHash, timestamp)

/**
 * Adaptor wrapping Amazon DynamoDB
 * https://aws.amazon.com/dynamodb/
 * @param mainLogger
 * @param {GmeConfig} gmeConfig
 * @constructor
 * @ignore
 */
function DynamoAdapter(mainLogger, gmeConfig) {
    var self = this,
        connectionCnt = 0,
        connectDeferred,
        disconnectDeferred,
        logger = mainLogger.fork('dynamoAdapter');

    //AWS.config(gmeConfig.storage.database.options);

    this.client = null;
    this.logger = logger;
    this.CONSTANTS = {
        PROJECT_ID_DIV: '-'
    };

    function openDatabase(callback) {
        connectionCnt += 1;
        logger.debug('openDatabase, connection counter:', connectionCnt);

        if (connectionCnt === 1) {
            if (self.client === null) {
                logger.debug('Connecting to DynamoDB...');
                connectDeferred = Q.defer();
                self.client = new AWS.DynamoDB({
                    accessKeyId: '123',
                    secretAccessKey: 'abc',
                    region: 'local',
                    endpoint: 'localhost:4567',
                    sslEnabled: false
                });
                logger.debug('Connected?');
                connectDeferred.resolve();
            } else {
                logger.debug('Count is 1 but DynamoDB is not null');
            }
        } else {
            // we are already connected
            logger.debug('Reusing DynamoDB connection.');
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
                logger.debug('Closing connection to DynamoDB...');
                self.client = null;
                logger.debug('Closed?');
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
        var deferred = Q.defer(),
            rawProjectId = projectId.replace('+', self.CONSTANTS.PROJECT_ID_DIV),
            params = {
                TableName: rawProjectId,
            };

        if (self.client) {
            self.client.deleteTable(params, function (err, data) {
                if (err) {
                    deferred.reject(err);
                    return;
                }

                // Waits for the tableNotExists state by periodically calling the underlying DynamoDB.describeTable()
                // operation every 20 seconds (at most 25 times).
                //self.client.waitFor('tableNotExists', {TableName: rawProjectId}, function (err, data) {
                //    if (err) {
                //        deferred.reject(err);
                //        return;
                //    }
                    deferred.resolve(false);
                //});
            });
        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function openProject(projectId, callback) {
        var deferred = Q.defer();

        logger.debug('openProject', projectId);

        if (self.client) {
            //Q.ninvoke(self.client, 'exists', projectId)
            //    .then(function (result) {
            //        // 1 if the key exists.
            //        // 0 if the key does not exist.
            //        logger.debug('openProject, result', result);
            //        if (result === 1) {
                        deferred.resolve(new DynamoProject(projectId, self));
                //    } else {
                //        deferred.reject(new Error('Project does not exist ' + projectId));
                //    }
                //})
                //.catch(deferred.reject);

        } else {
            deferred.reject(new Error('Database is not open.'));
        }

        return deferred.promise.nodeify(callback);
    }

    function createProject(projectId, callback) {
        var deferred = Q.defer(),
            rawProjectId = projectId.replace('+', self.CONSTANTS.PROJECT_ID_DIV),
            params = {
                TableName: rawProjectId,
                AttributeDefinitions: [
                    {
                        AttributeName: 'ID',
                        AttributeType: 'S'
                    }
                    //{
                    //    AttributeName: 'time',
                    //    AttributeType: 'N'
                    //}
                ],
                KeySchema: [
                    {
                        AttributeName: 'ID',
                        KeyType: 'HASH'
                    }
                    //{
                    //    AttributeName: 'time',
                    //    KeyType: 'RANGE'
                    //}
                ],
                ProvisionedThroughput: {
                    ReadCapacityUnits: 10, //TODO: what should these be
                    WriteCapacityUnits: 10
                }

            };

        logger.debug('createProject', projectId);

        if (self.client) {
            self.client.createTable(params, function (err, result) {
                if (err) {
                    if (err.name === 'ResourceInUseException') {
                        deferred.reject(new Error('Project already exists ' + projectId));
                    } else {
                        deferred.reject(err);
                    }
                    return;
                }

                // Waits for the tableExists state by periodically calling the underlying DynamoDB.describeTable()
                // operation every 20 seconds (at most 25 times).
                //self.client.waitFor('tableExists', {TableName: rawProjectId}, function (err, data) {
                //    if (err) {
                //        deferred.reject(err);
                //        return;
                //    }
                    deferred.resolve(new DynamoProject(projectId, self));
                //});
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

module.exports = DynamoAdapter;
