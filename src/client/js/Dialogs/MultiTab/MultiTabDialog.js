/*globals define, $*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Loader/LoaderCircles',
    'text!./templates/MultiTabDialog.html',
    'text!./templates/ModalBodyForm.html',
    'css!./styles/MultiTabDialog.css'
], function (LoaderCircles, dialogTemplate, modalBodyForm) {

    'use strict';

    var MultiTabDialog;

    MultiTabDialog = function () {

    };

    MultiTabDialog.prototype.show = function (parameters, onHide) {
        var self = this;
        this._initDialog(parameters);

        this._dialog.on('hide.bs.modal', function () {
            onHide();
            self._onHide();
        });

        this._dialog.modal('show');
    };

    /**
     * Displays the alert badge.
     * @param {string} message
     * @param {string} [severity=danger] - 'success', 'info', 'warning' or 'danger'.
     */
    MultiTabDialog.prototype.showAlert = function (message, severity) {
        severity = severity || 'danger';
        this._errorBadge.removeClass('alert-success alert-info alert-warning alert-danger');
        this._errorBadge.addClass('alert-' + severity);
        this._errorBadge.text(message);
        this._errorBadge.show();
    };

    /**
     * Hides the alert badge.
     */
    MultiTabDialog.prototype.hideAlert = function () {
        this._errorBadge.hide();
    };

    MultiTabDialog.prototype._initDialog = function (parameters) {
        var self = this,
            i;

        this._dialog = $(dialogTemplate);
        this._loader = new LoaderCircles({containerElement: this._dialog});
        this._modalContent = this._dialog.find('.modal-content');

        this._modalHeader = this._modalContent.find('.modal-header');
        this._preBody = this._modalContent.find('.pre-body');
        this._modalBody = this._modalContent.find('.modal-body');
        this._modalFooter = this._modalContent.find('.modal-footer');

        this._modalHeader.find('.header-icon').addClass(parameters.iconClass || 'glyphicon glyphicon-comment');
        this._modalHeader.find('.header-title').text(parameters.title || 'Missing parameters.title');

        if (parameters.extraClasses) {
            this._dialog.addClass(parameters.extraClasses);
        }

        this._tabsUl = this._preBody.find('ul.nav-tabs');

        this._currentTabIndex = parameters.activeTabIndex || 0;
        this._tabEls = [];
        this._formEls = [];
        this._okBtnEls = [];

        for (i = 0; i < parameters.tabs.length; i += 1) {
            this._addTab(parameters.tabs[i], i);
            if (i === this._currentTabIndex) {
                this._tabEls[i].addClass('active');
            } else {
                this._formEls[i].hide();
                this._okBtnEls[i].hide();
            }
        }

        if (parameters.tabs.length === 1) {
            // Only one tab, hide the entire prebody.
            this._preBody.hide();
        }

        this._errorBadge = $('<div class="alert alert-danger error-badge" role="alert"></div>');
        this._errorBadge.hide();
        this._modalBody.append(this._errorBadge);
    };

    MultiTabDialog.prototype._onHide = function () {
        this._loader.destroy();
        this._dialog.find('li.tab').off('click');
        this._dialog.find('.toggle-info-btn').off('click');
        this._dialog.find('.ok-btn').off('click');
        this._dialog.remove();
        this._dialog.empty();
        this._dialog = undefined;
    };

    MultiTabDialog.prototype._addTab = function (desc, index) {
        var self = this,
            tabEl,
            formEl = $(modalBodyForm),
            infoDetails,
            buttonEl;

        // Add the tab item to the prebody tabs.
        tabEl = $('<li class="tab"><a href="#" data-toggle="tab">' + desc.title + '</a></li>');
        tabEl.on('click', function () {
            self._tabIndexChanged(index);
        });

        this._tabsUl.append(tabEl);
        this._tabEls.push(tabEl);

        // Add the form part to modalBody.
        formEl = $(modalBodyForm);

        infoDetails = formEl.find('.info-title').text(desc.infoTitle);
        infoDetails = formEl.find('.info-details');
        infoDetails.text(desc.infoDetails);

        formEl.find('.toggle-info-btn').on('click', function () {
            if (infoDetails.hasClass('hidden')) {
                infoDetails.removeClass('hidden');
            } else {
                infoDetails.addClass('hidden');
            }
        });

        formEl.find('.form-control-container').append(desc.formControl);
        this._formEls.push(formEl);
        this._modalBody.append(formEl);

        // Add the OK btn to the footer.
        buttonEl = $('<button class="btn btn-primary ok-btn">OK</button>');
        buttonEl.on('click', function () {
            self._errorBadge.hide();
            self._modalContent.css('opacity', 0);
            self._loader.start();
            desc.onOK(function (err) {
                self._loader.stop();
                self._modalContent.css('opacity', 1);
                if (err) {
                    self.showAlert(typeof err === 'string' ? err : err.message);
                } else {
                    self._dialog.modal('hide');
                }
            });
        });

        this._okBtnEls.push(buttonEl);
        this._modalFooter.prepend(buttonEl);
    };

    MultiTabDialog.prototype._tabIndexChanged = function (index) {
        if (this._currentTabIndex === index) {
            return;
        }

        this._formEls[this._currentTabIndex].hide();
        this._okBtnEls[this._currentTabIndex].hide();
        this._tabEls[this._currentTabIndex].removeClass('active');

        this._currentTabIndex = index;
        this._formEls[this._currentTabIndex].show();
        this._okBtnEls[this._currentTabIndex].show();
        this._tabEls[this._currentTabIndex].addClass('active');

        // Finally hide the badge if shown.
        this._errorBadge.hide();
    };

    return MultiTabDialog;
});