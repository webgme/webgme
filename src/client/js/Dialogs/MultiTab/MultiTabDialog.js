/*globals define, $*/
/*jshint browser: true*/
/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
    'js/Loader/LoaderCircles',
    'text!./templates/MultiTabDialogDialog.html',
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

    MultiTabDialog.prototype._initDialog = function (parameters) {
        var self = this,
            result = [],
            i;

        this._dialog = $(dialogTemplate);
        this._loader = new LoaderCircles({containerElement: this._dialog});

        this._dialog.find('.header-icon').addClass(parameters.iconClass);
        this._dialog.find('.header-title').text(parameters.title);

        this._tabsUl = this._dialog.find('ul.nav-tabs');
        this._modalBody = this._dialog.find('.modal-body');
        this._modalFooter = this._dialog.find('.modal-footer');
        this._btnCancel = this._modalFooter.find('.btn-cancel');

        this._cancelBtn.on('click', function (event) {
            event.preventDefault();
            event.stopPropagation();
            self._dialog.modal('hide');
        });

        this._currentTabIndex = 0;
        this._tabEls = [];
        this._formEls = [];
        this._okBtnEls = [];

        for (i = 0; i < parameters.tabs.length; i += 1) {
            result.push(self._addTab(parameters.tabs[i]));
        }


    };

    MultiTabDialog.prototype._onHide = function () {
        this._loader.destroy();
        this._cancelBtn.off('click');
        this._dialog.find('li.tab').off('click');
        this._dialog.find('.toggle-info-btn').off('click');
        this._dialog.find('.ok-btn').off('click');
        this._dialog.remove();
        this._dialog.empty();
        this._dialog = undefined;
    };

    MultiTabDialog.prototype._addTab = function (desc, index) {
        var self = this,
            tabEl = $('<li class="tab"><a href="#" data-toggle="tab">' + desc.title + '</a></li>'),
            formEl = $(modalBodyForm),
            infoDetails = formEl.find('.info-title').text(desc.infoTitle),
            buttonEl = $('<button class="btn btn-primary ok-btn">OK</button>');

        this._tabsUl.append(tabEl);

        tabEl.on('click', function () {
            self._tabIndexChanged(index);
        });

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
        buttonEl.on('click', function () {
            self._loader.start();
            desc.onOK(function (err) {
                self._loader.stop();
                if (err) {
                    //TODO: Show error
                } else {
                    self._dialog.modal('hide');
                }
            });
        });
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