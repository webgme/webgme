/*globals define, $, WebGMEGlobal*/
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 * @author pmeijer / https://github.com/pmeijer
 * @author kecso / https://github.com/kecso
 */

define(['js/Constants',
    'codemirror/lib/codemirror',
    'text!assets/decoratorSVGList.json',
    'text!./templates/DecoratorSVGExplorerDialog.html',
    'codemirror/mode/htmlembedded/htmlembedded',
    'css!./styles/DecoratorSVGExplorerDialog.css',
    'css!codemirror/lib/codemirror.css',
    'css!codemirror/theme/monokai.css'
], function (CONSTANTS,
             CodeMirror,
             decoratorSVGList,
             DecoratorSVGExplorerDialogTemplate) {

    'use strict';

    var DecoratorSVGExplorerDialog,
        IMG_BASE = $('<div class="image-container"><img width=60px src=""/>' +
            '<div class="desc">description</div><div class="btn-holder"></div></div>'),
        IMG_BTN_BASE = $('<div class="action-btn btn btn-xs glyphicon"></div>'),
        GROUP_TXT = '<li class="tab"><a href="#" data-toggle="tab">__GROUP_NAME__</a></li>',
        DecoratorSVGIconList = JSON.parse(decoratorSVGList),
        DATA_FILENAME = 'data-filename',
        DATA_SVG = 'data-normalized-filename',
        DATA_TAB = 'data-tab-group',
        TAB_GROUP_PREFIX = 'tab-group-',
        DEFAULT_TAB_GROUP = 'Default';

    DecoratorSVGIconList.unshift('__current__');
    DecoratorSVGIconList.unshift('');

    DecoratorSVGExplorerDialog = function () {
    };

    DecoratorSVGExplorerDialog.prototype.show = function (fnCallback, oldValue) {
        var self = this;

        this._fnCallback = fnCallback;

        this._groups = {};
        this._groupNames = null;

        this._old = oldValue;
        this._clientNode = WebGMEGlobal.Client.getNode(WebGMEGlobal.State.getActiveSelection()[0] ||
            WebGMEGlobal.State.getActiveObject());
        this.result = oldValue;
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
            divImg,
            setLiveSvg = function () {
                var svgText = self._codemirror.getValue(),
                    testResult,
                    svg;

                testResult = WebGMEGlobal.SvgManager.testSvgTemplate(svgText, self._clientNode);
                if (testResult === null) {
                    svg = WebGMEGlobal.SvgManager.getRawSvgContent(svgText, self._clientNode, true);
                    svg.addClass('displayed-svg');
                    self._editor.find('.svg-display').empty().append(svg);
                } else {
                    self._editor.find('.svg-display').empty()
                        .html(testResult.message);
                }
            },
            removeBtnFn = function () {
                self.result = undefined;
                self._dialog.modal('hide');
            },
            cancelBtnFn = function () {
                self.result = self._old;
                self._dialog.modal('hide');
            },
            selectBtnFn = function (event) {
                self.result = $(event.currentTarget).data('filename');
                self._dialog.modal('hide');
            },
            editBtnFn = function (event) {
                var filename = $(event.currentTarget).data('filename');

                self._filter('$@$impossible$@$');
                self._editor.show();
                self._btnCancel.show();
                self._btnSave.show();
                self._txtFind.hide();
                self._groupTabList.hide();
                self._modalBody.addClass('fixed-modal-body');
                self._modalBody.removeClass('modal-body');

                if (filename === '__current__') {
                    self._codemirror.setValue(
                        WebGMEGlobal.SvgManager.getRawSvgContent(self._old, self._clientNode, false) || ''
                    );
                } else {
                    self._codemirror.setValue(
                        WebGMEGlobal.SvgManager.getRawSvgContent(filename, self._clientNode, false) || ''
                    );
                }

                setLiveSvg();
                self._codemirror.refresh();
                self._codemirror.focus();
            };

        this._dialog = $(DecoratorSVGExplorerDialogTemplate);
        this._modalBody = this._dialog.find('.modal-body');
        this._editor = this._dialog.find('.svg-editor');
        this._btnSave = this._dialog.find('.btn-select');
        this._btnCancel = this._dialog.find('.btn-cancel');
        this._codemirrorEl = this._editor.find('.svg-editing-code-mirror');
        this._txtFind = this._dialog.find('#txtFilter');
        this._groupTabList = this._dialog.find('ul.nav-tabs');

        this._btnCancel.on('click', function () {
            self._editor.hide();
            self._btnCancel.hide();
            self._btnSave.hide();
            self._filter('');
            self._txtFind.show();
            self._groupTabList.show();
            self._modalBody.removeClass('fixed-modal-body');
            self._modalBody.addClass('modal-body');
        });

        this._btnSave.on('click', function () {
            self.result = self._codemirror.getValue();
            self._dialog.modal('hide');
        });

        /* jshint ignore:start */
        this._codemirror = CodeMirror(this._codemirrorEl[0], {
            readOnly: false,
            lineNumbers: true,
            matchBrackets: true,
            lint: false,
            theme: 'monokai',
            mode: 'htmlembedded',
            autofocus: true,
            dragDrop: false,
            gutters: ['CodeMirror-linenumbers']
        });
        /* jshint ignore:end */

        this._codemirror.on('change', function () {
            setLiveSvg();
        });

        this._editor.hide();
        this._btnSave.hide();
        this._btnCancel.hide();

        for (i = 0; i < len; i += 1) {
            svg = DecoratorSVGIconList[i];
            divImg = IMG_BASE.clone();
            namePieces = svg.split('/');
            imgName = namePieces[namePieces.length - 1];

            btnSelect = IMG_BTN_BASE.clone();
            btnSelect.attr('title', 'Select item to use');
            btnSelect.data('filename', svg);

            btnEdit = IMG_BTN_BASE.clone();
            btnEdit.attr('title', 'Edit to use as embedded svg');
            btnEdit.data('filename', svg);
            btnEdit.on('click', editBtnFn);

            divImg.find('.btn-holder').append(btnSelect);
            divImg.find('.btn-holder').append(btnEdit);

            if (i === 0) {
                btnSelect.addClass('glyphicon-remove');
                btnEdit.addClass('glyphicon-plus');
                btnSelect.attr('title', 'Clear related SVG registry');
                divImg.find('img').remove();
                divImg.find('.desc').text('-- NONE --');
                divImg.find('.desc').attr('title', '-- NONE --');
                btnSelect.on('click', removeBtnFn);
                btnEdit.attr('title', 'Create an embedded SVG');
            } else if (i === 1) {
                btnSelect.addClass('glyphicon-ok');
                btnEdit.addClass('glyphicon-pencil');
                divImg.find('img').attr('src',
                    WebGMEGlobal.SvgManager.getRawSvgContent(self._old, self._clientNode, true, true));
                divImg.find('.desc').text('-- CURRENT --');
                divImg.find('.desc').attr('title', '-- CURRENT --');
                btnSelect.on('click', cancelBtnFn);
            } else {
                btnSelect.addClass('glyphicon-ok');
                btnEdit.addClass('glyphicon-pencil');
                // Trim the .svg part
                imgName = imgName.substring(0, imgName.length - '.svg'.length);
                divImg.find('img').attr('src',
                    WebGMEGlobal.SvgManager.getRawSvgContent(svg, self._clientNode, true, true));
                divImg.find('img').attr('title', svg);
                divImg.find('.desc').text(imgName);
                divImg.find('.desc').attr('title', svg);
                btnSelect.on('click', selectBtnFn);
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
        } else {
            this._selectedSVG = undefined;
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