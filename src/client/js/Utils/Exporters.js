/*globals define*/
/*jshint node: true, browser: true, bitwise: false*/

/**
 * @author kecso / https://github.com/kecso
 */
define([
    'js/Loader/ProgressNotification',
    'clipboard',
    'js/Utils/SaveToDisk'
], function (ProgressNotification, Clipboard, saveToDisk) {
    'use strict';

    function exportProject(client, logger, projectParams, withAssets, callback) {
        var progress = ProgressNotification.start('<strong>Exporting </strong> project ...');

        client.exportProjectToFile(
            projectParams ? projectParams.projectId : client.getActiveProjectId(),
            projectParams ? projectParams.branchName : client.getActiveBranchName(),
            projectParams ? projectParams.commitHash : client.getActiveCommitHash(),
            withAssets,
            function (err, result) {
                clearInterval(progress.intervalId);
                if (err) {
                    logger.error('unable to save project', err);
                    progress.note.update({
                        message: '<strong>Failed to export: </strong>' + err.message,
                        type: 'danger',
                        progress: 100
                    });
                } else {
                    saveToDisk.saveUrlToDisk(result.downloadUrl);
                    progress.note.update({
                        message: '<strong>Exported </strong> project <a href="' +
                        result.downloadUrl + '" target="_blank">' + result.fileName + '</a>',
                        progress: 100,
                        type: 'success'
                    });
                }

                if (typeof callback === 'function') {
                    callback(err);
                }
            }
        );
    }

    function exportModels(client, logger, selectedIds, withAssets, callback) {
        var progress = ProgressNotification.start('<strong>Exporting </strong> models ...');

        withAssets = withAssets === false ? false : true;

        client.exportSelectionToFile(
            client.getActiveProjectId(),
            client.getActiveCommitHash(),
            selectedIds,
            withAssets,
            function (err, result) {
                var copied = false;
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
                        result.downloadUrl + '" target="_blank">' + result.fileName + '</a>',
                        progress: 100,
                        type: 'success',
                        icon: 'glyphicon glyphicon-copy'
                    });

                    $(progress.note.$ele).find('.glyphicon-copy').attr('title', 'copy blobhash of export to clipboard');
                    $(progress.note.$ele).find('.glyphicon-copy').attr('data-clipboard-text', result.hash);
                    new Clipboard($(progress.note.$ele).find('.glyphicon-copy')[0]);
                }

                if (typeof callback === 'function') {
                    callback(err);
                }
            }
        );
    }

    return {
        exportProject: exportProject,
        exportModels: exportModels
    };
});