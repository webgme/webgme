/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */

"use strict";

define(['js/Constants',
    'assets/decoratorSVG',
    'text!html/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog.html',
    'css!/css/Dialogs/DecoratorSVGExplorer/DecoratorSVGExplorerDialog'], function (CONSTANTS,
                                                               decoratorSVG,
                                                               DecoratorSVGExplorerDialogTemplate) {

    var DecoratorSVGExplorerDialog,
        IMG_BASE = $('<div class="img"><img src=""/><div class="desc">description</div></div>'),
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        DecoratorSVGIconList = [''].concat(decoratorSVG.DecoratorSVGIconList.slice(0)),
        DATA_FILENAME = 'filename',
        DATA_SVG = 'data-svg';


    DecoratorSVGExplorerDialog = function () {
    };

    DecoratorSVGExplorerDialog.prototype.show = function (fnCallback) {
        var self = this;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hidden', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.on('hide', function () {
            if (self._fnCallback && (self._selectedSVG || self._selectedSVG === '')) {
                self._fnCallback(self._selectedSVG);
            }
        });

        this._dialog.modal('show');
    };

    DecoratorSVGExplorerDialog.prototype._initDialog = function () {
        var self = this,
            len = DecoratorSVGIconList.length,
            i,
            svg,
            divImg;

        this._dialog = $(DecoratorSVGExplorerDialogTemplate);
        this._modalBody = this._dialog.find('.modal-body');
        this._btnSelect = this._dialog.find('.btn-select');
        this._txtFind = this._dialog.find('#txtFilter');

        for (i = 0; i < len; i += 1) {
            svg = DecoratorSVGIconList[i];
            divImg = IMG_BASE.clone();

            if (i === 0 && svg === '') {
                divImg.find('img').remove();
                divImg.find('.desc').text('-- NONE --');
                divImg.find('.desc').attr('title', '-- NONE --');
            } else {
                divImg.find('img').attr('src', SVG_DIR + svg);
                divImg.find('img').attr('title', svg);
                divImg.find('.desc').text(svg);
                divImg.find('.desc').attr('title', svg);
            }

            divImg.data(DATA_FILENAME, svg);
            divImg.attr(DATA_SVG, svg.toLowerCase());

            this._modalBody.append(divImg);
        }

        this._modalBody.on('mousedown', 'div.img', function () {
            self._modalBody.find('div.img.selected').removeClass('selected');
            self._setSelected($(this).data(DATA_FILENAME));
            $(this).addClass('selected');
        });

        this._modalBody.on('dblclick', 'div.img', function () {
            self._dialog.modal('hide');
        });

        this._btnSelect.on('click', function () {
            self._dialog.modal('hide');
        });

        this._txtFind.on('keyup', function () {
            self._filter($(this).val());
        });

        this._txtFind.on('keypress', function(e) {
            /* Prevent form submission */
            return  e.keyCode !== 13;
        });
    };

    DecoratorSVGExplorerDialog.prototype._setSelected = function (fileName) {
        this._modalBody.find('div.img.selected').removeClass('selected');
        if (fileName || fileName === '') {
            this._selectedSVG = fileName;
            this._btnSelect.removeClass('disabled');
        } else {
            this._selectedSVG = undefined;
            this._btnSelect.addClass('disabled');
        }
    };

    DecoratorSVGExplorerDialog.prototype._filter = function (fileName) {
        this._setSelected();
        if (fileName) {
            this._modalBody.find('div.img').hide();
            this._modalBody.find('div.img[' + DATA_SVG + '*="' +fileName.toLowerCase() + '"]').show();
        } else {
            this._modalBody.find('div.img').show();
        }

    };

    return DecoratorSVGExplorerDialog;
});