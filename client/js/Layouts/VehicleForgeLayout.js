/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Robert Kereskenyi
 */

"use strict";

define([ 'lib/jquery/' + (DEBUG ? 'jquery.layout' : 'jquery.layout.min'),
    'logManager',
    './DefaultLayout',
    'text!html/Layouts/Default/DefaultLayout.html',
    'text!./VehicleForgeLayoutConfig.json'], function (_jQueryLayout,
                                                               logManager,
                                                               DefaultLayout,
                                                               vehicleForgeLayoutTemplate,
                                                               VehicleForgeLayoutConfigJSON) {

    var VehicleForgeLayout,
        CONFIG = JSON.parse(VehicleForgeLayoutConfigJSON);

    VehicleForgeLayout = function () {
        this._logger = logManager.create('VehicleForgeLayout');

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