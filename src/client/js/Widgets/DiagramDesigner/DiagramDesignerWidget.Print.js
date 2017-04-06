/*globals define, $, window*/
/*jshint browser: true*/

/**
 * @author pmeijer / https://github.com/pmeijer
 */

define([
], function () {
    'use strict';

    function DiagramDesignerWidgetPrint() {
    }

    DiagramDesignerWidgetPrint.prototype.prepAndPrintCanvas = function () {
        this.$el.find('*').each(function () {
            var el = $(this),
                value;

            // Any other values?
            ['background-color', 'color'].forEach(function (type) {
                value = el.css(type);
                if (value) {
                    el[0].style.setProperty( type, value, 'important' );
                }
            });
        });

        window.print();
    };

    return DiagramDesignerWidgetPrint;
});