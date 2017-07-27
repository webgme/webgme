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

        function renamePointerTargetDefinition(nodePath, targetPath, oldName, newName, isSet, callback) {
            var parameters = {
                command: 'renameMetaPointerTarget',
                projectId: state.project.projectId,
                nodePath: nodePath,
                targetPath: targetPath,
                type: isSet ? 'set' : 'pointer',
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

        function renameAspectDefinition(nodePath, meta, oldName, newName, callback) {
            var parameters = {
                command: 'changeAspectMeta',
                projectId: state.project.projectId,
                nodePath: nodePath,
                meta: meta,
                type: 'aspect',
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
            renameAttributeDefinition: renameAttributeDefinition,
            renamePointerTargetDefinition: renamePointerTargetDefinition,
            renameAspectDefinition: renameAspectDefinition
        };
    }

    return gmeMetaRename;
});