/*globals define, WebGMEGlobal, $*/
/*jshint browser: true*/

define([
    'js/logger',
    'js/Constants',
    'js/Dialogs/ProjectInfo/ProjectInfoDialog',
    'css!./styles/ProjectKindWidget.css'
], function (Logger, CONSTANTS, ProjectInfoDialog) {

    'use strict';

    function ProjectKindWidget(containerEl, client) {
        this._logger = Logger.create('gme:Widgets:ProjectKind:ProjectKindWidget',
            WebGMEGlobal.gmeConfig.client.log);
        this._client = client;
        this._el = containerEl;
        this._initializeUI();
        this._logger.debug('Created');
    }

    ProjectKindWidget.prototype._initializeUI = function () {
        var self = this;

        this._el.empty();
        this._btnGroup = $('<div class="btn-group"></div>');
        this._btn = $('<button type="button" class="btn btn-micro btn-gray project-kind-btn" title="Project kind"/>');
        this._btnGroup.append(this._btn);
        this._el.append(this._btnGroup);

        this._btn.on('click', function (event) {
            var projectId = self._client.getActiveProjectId(),
                dialog;

            event.preventDefault();
            event.stopPropagation();

            if (!projectId) {
                return;
            }

            dialog = new ProjectInfoDialog(self._client);
            dialog.show(projectId, {
                onSaved: function () {
                    self._refresh();
                }
            });
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_OPENED, function () {
            self._refresh();
        });

        this._client.addEventListener(CONSTANTS.CLIENT.PROJECT_CLOSED, function () {
            self._refresh();
        });

        this._refresh();
    };

    ProjectKindWidget.prototype._refresh = function () {
        var self = this,
            projectId = this._client.getActiveProjectId(),
            kind;

        if (!projectId) {
            this._el.hide();
            return;
        }

        this._el.show();

        this._client.getProjects({info: true}, function (err, projects) {
            var i,
                info;

            if (err || self._client.getActiveProjectId() !== projectId) {
                return;
            }

            kind = null;
            for (i = 0; i < projects.length; i += 1) {
                if (projects[i]._id === projectId) {
                    info = projects[i].info || {};
                    kind = info.kind || null;
                    break;
                }
            }

            if (kind) {
                self._btn.text(kind);
                self._btn.attr('title', 'Project kind: ' + kind);
                self._btn.removeClass('no-kind');
            } else {
                self._btn.text('Kind');
                self._btn.attr('title', 'No project kind set — click to edit');
                self._btn.addClass('no-kind');
            }
        });
    };

    ProjectKindWidget.prototype.destroy = function () {
        if (this._btn) {
            this._btn.off('click');
        }
    };

    return ProjectKindWidget;
});
