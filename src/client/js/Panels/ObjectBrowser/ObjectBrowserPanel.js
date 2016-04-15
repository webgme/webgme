/*globals define, _, WebGMEGlobal*/
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
    'css!./styles/ObjectBrowserPanel.css'
], function (PanelBaseWithHeader,
             CONSTANTS,
             TreeBrowserControl,
             InheritanceBrowserControl,
             CrosscutBrowserControl,
             TreeBrowserWidget,
             ComponentSettings) {
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
        var toolbar,
            compositionTreeBrowserWidget,
            compositionTreeBrowserControl,
            inheritanceTreeBrowserWidget,
            inheritanceTreeBrowserControl,
            crosscutTreeBrowserWidget,
            crosscutTreeBrowserControl,
            compositionSettings,
            compositionEl;

        this.$el.addClass(OBJECT_BROWSER_CLASS);

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
            enableEdit: true,
            hideConnections: compositionSettings.filters.toggled.hideConnections,
            hideAbstracts: compositionSettings.filters.toggled.hideAbstracts,
            hideLeaves: compositionSettings.filters.toggled.hideLeaves,
            hideLibraries: compositionSettings.filters.toggled.hideLibraries,
            titleFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            },
            metaTypeFilter: {
                text: '',
                type: 'caseInsensitive' //caseSensitive, regex
            },
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

                    // Active the composition tree.
                    compositionEl.click();
                    if (selectedIds && selectedIds.length > 0) {
                        compositionTreeBrowserControl.locateNode(selectedIds[0]);
                    } else if (typeof nodeId === 'string') {
                        compositionTreeBrowserControl.locateNode(nodeId);
                    }
                }
            });
        }
    };

    return ObjectBrowserPanel;
});
