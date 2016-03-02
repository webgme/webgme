/*globals define, $*/
/*jshint browser: true*/
/**
 * WebGME jquery extension
 *
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define(['jquery'], function () {

    'use strict';

    $.fn.extend({
        editOnDblClick: function (params) {
            this.each(function () {
                $(this).on('dblclick.editOnDblClick', null, function (event) {
                    $(this).editInPlace(params);
                    event.stopPropagation();
                    event.preventDefault();
                });
            });
        }
    });

    $.fn.extend({
        editInPlace: function (params) {
            var editClass = params && params.class || null,
                extraCss = params && params.css || {},//Extra optional css styling
                onChangeFn = params && params.onChange || null,
                onFinishFn = params && params.onFinish || null,
                enableEmpty = params && params.enableEmpty || false,
                minHeight = 16,
                fontSizeAdjust = 5;

            function editInPlace(el) {
                var w = el.width(),
                    h = el.height(),
                    originalValue,
                    inputCtrl,
                    keys,
                    i;

                //check if already in edit mode
                //if so, select the content
                if (el.data('already-editing') === true) {
                    el.find('input').select().focus();
                    return;
                }

                //not editing yet, turn to edit mode now
                el.data('already-editing', true);

                //save old content
                originalValue = el.text();
                if (params && params.value) {
                    originalValue = params.value;
                }

                //create edit control
                inputCtrl = $('<input/>', {
                    type: 'text',
                    value: originalValue
                });

                //add custom edit class
                if (editClass && editClass !== '') {
                    inputCtrl.addClass(editClass);
                }

                //add any custom css specified 
                keys = Object.keys(extraCss);

                for (i = keys.length - 1; i >= 0; i--) {
                    inputCtrl.css(keys[i], extraCss[keys[i]]);
                }

                //set css properties to fix Bootstrap's modification
                h = Math.max(h, minHeight);
                inputCtrl.outerWidth(w).outerHeight(h);
                inputCtrl.css({
                    'box-sizing': 'border-box',
                    'margin': '0px',
                    'line-height': h + 'px',
                    'font-size':   h - fontSizeAdjust
                });


                el.html(inputCtrl);

                //set font size accordingly
                //TODO: multiple line editor not handled correctly
                /*h = inputCtrl.height();*/
                //inputCtrl.css({'font-size': originalFontSize});

                //finally put the control in focus
                inputCtrl.focus();

                //hook up event handlers to 'save' and 'cancel'
                inputCtrl.keydown(
                    function (event) {
                        switch (event.which) {
                            case 27: // [esc]
                                // discard changes on [esc]
                                inputCtrl.val(originalValue);
                                event.preventDefault();
                                event.stopPropagation();
                                $(this).blur();
                                break;
                            case 13: // [enter]
                                // simulate blur to accept new value
                                event.preventDefault();
                                event.stopPropagation();
                                $(this).blur();
                                break;
                            case 46:// DEL
                                //don't need to handle it specially but need to prevent propagation
                                event.stopPropagation();
                                break;
                            default:
                                break;
                        }
                    }
                ).blur(function (/*event*/) {
                        var newValue = inputCtrl.val();

                        //revert edit mode, when user leaves <input>
                        if (newValue === '' && enableEmpty === false) {
                            newValue = originalValue;
                        }

                        el.html('').text(newValue);
                        el.removeData('already-editing');

                        if (newValue !== originalValue) {
                            if (onChangeFn) {
                                onChangeFn.call(el, originalValue, newValue);
                            }
                        }

                        if (onFinishFn) {
                            onFinishFn.call(el);
                        }
                    });
            }

            this.each(function () {
                editInPlace($(this));
            });
        }
    });

    // Canvas drawing extension
    if (!!document.createElement('canvas').getContext) {
        $.extend(window.CanvasRenderingContext2D.prototype, {

            ellipse: function (aX, aY, r1, r2, fillIt) {
                var aWidth,
                    aHeight,
                    hB,
                    vB,
                    eX,
                    eY,
                    mX,
                    mY;

                aX = aX - r1;
                aY = aY - r2;

                aWidth = r1 * 2;
                aHeight = r2 * 2;

                hB = (aWidth / 2) * 0.5522848;
                vB = (aHeight / 2) * 0.5522848;
                eX = aX + aWidth;
                eY = aY + aHeight;
                mX = aX + aWidth / 2;
                mY = aY + aHeight / 2;

                this.beginPath();
                this.moveTo(aX, mY);
                this.bezierCurveTo(aX, mY - vB, mX - hB, aY, mX, aY);
                this.bezierCurveTo(mX + hB, aY, eX, mY - vB, eX, mY);
                this.bezierCurveTo(eX, mY + vB, mX + hB, eY, mX, eY);
                this.bezierCurveTo(mX - hB, eY, aX, mY + vB, aX, mY);
                this.closePath();
                if (fillIt) {
                    this.fill();
                }
                this.stroke();
            },

            circle: function (aX, aY, aDiameter, fillIt) {
                this.ellipse(aX, aY, aDiameter, aDiameter, fillIt);
            }
        });
    }

    /*
     *
     * Getting textwidth
     *
     */
    $.fn.extend({
        textWidth: function () {
            var htmlOrg,
                htmlCalc,
                width;

            htmlOrg = $(this).html();
            htmlCalc = '<span>' + htmlOrg + '</span>';
            $(this).html(htmlCalc);
            width = $(this).find('span:first').width();
            $(this).html(htmlOrg);

            return width;
        }
    });

    $.fn.extend({
        groupedAlphabetTabs: function (params) {
            var defaultParams = {'groups': ['A - E', 'F - J', 'K - O', 'P - T', 'U - Z']},
                opts = {},
                ulBase = $('<ul class="nav nav-tabs"></ul>'),
                liBase = $('<li class=""><a href="#" data-toggle="tab"></a></li>'),
                hasActive = false,
                ul,
                li,
                i,
                start,
                end;

            $.extend(opts, defaultParams, params);

            ul = ulBase.clone();
            if (opts.extraTabs) {
                opts.extraTabs.forEach(function (tabInfo) {
                    li = liBase.clone();
                    if (tabInfo.active === true) {
                        li.addClass('active');
                        hasActive = true;
                    }

                    li.find('a').text(tabInfo.title);
                    li.data('filter', tabInfo.data);
                    ul.append(li);
                });
            }

            li = liBase.clone();
            if (hasActive === false) {
                li.addClass('active');
            }
            li.find('a').text('ALL');
            ul.append(li);

            for (i = 0; i < opts.groups.length; i += 1) {
                start = opts.groups[i].split('-')[0].trim();
                end = opts.groups[i].split('-')[1].trim();
                li = liBase.clone();
                li.find('a').text(opts.groups[i]);
                li.data('filter', [start, end]);
                ul.append(li);
            }

            this.each(function () {
                $(this).append(ul.clone(true));
                $(this).on('click.groupedAlphabetTabs', 'li', function (event) {
                    var filter = $(this).data('filter');

                    if (params && params.onClick) {
                        params.onClick(filter);
                    }

                    event.preventDefault();
                });
            });
        }
    });
});
