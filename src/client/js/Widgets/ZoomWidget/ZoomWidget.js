/*globals define, $*/
/*jshint browser: true*/

/**
 * Zoom-widget similar to zoom in google-maps.
 * Two buttons and pop-over option to show slider.
 * @author pmeijer / https://github.com/pmeijer
 */

define(['jquery-csszoom', 'css!./styles/ZoomWidget.css'], function () {
    'use strict';

    /**
     *
     * @param options
     * @param {string} options.class - css-class for container
     * @param {string} options.sliderClass - extra css-class for slider
     * @param {$html} options.zoomTarget
     * @param {function} [options.onZoom]
     * @param {number[]} [options.zoomValues=[0.1, 0.2, .., 4.0]]
     * @param {string[]} [options.showSliderAtStart]
     * @constructor
     */
    function ZoomWidget(options) {
        var zoomInBtn = $('<a tabindex="0" class="btn-zoom btn-zoom-in ui-corner-all ui-state-default">' +
            '<i class="glyphicon glyphicon-plus"/></a>'),
            zoomOutBtn = $('<a tabindex="0" class="btn-zoom btn-zoom-out ui-corner-all ui-state-default">' +
                '<i class="glyphicon glyphicon-minus"/></a>'),
            zoomContainer = $('<div/>', {class: 'zoom-widget-container ' + options.class}),
            zoomSlider = $('<div/>', {class: options.sliderClass}),
            zoomLabel = $('<label/>', {class: 'zoom-widget-label'});

        options.zoomValues = options.zoomValues || [0.1, 0.2, 0.3, 0.4, 0.5, 0.6, 0.7, 0.8, 0.9, 1,
                1.2, 1.4, 1.6, 1.8, 2.0, 2.5, 3.0, 3.5, 4.0];

        zoomContainer.append(zoomInBtn);
        zoomContainer.append(zoomSlider);
        zoomContainer.append(zoomOutBtn);
        zoomContainer.append(zoomLabel);

        zoomSlider.csszoom({
            zoomTarget: options.zoomTarget,
            zoomLevels: options.zoomValues,
            onZoom: function (zoomLevel) {
                zoomLabel.text(zoomLevel + 'x');
                if (typeof options.onZoom === 'function') {
                    options.onZoom(zoomLevel);
                }
            }
        });

        if (!options.showSliderAtStart) {
            zoomSlider.addClass('hidden');
        }

        zoomInBtn.on('click', function () {
            $(this).popover('hide');
            zoomSlider.csszoom('zoomIn');
        });

        zoomOutBtn.on('click', function () {
            $(this).popover('hide');
            zoomSlider.csszoom('zoomOut');
        });

        zoomContainer.find('.btn-zoom')
            .popover({
                delay: {
                    show: 500,
                    hide: 2000
                },
                animation: false,
                trigger: 'hover',
                title: 'Zoom',
                content: '<a class="slider-toggle" href=#>slider</a>',
                html: true
            })
            .on('show.bs.popover', function () {
                var btnEl = $(this);
                if (btnEl.hasClass('btn-zoom-in')) {
                    zoomOutBtn.popover('hide');
                } else {
                    zoomInBtn.popover('hide');
                }
            })
            .on('shown.bs.popover', function () {
                var btnEl = $(this),
                    offset = (btnEl.width() / 2) + 1,
                    text = zoomSlider.hasClass('hidden') ? 'Show slider' : 'Hide slider',
                    popover = zoomContainer.find('[id=' + btnEl.attr('aria-describedby') + ']');

                if (btnEl.hasClass('btn-zoom-in')) {
                    popover.css('top', (parseFloat(popover.css('top')) + offset) + 'px');
                } else {
                    popover.css('top', (parseFloat(popover.css('top')) - offset) + 'px');
                }

                zoomContainer.find('a.slider-toggle').text(text);
                zoomContainer.find('a.slider-toggle').on('click', function () {
                    btnEl.popover('hide');
                    if (zoomSlider.hasClass('hidden')) {
                        zoomSlider.removeClass('hidden');
                    } else {
                        zoomSlider.addClass('hidden');
                    }
                });
            });

        this.$zoomContainer = zoomContainer;
        this.$zoomSlider = zoomSlider;
    }

    return ZoomWidget;
});