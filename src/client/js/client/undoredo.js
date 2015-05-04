/*globals define*/
/*jshint browser: true*/
/**
 * @author kecso / https://github.com/kecso
 */
define([], function () {
    'use strict';
    function UndoRedo(_client) {
        var
            currentModification = null,
            canDoUndo = false,
            canDoRedo = false,
            currentTarget = null,
            addModification = function (commitHash, info) {
                var newElement = {
                    previous: currentModification,
                    commit: commitHash,
                    info: info,
                    next: null
                };
                if (currentModification) {
                    currentModification.next = newElement;
                }
                currentModification = newElement;
            },
            undo = function (branch, callback) {
                var from, to, project;
                if (canDoUndo && currentModification && currentModification.previous) {
                    project = _client.getProjectObject();
                    from = currentModification.commit;
                    to = currentModification.previous.commit;
                    currentModification = currentModification.previous;
                    currentTarget = to;
                    project.setBranchHash(branch, from, to, callback);
                } else {
                    callback(new Error('unable to execute undo'));
                }
            },
            redo = function (branch, callback) {
                var from, to, project;
                if (canDoRedo && currentModification && currentModification.next) {
                    project = _client.getProjectObject();
                    from = currentModification.commit;
                    to = currentModification.next.commit;
                    currentModification = currentModification.next;
                    currentTarget = to;
                    project.setBranchHash(branch, from, to, callback);
                } else {
                    callback(new Error('unable to execute redo'));
                }
            },
            clean = function () {
                currentModification = null;
                canDoUndo = false;
                canDoRedo = false;
            },
            checkStatus = function () {
                return {
                    undo: currentModification ? currentModification.previous !== null &&
                    currentModification.previous !== undefined : false,
                    redo: currentModification ? currentModification.next !== null &&
                    currentModification.next !== undefined : false
                };
            },
            isCurrentTarget = function (commitHash) {
                if (currentTarget === commitHash) {
                    currentTarget = null;
                    return true;
                }
                return false;
            };

        _client.addEventListener(_client.events.UNDO_AVAILABLE, function (client, parameters) {
            canDoUndo = parameters === true;
        });
        _client.addEventListener(_client.events.REDO_AVAILABLE, function (client, parameters) {
            canDoRedo = parameters === true;
        });
        return {
            undo: undo,
            redo: redo,
            addModification: addModification,
            clean: clean,
            checkStatus: checkStatus,
            isCurrentTarget: isCurrentTarget
        };

    }

    return UndoRedo;
});