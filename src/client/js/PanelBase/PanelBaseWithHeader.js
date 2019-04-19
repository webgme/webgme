/*globals define, $, _*/
/*jshint browser: true, camelcase: false*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([
    'js/PanelBase/PanelBase',
    'js/Constants',
    'css!./styles/PanelBaseWithHeader.css'
], function (PanelBase, CONSTANTS) {

    'use strict';

    var PanelBaseWithHeader,
        BASE_CLASS = 'panel-base-wh', // /styles/PanelBaseWithHeader.scss
        SCROLL_CLASS = 'panel-base-scroll';

    //inherit from PanelBase Phase #1
    PanelBaseWithHeader = function (options, layoutManager) {
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] =
            options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] || 'PanelBaseWithHeader';

        //add PanelBaseWithHeader specific options when not present
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] === true;
        options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] =
            options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] === true;

        //call parent's constructor
        PanelBase.apply(this, [options, layoutManager]);

        this.initUI(options);
    };
    //inherit from PanelBase Phase #2
    PanelBaseWithHeader.OPTIONS = _.extend(PanelBase.OPTIONS, {
        HEADER_TITLE: 'HEADER_TITLE',
        FLOATING_TITLE: 'FLOATING_TITLE',
        NO_SCROLLING: 'NO_SCROLLING'
    });
    _.extend(PanelBaseWithHeader.prototype, PanelBase.prototype);

    /* OVERRIDE PanelBase members */
    PanelBaseWithHeader.prototype.setSize = function (width, height) {
        this._setSize(width, height);

        this.onResize(this.size.width, this.size.height);
    };

    PanelBaseWithHeader.prototype.onReadOnlyChanged = function (isReadOnly) {
        this._onReadOnlyChanged(isReadOnly);
    };

    /* CUSTOM MEMBERS */
    PanelBaseWithHeader.prototype.initUI = function (options) {
        //save original $el to $_el
        if (this.$_el === undefined) {
            this.$_el = this.$el;
        }

        //clear content
        this.$_el.empty();

        //add own class
        this.$_el.addClass(BASE_CLASS);

        //by default we also add the scrolling
        if (options[PanelBaseWithHeader.OPTIONS.NO_SCROLLING] !== true) {
            this.$_el.addClass(SCROLL_CLASS);
        }

        //Create Panel's HEADER
        this.$panelHeader = $('<div/>', {
            class: 'panel-header no-print'
        });
        this.$panelHeaderTitle = $('<div/>', {
            class: 'panel-header-title'
        });

        //Create Panel's BODY
        //set $el to panel-body for subclass use
        this.$el = this.$panelBody = $('<div/>', {
            class: 'panel-body drawing-canvas'
        });

        //create additional visual pieces
        //READ-ONLY indicator in header
        this.$panelReadOnlyIndicator = $('<div/>', {
            class: 'ro-icon',
            title: 'READ-ONLY mode ON'
        });
        this.$panelReadOnlyIndicator.append($('<i class="glyphicon glyphicon-lock"></i>'));

        //TITLE IN HEADER BAR
        if (options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] === true) {
            this.$_el.append(this.$panelHeader);
            this.$_el.append(this.$panelBody);
            this.$panelHeader.append(this.$panelReadOnlyIndicator);
            this.$panelHeader.append(this.$panelHeaderTitle);

        } else if (options[PanelBaseWithHeader.OPTIONS.FLOATING_TITLE] === true) {
            this.$_el.append(this.$panelBody);
            this.$_el.append(this.$panelHeader);
            this.$panelHeader.addClass('absolute-header');
            this.$floatingTitle = $('<div/>', {
                class: 'floating-title no-print'
            });
            this.$floatingTitle.append(this.$panelReadOnlyIndicator);
            this.$floatingTitle.append(this.$panelHeaderTitle);
            this.$_el.append(this.$floatingTitle);

        } else {
            this.$_el.append(this.$panelBody);
            this.$_el.append(this.$panelReadOnlyIndicator);
        }


        //Navigator title - if used, title will not be set, but client event will be followed
        this._navigationTitleConfig = null;
        if (this._client) {
            this._configNavigationTitle(this._getCurrentNavigationConfig());
        }
        this._attachClientEventListener();
    };

    PanelBaseWithHeader.prototype._detachClientEventListener = function () {
        WebGMEGlobal.State.off('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._activeNodeChanged, this);
    };

    PanelBaseWithHeader.prototype._attachClientEventListener = function () {
        this._detachClientEventListener();
        WebGMEGlobal.State.on('change:' + CONSTANTS.STATE_ACTIVE_OBJECT, this._activeNodeChanged, this);
    };

    PanelBaseWithHeader.prototype._shouldUseNavigationTitle = function () {
        var config = {enabled: false};
        if (this._config && this._client) {
            config = this._getCurrentNavigationConfig();
        }
        return config.enabled === true;
    };

    PanelBaseWithHeader.prototype._refreshNavigationTitle = function () {
        console.log(WebGMEGlobal.State.getActiveObject());
        var self = this,
            navigationItems = [],
            config = self._getCurrentNavigationConfig(),
            activeObjectId = WebGMEGlobal.State.getActiveObject(),
            node = this._client.getNode(activeObjectId),
            levelSeparatorAdded = false,
            item;

        self.$panelHeaderTitle.empty();

        if (node) {
            config.depth = config.depth || 2;
            while (node) {
                item = {};
                item.id = node.getId();
                item.text = config.attribute ? node.getAttribute(config.attribute) : item.id;
                navigationItems.unshift(item);
                node = self._client.getNode(node.getParentId());
            }

            navigationItems.forEach(function (dataItem, index) {
                if (index + 1 === navigationItems.length) {
                    self.$panelHeaderTitle.append('<span>' + dataItem.text + '</span>');
                } else {
                    if (index < config.depth) {
                        item = $('<span class="panel-header-title-navigation-item" data-webgme-id="' +
                            dataItem.id + '">' + dataItem.text + ' \> ' + '</span>');
                        item.on('dblclick', self._navigationTitleClicked);
                        self.$panelHeaderTitle.append(item);
                    } else if (!levelSeparatorAdded) {
                        levelSeparatorAdded = true;
                        self.$panelHeaderTitle.append('<span>... \> </span>');
                    }
                }
            });
        }
    };

    PanelBaseWithHeader.prototype._activeNodeChanged = function (model, activeObjectId) {
        if (!(this._config && this._client)) {
            return;
        } else if (this._shouldUseNavigationTitle() !== true) {
            return;
        }
        this._refreshNavigationTitle();
    };

    PanelBaseWithHeader.prototype._getCurrentNavigationConfig = function () {
        var config = null,
            projectId = this._client.getActiveProjectId(),
            projectKind;

        if (projectId) {
            projectKind = this._client.getActiveProjectKind();
            if (this._config.byProjectId.navigationTitle.hasOwnProperty(projectId)) {
                config = this._config.byProjectId.navigationTitle[projectId];
            } else if (projectKind &&
                this._config.byProjectKind.navigationTitle.hasOwnProperty(projectKind)) {
                config = this._config.byProjectKind.navigationTitle[projectKind];
            } else {
                config = this._config.navigationTitle;
            }
        } else {
            config = this._config.navigationTitle;
        }

        return config;
    };

    PanelBaseWithHeader.prototype._navigationTitleClicked = function (event) {
        var settings = {};
        settings[CONSTANTS.STATE_ACTIVE_OBJECT] = $(event.target).data('webgme-id');
        WebGMEGlobal.State.set(settings);
    };

    PanelBaseWithHeader.prototype.destroy = function () {
        this._detachClientEventListener();
        this.clear();
        this.$_el.remove();
        this._destroyedInstance = true;
    };

    PanelBaseWithHeader.prototype._configNavigationTitle = function (config) {
        this.$panelHeaderTitle.empty();

        //Navigator title - if used, title will not be set, but client event will be followed
        if (config.enabled === true) {
            if (this._client) {
                this._attachClientEventListener();
                if (typeof this._navigationTitleConfig.attribute === 'string') {
                    this._navigationAttribute = this._navigationTitleConfig.attribute;

                } else {
                    this._navigationAttribute = null;
                }
                this._navigationTitleDepth = this._navigationTitleConfig.depth || 1;
            }
        }
    };

    PanelBaseWithHeader.prototype.setTitle = function (text) {
        if (this.$panelHeaderTitle && !this._shouldUseNavigationTitle()) {
            this.$panelHeaderTitle.text(text);
        }
    };

    /************** CUSTOM RESIZE HANDLER *****************/
    PanelBaseWithHeader.prototype._setSize = function (w, h) {
        var panelHeaderHeight = this.$panelHeader.outerHeight(true),
            panelHeaderPadding = parseInt(this.$panelHeader.css('padding-left')) +
                parseInt(this.$panelHeader.css('padding-right')),
            panelBodyPadding = parseInt(this.$panelBody.css('padding-left')) +
                parseInt(this.$panelBody.css('padding-right')),
            panelBodyPaddingV = parseInt(this.$panelBody.css('padding-top')) +
                parseInt(this.$panelBody.css('padding-bottom')),
            panelBorder = parseInt(this.$_el.css('border-left-width')) + parseInt(this.$_el.css('border-right-width')),
            panelMargin = parseInt(this.$_el.css('margin-top')) + parseInt(this.$_el.css('margin-bottom'));

        w -= panelBorder;
        h -= panelMargin;

        this.$_el.width(w).height(h);
        this.$panelHeader.width(w - panelHeaderPadding);
        this.$panelBody.width(w - panelBodyPadding).height(h - panelHeaderHeight - panelBodyPaddingV);

        //get panel-body's offset
        this.offset = this.$el.offset();

        this.size = {
            width: w - panelBodyPadding,
            height: h - panelHeaderHeight - panelBodyPaddingV
        };
    };
    /************** END OF --- CUSTOM RESIZE HANDLER *****************/

    /************** CUSTOM READ-ONLY CHANGED HANDLER *****************/
    PanelBaseWithHeader.prototype._onReadOnlyChanged = function (isReadOnly) {
        if (isReadOnly === true) {
            this.$_el.addClass(PanelBase.READ_ONLY_CLASS);
        } else {
            this.$_el.removeClass(PanelBase.READ_ONLY_CLASS);
        }
    };
    /************** END OF --- CUSTOM READ-ONLY CHANGED HANDLER *****************/

    return PanelBaseWithHeader;
});
