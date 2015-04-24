/*globals define, _*/
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
    'css!./styles/ObjectBrowserPanel.css'
], function (PanelBaseWithHeader,
             CONSTANTS,
             TreeBrowserControl,
             InheritanceBrowserControl,
             CrosscutBrowserControl,
             TreeBrowserWidget) {
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
        var compositionTreeBrowserWidget,
            compositionTreeBrowserControl,
            inheritanceTreeBrowserWidget,
            inheritanceTreeBrowserControl,
            crosscutTreeBrowserWidget,
            crosscutTreeBrowserControl;

        this.$el.addClass(OBJECT_BROWSER_CLASS);

        this.$el.html('<ul class="nav nav-tabs">' +
        '<li class="active"><a href="#composition" data-toggle="tab">Composition</a></li>' +
        '<li class=""><a href="#inheritance" data-toggle="tab">Inheritance</a></li>' +
        '<li class=""><a href="#crosscut" data-toggle="tab">Crosscut</a></li>' +
        '</ul>' + '<div class="tab-content">' +
        '<div class="tab-pane active" id="composition">composition</div>' +
        '<div class="tab-pane" id="inheritance">inheritance</div>' +
        '<div class="tab-pane" id="crosscut">crosscut</div>' +
        '</div>');

        //set Widget title
        this.setTitle('Object Browser');

        compositionTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#composition').first());
        compositionTreeBrowserControl = new TreeBrowserControl(this._client, compositionTreeBrowserWidget);

        inheritanceTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#inheritance').first());
        inheritanceTreeBrowserControl = new InheritanceBrowserControl(this._client, inheritanceTreeBrowserWidget);

        crosscutTreeBrowserWidget = new TreeBrowserWidget(this.$el.find('div#crosscut').first());
        crosscutTreeBrowserControl = new CrosscutBrowserControl(this._client, crosscutTreeBrowserWidget);
    };

    return ObjectBrowserPanel;
});
