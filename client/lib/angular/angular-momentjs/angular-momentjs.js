/*
  angular-momentjs - v0.1.6 
  2014-01-28
*/
(function(window, angular, undefined) {
    angular.module("angular-moment", [ "gdi2290.moment" ]);
    angular.module("angular-momentjs", [ "gdi2290.moment" ]);
    angular.module("ngMoment", [ "gdi2290.moment" ]);
    angular.module("ngMomentjs", [ "gdi2290.moment" ]);
    angular.module("ngMomentJS", [ "gdi2290.moment" ]);
    angular.module("gdi2290.amTimeAgo", []);
    angular.module("gdi2290.amDateFormat", []);
    angular.module("gdi2290.moment-service", []);
    angular.module("gdi2290.moment", [ "gdi2290.moment-service", "gdi2290.amDateFormat", "gdi2290.amTimeAgo" ]);
    "use strict";
    angular.module("gdi2290.amDateFormat").filter("amDateFormat", function($moment) {
        return function(value, format) {
            if (typeof value === "undefined" || value === null) {
                return "";
            }
            if (!isNaN(parseFloat(value)) && isFinite(value)) {
                value = new Date(parseInt(value, 10));
            }
            if ($moment.then) {
                $moment().then(function(moment) {
                    return moment(value).format(format);
                });
            } else {
                return $moment(value).format(format);
            }
        };
    });
    "use strict";
    angular.module("gdi2290.amTimeAgo").directive("amTimeAgo", function($moment, $timeout) {
        function isUndefined(value) {
            return typeof value === "undefined" || value === null || value === "";
        }
        return function(scope, element, attrs) {
            var activeTimeout = null;
            var currentValue;
            var currentFormat;
            function cancelTimer() {
                if (activeTimeout) {
                    $timeout.cancel(activeTimeout);
                    activeTimeout = null;
                }
            }
            function updateTime(momentInstance) {
                element.text(momentInstance.fromNow());
                var howOld;
                if ($moment.then) {
                    $moment().then(function(moment) {
                        howOld = moment().diff(momentInstance, "minute");
                    });
                } else {
                    howOld = $moment().diff(momentInstance, "minute");
                }
                var secondsUntilUpdate = 3600;
                if (howOld < 1) {
                    secondsUntilUpdate = 1;
                } else if (howOld < 60) {
                    secondsUntilUpdate = 30;
                } else if (howOld < 180) {
                    secondsUntilUpdate = 300;
                }
                activeTimeout = $timeout(function() {
                    updateTime(momentInstance);
                }, secondsUntilUpdate * 1e3, false);
            }
            function updateMoment() {
                cancelTimer();
                if ($moment().then) {
                    $moment.then(function(moment) {
                        updateTime(moment(currentValue, currentFormat));
                    });
                } else {
                    updateTime($moment(currentValue, currentFormat));
                }
            }
            scope.$watch(attrs.amTimeAgo, function(value) {
                if (isUndefined(value)) {
                    cancelTimer();
                    if (currentValue) {
                        element.text("");
                        currentValue = null;
                    }
                    return;
                }
                if (angular.isNumber(value)) {
                    value = new Date(value);
                }
                currentValue = value;
                updateMoment();
            });
            attrs.$observe("amFormat", function(format) {
                currentFormat = format;
                if (currentValue) {
                    updateMoment();
                }
            });
            scope.$on("$destroy", function() {
                cancelTimer();
            });
        };
    });
    "use strict";
    angular.module("gdi2290.moment-service").provider("$moment", function() {
        var _asyncLoading = false;
        var _scriptUrl = "//cdnjs.cloudflare.com/ajax/libs/moment.js/2.5.0/moment.min.js";
        this.asyncLoading = function(config) {
            _asyncLoading = config || _asyncLoading;
            return this;
        };
        this.scriptUrl = function(url) {
            _scriptUrl = url || _scriptUrl;
            return this;
        };
        function createScript($document, callback) {
            var scriptTag = $document.createElement("script");
            scriptTag.type = "text/javascript";
            scriptTag.async = true;
            scriptTag.src = _scriptUrl;
            scriptTag.onreadystatechange = function() {
                if (this.readyState === "complete") {
                    callback();
                }
            };
            scriptTag.onload = callback;
            var s = $document.getElementsByTagName("body")[0];
            s.appendChild(scriptTag);
        }
        this.$get = ['$timeout', '$document', '$q', '$window', function($timeout, $document, $q, $window) {
            var deferred = $q.defer();
            var _moment = $window.moment;
            if (_asyncLoading) {
                var onScriptLoad = function(callback) {
                    $timeout(function() {
                        deferred.resolve($window.moment);
                    });
                };
                createScript($document[0], onScriptLoad);
            }
            return _asyncLoading ? deferred.promise : _moment;
        }];
    });
})(this, this.angular, void 0);