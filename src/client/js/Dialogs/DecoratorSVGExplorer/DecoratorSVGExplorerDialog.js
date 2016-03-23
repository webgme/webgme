/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
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
        IMG_BASE = $('<div class="image-container"><img src=""/><div class="desc">description</div></div>'),
        GROUP_TXT = '<li class="tab"><a href="#" data-toggle="tab">__GROUP_NAME__</a></li>',
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        DecoratorSVGIconList = [''].concat(decoratorSVG.DecoratorSVGIconList.slice(0)),
        DATA_FILENAME = 'data-filename',
        DATA_SVG = 'data-normalized-filename',
        DATA_TAB = 'data-tab-group',
        TAB_GROUP_PREFIX = 'tab-group-',
        UNGROUPED = '__UNGROUPED__';


    DecoratorSVGExplorerDialog = function () {
    };

    DecoratorSVGExplorerDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this,
            $originalSelected;

        this._fnCallback = fnCallback;

        this._groups = {};
        this._groupNames = null;

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
            namePieces,
            imgName,
            tabGroupEl,
            divImg;

        this._dialog = $(DecoratorSVGExplorerDialogTemplate);
        this._modalBody = this._dialog.find('.modal-body');
        this._btnSelect = this._dialog.find('.btn-select');
        this._txtFind = this._dialog.find('#txtFilter');
        this._groupTabList = this._dialog.find('ul.nav-tabs');

        for (i = 0; i < len; i += 1) {
            svg = DecoratorSVGIconList[i];
            divImg = IMG_BASE.clone();
            namePieces = svg.split('/');
            imgName = namePieces[namePieces.length - 1];

            if (i === 0 && svg === '') {
                divImg.find('img').remove();
                divImg.find('.desc').text('-- NONE --');
                divImg.find('.desc').attr('title', '-- NONE --');
            } else {
                // Trim the .svg part
                imgName = imgName.substring(0, imgName.length - '.svg'.length);
                divImg.find('img').attr('src', SVG_DIR + svg);
                divImg.find('img').attr('title', svg);
                divImg.find('.desc').text(imgName);
                divImg.find('.desc').attr('title', svg);
            }

            divImg.data(DATA_FILENAME, svg);
            divImg.attr(DATA_FILENAME, svg);

            divImg.attr(DATA_SVG, imgName.toLowerCase());
            divImg.data(DATA_SVG, imgName.toLowerCase());

            if (namePieces.length === 1) {
                // These are the "old" SVGs at the root.
                divImg.addClass(TAB_GROUP_PREFIX + UNGROUPED);
            } else {
                divImg.addClass(TAB_GROUP_PREFIX + namePieces[0]);
                this._groups[namePieces[0]] = true;
            }

            this._modalBody.append(divImg);

            self._setSelected();
        }

        this._groupNames = Object.keys(this._groups);
        // Add the groups tabs
        tabGroupEl = $(GROUP_TXT.replace('__GROUP_NAME__', 'All'));
        tabGroupEl.addClass('All active');
        this._groupTabList.append(tabGroupEl);

        for (i = 0; i < this._groupNames.length; i += 1) {
            tabGroupEl = $(GROUP_TXT.replace('__GROUP_NAME__', this._groupNames[i]));
            tabGroupEl.data(DATA_TAB, this._groupNames[i]);
            this._groupTabList.append(tabGroupEl);
        }

        this._modalBody.on('mousedown', 'div.image-container', function () {
            var $el = $(this);

            self._modalBody.find('div.image-container.selected').removeClass('selected');
            self._setSelected($el.data(DATA_FILENAME), $el);
        });

        this._modalBody.on('dblclick', 'div.image-container', function () {
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

        this._groupTabList.find('li.tab').on('click', function () {
            var el = $(this),
                groupClass;
            self._setSelected();

            if (el.hasClass('All')) {
                self._modalBody.find('div.image-container').removeClass('not-in-tab-group');
            } else {
                groupClass = TAB_GROUP_PREFIX + el.data(DATA_TAB);
                self._modalBody.find('div.image-container').each(function () {
                    var divImg = $(this);
                    if (divImg.hasClass(groupClass)) {
                        divImg.removeClass('not-in-tab-group');
                    } else {
                        divImg.addClass('not-in-tab-group');
                    }
                });
            }
        });
    };

    DecoratorSVGExplorerDialog.prototype._setSelected = function (fileName, $selectedItem) {
        this._modalBody.find('div.image-container.selected').removeClass('selected');

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
            this._modalBody.find('div.image-container').each(function () {
                var divImg = $(this),
                    name = divImg.data(DATA_SVG);

                if (name && name.indexOf(fileName.toLowerCase()) < 0) {
                    divImg.addClass('not-in-filter');
                } else if (!name) {
                    divImg.addClass('not-in-filter');
                } else {
                    divImg.removeClass('not-in-filter');
                }
            });
        } else {
            this._modalBody.find('div.image-container').removeClass('not-in-filter');
        }

    };

    return DecoratorSVGExplorerDialog;
});