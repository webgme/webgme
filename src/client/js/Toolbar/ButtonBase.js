/*globals define, $  */
/*jshint browser: true*/
/**
 * @author rkereskenyi / https://github.com/rkereskenyi
 */

define([], function () {

    'use strict';

    function createButton(params) {
        var button,
            btnClass = 'btn btn-mini';

        button = $('<a/>', {
            class: btnClass,
            href: '#',
            title: params.title
        });

        if (params.data) {
            button.data(params.data);
        }

        if (params.icon) {
            if (typeof params.icon === 'string') {
                button.append($('<i class="' + params.icon + '"></i>'));
            } else {
                button.append(params.icon);
            }
        }

        if (params.text) {
            if (params.icon) {
                button.append(' ');
            }
            button.append(params.text);
        }

        if (params.clickFn) {
            button.on('click', function (event) {
                if (!button.hasClass('disabled')) {
                    params.clickFn.call(this, $(this).data());
                }
                if (params.clickFnEventCancel !== false) {
                    event.stopPropagation();
                    event.preventDefault();
                }
            });
        }

        button.enabled = function (enabled) {
            if (enabled === true) {
                button.disable(false);
            } else {
                button.disable(true);
            }
        };

        return button;
    }


    return {createButton: createButton};
});