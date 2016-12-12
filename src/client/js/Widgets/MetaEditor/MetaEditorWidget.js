/*globals define, $, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define([
    'js/logger',
    'js/util',
    'js/DragDrop/DragHelper',
    'js/Widgets/DiagramDesigner/DiagramDesignerWidget',
    'js/Controls/iCheckBox',
    './MetaEditorPointerNamesDialog',
    'css!./styles/MetaEditorWidget.css'
], function (Logger,
             clientUtil,
             DragHelper,
             DiagramDesignerWidget,
             ICheckBox,
             MetaEditorPointerNamesDialog) {

    'use strict';

    function MetaEditorWidget(container, params) {
        params = params || {};
        params.loggerName = 'gme:Widgets:MetaEditor:MetaEditorWidget';

        //disable line style parameter controls in toolbar
        params.lineStyleControls = false;

        params.tabsEnabled = true;
        params.addTabs = true;
        params.deleteTabs = true;
        params.reorderTabs = true;

        DiagramDesignerWidget.call(this, container, params);

        this.$el.parent().addClass('meta-editor-widget');
        this.logger.debug('MetaEditorWidget ctor');
    }

    _.extend(MetaEditorWidget.prototype, DiagramDesignerWidget.prototype);

    MetaEditorWidget.prototype._initializeUI = function (/*containerElement*/) {
        DiagramDesignerWidget.prototype._initializeUI.apply(this, arguments);
        this.logger.debug('MetaEditorWidget._initializeUI');

        //disable connection to a connection
        this._connectToConnection = false;

        this._initializeFilterPanel();
        this._initializeMetaConsistencyResult();
    };

    MetaEditorWidget.prototype._afterManagersInitialized = function () {
        //turn off item rotation
        this.enableRotate(false);
    };

    MetaEditorWidget.prototype._initializeFilterPanel = function () {
        /**** create FILTER PANEL ****/
        this.$filterPanel = $('<div/>', {
            class: 'filterPanel'
        });

        this.$filterPanel.html('<div class="header">FILTER</div><ul class="body"></ul>');

        this.$filterHeader = this.$filterPanel.find('.header');
        this.$filterUl = this.$filterPanel.find('ul.body');

        this.$el.parent().append(this.$filterPanel);
        this._filterCheckboxes = {};
    };

    MetaEditorWidget.prototype._initializeMetaConsistencyResult = function () {
        /**** create FILTER PANEL ****/
        this.$metaConsistencyResults = $('<div/>', {
            class: 'meta-consistency-results'
        });

        this.$el.parent().append(this.$metaConsistencyResults);
    };

    MetaEditorWidget.prototype._checkChanged = function (value, isChecked) {
        this._refreshHeaderText();
        this.logger.debug('CheckBox checkChanged: ' + value + ', checked: ' + isChecked);
        this.onCheckChanged(value, isChecked);
    };

    MetaEditorWidget.prototype.onCheckChanged = function (/*value, isChecked*/) {
        this.logger.warn('MetaEditorWidget.onCheckChanged(value, isChecked) is not overridden!');
    };

    MetaEditorWidget.prototype.showMetaConsistencyResults = function (results) {
        var self = this,
            hadInconsistencies = false,
            resEl,
            dl,
            i,j;

        results.sort(function (r1, r2) {
            if (r1.message > r2.message) {
                return 1;
            } else if (r1.message < r2.message) {
                return -1;
            }

            return 0;
        });

        this.$metaConsistencyResults.find('dd.path-link').off('click');
        this.$metaConsistencyResults.find('i.close-result').off('click');

        this.$metaConsistencyResults.empty();

        for (i = 0; i < results.length; i += 1) {
            hadInconsistencies = true;
            this.$metaConsistencyResults.append($('<div>', {class: 'meta-inconsistency-divider'}));

            resEl = $('<div>', {
                class: 'meta-inconsistency',
            });

            dl = $('<dl>', {class: 'dl-horizontal'});

            dl.append($('<dt>', {text: 'Inconsistency'}));
            dl.append($('<dd>', {text: results[i].message}));

            dl.append($('<dt>', {text: 'Description'}));
            dl.append($('<dd>', {text: results[i].description}));

            dl.append($('<dt>', {text: 'Hint'}));
            dl.append($('<dd>', {text: results[i].hint}));

            dl.append($('<dt>', {text: 'Node path'}));
            dl.append($('<dd>', {text: results[i].path, class: 'path-link'}).data('gme-id', results[i].path));

            if (results[i].relatedPaths.length > 0) {
                dl.append($('<dt>', {text: 'Related paths'}));
                for (j = 0; j < results[i].relatedPaths.length; j += 1) {
                    dl.append($('<dd>', {
                        text: results[i].relatedPaths[j],
                        class: 'path-link'
                    }).data('gme-id', results[i].relatedPaths[j]));
                }
            }

            resEl.append(dl);
            this.$metaConsistencyResults.append(resEl);
        }

        if (hadInconsistencies === true) {
            this.$metaConsistencyResults.find('dd.path-link').on('click', function () {
                var path = $(this).data('gme-id');
                self.onInconsistencyLinkClicked(path);
            });

            this.$metaConsistencyResults.prepend($('<h3>', {
                text: 'Meta-model Inconsistencies',
                class: 'meta-inconsistency-header'
            }).append($('<i/>', {
                class: 'fa fa-check-circle-o close-result pull-left',
                title: 'Close result view'
            }).on('click', function () {
                self.showMetaConsistencyResults([]);
            })));
            this.$metaConsistencyResults.append($('<div>', {class: 'meta-inconsistency-divider'}));
            this.$el.parent().addClass('show-meta-consistency-results');
        } else {
            this.$el.parent().removeClass('show-meta-consistency-results');
        }
    };

    MetaEditorWidget.prototype.onInconsistencyLinkClicked = function (gmeId) {
        this.logger.warn('MetaEditorWidget.onInconsistencyLinkClicked not overwritten in controller, gmeId:', gmeId);
    };

    MetaEditorWidget.prototype.addFilterItem = function (text, value, iconEl) {
        var item = $('<li/>', {
                class: 'filterItem'
            }),
            checkBox,
            self = this;

        checkBox = new ICheckBox({
            checkChangedFn: function (data, isChecked) {
                self._checkChanged(value, isChecked);
            }
        });

        item.append(iconEl.addClass('inline'));
        item.append(text);
        item.append(checkBox.el);

        this.$filterUl.append(item);

        this._refreshHeaderText();

        this._filterCheckboxes[value] = checkBox;

        return item;
    };

    MetaEditorWidget.prototype._refreshHeaderText = function () {
        var all = this.$filterUl.find('.iCheckBox').length,
            on = this.$filterUl.find('.iCheckBox.checked').length;

        this.$filterHeader.html('FILTER' + (all === on ? '' : ' *'));
    };

    MetaEditorWidget.prototype.selectNewPointerName = function (existingPointerNames, notAllowedPointerNames,
                                                                isSet, callback) {
        new MetaEditorPointerNamesDialog().show(existingPointerNames, notAllowedPointerNames, isSet, callback);
    };

    MetaEditorWidget.prototype.setFilterChecked = function (value) {
        if (this._filterCheckboxes[value] && !this._filterCheckboxes[value].isChecked()) {
            this._filterCheckboxes[value].setChecked(true);
        }
    };

    MetaEditorWidget.prototype.getDragEffects = function (/*selectedElements, event*/) {
        //the only drag is a MOVE
        return [DragHelper.DRAG_EFFECTS.DRAG_MOVE];
    };

    /* OVERWRITE DiagramDesignerWidget.prototype._dragHelper */
    MetaEditorWidget.prototype._dragHelper = function (el, event, dragInfo) {
        var helperEl = DiagramDesignerWidget.prototype._dragHelper.apply(this, [el, event, dragInfo]);

        //clear out default 'Move' text from helperEl
        helperEl.empty();

        return helperEl;
    };

    return MetaEditorWidget;
});