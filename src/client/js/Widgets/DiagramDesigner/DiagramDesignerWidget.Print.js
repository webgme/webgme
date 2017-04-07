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
        // https://developer.mozilla.org/en-US/docs/Web/CSS/-webkit-print-color-adjust
        this.$el.css('-webkit-print-color-adjust', 'exact');

        // Inline style is not printed unless tagged with !important
        this.$el.find('*').each(function () {
            var el = $(this),
                value;

            // Any other values?
            [
                'background-color',
                'color',
                'border-color',
                'border-top-color',
                'border-right-color',
                'border-bottom-color',
                'border-left-color',
            ].forEach(function (type) {
                value = el.css(type);
                if (value && el[0].style) {
                    el[0].style.setProperty(type, value, 'important');
                }
            });
        });

        window.print();
    };

    return DiagramDesignerWidgetPrint;
});