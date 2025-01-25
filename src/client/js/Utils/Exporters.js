/*globals define, $*/
/*jshint node: true, browser: true, bitwise: false*/

/**
 * @author kecso / https://github.com/kecso
 */
define([
    'js/Loader/ProgressNotification',
    'clipboard',
    'js/Utils/SaveToDisk',
    'blob/BlobClient'
], function (ProgressNotification, Clipboard, saveToDisk, BlobClient) {
    'use strict';

    function _exportProjectOrLibrary(client, logger, projectParams, withAssets, libraryName, callback) {
        var progress = ProgressNotification.start('<strong>Exporting </strong> project ...'),
            bc = new BlobClient({ logger: logger.fork('BlobClient') }),
            cb = function (err, result) {
                clearInterval(progress.intervalId);
                if (err) {
                    logger.error('unable to save project', err);
                    progress.note.update({
                        message: '<strong>Failed to export: </strong>' + err.message,
                        type: 'danger',
                        progress: 100
                    });
                } else {
                    saveToDisk.saveUrlToDisk(bc.getDownloadURL(result.hash));
                    progress.note.update({
                        message: '<strong>Exported </strong> project <a href="' +
                            bc.getDownloadURL(result.hash) + '" target="_blank">' + result.fileName + '</a>',
                        progress: 100,
                        type: 'success'
                    });
                }

                if (typeof callback === 'function') {
                    callback(err);
                }
            };

        if (libraryName) {
            client.workerRequests.exportLibraryToFile(
                projectParams ? projectParams.projectId : client.getActiveProjectId(),
                projectParams ? projectParams.branchName : client.getActiveBranchName(),
                projectParams ? projectParams.commitHash : client.getActiveCommitHash(),
                withAssets,
                libraryName,
                cb
            );
        } else {
            client.exportProjectToFile(
                projectParams ? projectParams.projectId : client.getActiveProjectId(),
                projectParams ? projectParams.branchName : client.getActiveBranchName(),
                projectParams ? projectParams.commitHash : client.getActiveCommitHash(),
                withAssets,
                cb
            );
        }
    }

    function exportProject(client, logger, projectParams, withAssets, callback) {
        _exportProjectOrLibrary(client, logger, projectParams, withAssets, undefined, callback);
    }

    function exportModels(client, logger, selectedIds, withAssets, callback) {
        var progress = ProgressNotification.start({
            message: '<strong>Exporting </strong> models ...',
            useClipboard: true
        }),
            bc = new BlobClient({ logger: logger.fork('BlobClient') });

        withAssets = withAssets === false ? false : true;

        client.exportSelectionToFile(
            client.getActiveProjectId(),
            client.getActiveCommitHash(),
            selectedIds,
            withAssets,
            function (err, result) {
                clearInterval(progress.intervalId);
                if (err) {
                    logger.error('unable to export models', err);
                    progress.note.update({
                        message: '<strong>Failed to export: </strong>' + err.message,
                        type: 'danger',
                        progress: 100
                    });
                } else {
                    progress.note.update({
                        message: '<strong>Exported </strong> models <a href="' +
                            bc.getDownloadURL(result.hash) + '" target="_blank">' + result.fileName + '</a>',
                        progress: 100,
                        type: 'success',
                        clipboardValue: result.hash
                    });

                    progress.btnEl.show();
                }

                if (typeof callback === 'function') {
                    callback(err);
                }
            }
        );
    }

    return {
        exportProject,
        exportLibrary: _exportProjectOrLibrary,
        exportModels,
    };
});