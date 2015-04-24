/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define(['js/Constants',
    'assets/decoratorSVG',
    'text!./templates/DecoratorSVGExplorerDialog.html',
    'css!./styles/DecoratorSVGExplorerDialog.css'
], function (CONSTANTS,
             decoratorSVG,
             DecoratorSVGExplorerDialogTemplate) {

    'use strict';

    var DecoratorSVGExplorerDialog,
        IMG_BASE = $('<div class="img"><img src=""/><div class="desc">description</div></div>'),
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        DecoratorSVGIconList = [''].concat(decoratorSVG.DecoratorSVGIconList.slice(0)),
        DATA_FILENAME = 'data-filename',
        DATA_SVG = 'data-normalized-filename';


    DecoratorSVGExplorerDialog = function () {
    };

    DecoratorSVGExplorerDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this,
            $originalSelected;

        this._fnCallback = fnCallback;

        this._initDialog();

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.on('hide.bs.modal', function () {
            if (self._fnCallback && (self.result || self.result === '')) {
                self._fnCallback(self.result);
            }
        });

        this._dialog.modal('show');

        if (oldValue) {

            $originalSelected = self._modalBody.find('[' + DATA_FILENAME + '="' + oldValue + '"]');
            this._setSelected(oldValue, $originalSelected);
        }


    };

    DecoratorSVGExplorerDialog.prototype.registerResult = function () {
        this.result = this._selectedSVG;
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
            divImg.attr(DATA_FILENAME, svg);

            divImg.attr(DATA_SVG, svg.toLowerCase());

            this._modalBody.append(divImg);

            self._setSelected();
        }

        this._modalBody.on('mousedown', 'div.img', function () {
            var $el = $(this);

            self._modalBody.find('div.img.selected').removeClass('selected');
            self._setSelected($el.data(DATA_FILENAME), $el);
        });

        this._modalBody.on('dblclick', 'div.img', function () {
            self.registerResult();
            self._dialog.modal('hide');
        });

        this._btnSelect.on('click', function () {
            self.registerResult();
            self._dialog.modal('hide');
        });

        this._txtFind.on('keyup', function () {
            self._filter($(this).val());
        });

        this._txtFind.on('keypress', function (e) {
            return e.keyCode !== 13;
        });
    };

    DecoratorSVGExplorerDialog.prototype._setSelected = function (fileName, $selectedItem) {
        this._modalBody.find('div.img.selected').removeClass('selected');

        if ($selectedItem) {
            $selectedItem.addClass('selected');
        }

        if (fileName || fileName === '') {
            this._selectedSVG = fileName;
            this._btnSelect.disable(false);
        } else {
            this._selectedSVG = undefined;
            this._btnSelect.disable(true);
        }
    };

    DecoratorSVGExplorerDialog.prototype._filter = function (fileName) {
        this._setSelected();
        if (fileName) {
            this._modalBody.find('div.img').hide();
            this._modalBody.find('div.img[' + DATA_SVG + '*="' + fileName.toLowerCase() + '"]').show();
        } else {
            this._modalBody.find('div.img').show();
        }

    };

    return DecoratorSVGExplorerDialog;
});