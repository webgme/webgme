/*globals define, $*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'text!./templates/MultiTabDialogDialog.html',
    'text!./templates/ModalBodyForm.html',
    'css!./styles/MultiTabDialog.css'
], function (dialogTemplate, modalBodyForm) {

    'use strict';

    var MultiTabDialog;

    MultiTabDialog = function () {

    };

    MultiTabDialog.prototype.show = function (fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hide.bs.modal', function () {
            self._onHide();
        });

        this._dialog.modal('show');
    };

    MultiTabDialog.prototype._initDialog = function (parameters) {
        var self = this,
            result = [],
            i;

        this._dialog = $(dialogTemplate);
        this._dialog.find('.header-icon').addClass(parameters.iconClass);
        this._dialog.find('.header-title').text(parameters.title);


        this._tabsUl = this._dialog.find('ul.nav-tabs');
        this._modalBody = this._dialog.find('.modal-body');
        this._modalFooter = this._dialog.find('.modal-footer');

        this._currentTabIndex = 0;
        this._tabEls = [];
        this._formEls = [];
        this._okBtnEls = [];

        for (i = 0; i < parameters.tabs.length; i += 1) {
            result.push(self._addTab(parameters.tabs[i]));
        }


        function toggleActive(tabEl) {
            self._formSnapShot.removeClass('activated');
            self._formDuplicate.removeClass('activated');
            self._formBlob.removeClass('activated');
            self._btnCreateSnapShot.removeClass('activated');
            self._btnDuplicate.removeClass('activated');
            self._btnCreateBlob.removeClass('activated');

            if (tabEl.hasClass('snap-shot')) {
                self._formSnapShot.addClass('activated');
                self._btnCreateSnapShot.addClass('activated');
            } else if (tabEl.hasClass('duplicate')) {
                self._formDuplicate.addClass('activated');
                self._btnDuplicate.addClass('activated');
            } else if (tabEl.hasClass('blob')) {
                self._formBlob.addClass('activated');
                self._btnCreateBlob.addClass('activated');
            } else {
                return;
            }
        }

        // Forms
        this._formSnapShot = this._dialog.find('form.snap-shot');
        this._formDuplicate = this._dialog.find('form.duplicate');
        this._formBlob = this._dialog.find('form.blob');

        // Assign buttons
        this._btnCreateSnapShot = this._dialog.find('.btn-create-snap-shot');
        this._btnDuplicate = this._dialog.find('.btn-duplicate');
        this._btnCreateBlob = this._dialog.find('.btn-create-blob');

        // Snap-shot selector
        this._selectSnapShot = this._formSnapShot.find('select.snap-shot');
        this._optGroupFile = this._selectSnapShot.find('optgroup.file');
        this._optGroupDb = this._selectSnapShot.find('optgroup.db');
        this._selectSnapShot.children().remove();
        this._optGroupFile.children().remove();
        this._selectSnapShot.append(this._optGroupFile);
        this._optGroupDb.children().remove();
        this._selectSnapShot.append(this._optGroupDb);
        // Duplicate selector
        this._selectDuplicate = this._formDuplicate.find('select.duplicate-project');
        this._optGroupDuplicate = this._selectDuplicate.find('optgroup.project-id');
        this._optGroupDuplicate.children().remove();
        this._selectDuplicate.append(this._optGroupDuplicate);

        this._btnCancel = this._dialog.find('.btn-cancel');

        if (self.initialTab === 'import') {
            toggleActive(this._dialog.find('li.blob').addClass('active'));
        } else {
            toggleActive(this._dialog.find('li.snap-shot').addClass('active'));
        }

        // attach handlers
        this._dialog.find('li.tab').on('click', function () {
            toggleActive($(this));
        });

        this._dialog.find('.toggle-info-btn').on('click', function (event) {
            var el = $(this),
                infoEl;
            event.preventDefault();
            event.stopPropagation();

            if (el.hasClass('snap-shot-info')) {
                infoEl = self._dialog.find('span.snap-shot-info');
            } else if (el.hasClass('duplicate-info')) {
                infoEl = self._dialog.find('span.duplicate-info');
            } else if (el.hasClass('blob-info')) {
                infoEl = self._dialog.find('span.blob-info');
            } else {
                return;
            }

            if (infoEl.hasClass('hidden')) {
                infoEl.removeClass('hidden');
            } else {
                infoEl.addClass('hidden');
            }
        });

        this._btnCreateSnapShot.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();

            self._dialog.modal('hide');

            if (self._fnCallback) {
                self._logger.debug(self._selectSnapShot.val());
                self.seedProjectType = self._selectSnapShot.val().slice(0, self._selectSnapShot.val().indexOf(':'));
                self.seedProjectName = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf(':') + 1);

                if (self.seedProjectType === 'db') {
                    self.seedProjectName = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf(':') + 1,
                        self._selectSnapShot.val().indexOf('#'));
                    self.seedCommitHash = self._selectSnapShot.val().slice(self._selectSnapShot.val().indexOf('#'));
                }

                self._fnCallback(self.seedProjectType,
                    self.seedProjectName,
                    self.seedProjectBranch,
                    self.seedCommitHash);
            }
        });

        this._btnCreateBlob.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
            if (self._fnCallback && self.assetWidget.propertyValue) {
                self._fnCallback(self._blobIsPackage ? 'package' : 'blob', self.assetWidget.propertyValue, null, null);
            }
        });

        this._btnCreateBlob.disable(true);

        this.assetWidget.onFinishChange(function (data) {
            self._btnCreateBlob.disable(true);

            if (!data.newValue) {
                self._logger.error(new Error('New data does not have a value, ' + data));
                return;
            }

            self.blobClient.getMetadata(data.newValue)
                .then(function (metadata) {
                    if (metadata.name.toLowerCase().lastIndexOf('.webgmex') ===
                        metadata.name.length - '.webgmex'.length) {
                        self._blobIsPackage = true;
                        self._btnCreateBlob.disable(false);
                    } else {
                        throw new Error('Not .webgmex extension');
                    }
                })
                .catch(function (err) {
                    //TODO: Better feedback here.
                    self._logger.error('Error in uploaded file', err);
                });
        });

        this._btnDuplicate.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._logger.debug('Duplicating with value', self._selectDuplicate.val());
            self._dialog.modal('hide');
            if (self._fnCallback) {
                self._fnCallback('duplicate', self._selectDuplicate.val(), null, null);
            }
        });

    };

    MultiTabDialog.prototype._onHide = function () {
        this._dialog.find('li.tab').off('click');
        this._dialog.find('.toggle-info-btn').off('click');
        this._dialog.remove();
        this._dialog.empty();
        this._dialog = undefined;
    };

    MultiTabDialog.prototype._addTab = function (desc, index) {
        var self = this,
            tabEl = $('<li class="tab"><a href="#" data-toggle="tab">' + desc.title + '</a></li>'),
            formEl = $(modalBodyForm),
            infoDetails;

        this._tabsUl.append(tabEl);

        tabEl.on('click', function () {
            self._tabIndexChanged(index);
        });

        formEl.find('.info-title').text(desc.infoTitle);
        infoDetails = formEl.find('.info-details');
        infoDetails.text(desc.infoDetails);

        formEl.find('.toggle-info-btn').on('click', function () {
            if (infoDetails.hasClass('hidden')) {
                infoDetails.removeClass('hidden');
            } else {
                infoDetails.addClass('hidden');
            }
        });

        formEl.find('.form-controller-container').append(desc.formControl);
    };

    MultiTabDialog.prototype._tabIndexChanged = function (index) {
        if (this._currentTabIndex === index) {
            return;
        }

        this._formEls[this._currentTabIndex].hide();
        this._okBtnEls[this._currentTabIndex].hide();

        this._currentTabIndex = index;
        this._formEls[this._currentTabIndex].show();
        this._okBtnEls[this._currentTabIndex].show();
    };

    return MultiTabDialog;
});