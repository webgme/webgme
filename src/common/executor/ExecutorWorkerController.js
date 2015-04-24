/*globals define*/
/*jshint node:true*/

/**
 * @author ksmyth / https://github.com/ksmyth
 */

define([], function () {
    'use strict';
    var ExecutorWorkerController = function ($scope, worker) {
        this.$scope = $scope;
        this.$scope.jobs = { };
        this.worker = worker;

        this.initialize();
    };

    ExecutorWorkerController.prototype.update = function () {
        if (!this.$scope.$$phase) {
            this.$scope.$apply();
        }
    };

    ExecutorWorkerController.prototype.initialize = function () {
        var self = this;
        if (self.worker) {
            self.worker.on('jobUpdate', function (jobInfo) {
                self.$scope.jobs[jobInfo.hash] = jobInfo;
                self.update();
            });
        } else {
            self.initTestData();
        }
    };

    ExecutorWorkerController.prototype.initTestData = function () {
        var self = this,
            i,
            statuses = [
                'CREATED',
                'SUCCESS',
                'FAILED_TO_EXECUTE',
                'FAILED_TO_GET_SOURCE_METADATA',
                'FAILED_SOURCE_COULD_NOT_BE_OBTAINED',
                'FAILED_CREATING_SOURCE_ZIP',
                'FAILED_UNZIP',
                'FAILED_EXECUTOR_CONFIG',
                'FAILED_TO_ARCHIVE_FILE',
                'FAILED_TO_SAVE_JOINT_ARTIFACT',
                'FAILED_TO_ADD_OBJECT_HASHES',
                'FAILED_TO_SAVE_ARTIFACT'];

        self.$scope.jobs = { };

        for (i = 0; i < 30; i += 1) {
            self.$scope.jobs['/' + i] = {
//                status: (i % 3) ? 'OK' : 'FAILED',
                hash: i,
                url: '',
                resultHash: i + 10000
            };

            self.$scope.jobs['/' + i].status = statuses[Math.floor(Math.random() * statuses.length)];
        }

    };

    return ExecutorWorkerController;
});
