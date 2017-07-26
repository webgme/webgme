/**
 * @author kecso / https://github.com/kecso
 */
define(['js/Constants'], function (CONSTANTS) {
    'use strict';

    function gmeMetaRename(logger, state, storage, saveRoot) {

        function renameConcept(nodePath, type, oldName, newName, callback) {
            var parameters = {
                command: 'renameConcept',
                projectId: state.project.projectId,
                nodePath: nodePath,
                type: type,
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function renameAttributeDefinition(nodePath, meta, oldName, newName, callback) {
            var parameters = {
                command: 'changeAttributeMeta',
                projectId: state.project.projectId,
                nodePath: nodePath,
                meta: meta,
                type: 'attribute',
                oldName: oldName,
                newName: newName,
                branchName: state.branchName
            };

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        return {
            renameConcept: renameConcept,
            renameAttributeDefinition: renameAttributeDefinition
        };
    }

    return gmeMetaRename;
});