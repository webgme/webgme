/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/util',
    'blob/BlobClient',
    'text!./templates/PluginResultsDialog.html',
    'js/logger',
    'common/storage/util',
    'css!./styles/PluginResultsDialog.css'
], function (clientUtil,
             BlobClient,
             pluginResultsDialogTemplate,
             Logger,
             storageUtil) {

    'use strict';

    var PluginResultsDialog,
        PLUGIN_RESULT_ENTRY_BASE = $('<div/>', {class: 'plugin-result'}),
        PLUGIN_RESULT_HEADER_BASE = $('<div class="alert"></div>'),
        RESULT_SUCCESS_CLASS = 'alert-success',
        RESULT_ERROR_CLASS = 'alert-danger',
        RESULT_WARNING_CLASS = 'alert-warning',
        ICON_SUCCESS = $('<i class="glyphicon glyphicon-ok"/>'),
        ICON_ERROR = $('<i class="glyphicon glyphicon-warning-sign"/>'),
        RESULT_NAME_BASE = $('<span/>', {class: 'title'}),
        RESULT_TIME_BASE = $('<span/>', {class: 'time'}),
        RESULT_DETAILS_BTN_BASE = $('<span class="btn btn-micro btn-details pull-right">Details</span>'),
        RESULT_DETAILS_BASE = $('<div/>', {class: 'messages collapse'}),
        MESSAGE_ENTRY_BASE = $('<div class="msg"><div class="msg-title"></div><div class="msg-body"></div></div>'),
        MESSAGE_ENTRY_NODE_BTN_BASE = $('<span class="btn btn-micro btn-node pull-right">Show node</span>'),
    //jscs:disable maximumLineLength
        RESULT_ARTIFACTS_BASE = $('<div class="artifacts collapse"><div class="artifacts-title">Generated artifacts</div><div class="artifacts-body"><ul></ul></div></div>'),
        RESULT_HISTORY_BASE = $('<div class="artifacts history collapse"><div class="artifacts-title history-title">Execution History</div><div class="history-body"><ul></ul></div></div>'),
        COMMIT_ENTRY = $('<li><span class="btn btn-micro btn-commit" title="Select commit"></span><span class="commit-msg"></span><span class="btn btn-micro btn-branch" title="Select branch"></span></li>'),
    //jscs:enable maximumLineLength
        ARTIFACT_ENTRY_BASE = $('<li><a href="#" target="_self">Loading...</a></li>'),
        MESSAGE_PREFIX = 'Message #';

    PluginResultsDialog = function () {
        this.logger = Logger.create('gme:Dialogs:PluginResults:PluginResultsDialog', WebGMEGlobal.gmeConfig.client.log);
    };

    PluginResultsDialog.prototype.show = function (client, pluginResults, expandedId) {
        var self = this;

        this._dialog = $(pluginResultsDialogTemplate);
        this._client = client;
        this._initDialog(pluginResults, expandedId || null);

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.modal('show');
    };


    PluginResultsDialog.prototype._initDialog = function (pluginResults, expandedId) {
        var self = this,
            dialog = this._dialog,
            client = this._client,
            resultEntry,
            body = dialog.find('.modal-body'),
            UNREAD_CSS = 'unread',
            result,
            resultHeader,
            spanResultTitle,
            spanResultTime,
            messageContainer,
            resultDetailsBtn,
            messageEntry,
            messageEntryBtn,
            messages,
            j,
            artifactsContainer,
            artifacts,
            artifactsUL,
            artifactEntry,
            artifactEntryA,
            i,
            pluginName,
            pluginTime,
            blobClient,
            addArtifactUL;

        addArtifactUL = function (hash, ulE, bc) {
            bc.getMetadata(hash, function (err, metadata) {
                if (err) {
                    self.logger.error(err);
                    return;
                }
                var size = bc.getHumanSize(metadata.size);
                artifactEntry = ARTIFACT_ENTRY_BASE.clone();
                artifactEntryA = artifactEntry.find('a');
                //TODO: set the correct URL here
                artifactEntryA.attr('href', bc.getDownloadURL(hash));
                //TODO: set the correct link text here
                artifactEntryA.text(metadata.name + ' (' + size + ')');
                ulE.append(artifactEntry);
            });
        };

        function getHistory(commits, projectId) {
            var historyContainer = RESULT_HISTORY_BASE.clone(),
                commitEl,
                btnCommit,
                btnBranch,
                message,
                historyUl = historyContainer.find('ul'),
                c;

            for (c = 0; c < commits.length; c += 1) {
                if (c === 0) {
                    message = 'started from';
                } else if (commits[c].status === storageUtil.CONSTANTS.SYNCED) {
                    message = 'updated';
                } else if (commits[c].status === storageUtil.CONSTANTS.MERGED) {
                    message = 'merged into';
                } else if (!commits[c].status) {
                    // When null or undefined there was no branch target for the commit..
                    message = 'made commit';
                } else {
                    message = 'forked and created';
                }

                commitEl = COMMIT_ENTRY.clone();
                btnCommit = commitEl.find('.btn-commit');
                btnCommit.text(commits[c].commitHash.substring(0, 7));
                btnCommit.attr('project-id', projectId);
                btnCommit.attr('commit-hash', commits[c].commitHash);

                commitEl.find('.commit-msg').text(message);

                btnBranch = commitEl.find('.btn-branch').text(commits[c].branchName);
                btnBranch.text(commits[c].branchName);
                btnBranch.attr('project-id', projectId);
                btnBranch.attr('branch-name', commits[c].branchName);

                historyUl.append(commitEl);
            }

            return historyContainer;
        }

        function toggleCollapsed(resultDiv) {
            var messagesPanel = resultDiv.find('.messages'),
                artifactsPanel = resultDiv.find('.artifacts');

            messagesPanel.toggleClass('in');
            artifactsPanel.toggleClass('in');
        }

        for (i = 0; i < pluginResults.length; i += 1) {
            result = pluginResults[i];

            resultEntry = PLUGIN_RESULT_ENTRY_BASE.clone();

            if (result.__unread === true) {
                resultEntry.addClass(UNREAD_CSS);
                delete result.__unread;
            }

            pluginName = result.getPluginName ? result.getPluginName() : 'PluginName N/A';
            spanResultTitle = RESULT_NAME_BASE.clone();


            resultHeader = PLUGIN_RESULT_HEADER_BASE.clone();
            if (result.getSuccess() === true) {
                resultHeader.append(ICON_SUCCESS.clone());


                if (client.getProjectObject() && client.getProjectObject().projectId !== result.projectId) {
                    resultHeader.addClass(RESULT_WARNING_CLASS);
                    spanResultTitle.text(pluginName + ' - was invoked on different project (' +
                        storageUtil.getProjectDisplayedNameFromProjectId(result.projectId) + ').');
                } else {
                    resultHeader.addClass(RESULT_SUCCESS_CLASS);
                    spanResultTitle.text(pluginName);
                }

            } else {
                resultHeader.addClass(RESULT_ERROR_CLASS);
                resultHeader.append(ICON_ERROR.clone());
                spanResultTitle.text(pluginName + ' - ' + result.error);
            }

            resultHeader.append(spanResultTitle);

            pluginTime = result.getFinishTime ? clientUtil.formattedDate(new Date(result.getFinishTime()),
                'elapsed') : 'Time: N/A';
            spanResultTime = RESULT_TIME_BASE.clone();
            spanResultTime.text(pluginTime);
            resultHeader.append(spanResultTime);

            resultDetailsBtn = RESULT_DETAILS_BTN_BASE.clone();
            resultHeader.append(resultDetailsBtn);

            messageContainer = RESULT_DETAILS_BASE.clone();
            messages = result.getMessages();

            for (j = 0; j < messages.length; j += 1) {
                messageEntry = MESSAGE_ENTRY_BASE.clone();
                messageEntry.find('.msg-title').text(MESSAGE_PREFIX + (j + 1));
                if (messages[j].activeNode.id || messages[j].activeNode.id === '') {
                    messageEntryBtn = MESSAGE_ENTRY_NODE_BTN_BASE.clone();
                    messages[j].projectId = result.projectId;
                    messageEntry.append(messageEntryBtn);
                    messageEntry.find('.btn-node').attr('node-result-details', JSON.stringify(messages[j]));
                }
                messageEntry.find('.msg-body').html(messages[j].message);
                messageContainer.append(messageEntry);
            }

            artifactsContainer = undefined;

            blobClient = new BlobClient({logger: this.logger.fork('BlobClient')});

            artifacts = result.getArtifacts();
            if (artifacts.length > 0) {
                artifactsContainer = RESULT_ARTIFACTS_BASE.clone();
                artifactsUL = artifactsContainer.find('ul');
                for (j = 0; j < artifacts.length; j += 1) {
                    addArtifactUL(artifacts[j], artifactsUL, blobClient);
                }
            }

            resultEntry.append(resultHeader);

            resultEntry.append(getHistory(result.commits, result.projectId));

            if (artifactsContainer) {
                resultEntry.append(artifactsContainer);
            }

            resultEntry.append(messageContainer);

            if (result.__id === expandedId) {
                toggleCollapsed(resultEntry);
            }

            body.append(resultEntry);
        }

        dialog.find('.btn-clear').on('click', function () {
            body.empty();
            pluginResults.splice(0, pluginResults.length);
        });

        dialog.on('click', '.btn-details', function (event) {
            toggleCollapsed($(this).parent().parent());

            event.stopPropagation();
            event.preventDefault();
        });

        dialog.on('click', '.btn-commit', function () {
            var commitEl = $(this),
                projectId = commitEl.attr('project-id'),
                commitHash = commitEl.attr('commit-hash');
            if (client.getProjectObject() && client.getProjectObject().projectId === projectId) {
                client.selectCommit(commitHash, function (err) {
                    if (err) {
                        self.logger.error(err);
                    } else {
                        // Set this as selected.
                    }
                });
            } else {
                self.logger.error('Project for result is not the same as open project', projectId);
            }
        });

        dialog.on('click', '.btn-branch', function () {
            var commitEl = $(this),
                projectId = commitEl.attr('project-id'),
                branchName = commitEl.attr('branch-name');
            if (client.getProjectObject() && client.getProjectObject().projectId === projectId) {
                //if (client.getActiveBranchName() === branchName) {
                //    return;
                //}
                client.selectBranch(branchName, null, function (err) {
                    if (err) {
                        self.logger.error(err);
                    } else {
                        // Set this as selected.
                    }
                });
            } else {
                self.logger.error('Project for result is not the same as open project', projectId);
            }
        });

        dialog.on('click', '.btn-node', function (/* event */) {
            var nodeBtn = $(this),
                resultEntry = JSON.parse(nodeBtn.attr('node-result-details')),
                nodeId = resultEntry.activeNode.id,
                projectId = resultEntry.projectId,
                patterns = {},
                territoryId = client.addUI(this, function (events) {
                    var nodeLoaded = false;
                    events.forEach(function (event) {
                        if (event.etype === 'load' && event.eid === nodeId) {
                            nodeLoaded = true;
                        }
                    });

                    if (nodeLoaded) {
                        WebGMEGlobal.State.registerActiveObject(nodeId);
                        WebGMEGlobal.State.registerActiveSelection([]);
                        dialog.modal('hide');
                    } else {
                        self.logger.error('Could not load the linked node at path', nodeId);
                    }

                    client.removeUI(territoryId);
                });

            if (client.getProjectObject() && client.getProjectObject().projectId === projectId) {
                territoryId = client.addUI(this, function (events) {
                    var nodeLoaded = false;
                    events.forEach(function (event) {
                        if (event.etype === 'load' && event.eid === nodeId) {
                            nodeLoaded = true;
                        }
                    });

                    if (nodeLoaded) {
                        WebGMEGlobal.State.registerActiveObject(nodeId);
                        WebGMEGlobal.State.registerActiveSelection([]);
                        dialog.modal('hide');
                    } else {
                        self.logger.error('Could not load the linked node at path', nodeId);
                    }

                    client.removeUI(territoryId);
                });

                patterns[nodeId] = {children: 0};
                client.updateTerritory(territoryId, patterns);
            } else {
                self.logger.error('Project for result is not the same as open project', projectId);
            }
        });

    };


    return PluginResultsDialog;
});
