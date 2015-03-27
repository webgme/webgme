/*globals define, DEBUG, WebGMEGlobal, _*/

/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 * @author nabana / https://github.com/nabana
 */

define([ 'lib/jquery/' + (DEBUG ? 'jquery.layout' : 'jquery.layout.min'),
    'js/logger',
    './DefaultLayout',
    'text!./templates/DefaultLayout.html',
    'text!./VehicleForgeLayoutConfig.json'], function (_jQueryLayout,
                                                               Logger,
                                                               DefaultLayout,
                                                               vehicleForgeLayoutTemplate,
                                                               VehicleForgeLayoutConfigJSON) {

    "use strict";

    var VehicleForgeLayout,
        CONFIG = JSON.parse(VehicleForgeLayoutConfigJSON);

    VehicleForgeLayout = function () {
        this._logger = Logger.create('gme:Layouts:VehicleForgeLayout', WebGMEGlobal.gmeConfig.client.log);

        //call parent's constructor
        DefaultLayout.apply(this, [{'logger': this._logger,
                                    'panels': CONFIG.panels,
                                    'template': vehicleForgeLayoutTemplate}]);
    };

    //inherit from PanelBaseWithHeader
    _.extend(VehicleForgeLayout.prototype, DefaultLayout.prototype);


    VehicleForgeLayout.prototype._onWestResize = function () {
        var len = this._westPanels.length,
            w = this._westPanel.width(),
            h = this._westPanel.height(),
            pHeight = Math.floor(h / len),
            i;

        for (i = 0; i < len; i += 1) {
            this._westPanels[i].setSize(w, pHeight);
        }
    };

    return VehicleForgeLayout;
});