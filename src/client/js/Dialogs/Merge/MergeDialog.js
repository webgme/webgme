/*globals define, WebGMEGlobal, $ */
/*jshint browser: true*/
/**
 * @author lattmann / https://github.com/lattmann
 */


define([
    'js/logger',
    'text!./templates/MergeDialog.html',
    'text!./templates/DiffTemplate.html',
    'css!./styles/MergeDialog.css'
], function (Logger,
             mergeDialogTemplate,
             diffTemplate) {

    'use strict';

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
                '<div class="col-md-6 path"></div>' +
                '<div class="col-md-3 value-theirs"></div>' +
                '<div class="col-md-3 value-mine"></div>' +
                '</div>'),
            conflictItemE,
            mineText,
            valueMineE,
            valueTheirsE,
            linkTheirs,
            linkMine,
            i,

        // FIXME: HACK
        // regular expression matching:
        // /1/2/3/4/5/attr/name -> '/1/2/3/4/5' -> nodeId
        // /attr/name -> '' -> root node
            pathRegExp = /((\/\d+)*)/,
            getParentPath = function (path) {
                //in case of root object it return the root itself
                return path.slice(0, path.lastIndexOf('/'));
            };

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
                conflictItemE.find('.path').text(conflictItem.theirs.path);

                linkTheirs = '?project=' + encodeURIComponent(self._client.getActiveProjectId()) +
                    '&commit=' + encodeURIComponent(mergeResult.theirCommitHash) +
                    // FIXME: regexp parses out the path
                    '&node=' + encodeURIComponent(getParentPath(pathRegExp.exec(conflictItem.theirs.path)[0])) +
                    '&selection=' + encodeURIComponent(pathRegExp.exec(conflictItem.theirs.path)[0]);

                valueTheirsE = $('<div>' +
                    '<a class="glyphicon glyphicon-link" href="' + linkTheirs + '" target="_blank" tooltip="Open"></a>' +
                    '<span><xmp style="word-wrap: break-word; white-space: normal">' + JSON.stringify(conflictItem.theirs.value) + '</xmp></span>' +
                    '</div>');

                conflictItemE.find('.value-theirs').append(valueTheirsE);

                if (conflictItem.theirs.path === conflictItem.mine.path) {
                    mineText = JSON.stringify(conflictItem.mine.value);
                } else {
                    mineText = conflictItem.mine.path + ': ' + JSON.stringify(conflictItem.mine.value);
                }

                linkMine = '?project=' + encodeURIComponent(self._client.getActiveProjectId()) +
                    '&commit=' + encodeURIComponent(mergeResult.myCommitHash) +
                    // FIXME: regexp parses out the path
                    '&node=' + encodeURIComponent(getParentPath(pathRegExp.exec(conflictItem.mine.path)[0])) +
                    '&selection=' + encodeURIComponent(pathRegExp.exec(conflictItem.mine.path)[0]);
                valueMineE = $('<div>' +
                    // FIXME: should we use fa-link instead ???
                    '<a class="glyphicon glyphicon-link" href="' + linkMine + '"  target="_blank" tooltip="Open"></a>' +
                    '<span><xmp style="word-wrap: break-word; white-space: normal">' + mineText + '</xmp></span>' +
                    '</div>');

                conflictItemE.find('.value-mine').append(valueMineE);

                this._updateSelection(conflictItem, conflictItemE);
                this._addClickHandler(conflictItem, conflictItemE);

                conflictsE.append(conflictItemE);
            }
        }

        this._diffPlaceholder.append(diff);
    };

    MergeDialog.prototype._addClickHandler = function (conflictItem, conflictItemE) {
        var self = this;

        conflictItemE.on('click', function (event) {

            if (event.target.tagName === 'A') {
                // clicked on an A tag we do not need to change the selection.
                return;
            }

            if (conflictItem.selected === 'mine') {
                conflictItem.selected = 'theirs';
            } else if (conflictItem.selected === 'theirs') {
                conflictItem.selected = 'mine';
            } else {
                // default
                conflictItem.selected = 'mine';
            }
            self._updateSelection(conflictItem, conflictItemE);
        });
    };

    MergeDialog.prototype._updateSelection = function (conflictItem, conflictItemE) {
        if (conflictItem.selected === 'mine') {
            conflictItemE.find('.value-mine').addClass('selected');
            conflictItemE.find('.value-theirs').removeClass('selected');
        } else if (conflictItem.selected === 'theirs') {
            conflictItemE.find('.value-mine').removeClass('selected');
            conflictItemE.find('.value-theirs').addClass('selected');
        } else {
            conflictItemE.find('.value-mine').removeClass('selected');
            conflictItemE.find('.value-theirs').removeClass('selected');
        }
    };

    return MergeDialog;
});