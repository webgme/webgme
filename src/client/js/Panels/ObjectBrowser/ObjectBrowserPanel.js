/*globals define, _, WebGMEGlobal, $*/
/*jshint browser: true*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */


define(['js/PanelBase/PanelBaseWithHeader',
    'js/Constants',
    './TreeBrowserControl',
    './InheritanceBrowserControl',
    './CrosscutBrowserControl',
    'js/Widgets/TreeBrowser/TreeBrowserWidget',
    'js/Utils/ComponentSettings',
    'js/UIEvents',
    'css!./styles/ObjectBrowserPanel.css'
], function (PanelBaseWithHeader,
             CONSTANTS,
             TreeBrowserControl,
             InheritanceBrowserControl,
             CrosscutBrowserControl,
             TreeBrowserWidget,
             ComponentSettings,
             UI_EVENTS) {
    'use strict';

    var ObjectBrowserPanel,
        __parent__ = PanelBaseWithHeader,
        OBJECT_BROWSER_CLASS = 'object-browser';

    ObjectBrowserPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = 'ObjectBrowserPanel';
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options, layoutManager]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug('ObjectBrowserPanel ctor finished');
    };

    //inherit from PanelBaseWithHeader
    _.extend(ObjectBrowserPanel.prototype, __parent__.prototype);

    ObjectBrowserPanel.prototype._initialize = function () {
        var self = this,
            toolbar,
            compositionTreeBrowserWidget,
            compositionTreeBrowserControl,
            inheritanceTreeBrowserWidget,
            inheritanceTreeBrowserControl,
            crosscutTreeBrowserWidget,
            crosscutTreeBrowserControl,
            compositionSettings,
            // helpIcon,
            compositionEl;

        this.$el.addClass(OBJECT_BROWSER_CLASS);
        // TODO: Add this once we settled on the icons.
        // helpIcon = $('<div/>', {class: 'helper pull-right', text: 'help'});
        // this.$panelHeader.append(helpIcon);
        //
        // // http://v4-alpha.getbootstrap.com/components/popovers/#usage
        // helpIcon.popover({
        //     animation: false,
        //     placement: 'left',
        //     trigger: 'click',
        //     title: 'Icons',
        //     content: '<ul class="icon-list" href=#>' +
        //     '<li>Atom - A node that does not have any children</li>' +
        //     '<li>Model - A node that has children</li>' +
        //     '<li>Connection - A node representing a connection</li>' +
        //     '<li>Set - A node that has defined sets (or cross-cuts)</li>' +
        //     '<li>Meta - A node that defines a meta type</li>' +
        //     '</ul>',
        //     html: true
        // }).on('show.bs.popover', function () {
        //
        // }).on('shown.bs.popover', function () {
        //
        // });

        this.$el.html('<ul class="nav nav-tabs">' +
            '<li class="composition active"><a class="composition-anchor" href="#composition" data-toggle="tab">Composition</a></li>' +
            '<li class="inheritance"><a href="#inheritance" data-toggle="tab">Inheritance</a></li>' +
            '<li class="crosscut"><a href="#crosscut" data-toggle="tab">Crosscut</a></li>' +
            '</ul>' + '<div class="tab-content">' +
            '<div class="tab-pane active" id="composition">composition</div>' +
            '<div class="tab-pane" id="inheritance">inheritance</div>' +
            '<div class="tab-pane" id="crosscut">crosscut</div>' +
            '</div>');

        compositionEl = this.$el.find('a.composition-anchor');

        //set Widget title
        this.setTitle('Object Browser');
        compositionSettings = TreeBrowserControl.getDefaultConfig();
        ComponentSettings.resolveWithWebGMEGlobal(compositionSettings, TreeBrowserControl.getComponentId());

        compositionTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#composition').first(), {
            hideConnections: compositionSettings.filters.toggled.hideConnections,
            hideAbstracts: compositionSettings.filters.toggled.hideAbstracts,
            hideLeaves: compositionSettings.filters.toggled.hideLeaves,
            hideLibraries: compositionSettings.filters.toggled.hideLibraries,
            hideMetaNodes: compositionSettings.filters.toggled.hideMetaNodes,
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            },
            metaTypeFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            }
        });
        compositionTreeBrowserControl = new TreeBrowserControl(this._client, compositionTreeBrowserWidget,
            compositionSettings);

        inheritanceTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#inheritance').first(), {
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            }
        });
        inheritanceTreeBrowserControl = new InheritanceBrowserControl(this._client, inheritanceTreeBrowserWidget);

        crosscutTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#crosscut').first(), {
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            }
        });

        crosscutTreeBrowserControl = new CrosscutBrowserControl(this._client, crosscutTreeBrowserWidget);

        // Add toolbar button that dispatches locate node
        toolbar = WebGMEGlobal.Toolbar;
        if (toolbar) {
            toolbar.addSeparator();
            toolbar.addButton({
                title: 'Locate in tree browser',
                icon: 'glyphicon glyphicon-screenshot',
                data: {},
                clickFn: function (/*data*/) {
                    var nodeId = WebGMEGlobal.State.getActiveObject(),
                        selectedIds = WebGMEGlobal.State.getActiveSelection();
                    if (selectedIds && selectedIds.length > 0) {
                        nodeId = selectedIds[0];
                    }

                    if (typeof nodeId === 'string') {
                        self._client.dispatchEvent(UI_EVENTS.LOCATE_NODE, {nodeId: nodeId});
                    }
                }
            });
        }

        // Add event handler for locate node events.
        this._client.addEventListener(UI_EVENTS.LOCATE_NODE, function (client, eventData) {
            compositionEl.click();
            if (typeof eventData.nodeId === 'string') {
                compositionTreeBrowserControl.locateNode(eventData.nodeId);
            }
        });
    };

    return ObjectBrowserPanel;
});
