"use strict";

define(['js/PanelBase/PanelBaseWithHeader',
    'js/Constants',
    './TreeBrowserControl',
    './JSTreeBrowserWidget'], function (PanelBaseWithHeader,
                                                          CONSTANTS,
                                                          TreeBrowserControl,
                                                          JSTreeBrowserWidget) {

    var ObjectBrowserPanel,
        __parent__ = PanelBaseWithHeader,
        PART_CLASS = "part";

    ObjectBrowserPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "ObjectBrowserPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("ObjectBrowserPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(ObjectBrowserPanel.prototype, __parent__.prototype);

    ObjectBrowserPanel.prototype._initialize = function () {
        var self = this;

        //set Widget title
        this.setTitle("Object Browser");

        var treeBrowserView = new JSTreeBrowserWidget(this.$el);
        var control = new TreeBrowserControl(this._client, treeBrowserView);
    };

    return ObjectBrowserPanel;
});
