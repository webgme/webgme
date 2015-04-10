/*globals angular, require*/
'use strict';

var components = [
    {
      name: 'itemList',
      sources: [ 'demo.html', 'newItemTemplate.html', 'demo.js']
    },
    {
      name: 'hierarchicalMenu',
      sources: [ 'demo.html', 'demo.js']
    },
    {
      name: 'contextmenu',
      sources: [ 'demo.html', 'demo.js']
    },
    {
      name: 'dropdownNavigator',
      sources: [ 'demo.html', 'demo.js']
    },
    {
        name: 'treeNavigator',
        sources: ['demo.html', 'demo.js']
    }
];

require('../library/hierarchicalMenu/docs/demo.js');
require('../library/contextmenu/docs/demo.js');
require('../library/dropdownNavigator/docs/demo.js');
require('../library/treeNavigator/docs/demo.js');
require('../library/itemList/docs/demo.js');

require('angular-sanitize');
window.Showdown = require('showdown');
require('angular-markdown-directive');

require('codemirror-css');
window.CodeMirror = require('codemirror');

require('codemirror/mode/htmlmixed/htmlmixed');
require('codemirror/mode/xml/xml');
require('codemirror/mode/javascript/javascript');

require('angular-ui-codemirror');


var demoApp = angular.module(
    'isis.ui.demoApp', [
        'isis.ui.demoApp.templates',
        'btford.markdown',
        'ui.codemirror'
    ].concat(components.map(function (e) {
        return 'isis.ui.' + e.name + '.demo';
    }))
);

demoApp.run(function () {
    console.log('DemoApp run...');
});

demoApp.controller(
    'UIComponentsDemoController',
    function ($scope, $templateCache) {

        var fileExtensionRE,
            codeMirrorModes;

        fileExtensionRE = /(?:\.([^.]+))?$/;

        codeMirrorModes = {
            'js': 'javascript',
            'html': 'htmlmixed'
        };

        $scope.components = components.map(function (component) {
            var sources,
                viewerOptions,
                fileExtension;

            if (angular.isArray(component.sources)) {
                sources = component.sources.map(function (sourceFile) {

                    fileExtension = fileExtensionRE.exec(sourceFile);

                    viewerOptions = {
                        lineWrapping: true,
                        lineNumbers: true,
                        readOnly: true,
                        mode: codeMirrorModes[fileExtension[1]] || 'xml'
                    };

                    return {
                        fileName: sourceFile,
                        code: $templateCache.get('/library/' + component.name + '/docs/' +
                            sourceFile),
                        viewerOptions: viewerOptions
                    };
                });
            }

            return {
                name: component.name,
                template: '/library/' + component.name + '/docs/demo.html',
                docs: '/library/' + component.name + '/docs/readme.md',
                sources: sources,
                selectedSourceFile: sources[0]
            };
        });

    });

window.countOfSesquatches = function (printWatchers) {

    var root = angular.element(document.getElementsByTagName('body'));

    var watchers = [];

    var f = function (element) {
        angular.forEach(['$scope', '$isolateScope'], function (scopeProperty) {
            if (element.data() && element.data()
                .hasOwnProperty(scopeProperty)) {
                angular.forEach(element.data()[scopeProperty].$$watchers, function (watcher) {
                    watchers.push(watcher);
                });
            }
        });

        angular.forEach(element.children(), function (childElement) {
            f(angular.element(childElement));
        });
    };

    f(root);

    // Remove duplicate watchers
    var watchersWithoutDuplicates = [];
    angular.forEach(watchers, function (item) {
        if (watchersWithoutDuplicates.indexOf(item) < 0) {
            watchersWithoutDuplicates.push(item);
            if (printWatchers === true) {
                console.log(item);
            }
        }
    });

    console.log(watchersWithoutDuplicates.length);

};