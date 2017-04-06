/*globals define, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


define([
    'js/logger',
    'common/util/diff',
    'text!./templates/MergeDialog.html',
    'text!./templates/DiffTemplate.html',
    'css!./styles/MergeDialog.css'
], function (Logger,
             DIFF,
             mergeDialogTemplate,
             diffTemplate) {

    'use strict';
    function getParentPath(path) {
        //in case of root object it return the root itself
        return path.slice(0, path.lastIndexOf('/'));
    }

    var MergeDialog;

    MergeDialog = function (client) {
        this._logger = Logger.create('gme:Dialogs:Merge:MergeDialog', WebGMEGlobal.gmeConfig.client.log);

        this._client = client;

        this._logger.debug('Created');

        this.resolution = null; // conflict resolution by user
    };

    MergeDialog.prototype.show = function (err, mergeResult) {
        var self = this;

        this._initDialog();

        if (err) {
            this._alertFailed.show();
            this._alertFailed.text(err);

            if (mergeResult) {
                this._addDiff(mergeResult);
                this._btnResolve.show();
                this._btnAbort.show();
            } else {
                this._warningNoDiff.show();
                this._btnOk.show();
            }
        } else {
            this._alertSuccess.show();
            this._btnOk.show();
        }

        this._dialog.modal('show');

        this._dialog.on('shown.bs.modal', function () {
            //self._txtMessage.focus();
        });

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._btnResolve.on('click', function () {
            // TODO: update UI to reflect the applied conflict resolution

            self._client.resolve(self.resolution, function (err, result) {
                // FIXME: we might be able to reuse the current dialog instance ...
                var mergeDialog = new MergeDialog(self._client);
                if (err) {
                    self._logger.error('resolve finished', err, result);
                } else {
                    self._logger.debug('resolve finished', result);
                }

                mergeDialog.show(err, result);
            });
        });

        //this._btnAbort.on('click', function () {
        //    //just simply exit the dialog
        //    self._dialog.modal('hide');
        //});
    };

    MergeDialog.prototype._initDialog = function () {
        //var self = this,
        //    actualBranchName = this._client.getActiveBranchName();

        this._dialog = $(mergeDialogTemplate);

        this._alertSuccess = this._dialog.find('.merge-success');
        this._alertFailed = this._dialog.find('.merge-failed');

        this._warningNoDiff = this._dialog.find('.no-diff');
        this._diffPlaceholder = this._dialog.find('.diff-placeholder');

        this._btnResolve = this._dialog.find('.btn-resolve');
        this._btnAbort = this._dialog.find('.btn-abort');
        this._btnOk = this._dialog.find('.btn-ok');

        this._alertSuccess.hide();
        this._alertFailed.hide();

        this._warningNoDiff.hide();
        this._btnResolve.hide();
        this._btnAbort.hide();
        this._btnOk.hide();
    };

    MergeDialog.prototype._addDiff = function (mergeResult) {
        var self = this,
            diff = $(diffTemplate),
            conflictsE,
            conflictItem,
            conflictItemTemplate = $('<div class="row conflict-item">' +
                '<div class="col-md-3 path"></div>' +
                '<div class="col-md-3 value-theirs"></div>' +
                '<div class="col-md-3 value-mine"></div>' +
                '<div class="col-md-3 value-other"></div>' +
                '</div>'),
            conflictItemE,
            pathObject,
            path,
            text,
            value,
            link,
            i;

        this.resolution = mergeResult;

        diff.find('.base').text(mergeResult.baseCommitHash);
        diff.find('.mine').text(mergeResult.myCommitHash);
        diff.find('.theirs').text(mergeResult.theirCommitHash);
        diff.find('.branch').text(mergeResult.targetBranchName);

        conflictsE = diff.find('.conflicts');

        if (mergeResult.hasOwnProperty('conflict') &&
            mergeResult.conflict.hasOwnProperty('items')) {

            // test ui scalability
            //for (i = 0; i < 100; i += 1) {
            //    mergeResult.conflict.items.push(JSON.parse(JSON.stringify(mergeResult.conflict.items[Math.floor(Math.random() * mergeResult.conflict.items.length)])));
            //}

            conflictItemE = conflictItemTemplate.clone();
            conflictItemE.find('.path').text('Path to conflict');
            conflictItemE.find('.value-theirs').text('Theirs (current branch)');
            conflictItemE.find('.value-mine').text('Mine (merging in)');
            conflictItemE.find('.value-other').text('Manual (by default original)');

            conflictsE.append(conflictItemE);

            mergeResult.conflict.items.sort(function (a, b) {
                if (a.theirs.path > b.theirs.path) {
                    return 1;
                }
                if (a.theirs.path < b.theirs.path) {
                    return -1;
                }
                // a must be equal to b
                return 0;
            });

            for (i = 0; i < mergeResult.conflict.items.length; i += 1) {
                conflictItem = mergeResult.conflict.items[i];
                conflictItemE = conflictItemTemplate.clone();

                pathObject = DIFF.pathToObject(conflictItem.theirs.path);
                path = conflictItem.originalNodePath || pathObject.node;
                conflictItemE.find('.path').text('"' + pathObject.node + '" [' +
                    pathObject.full.substr(pathObject.node.length) + ']');

                link = '?project=' + encodeURIComponent(self._client.getActiveProjectId()) +
                    '&commit=' + encodeURIComponent(mergeResult.theirCommitHash) +
                    '&node=' + encodeURIComponent(getParentPath(path)) +
                    '&selection=' + encodeURIComponent(path);

                value = $('<div>' +
                    '<a class="glyphicon glyphicon-link" href="' + link +
                    '" target="_blank" tooltip="Open"></a>' +
                    '<span><code style="word-wrap: break-word; white-space: normal">' +
                    JSON.stringify(conflictItem.theirs.value) + '</code></span>' +
                    '</div>');

                conflictItemE.find('.value-theirs').append(value);
                this._addClickHandler(conflictItem, conflictItemE, value, 'theirs');

                if (conflictItem.theirs.path === conflictItem.mine.path) {
                    text = JSON.stringify(conflictItem.mine.value);
                } else {
                    text = conflictItem.mine.path + ': ' + JSON.stringify(conflictItem.mine.value);
                }

                pathObject = DIFF.pathToObject(conflictItem.mine.path);
                path = conflictItem.originalNodePath || pathObject.node;
                link = '?project=' + encodeURIComponent(self._client.getActiveProjectId()) +
                    '&commit=' + encodeURIComponent(mergeResult.myCommitHash) +
                    '&node=' + encodeURIComponent(getParentPath(path)) +
                    '&selection=' + encodeURIComponent(path);
                value = $('<div>' +
                    '<a class="glyphicon glyphicon-link" href="' + link + '"  target="_blank" tooltip="Open"></a>' +
                    '<span><code style="word-wrap: break-word; white-space: normal">' + text + '</code></span>' +
                    '</div>');

                conflictItemE.find('.value-mine').append(value);
                this._addClickHandler(conflictItem, conflictItemE, value, 'mine');

                if (conflictItem.other) {
                    pathObject = DIFF.pathToObject(conflictItem.other.path);
                    link = '?project=' + encodeURIComponent(self._client.getActiveProjectId()) +
                        '&commit=' + encodeURIComponent(mergeResult.baseCommitHash) +
                        '&node=' + encodeURIComponent(getParentPath(pathObject.node)) +
                        '&selection=' + encodeURIComponent(pathObject.node);
                    value = $('<div>' +
                        '<a class="glyphicon glyphicon-link" href="' + link + '"  target="_blank" tooltip="Open"></a>' +
                        '<span><input type="text" value=\'' + JSON.stringify(conflictItem.other.value) +
                        '\' style="word-wrap: break-word; white-space: normal"></input></span></div>');

                    conflictItemE.find('.value-other').append(value);
                    this._addClickHandler(conflictItem, conflictItemE, value, 'other');
                    this._addTypeChecker(conflictItem, value);
                }
                this._updateSelection(conflictItem, conflictItemE);
                this._addGlobalClickHandler(conflictItem, conflictItemE);

                conflictsE.append(conflictItemE);
            }
        }

        this._diffPlaceholder.append(diff);
    };

    MergeDialog.prototype._addTypeChecker = function (conflictItem, valueE) {
        var inputField = valueE.find('input'),
            value;
        inputField.on('keyup', function (event) {
            event.preventDefault();
            event.stopPropagation();

            value = inputField.val();
            try {
                if (typeof conflictItem.other.value === typeof JSON.parse(value)) {
                    valueE.removeClass('text-danger');
                    conflictItem.other.value = JSON.parse(value);
                } else {
                    valueE.addClass('text-danger');
                }
            } catch (e) {
                valueE.addClass('text-danger');
            }
        });
    };

    MergeDialog.prototype._addGlobalClickHandler = function (conflictItem, conflictItemE) {
        var self = this;

        conflictItemE.on('click', function (event) {
            if (event.target.tagName === 'A') {
                // clicked on an A tag we do not need to change the selection.
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            //We rotate the selection
            switch (conflictItem.selected) {
                case 'theirs':
                    conflictItem.selected = 'mine';
                    break;
                case 'mine':
                    if (conflictItem.other) {
                        conflictItem.selected = 'other';
                    } else {
                        conflictItem.selected = 'theirs';
                    }
                    break;
                case 'other':
                    conflictItem.selected = 'theirs';
                    break;
            }

            self._updateSelection(conflictItem, conflictItemE);
        });
    };

    MergeDialog.prototype._addClickHandler = function (conflictItem, conflictItemE, conflictItemSegmentE, type) {
        var self = this;

        conflictItemSegmentE.on('click', function (event) {

            if (event.target.tagName === 'A') {
                // clicked on an A tag we do not need to change the selection.
                return;
            }

            event.stopPropagation();
            event.preventDefault();

            if (conflictItem.selected !== type) {
                conflictItem.selected = type;
                self._updateSelection(conflictItem, conflictItemE);
            }
        });
    };

    MergeDialog.prototype._updateSelection = function (conflictItem, conflictItemE) {
        if (conflictItem.selected === 'mine') {
            conflictItemE.find('.value-mine').addClass('selected');
            conflictItemE.find('.value-theirs').removeClass('selected');
            conflictItemE.find('.value-other').removeClass('selected');
        } else if (conflictItem.selected === 'theirs') {
            conflictItemE.find('.value-mine').removeClass('selected');
            conflictItemE.find('.value-other').removeClass('selected');
            conflictItemE.find('.value-theirs').addClass('selected');
        } else {
            conflictItemE.find('.value-other').addClass('selected');
            conflictItemE.find('.value-mine').removeClass('selected');
            conflictItemE.find('.value-theirs').removeClass('selected');
        }
    };

    return MergeDialog;
});