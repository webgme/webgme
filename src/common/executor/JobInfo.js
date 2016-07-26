/*globals define*/
/*jshint node:true*/

/**
 * @author lattmann / https://github.com/lattmann
 */

define([], function () {
    'use strict';

    /**
     * Class describing an executor job. The data is used for communication between the
     * initiator/a monitor of the job and the worker executing the job.
     *
     * @param {object} parameters
     * @param {hash} parameters.hash - Job identifier.
     * @constructor
     * @alias JobInfo
     */
    var JobInfo = function (parameters) {

        /**
         * Job identifier.
         * @type {string}
         */
        this.hash = parameters.hash;

        /**
         * Array of hashes to {@link Artifact}s containing each requested result.
         * @type {string[]}
         */
        this.resultHashes = parameters.resultHashes || [];

        /**
         * Hash to an {@link Artifact} containing the union of all requests results.
         * @type {string}
         */
        this.resultSuperSet = parameters.resultSuperSet || null;

        this.userId = parameters.userId || [];

        /**
         * Current status of the job.
         * @type {string}
         */
        this.status = parameters.status || null;

        /**
         * Timestamp of when the job was created.
         * @type {string}
         */
        this.createTime = parameters.createTime || null;

        /**
         * Timestamp of when the job execution started by a worker.
         * @type {string}
         */
        this.startTime = parameters.startTime || null;

        /**
         * Timestamp of when the job execution finished on the worker.
         * @type {string}
         */
        this.finishTime = parameters.finishTime || null;

        /**
         * Id/label of the worker processing the job.
         * @type {string}
         */
        this.worker = parameters.worker || null;

        /**
         * Array of labels for the job.
         * @type {string[]}
         */
        this.labels = parameters.labels || [];

        /**
         * The (id) outputNumber (0, 1, 2, ...) of the latest {@link OutputInfo} (for this job) available on the server.
         * When no output is available the number is <b>null</b>.
         * @type {number}
         */
        this.outputNumber = typeof parameters.outputNumber === 'number' ? parameters.outputNumber : null;
    };

    /**
     * Array of statuses where the job hash finished and won't proceed.
     * @type {string[]}
     */
    JobInfo.finishedStatuses = [
        'SUCCESS',
        'CANCELED',
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

    /**
     * Returns true of the provided status is a finished status.
     * @param {string} status - The status of a job.
     * @returns {boolean}
     */
    JobInfo.isFinishedStatus = function (status) {
        return JobInfo.finishedStatuses.indexOf(status) !== -1;
    };

    /**
     * Returns true if the provided status is a failed finished status.
     * @param {string} status - The status of a job.
     * @returns {boolean}
     */
    JobInfo.isFailedFinishedStatus = function (status) {
        return JobInfo.isFinishedStatus(status) && status !== 'SUCCESS';
    };

    return JobInfo;
});