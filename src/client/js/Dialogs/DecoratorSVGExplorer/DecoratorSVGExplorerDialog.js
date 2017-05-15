/*globals define, $*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 */

define(['js/Constants',
    'codemirror/lib/codemirror',
    'text!assets/decoratorSVGList.json',
    'text!./templates/DecoratorSVGExplorerDialog.html',
    'codemirror/mode/htmlmixed/htmlmixed',
    'css!./styles/DecoratorSVGExplorerDialog.css',
    'css!codemirror/lib/codemirror.css',
    'css!codemirror/theme/monokai.css'
], function (CONSTANTS,
             CodeMirror,
             decoratorSVGList,
             DecoratorSVGExplorerDialogTemplate) {

    'use strict';

    var DecoratorSVGExplorerDialog,
        IMG_BASE = $('<div class="image-container"><img src=""/><div class="desc">description</div>' +
            '<div class="btn-holder"></div></div>'),
        IMG_BTN_BASE = $('<div class="btn btn-xs glyphicon"></div>'),
        GROUP_TXT = '<li class="tab"><a href="#" data-toggle="tab">__GROUP_NAME__</a></li>',
        SVG_DIR = CONSTANTS.ASSETS_DECORATOR_SVG_FOLDER,
        DecoratorSVGIconList = JSON.parse(decoratorSVGList),
        DATA_FILENAME = 'data-filename',
        DATA_SVG = 'data-normalized-filename',
        DATA_TAB = 'data-tab-group',
        TAB_GROUP_PREFIX = 'tab-group-',
        DEFAULT_TAB_GROUP = 'Default';

    DecoratorSVGIconList.unshift('');
    DecoratorSVGIconList.unshift('');

    DecoratorSVGExplorerDialog = function () {
    };

    DecoratorSVGExplorerDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this,
            $originalSelected;

        this._fnCallback = fnCallback;

        this._groups = {};
        this._groupNames = null;

        this._old = oldValue;
        this._clientNode = WebGMEGlobal.Client.getNode(WebGMEGlobal.State.getActiveSelection()[0]);
        this._initDialog();

        this._dialog.on('hidden.bs.modal', function () {
            self._dialog.remove();
            self._dialog.empty();
            self._dialog = undefined;
        });

        this._dialog.on('hide.bs.modal', function () {
            if (self._fnCallback) {
                self._fnCallback(self.result);
            }
        });

        this._dialog.modal('show');

        // if (oldValue) {
        //
        //     $originalSelected = self._modalBody.find('[' + DATA_FILENAME + '="' + oldValue + '"]');
        //     this._setSelected(oldValue, $originalSelected);
        // }
    };

    DecoratorSVGExplorerDialog.prototype.registerResult = function () {
        this.result = this._selectedSVG;
    };

    DecoratorSVGExplorerDialog.prototype._initDialog = function () {
        var self = this,
            len = DecoratorSVGIconList.length,
            i,
            svg,
            btnSelect,
            btnEdit,
            namePieces,
            imgName,
            tabGroupEl,
            divImg;

        this._dialog = $(DecoratorSVGExplorerDialogTemplate);
        this._modalBody = this._dialog.find('.modal-body');
        this._editor = this._dialog.find('.svg-editor');
        this._btnUse = this._dialog.find('.btn-select');
        this._btnCancel = this._dialog.find('.btn-cancel');
        this._codemirrorEl = this._editor.find('.svg-editing-code-mirror');
        this._txtFind = this._dialog.find('#txtFilter');
        this._groupTabList = this._dialog.find('ul.nav-tabs');

        this._btnCancel.on('click', function () {
            self._editor.hide();
            self._filter('');
        });

        this._codemirror = CodeMirror(this._codemirrorEl[0], {
            readOnly: false,
            lineNumbers: true,
            matchBrackets: true,
            lint: false,
            theme: 'monokai',
            mode: 'htmlmixed',
            autofocus: true,
            dragDrop: false,
            gutters: ["CodeMirror-linenumbers"]
        });

        this._editor.hide();
        this._btnUse.hide();
        this._btnCancel.hide();

        for (i = 0; i < len; i += 1) {
            svg = DecoratorSVGIconList[i];
            divImg = IMG_BASE.clone();
            namePieces = svg.split('/');
            imgName = namePieces[namePieces.length - 1];

            btnSelect = IMG_BTN_BASE.clone();
            btnSelect.addClass('glyphicon-ok');
            btnSelect.attr('title', 'Select item to use');
            btnSelect.data('filename', svg);

            btnEdit = IMG_BTN_BASE.clone();
            btnEdit.addClass('glyphicon-pencil');
            btnEdit.attr('title', 'Edit to use as embedded svg');
            btnEdit.data('filename', svg);
            btnEdit.on('click', function (event) {
                // self._setSelected($(event.currentTarget).data('filename'));
                self._filter('$@$impossible$@$');
                self._editor.show();
                self._btnCancel.show();
                self._btnUse.show();
                self._codemirror.setValue(WebGMEGlobal.SvgManager.getRawSvgContent(self._old));
                self._codemirror.refresh();
                self._codemirror.focus();
            });

            divImg.find('.btn-holder').append(btnSelect);
            divImg.find('.btn-holder').append(btnEdit);

            if (i === 0) {
                divImg.find('img').remove();
                divImg.find('.desc').text('-- NONE --');
                divImg.find('.desc').attr('title', '-- NONE --');
                btnSelect.on('click', function () {
                    self.result = null;
                    self._dialog.modal('hide');
                });
            } else if (i === 1) {
                if (WebGMEGlobal.SvgManager.isSvg()) {
                    divImg.find('img').attr('src', WebGMEGlobal.SvgManager.getRawSvgContent(self._old, self._clientNode, true));
                } else {
                    divImg.find('img').attr('src', SVG_DIR + self._old);
                }

                divImg.find('.desc').text('-- CURRENT --');
                divImg.find('.desc').attr('title', '-- CURRENT --');
                btnSelect.on('click', function () {
                    self.result = self._old;
                    self._dialog.modal('hide');
                });
            } else {
                // Trim the .svg part
                imgName = imgName.substring(0, imgName.length - '.svg'.length);
                divImg.find('img').attr('src', SVG_DIR + svg);
                divImg.find('img').attr('title', svg);
                divImg.find('.desc').text(imgName);
                divImg.find('.desc').attr('title', svg);
                btnSelect.on('click', function (event) {
                    self.result = $(event.currentTarget).data('filename');
                    self._dialog.modal('hide');
                });
            }

            divImg.data(DATA_FILENAME, svg);
            divImg.attr(DATA_FILENAME, svg);

            divImg.attr(DATA_SVG, imgName.toLowerCase());
            divImg.data(DATA_SVG, imgName.toLowerCase());

            if (namePieces.length === 1) {
                // These are the "old" SVGs at the root.
                divImg.addClass(TAB_GROUP_PREFIX + DEFAULT_TAB_GROUP);
            } else {
                divImg.addClass(TAB_GROUP_PREFIX + namePieces[0]);
                this._groups[namePieces[0]] = true;
                divImg.addClass('not-in-tab-group');
            }

            this._modalBody.append(divImg);

            self._setSelected();
        }

        this._groupNames = Object.keys(this._groups);
        this._groupNames.sort(function (a, b) {
            var la = a.toLowerCase(),
                lb = b.toLowerCase();

            if (la > lb) {
                return 1;
            } else if (la < lb) {
                return -1;
            }

            return 0;
        });

        // Add the groups tabs
        tabGroupEl = $(GROUP_TXT.replace('__GROUP_NAME__', DEFAULT_TAB_GROUP));
        tabGroupEl.addClass('active');
        tabGroupEl.data(DATA_TAB, DEFAULT_TAB_GROUP);
        this._groupTabList.append(tabGroupEl);

        for (i = 0; i < this._groupNames.length; i += 1) {
            tabGroupEl = $(GROUP_TXT.replace('__GROUP_NAME__', this._groupNames[i]));
            tabGroupEl.data(DATA_TAB, this._groupNames[i]);
            this._groupTabList.append(tabGroupEl);
        }

        // this._modalBody.on('mousedown', 'div.image-container', function () {
        //     var $el = $(this);
        //
        //     self._modalBody.find('div.image-container.selected').removeClass('selected');
        //     self._setSelected($el.data(DATA_FILENAME), $el);
        // });

        // this._modalBody.on('dblclick', 'div.image-container', function () {
        //     self.registerResult();
        //     self._dialog.modal('hide');
        // });

        // this._btnSelect.on('click', function () {
        //     self.registerResult();
        //     self._dialog.modal('hide');
        // });

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

            groupClass = TAB_GROUP_PREFIX + el.data(DATA_TAB);
            self._modalBody.find('div.image-container').each(function () {
                var divImg = $(this);
                if (divImg.hasClass(groupClass)) {
                    divImg.removeClass('not-in-tab-group');
                } else {
                    divImg.addClass('not-in-tab-group');
                }
            });
        });
    };

    DecoratorSVGExplorerDialog.prototype._setSelected = function (fileName, $selectedItem) {
        this._modalBody.find('div.image-container.selected').removeClass('selected');

        if ($selectedItem) {
            $selectedItem.addClass('selected');
        }

        if (fileName || fileName === '') {
            this._selectedSVG = fileName;
            // this._btnSelect.disable(false);
        } else {
            this._selectedSVG = undefined;
            // this._btnSelect.disable(true);
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