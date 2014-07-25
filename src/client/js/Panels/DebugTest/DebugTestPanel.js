/*globals define, _, requirejs, WebGMEGlobal*/

define(['js/PanelBase/PanelBaseWithHeader'], function (PanelBaseWithHeader) {

    "use strict";

    var DebugTestPanel,
        __parent__ = PanelBaseWithHeader,
        BTN_NUM = 3;

    DebugTestPanel = function (layoutManager, params) {
        var options = {};
        //set properties from options
        options[PanelBaseWithHeader.OPTIONS.LOGGER_INSTANCE_NAME] = "DebugTestPanel";
        options[PanelBaseWithHeader.OPTIONS.HEADER_TITLE] = true;

        //call parent's constructor
        __parent__.apply(this, [options]);

        this._client = params.client;

        //initialize UI
        this._initialize();

        this.logger.debug("DebugTestPanel ctor finished");
    };

    //inherit from PanelBaseWithHeader
    _.extend(DebugTestPanel.prototype, __parent__.prototype);

    DebugTestPanel.prototype._initialize = function () {
        var self = this,
            i,
            btn;

        //set Widget title
        this.setTitle("Test");

        var btnGroup = $('<div class="btn-group inline"></div>');

        for (i = 1; i <= BTN_NUM; i += 1) {
            btn = $('<a class="btn btn-small" href="#" data-id="' + i + '">#' + i +'</a>');
            btnGroup.append(btn);
        }


        this.$el.append(btnGroup);

        btnGroup.on('click', '.btn', function () {
            var id = parseInt($(this).attr('data-id'), 10);
            self._client.testMethod(id);
        });
    };

    return DebugTestPanel;
});
