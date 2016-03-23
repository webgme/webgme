/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define(['js/Constants'], function (CONSTANTS) {
    'use strict';
    function gmeLibraries(logger, state, storage, saveFunction) {

        function getLibraryNames() {
            if (state.core && state.nodes[CONSTANTS.PROJECT_ROOT_ID] &&
                typeof state.nodes[CONSTANTS.PROJECT_ROOT_ID].node === 'object') {
                return state.core.getLibraryNames(state.nodes[CONSTANTS.PROJECT_ROOT_ID].node);
            }

            return [];
        }

        function getLibraryInfo(libraryName) {
            if (state.core && state.nodes[CONSTANTS.PROJECT_ROOT_ID] &&
                typeof state.nodes[CONSTANTS.PROJECT_ROOT_ID].node === 'object') {
                return state.core.getLibraryInfo(state.nodes[CONSTANTS.PROJECT_ROOT_ID].node, libraryName) || null;
            }

            return null;
        }

        function importLibrary(name, blobHashOrLibraryInfo, callback) {
            var parameters = {
                command: 'addLibrary',
                projectId: state.project.projectId,
                libraryName: name,
                branchName: state.branchName
            };

            if (typeof blobHashOrLibraryInfo === 'string') {
                parameters.blobHash = blobHashOrLibraryInfo;
            } else {
                parameters.libraryInfo = blobHashOrLibraryInfo;
            }

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function refreshLibrary(name, blobHashOrLibraryInfo, callback) {
            var parameters = {
                command: 'updateLibrary',
                projectId: state.project.projectId,
                libraryName: name,
                branchName: state.branchName
            };

            if (typeof blobHashOrLibraryInfo === 'string') {
                parameters.blobHash = blobHashOrLibraryInfo;
            } else if (blobHashOrLibraryInfo) {
                parameters.libraryInfo = blobHashOrLibraryInfo;
            }

            storage.simpleRequest(parameters, function (err, result) {
                if (err) {
                    logger.error(err);
                }
                callback(err, result);
            });
        }

        function removeLibrary(libraryName) {
            state.core.removeLibrary(state.nodes[CONSTANTS.PROJECT_ROOT_ID].node, libraryName);
            saveFunction('removeLibrary(' + libraryName + ')');
        }

        function renameLibrary(oldName, newName) {
            state.core.renameLibrary(state.nodes[CONSTANTS.PROJECT_ROOT_ID].node, oldName, newName);
            saveFunction('renameLibrary(' + oldName + ',' + newName + ')');
        }

        function followLibrary(libraryRootId) {
            var address,
                info;
            if (!state.nodes[libraryRootId]) {
                logger.warn('only cached libraryies can be followed!');
                return;
            }
            info = getLibraryInfo(state.core.getFullyQualifiedName(state.nodes[libraryRootId].node));

            if (!info) {
                logger.warn('the library has no valid info');
                return;
            }

            if (!info.projectId) {
                logger.warn('the library has only partial info');
                return;
            }

            address = window.location.origin + '/?project=' + encodeURIComponent(info.projectId);

            if (info.commitHash) {
                address += '&commit=' + encodeURIComponent(info.commitHash);
            } else if (info.branchName) {
                address += '&branch=' + encodeURIComponent(info.branchName);
            }

            window.open(address, '_blank');
            window.focus();

        }

        return {
            getLibraryNames: getLibraryNames,
            importLibrary: importLibrary,
            refreshLibrary: refreshLibrary,
            removeLibrary: removeLibrary,
            renameLibrary: renameLibrary,
            getLibraryInfo: getLibraryInfo,
            followLibrary: followLibrary
        };
    }

    return gmeLibraries;
});