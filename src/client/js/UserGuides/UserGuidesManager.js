define(['sheperd-js'], function (Shepherd) {
    'use strict';

    console.log('sheperdjs', Shepherd);
    var UserGuidesManager = function () {
        //should initialize guides by fetching all available ones...
        this._tours = {};
    };

    UserGuidesManager.prototype.startGuide = function (tourName) {
        const tour = new Shepherd.Tour({
            defaultStepOptions: {
                classes: 'shadow-md bg-purple-dark',
                scrollTo: true
            }
        });

        tour.addStep({
            id: 'example-step',
            text: 'Let\'s start this little tour',
            attachTo: {
                element: element,
                on: 'right'
            },
            classes: 'example-step-extra-class',
            buttons: [
                {
                    text: 'Next',
                    action: tour.next
                }
            ]
        });

        tour.start();
    };

    UserGuidesManager.prototype.getAvailableGuides = function () {

    };

    UserGuidesManager.prototype.getMyTour = function (tourName) {
        if (!this._tours.hasOwnProperty(tourName)) {
            this._tours[tourName] = new Shepherd.Tour({
                defaultStepOptions: {
                    scrollTo: true
                },
                styleVariables: {
                    shepherdThemePrimary: '#00B0F0',
                    shepherdTextBackground: '#7B7B7B',
                    useDropShadow: true
                }
            });
        }
        return this._tours[tourName];
    };

    return UserGuidesManager;
});
