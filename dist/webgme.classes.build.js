var WebGMEGlobal = WebGMEGlobal || {}; WebGMEGlobal.classes = WebGMEGlobal.classes || {};(function(){/** vim: et:ts=4:sw=4:sts=4
 * @license RequireJS 2.1.11 Copyright (c) 2010-2014, The Dojo Foundation All Rights Reserved.
 * Available via the MIT or new BSD license.
 * see: http://github.com/jrburke/requirejs for details
 */
//Not using strict: uneven strict support in browsers, #392, and causes
//problems with requirejs.exec()/transpiler plugins that may not be strict.
/*jslint regexp: true, nomen: true, sloppy: true */
/*global window, navigator, document, importScripts, setTimeout, opera */

var requirejs, require, define;
(function (global) {
    var req, s, head, baseElement, dataMain, src,
        interactiveScript, currentlyAddingScript, mainScript, subPath,
        version = '2.1.11',
        commentRegExp = /(\/\*([\s\S]*?)\*\/|([^:]|^)\/\/(.*)$)/mg,
        cjsRequireRegExp = /[^.]\s*require\s*\(\s*["']([^'"\s]+)["']\s*\)/g,
        jsSuffixRegExp = /\.js$/,
        currDirRegExp = /^\.\//,
        op = Object.prototype,
        ostring = op.toString,
        hasOwn = op.hasOwnProperty,
        ap = Array.prototype,
        apsp = ap.splice,
        isBrowser = !!(typeof window !== 'undefined' && typeof navigator !== 'undefined' && window.document),
        isWebWorker = !isBrowser && typeof importScripts !== 'undefined',
        //PS3 indicates loaded and complete, but need to wait for complete
        //specifically. Sequence is 'loading', 'loaded', execution,
        // then 'complete'. The UA check is unfortunate, but not sure how
        //to feature test w/o causing perf issues.
        readyRegExp = isBrowser && navigator.platform === 'PLAYSTATION 3' ?
                      /^complete$/ : /^(complete|loaded)$/,
        defContextName = '_',
        //Oh the tragedy, detecting opera. See the usage of isOpera for reason.
        isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
        contexts = {},
        cfg = {},
        globalDefQueue = [],
        useInteractive = false;

    function isFunction(it) {
        return ostring.call(it) === '[object Function]';
    }

    function isArray(it) {
        return ostring.call(it) === '[object Array]';
    }

    /**
     * Helper function for iterating over an array. If the func returns
     * a true value, it will break out of the loop.
     */
    function each(ary, func) {
        if (ary) {
            var i;
            for (i = 0; i < ary.length; i += 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    /**
     * Helper function for iterating over an array backwards. If the func
     * returns a true value, it will break out of the loop.
     */
    function eachReverse(ary, func) {
        if (ary) {
            var i;
            for (i = ary.length - 1; i > -1; i -= 1) {
                if (ary[i] && func(ary[i], i, ary)) {
                    break;
                }
            }
        }
    }

    function hasProp(obj, prop) {
        return hasOwn.call(obj, prop);
    }

    function getOwn(obj, prop) {
        return hasProp(obj, prop) && obj[prop];
    }

    /**
     * Cycles over properties in an object and calls a function for each
     * property value. If the function returns a truthy value, then the
     * iteration is stopped.
     */
    function eachProp(obj, func) {
        var prop;
        for (prop in obj) {
            if (hasProp(obj, prop)) {
                if (func(obj[prop], prop)) {
                    break;
                }
            }
        }
    }

    /**
     * Simple function to mix in properties from source into target,
     * but only if target does not already have a property of the same name.
     */
    function mixin(target, source, force, deepStringMixin) {
        if (source) {
            eachProp(source, function (value, prop) {
                if (force || !hasProp(target, prop)) {
                    if (deepStringMixin && typeof value === 'object' && value &&
                        !isArray(value) && !isFunction(value) &&
                        !(value instanceof RegExp)) {

                        if (!target[prop]) {
                            target[prop] = {};
                        }
                        mixin(target[prop], value, force, deepStringMixin);
                    } else {
                        target[prop] = value;
                    }
                }
            });
        }
        return target;
    }

    //Similar to Function.prototype.bind, but the 'this' object is specified
    //first, since it is easier to read/figure out what 'this' will be.
    function bind(obj, fn) {
        return function () {
            return fn.apply(obj, arguments);
        };
    }

    function scripts() {
        return document.getElementsByTagName('script');
    }

    function defaultOnError(err) {
        throw err;
    }

    //Allow getting a global that is expressed in
    //dot notation, like 'a.b.c'.
    function getGlobal(value) {
        if (!value) {
            return value;
        }
        var g = global;
        each(value.split('.'), function (part) {
            g = g[part];
        });
        return g;
    }

    /**
     * Constructs an error with a pointer to an URL with more information.
     * @param {String} id the error ID that maps to an ID on a web page.
     * @param {String} message human readable error.
     * @param {Error} [err] the original error, if there is one.
     *
     * @returns {Error}
     */
    function makeError(id, msg, err, requireModules) {
        var e = new Error(msg + '\nhttp://requirejs.org/docs/errors.html#' + id);
        e.requireType = id;
        e.requireModules = requireModules;
        if (err) {
            e.originalError = err;
        }
        return e;
    }

    if (typeof define !== 'undefined') {
        //If a define is already in play via another AMD loader,
        //do not overwrite.
        return;
    }

    if (typeof requirejs !== 'undefined') {
        if (isFunction(requirejs)) {
            //Do not overwrite and existing requirejs instance.
            return;
        }
        cfg = requirejs;
        requirejs = undefined;
    }

    //Allow for a require config object
    if (typeof require !== 'undefined' && !isFunction(require)) {
        //assume it is a config object.
        cfg = require;
        require = undefined;
    }

    function newContext(contextName) {
        var inCheckLoaded, Module, context, handlers,
            checkLoadedTimeoutId,
            config = {
                //Defaults. Do not set a default for map
                //config to speed up normalize(), which
                //will run faster if there is no default.
                waitSeconds: 7,
                baseUrl: './',
                paths: {},
                bundles: {},
                pkgs: {},
                shim: {},
                config: {}
            },
            registry = {},
            //registry of just enabled modules, to speed
            //cycle breaking code when lots of modules
            //are registered, but not activated.
            enabledRegistry = {},
            undefEvents = {},
            defQueue = [],
            defined = {},
            urlFetched = {},
            bundlesMap = {},
            requireCounter = 1,
            unnormalizedCounter = 1;

        /**
         * Trims the . and .. from an array of path segments.
         * It will keep a leading path segment if a .. will become
         * the first path segment, to help with module name lookups,
         * which act like paths, but can be remapped. But the end result,
         * all paths that use this function should look normalized.
         * NOTE: this method MODIFIES the input array.
         * @param {Array} ary the array of path segments.
         */
        function trimDots(ary) {
            var i, part, length = ary.length;
            for (i = 0; i < length; i++) {
                part = ary[i];
                if (part === '.') {
                    ary.splice(i, 1);
                    i -= 1;
                } else if (part === '..') {
                    if (i === 1 && (ary[2] === '..' || ary[0] === '..')) {
                        //End of the line. Keep at least one non-dot
                        //path segment at the front so it can be mapped
                        //correctly to disk. Otherwise, there is likely
                        //no path mapping for a path starting with '..'.
                        //This can still fail, but catches the most reasonable
                        //uses of ..
                        break;
                    } else if (i > 0) {
                        ary.splice(i - 1, 2);
                        i -= 2;
                    }
                }
            }
        }

        /**
         * Given a relative module name, like ./something, normalize it to
         * a real name that can be mapped to a path.
         * @param {String} name the relative name
         * @param {String} baseName a real name that the name arg is relative
         * to.
         * @param {Boolean} applyMap apply the map config to the value. Should
         * only be done if this normalization is for a dependency ID.
         * @returns {String} normalized name
         */
        function normalize(name, baseName, applyMap) {
            var pkgMain, mapValue, nameParts, i, j, nameSegment, lastIndex,
                foundMap, foundI, foundStarMap, starI,
                baseParts = baseName && baseName.split('/'),
                normalizedBaseParts = baseParts,
                map = config.map,
                starMap = map && map['*'];

            //Adjust any relative paths.
            if (name && name.charAt(0) === '.') {
                //If have a base name, try to normalize against it,
                //otherwise, assume it is a top-level require that will
                //be relative to baseUrl in the end.
                if (baseName) {
                    //Convert baseName to array, and lop off the last part,
                    //so that . matches that 'directory' and not name of the baseName's
                    //module. For instance, baseName of 'one/two/three', maps to
                    //'one/two/three.js', but we want the directory, 'one/two' for
                    //this normalization.
                    normalizedBaseParts = baseParts.slice(0, baseParts.length - 1);
                    name = name.split('/');
                    lastIndex = name.length - 1;

                    // If wanting node ID compatibility, strip .js from end
                    // of IDs. Have to do this here, and not in nameToUrl
                    // because node allows either .js or non .js to map
                    // to same file.
                    if (config.nodeIdCompat && jsSuffixRegExp.test(name[lastIndex])) {
                        name[lastIndex] = name[lastIndex].replace(jsSuffixRegExp, '');
                    }

                    name = normalizedBaseParts.concat(name);
                    trimDots(name);
                    name = name.join('/');
                } else if (name.indexOf('./') === 0) {
                    // No baseName, so this is ID is resolved relative
                    // to baseUrl, pull off the leading dot.
                    name = name.substring(2);
                }
            }

            //Apply map config if available.
            if (applyMap && map && (baseParts || starMap)) {
                nameParts = name.split('/');

                outerLoop: for (i = nameParts.length; i > 0; i -= 1) {
                    nameSegment = nameParts.slice(0, i).join('/');

                    if (baseParts) {
                        //Find the longest baseName segment match in the config.
                        //So, do joins on the biggest to smallest lengths of baseParts.
                        for (j = baseParts.length; j > 0; j -= 1) {
                            mapValue = getOwn(map, baseParts.slice(0, j).join('/'));

                            //baseName segment has config, find if it has one for
                            //this name.
                            if (mapValue) {
                                mapValue = getOwn(mapValue, nameSegment);
                                if (mapValue) {
                                    //Match, update name to the new value.
                                    foundMap = mapValue;
                                    foundI = i;
                                    break outerLoop;
                                }
                            }
                        }
                    }

                    //Check for a star map match, but just hold on to it,
                    //if there is a shorter segment match later in a matching
                    //config, then favor over this star map.
                    if (!foundStarMap && starMap && getOwn(starMap, nameSegment)) {
                        foundStarMap = getOwn(starMap, nameSegment);
                        starI = i;
                    }
                }

                if (!foundMap && foundStarMap) {
                    foundMap = foundStarMap;
                    foundI = starI;
                }

                if (foundMap) {
                    nameParts.splice(0, foundI, foundMap);
                    name = nameParts.join('/');
                }
            }

            // If the name points to a package's name, use
            // the package main instead.
            pkgMain = getOwn(config.pkgs, name);

            return pkgMain ? pkgMain : name;
        }

        function removeScript(name) {
            if (isBrowser) {
                each(scripts(), function (scriptNode) {
                    if (scriptNode.getAttribute('data-requiremodule') === name &&
                            scriptNode.getAttribute('data-requirecontext') === context.contextName) {
                        scriptNode.parentNode.removeChild(scriptNode);
                        return true;
                    }
                });
            }
        }

        function hasPathFallback(id) {
            var pathConfig = getOwn(config.paths, id);
            if (pathConfig && isArray(pathConfig) && pathConfig.length > 1) {
                //Pop off the first array value, since it failed, and
                //retry
                pathConfig.shift();
                context.require.undef(id);
                context.require([id]);
                return true;
            }
        }

        //Turns a plugin!resource to [plugin, resource]
        //with the plugin being undefined if the name
        //did not have a plugin prefix.
        function splitPrefix(name) {
            var prefix,
                index = name ? name.indexOf('!') : -1;
            if (index > -1) {
                prefix = name.substring(0, index);
                name = name.substring(index + 1, name.length);
            }
            return [prefix, name];
        }

        /**
         * Creates a module mapping that includes plugin prefix, module
         * name, and path. If parentModuleMap is provided it will
         * also normalize the name via require.normalize()
         *
         * @param {String} name the module name
         * @param {String} [parentModuleMap] parent module map
         * for the module name, used to resolve relative names.
         * @param {Boolean} isNormalized: is the ID already normalized.
         * This is true if this call is done for a define() module ID.
         * @param {Boolean} applyMap: apply the map config to the ID.
         * Should only be true if this map is for a dependency.
         *
         * @returns {Object}
         */
        function makeModuleMap(name, parentModuleMap, isNormalized, applyMap) {
            var url, pluginModule, suffix, nameParts,
                prefix = null,
                parentName = parentModuleMap ? parentModuleMap.name : null,
                originalName = name,
                isDefine = true,
                normalizedName = '';

            //If no name, then it means it is a require call, generate an
            //internal name.
            if (!name) {
                isDefine = false;
                name = '_@r' + (requireCounter += 1);
            }

            nameParts = splitPrefix(name);
            prefix = nameParts[0];
            name = nameParts[1];

            if (prefix) {
                prefix = normalize(prefix, parentName, applyMap);
                pluginModule = getOwn(defined, prefix);
            }

            //Account for relative paths if there is a base name.
            if (name) {
                if (prefix) {
                    if (pluginModule && pluginModule.normalize) {
                        //Plugin is loaded, use its normalize method.
                        normalizedName = pluginModule.normalize(name, function (name) {
                            return normalize(name, parentName, applyMap);
                        });
                    } else {
                        normalizedName = normalize(name, parentName, applyMap);
                    }
                } else {
                    //A regular module.
                    normalizedName = normalize(name, parentName, applyMap);

                    //Normalized name may be a plugin ID due to map config
                    //application in normalize. The map config values must
                    //already be normalized, so do not need to redo that part.
                    nameParts = splitPrefix(normalizedName);
                    prefix = nameParts[0];
                    normalizedName = nameParts[1];
                    isNormalized = true;

                    url = context.nameToUrl(normalizedName);
                }
            }

            //If the id is a plugin id that cannot be determined if it needs
            //normalization, stamp it with a unique ID so two matching relative
            //ids that may conflict can be separate.
            suffix = prefix && !pluginModule && !isNormalized ?
                     '_unnormalized' + (unnormalizedCounter += 1) :
                     '';

            return {
                prefix: prefix,
                name: normalizedName,
                parentMap: parentModuleMap,
                unnormalized: !!suffix,
                url: url,
                originalName: originalName,
                isDefine: isDefine,
                id: (prefix ?
                        prefix + '!' + normalizedName :
                        normalizedName) + suffix
            };
        }

        function getModule(depMap) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (!mod) {
                mod = registry[id] = new context.Module(depMap);
            }

            return mod;
        }

        function on(depMap, name, fn) {
            var id = depMap.id,
                mod = getOwn(registry, id);

            if (hasProp(defined, id) &&
                    (!mod || mod.defineEmitComplete)) {
                if (name === 'defined') {
                    fn(defined[id]);
                }
            } else {
                mod = getModule(depMap);
                if (mod.error && name === 'error') {
                    fn(mod.error);
                } else {
                    mod.on(name, fn);
                }
            }
        }

        function onError(err, errback) {
            var ids = err.requireModules,
                notified = false;

            if (errback) {
                errback(err);
            } else {
                each(ids, function (id) {
                    var mod = getOwn(registry, id);
                    if (mod) {
                        //Set error on module, so it skips timeout checks.
                        mod.error = err;
                        if (mod.events.error) {
                            notified = true;
                            mod.emit('error', err);
                        }
                    }
                });

                if (!notified) {
                    req.onError(err);
                }
            }
        }

        /**
         * Internal method to transfer globalQueue items to this context's
         * defQueue.
         */
        function takeGlobalQueue() {
            //Push all the globalDefQueue items into the context's defQueue
            if (globalDefQueue.length) {
                //Array splice in the values since the context code has a
                //local var ref to defQueue, so cannot just reassign the one
                //on context.
                apsp.apply(defQueue,
                           [defQueue.length, 0].concat(globalDefQueue));
                globalDefQueue = [];
            }
        }

        handlers = {
            'require': function (mod) {
                if (mod.require) {
                    return mod.require;
                } else {
                    return (mod.require = context.makeRequire(mod.map));
                }
            },
            'exports': function (mod) {
                mod.usingExports = true;
                if (mod.map.isDefine) {
                    if (mod.exports) {
                        return (defined[mod.map.id] = mod.exports);
                    } else {
                        return (mod.exports = defined[mod.map.id] = {});
                    }
                }
            },
            'module': function (mod) {
                if (mod.module) {
                    return mod.module;
                } else {
                    return (mod.module = {
                        id: mod.map.id,
                        uri: mod.map.url,
                        config: function () {
                            return  getOwn(config.config, mod.map.id) || {};
                        },
                        exports: mod.exports || (mod.exports = {})
                    });
                }
            }
        };

        function cleanRegistry(id) {
            //Clean up machinery used for waiting modules.
            delete registry[id];
            delete enabledRegistry[id];
        }

        function breakCycle(mod, traced, processed) {
            var id = mod.map.id;

            if (mod.error) {
                mod.emit('error', mod.error);
            } else {
                traced[id] = true;
                each(mod.depMaps, function (depMap, i) {
                    var depId = depMap.id,
                        dep = getOwn(registry, depId);

                    //Only force things that have not completed
                    //being defined, so still in the registry,
                    //and only if it has not been matched up
                    //in the module already.
                    if (dep && !mod.depMatched[i] && !processed[depId]) {
                        if (getOwn(traced, depId)) {
                            mod.defineDep(i, defined[depId]);
                            mod.check(); //pass false?
                        } else {
                            breakCycle(dep, traced, processed);
                        }
                    }
                });
                processed[id] = true;
            }
        }

        function checkLoaded() {
            var err, usingPathFallback,
                waitInterval = config.waitSeconds * 1000,
                //It is possible to disable the wait interval by using waitSeconds of 0.
                expired = waitInterval && (context.startTime + waitInterval) < new Date().getTime(),
                noLoads = [],
                reqCalls = [],
                stillLoading = false,
                needCycleCheck = true;

            //Do not bother if this call was a result of a cycle break.
            if (inCheckLoaded) {
                return;
            }

            inCheckLoaded = true;

            //Figure out the state of all the modules.
            eachProp(enabledRegistry, function (mod) {
                var map = mod.map,
                    modId = map.id;

                //Skip things that are not enabled or in error state.
                if (!mod.enabled) {
                    return;
                }

                if (!map.isDefine) {
                    reqCalls.push(mod);
                }

                if (!mod.error) {
                    //If the module should be executed, and it has not
                    //been inited and time is up, remember it.
                    if (!mod.inited && expired) {
                        if (hasPathFallback(modId)) {
                            usingPathFallback = true;
                            stillLoading = true;
                        } else {
                            noLoads.push(modId);
                            removeScript(modId);
                        }
                    } else if (!mod.inited && mod.fetched && map.isDefine) {
                        stillLoading = true;
                        if (!map.prefix) {
                            //No reason to keep looking for unfinished
                            //loading. If the only stillLoading is a
                            //plugin resource though, keep going,
                            //because it may be that a plugin resource
                            //is waiting on a non-plugin cycle.
                            return (needCycleCheck = false);
                        }
                    }
                }
            });

            if (expired && noLoads.length) {
                //If wait time expired, throw error of unloaded modules.
                err = makeError('timeout', 'Load timeout for modules: ' + noLoads, null, noLoads);
                err.contextName = context.contextName;
                return onError(err);
            }

            //Not expired, check for a cycle.
            if (needCycleCheck) {
                each(reqCalls, function (mod) {
                    breakCycle(mod, {}, {});
                });
            }

            //If still waiting on loads, and the waiting load is something
            //other than a plugin resource, or there are still outstanding
            //scripts, then just try back later.
            if ((!expired || usingPathFallback) && stillLoading) {
                //Something is still waiting to load. Wait for it, but only
                //if a timeout is not already in effect.
                if ((isBrowser || isWebWorker) && !checkLoadedTimeoutId) {
                    checkLoadedTimeoutId = setTimeout(function () {
                        checkLoadedTimeoutId = 0;
                        checkLoaded();
                    }, 50);
                }
            }

            inCheckLoaded = false;
        }

        Module = function (map) {
            this.events = getOwn(undefEvents, map.id) || {};
            this.map = map;
            this.shim = getOwn(config.shim, map.id);
            this.depExports = [];
            this.depMaps = [];
            this.depMatched = [];
            this.pluginMaps = {};
            this.depCount = 0;

            /* this.exports this.factory
               this.depMaps = [],
               this.enabled, this.fetched
            */
        };

        Module.prototype = {
            init: function (depMaps, factory, errback, options) {
                options = options || {};

                //Do not do more inits if already done. Can happen if there
                //are multiple define calls for the same module. That is not
                //a normal, common case, but it is also not unexpected.
                if (this.inited) {
                    return;
                }

                this.factory = factory;

                if (errback) {
                    //Register for errors on this module.
                    this.on('error', errback);
                } else if (this.events.error) {
                    //If no errback already, but there are error listeners
                    //on this module, set up an errback to pass to the deps.
                    errback = bind(this, function (err) {
                        this.emit('error', err);
                    });
                }

                //Do a copy of the dependency array, so that
                //source inputs are not modified. For example
                //"shim" deps are passed in here directly, and
                //doing a direct modification of the depMaps array
                //would affect that config.
                this.depMaps = depMaps && depMaps.slice(0);

                this.errback = errback;

                //Indicate this module has be initialized
                this.inited = true;

                this.ignore = options.ignore;

                //Could have option to init this module in enabled mode,
                //or could have been previously marked as enabled. However,
                //the dependencies are not known until init is called. So
                //if enabled previously, now trigger dependencies as enabled.
                if (options.enabled || this.enabled) {
                    //Enable this module and dependencies.
                    //Will call this.check()
                    this.enable();
                } else {
                    this.check();
                }
            },

            defineDep: function (i, depExports) {
                //Because of cycles, defined callback for a given
                //export can be called more than once.
                if (!this.depMatched[i]) {
                    this.depMatched[i] = true;
                    this.depCount -= 1;
                    this.depExports[i] = depExports;
                }
            },

            fetch: function () {
                if (this.fetched) {
                    return;
                }
                this.fetched = true;

                context.startTime = (new Date()).getTime();

                var map = this.map;

                //If the manager is for a plugin managed resource,
                //ask the plugin to load it now.
                if (this.shim) {
                    context.makeRequire(this.map, {
                        enableBuildCallback: true
                    })(this.shim.deps || [], bind(this, function () {
                        return map.prefix ? this.callPlugin() : this.load();
                    }));
                } else {
                    //Regular dependency.
                    return map.prefix ? this.callPlugin() : this.load();
                }
            },

            load: function () {
                var url = this.map.url;

                //Regular dependency.
                if (!urlFetched[url]) {
                    urlFetched[url] = true;
                    context.load(this.map.id, url);
                }
            },

            /**
             * Checks if the module is ready to define itself, and if so,
             * define it.
             */
            check: function () {
                if (!this.enabled || this.enabling) {
                    return;
                }

                var err, cjsModule,
                    id = this.map.id,
                    depExports = this.depExports,
                    exports = this.exports,
                    factory = this.factory;

                if (!this.inited) {
                    this.fetch();
                } else if (this.error) {
                    this.emit('error', this.error);
                } else if (!this.defining) {
                    //The factory could trigger another require call
                    //that would result in checking this module to
                    //define itself again. If already in the process
                    //of doing that, skip this work.
                    this.defining = true;

                    if (this.depCount < 1 && !this.defined) {
                        if (isFunction(factory)) {
                            //If there is an error listener, favor passing
                            //to that instead of throwing an error. However,
                            //only do it for define()'d  modules. require
                            //errbacks should not be called for failures in
                            //their callbacks (#699). However if a global
                            //onError is set, use that.
                            if ((this.events.error && this.map.isDefine) ||
                                req.onError !== defaultOnError) {
                                try {
                                    exports = context.execCb(id, factory, depExports, exports);
                                } catch (e) {
                                    err = e;
                                }
                            } else {
                                exports = context.execCb(id, factory, depExports, exports);
                            }

                            // Favor return value over exports. If node/cjs in play,
                            // then will not have a return value anyway. Favor
                            // module.exports assignment over exports object.
                            if (this.map.isDefine && exports === undefined) {
                                cjsModule = this.module;
                                if (cjsModule) {
                                    exports = cjsModule.exports;
                                } else if (this.usingExports) {
                                    //exports already set the defined value.
                                    exports = this.exports;
                                }
                            }

                            if (err) {
                                err.requireMap = this.map;
                                err.requireModules = this.map.isDefine ? [this.map.id] : null;
                                err.requireType = this.map.isDefine ? 'define' : 'require';
                                return onError((this.error = err));
                            }

                        } else {
                            //Just a literal value
                            exports = factory;
                        }

                        this.exports = exports;

                        if (this.map.isDefine && !this.ignore) {
                            defined[id] = exports;

                            if (req.onResourceLoad) {
                                req.onResourceLoad(context, this.map, this.depMaps);
                            }
                        }

                        //Clean up
                        cleanRegistry(id);

                        this.defined = true;
                    }

                    //Finished the define stage. Allow calling check again
                    //to allow define notifications below in the case of a
                    //cycle.
                    this.defining = false;

                    if (this.defined && !this.defineEmitted) {
                        this.defineEmitted = true;
                        this.emit('defined', this.exports);
                        this.defineEmitComplete = true;
                    }

                }
            },

            callPlugin: function () {
                var map = this.map,
                    id = map.id,
                    //Map already normalized the prefix.
                    pluginMap = makeModuleMap(map.prefix);

                //Mark this as a dependency for this plugin, so it
                //can be traced for cycles.
                this.depMaps.push(pluginMap);

                on(pluginMap, 'defined', bind(this, function (plugin) {
                    var load, normalizedMap, normalizedMod,
                        bundleId = getOwn(bundlesMap, this.map.id),
                        name = this.map.name,
                        parentName = this.map.parentMap ? this.map.parentMap.name : null,
                        localRequire = context.makeRequire(map.parentMap, {
                            enableBuildCallback: true
                        });

                    //If current map is not normalized, wait for that
                    //normalized name to load instead of continuing.
                    if (this.map.unnormalized) {
                        //Normalize the ID if the plugin allows it.
                        if (plugin.normalize) {
                            name = plugin.normalize(name, function (name) {
                                return normalize(name, parentName, true);
                            }) || '';
                        }

                        //prefix and name should already be normalized, no need
                        //for applying map config again either.
                        normalizedMap = makeModuleMap(map.prefix + '!' + name,
                                                      this.map.parentMap);
                        on(normalizedMap,
                            'defined', bind(this, function (value) {
                                this.init([], function () { return value; }, null, {
                                    enabled: true,
                                    ignore: true
                                });
                            }));

                        normalizedMod = getOwn(registry, normalizedMap.id);
                        if (normalizedMod) {
                            //Mark this as a dependency for this plugin, so it
                            //can be traced for cycles.
                            this.depMaps.push(normalizedMap);

                            if (this.events.error) {
                                normalizedMod.on('error', bind(this, function (err) {
                                    this.emit('error', err);
                                }));
                            }
                            normalizedMod.enable();
                        }

                        return;
                    }

                    //If a paths config, then just load that file instead to
                    //resolve the plugin, as it is built into that paths layer.
                    if (bundleId) {
                        this.map.url = context.nameToUrl(bundleId);
                        this.load();
                        return;
                    }

                    load = bind(this, function (value) {
                        this.init([], function () { return value; }, null, {
                            enabled: true
                        });
                    });

                    load.error = bind(this, function (err) {
                        this.inited = true;
                        this.error = err;
                        err.requireModules = [id];

                        //Remove temp unnormalized modules for this module,
                        //since they will never be resolved otherwise now.
                        eachProp(registry, function (mod) {
                            if (mod.map.id.indexOf(id + '_unnormalized') === 0) {
                                cleanRegistry(mod.map.id);
                            }
                        });

                        onError(err);
                    });

                    //Allow plugins to load other code without having to know the
                    //context or how to 'complete' the load.
                    load.fromText = bind(this, function (text, textAlt) {
                        /*jslint evil: true */
                        var moduleName = map.name,
                            moduleMap = makeModuleMap(moduleName),
                            hasInteractive = useInteractive;

                        //As of 2.1.0, support just passing the text, to reinforce
                        //fromText only being called once per resource. Still
                        //support old style of passing moduleName but discard
                        //that moduleName in favor of the internal ref.
                        if (textAlt) {
                            text = textAlt;
                        }

                        //Turn off interactive script matching for IE for any define
                        //calls in the text, then turn it back on at the end.
                        if (hasInteractive) {
                            useInteractive = false;
                        }

                        //Prime the system by creating a module instance for
                        //it.
                        getModule(moduleMap);

                        //Transfer any config to this other module.
                        if (hasProp(config.config, id)) {
                            config.config[moduleName] = config.config[id];
                        }

                        try {
                            req.exec(text);
                        } catch (e) {
                            return onError(makeError('fromtexteval',
                                             'fromText eval for ' + id +
                                            ' failed: ' + e,
                                             e,
                                             [id]));
                        }

                        if (hasInteractive) {
                            useInteractive = true;
                        }

                        //Mark this as a dependency for the plugin
                        //resource
                        this.depMaps.push(moduleMap);

                        //Support anonymous modules.
                        context.completeLoad(moduleName);

                        //Bind the value of that module to the value for this
                        //resource ID.
                        localRequire([moduleName], load);
                    });

                    //Use parentName here since the plugin's name is not reliable,
                    //could be some weird string with no path that actually wants to
                    //reference the parentName's path.
                    plugin.load(map.name, localRequire, load, config);
                }));

                context.enable(pluginMap, this);
                this.pluginMaps[pluginMap.id] = pluginMap;
            },

            enable: function () {
                enabledRegistry[this.map.id] = this;
                this.enabled = true;

                //Set flag mentioning that the module is enabling,
                //so that immediate calls to the defined callbacks
                //for dependencies do not trigger inadvertent load
                //with the depCount still being zero.
                this.enabling = true;

                //Enable each dependency
                each(this.depMaps, bind(this, function (depMap, i) {
                    var id, mod, handler;

                    if (typeof depMap === 'string') {
                        //Dependency needs to be converted to a depMap
                        //and wired up to this module.
                        depMap = makeModuleMap(depMap,
                                               (this.map.isDefine ? this.map : this.map.parentMap),
                                               false,
                                               !this.skipMap);
                        this.depMaps[i] = depMap;

                        handler = getOwn(handlers, depMap.id);

                        if (handler) {
                            this.depExports[i] = handler(this);
                            return;
                        }

                        this.depCount += 1;

                        on(depMap, 'defined', bind(this, function (depExports) {
                            this.defineDep(i, depExports);
                            this.check();
                        }));

                        if (this.errback) {
                            on(depMap, 'error', bind(this, this.errback));
                        }
                    }

                    id = depMap.id;
                    mod = registry[id];

                    //Skip special modules like 'require', 'exports', 'module'
                    //Also, don't call enable if it is already enabled,
                    //important in circular dependency cases.
                    if (!hasProp(handlers, id) && mod && !mod.enabled) {
                        context.enable(depMap, this);
                    }
                }));

                //Enable each plugin that is used in
                //a dependency
                eachProp(this.pluginMaps, bind(this, function (pluginMap) {
                    var mod = getOwn(registry, pluginMap.id);
                    if (mod && !mod.enabled) {
                        context.enable(pluginMap, this);
                    }
                }));

                this.enabling = false;

                this.check();
            },

            on: function (name, cb) {
                var cbs = this.events[name];
                if (!cbs) {
                    cbs = this.events[name] = [];
                }
                cbs.push(cb);
            },

            emit: function (name, evt) {
                each(this.events[name], function (cb) {
                    cb(evt);
                });
                if (name === 'error') {
                    //Now that the error handler was triggered, remove
                    //the listeners, since this broken Module instance
                    //can stay around for a while in the registry.
                    delete this.events[name];
                }
            }
        };

        function callGetModule(args) {
            //Skip modules already defined.
            if (!hasProp(defined, args[0])) {
                getModule(makeModuleMap(args[0], null, true)).init(args[1], args[2]);
            }
        }

        function removeListener(node, func, name, ieName) {
            //Favor detachEvent because of IE9
            //issue, see attachEvent/addEventListener comment elsewhere
            //in this file.
            if (node.detachEvent && !isOpera) {
                //Probably IE. If not it will throw an error, which will be
                //useful to know.
                if (ieName) {
                    node.detachEvent(ieName, func);
                }
            } else {
                node.removeEventListener(name, func, false);
            }
        }

        /**
         * Given an event from a script node, get the requirejs info from it,
         * and then removes the event listeners on the node.
         * @param {Event} evt
         * @returns {Object}
         */
        function getScriptData(evt) {
            //Using currentTarget instead of target for Firefox 2.0's sake. Not
            //all old browsers will be supported, but this one was easy enough
            //to support and still makes sense.
            var node = evt.currentTarget || evt.srcElement;

            //Remove the listeners once here.
            removeListener(node, context.onScriptLoad, 'load', 'onreadystatechange');
            removeListener(node, context.onScriptError, 'error');

            return {
                node: node,
                id: node && node.getAttribute('data-requiremodule')
            };
        }

        function intakeDefines() {
            var args;

            //Any defined modules in the global queue, intake them now.
            takeGlobalQueue();

            //Make sure any remaining defQueue items get properly processed.
            while (defQueue.length) {
                args = defQueue.shift();
                if (args[0] === null) {
                    return onError(makeError('mismatch', 'Mismatched anonymous define() module: ' + args[args.length - 1]));
                } else {
                    //args are id, deps, factory. Should be normalized by the
                    //define() function.
                    callGetModule(args);
                }
            }
        }

        context = {
            config: config,
            contextName: contextName,
            registry: registry,
            defined: defined,
            urlFetched: urlFetched,
            defQueue: defQueue,
            Module: Module,
            makeModuleMap: makeModuleMap,
            nextTick: req.nextTick,
            onError: onError,

            /**
             * Set a configuration for the context.
             * @param {Object} cfg config object to integrate.
             */
            configure: function (cfg) {
                //Make sure the baseUrl ends in a slash.
                if (cfg.baseUrl) {
                    if (cfg.baseUrl.charAt(cfg.baseUrl.length - 1) !== '/') {
                        cfg.baseUrl += '/';
                    }
                }

                //Save off the paths since they require special processing,
                //they are additive.
                var shim = config.shim,
                    objs = {
                        paths: true,
                        bundles: true,
                        config: true,
                        map: true
                    };

                eachProp(cfg, function (value, prop) {
                    if (objs[prop]) {
                        if (!config[prop]) {
                            config[prop] = {};
                        }
                        mixin(config[prop], value, true, true);
                    } else {
                        config[prop] = value;
                    }
                });

                //Reverse map the bundles
                if (cfg.bundles) {
                    eachProp(cfg.bundles, function (value, prop) {
                        each(value, function (v) {
                            if (v !== prop) {
                                bundlesMap[v] = prop;
                            }
                        });
                    });
                }

                //Merge shim
                if (cfg.shim) {
                    eachProp(cfg.shim, function (value, id) {
                        //Normalize the structure
                        if (isArray(value)) {
                            value = {
                                deps: value
                            };
                        }
                        if ((value.exports || value.init) && !value.exportsFn) {
                            value.exportsFn = context.makeShimExports(value);
                        }
                        shim[id] = value;
                    });
                    config.shim = shim;
                }

                //Adjust packages if necessary.
                if (cfg.packages) {
                    each(cfg.packages, function (pkgObj) {
                        var location, name;

                        pkgObj = typeof pkgObj === 'string' ? { name: pkgObj } : pkgObj;

                        name = pkgObj.name;
                        location = pkgObj.location;
                        if (location) {
                            config.paths[name] = pkgObj.location;
                        }

                        //Save pointer to main module ID for pkg name.
                        //Remove leading dot in main, so main paths are normalized,
                        //and remove any trailing .js, since different package
                        //envs have different conventions: some use a module name,
                        //some use a file name.
                        config.pkgs[name] = pkgObj.name + '/' + (pkgObj.main || 'main')
                                     .replace(currDirRegExp, '')
                                     .replace(jsSuffixRegExp, '');
                    });
                }

                //If there are any "waiting to execute" modules in the registry,
                //update the maps for them, since their info, like URLs to load,
                //may have changed.
                eachProp(registry, function (mod, id) {
                    //If module already has init called, since it is too
                    //late to modify them, and ignore unnormalized ones
                    //since they are transient.
                    if (!mod.inited && !mod.map.unnormalized) {
                        mod.map = makeModuleMap(id);
                    }
                });

                //If a deps array or a config callback is specified, then call
                //require with those args. This is useful when require is defined as a
                //config object before require.js is loaded.
                if (cfg.deps || cfg.callback) {
                    context.require(cfg.deps || [], cfg.callback);
                }
            },

            makeShimExports: function (value) {
                function fn() {
                    var ret;
                    if (value.init) {
                        ret = value.init.apply(global, arguments);
                    }
                    return ret || (value.exports && getGlobal(value.exports));
                }
                return fn;
            },

            makeRequire: function (relMap, options) {
                options = options || {};

                function localRequire(deps, callback, errback) {
                    var id, map, requireMod;

                    if (options.enableBuildCallback && callback && isFunction(callback)) {
                        callback.__requireJsBuild = true;
                    }

                    if (typeof deps === 'string') {
                        if (isFunction(callback)) {
                            //Invalid call
                            return onError(makeError('requireargs', 'Invalid require call'), errback);
                        }

                        //If require|exports|module are requested, get the
                        //value for them from the special handlers. Caveat:
                        //this only works while module is being defined.
                        if (relMap && hasProp(handlers, deps)) {
                            return handlers[deps](registry[relMap.id]);
                        }

                        //Synchronous access to one module. If require.get is
                        //available (as in the Node adapter), prefer that.
                        if (req.get) {
                            return req.get(context, deps, relMap, localRequire);
                        }

                        //Normalize module name, if it contains . or ..
                        map = makeModuleMap(deps, relMap, false, true);
                        id = map.id;

                        if (!hasProp(defined, id)) {
                            return onError(makeError('notloaded', 'Module name "' +
                                        id +
                                        '" has not been loaded yet for context: ' +
                                        contextName +
                                        (relMap ? '' : '. Use require([])')));
                        }
                        return defined[id];
                    }

                    //Grab defines waiting in the global queue.
                    intakeDefines();

                    //Mark all the dependencies as needing to be loaded.
                    context.nextTick(function () {
                        //Some defines could have been added since the
                        //require call, collect them.
                        intakeDefines();

                        requireMod = getModule(makeModuleMap(null, relMap));

                        //Store if map config should be applied to this require
                        //call for dependencies.
                        requireMod.skipMap = options.skipMap;

                        requireMod.init(deps, callback, errback, {
                            enabled: true
                        });

                        checkLoaded();
                    });

                    return localRequire;
                }

                mixin(localRequire, {
                    isBrowser: isBrowser,

                    /**
                     * Converts a module name + .extension into an URL path.
                     * *Requires* the use of a module name. It does not support using
                     * plain URLs like nameToUrl.
                     */
                    toUrl: function (moduleNamePlusExt) {
                        var ext,
                            index = moduleNamePlusExt.lastIndexOf('.'),
                            segment = moduleNamePlusExt.split('/')[0],
                            isRelative = segment === '.' || segment === '..';

                        //Have a file extension alias, and it is not the
                        //dots from a relative path.
                        if (index !== -1 && (!isRelative || index > 1)) {
                            ext = moduleNamePlusExt.substring(index, moduleNamePlusExt.length);
                            moduleNamePlusExt = moduleNamePlusExt.substring(0, index);
                        }

                        return context.nameToUrl(normalize(moduleNamePlusExt,
                                                relMap && relMap.id, true), ext,  true);
                    },

                    defined: function (id) {
                        return hasProp(defined, makeModuleMap(id, relMap, false, true).id);
                    },

                    specified: function (id) {
                        id = makeModuleMap(id, relMap, false, true).id;
                        return hasProp(defined, id) || hasProp(registry, id);
                    }
                });

                //Only allow undef on top level require calls
                if (!relMap) {
                    localRequire.undef = function (id) {
                        //Bind any waiting define() calls to this context,
                        //fix for #408
                        takeGlobalQueue();

                        var map = makeModuleMap(id, relMap, true),
                            mod = getOwn(registry, id);

                        removeScript(id);

                        delete defined[id];
                        delete urlFetched[map.url];
                        delete undefEvents[id];

                        //Clean queued defines too. Go backwards
                        //in array so that the splices do not
                        //mess up the iteration.
                        eachReverse(defQueue, function(args, i) {
                            if(args[0] === id) {
                                defQueue.splice(i, 1);
                            }
                        });

                        if (mod) {
                            //Hold on to listeners in case the
                            //module will be attempted to be reloaded
                            //using a different config.
                            if (mod.events.defined) {
                                undefEvents[id] = mod.events;
                            }

                            cleanRegistry(id);
                        }
                    };
                }

                return localRequire;
            },

            /**
             * Called to enable a module if it is still in the registry
             * awaiting enablement. A second arg, parent, the parent module,
             * is passed in for context, when this method is overridden by
             * the optimizer. Not shown here to keep code compact.
             */
            enable: function (depMap) {
                var mod = getOwn(registry, depMap.id);
                if (mod) {
                    getModule(depMap).enable();
                }
            },

            /**
             * Internal method used by environment adapters to complete a load event.
             * A load event could be a script load or just a load pass from a synchronous
             * load call.
             * @param {String} moduleName the name of the module to potentially complete.
             */
            completeLoad: function (moduleName) {
                var found, args, mod,
                    shim = getOwn(config.shim, moduleName) || {},
                    shExports = shim.exports;

                takeGlobalQueue();

                while (defQueue.length) {
                    args = defQueue.shift();
                    if (args[0] === null) {
                        args[0] = moduleName;
                        //If already found an anonymous module and bound it
                        //to this name, then this is some other anon module
                        //waiting for its completeLoad to fire.
                        if (found) {
                            break;
                        }
                        found = true;
                    } else if (args[0] === moduleName) {
                        //Found matching define call for this script!
                        found = true;
                    }

                    callGetModule(args);
                }

                //Do this after the cycle of callGetModule in case the result
                //of those calls/init calls changes the registry.
                mod = getOwn(registry, moduleName);

                if (!found && !hasProp(defined, moduleName) && mod && !mod.inited) {
                    if (config.enforceDefine && (!shExports || !getGlobal(shExports))) {
                        if (hasPathFallback(moduleName)) {
                            return;
                        } else {
                            return onError(makeError('nodefine',
                                             'No define call for ' + moduleName,
                                             null,
                                             [moduleName]));
                        }
                    } else {
                        //A script that does not call define(), so just simulate
                        //the call for it.
                        callGetModule([moduleName, (shim.deps || []), shim.exportsFn]);
                    }
                }

                checkLoaded();
            },

            /**
             * Converts a module name to a file path. Supports cases where
             * moduleName may actually be just an URL.
             * Note that it **does not** call normalize on the moduleName,
             * it is assumed to have already been normalized. This is an
             * internal API, not a public one. Use toUrl for the public API.
             */
            nameToUrl: function (moduleName, ext, skipExt) {
                var paths, syms, i, parentModule, url,
                    parentPath, bundleId,
                    pkgMain = getOwn(config.pkgs, moduleName);

                if (pkgMain) {
                    moduleName = pkgMain;
                }

                bundleId = getOwn(bundlesMap, moduleName);

                if (bundleId) {
                    return context.nameToUrl(bundleId, ext, skipExt);
                }

                //If a colon is in the URL, it indicates a protocol is used and it is just
                //an URL to a file, or if it starts with a slash, contains a query arg (i.e. ?)
                //or ends with .js, then assume the user meant to use an url and not a module id.
                //The slash is important for protocol-less URLs as well as full paths.
                if (req.jsExtRegExp.test(moduleName)) {
                    //Just a plain path, not module name lookup, so just return it.
                    //Add extension if it is included. This is a bit wonky, only non-.js things pass
                    //an extension, this method probably needs to be reworked.
                    url = moduleName + (ext || '');
                } else {
                    //A module that needs to be converted to a path.
                    paths = config.paths;

                    syms = moduleName.split('/');
                    //For each module name segment, see if there is a path
                    //registered for it. Start with most specific name
                    //and work up from it.
                    for (i = syms.length; i > 0; i -= 1) {
                        parentModule = syms.slice(0, i).join('/');

                        parentPath = getOwn(paths, parentModule);
                        if (parentPath) {
                            //If an array, it means there are a few choices,
                            //Choose the one that is desired
                            if (isArray(parentPath)) {
                                parentPath = parentPath[0];
                            }
                            syms.splice(0, i, parentPath);
                            break;
                        }
                    }

                    //Join the path parts together, then figure out if baseUrl is needed.
                    url = syms.join('/');
                    url += (ext || (/^data\:|\?/.test(url) || skipExt ? '' : '.js'));
                    url = (url.charAt(0) === '/' || url.match(/^[\w\+\.\-]+:/) ? '' : config.baseUrl) + url;
                }

                return config.urlArgs ? url +
                                        ((url.indexOf('?') === -1 ? '?' : '&') +
                                         config.urlArgs) : url;
            },

            //Delegates to req.load. Broken out as a separate function to
            //allow overriding in the optimizer.
            load: function (id, url) {
                req.load(context, id, url);
            },

            /**
             * Executes a module callback function. Broken out as a separate function
             * solely to allow the build system to sequence the files in the built
             * layer in the right sequence.
             *
             * @private
             */
            execCb: function (name, callback, args, exports) {
                return callback.apply(exports, args);
            },

            /**
             * callback for script loads, used to check status of loading.
             *
             * @param {Event} evt the event from the browser for the script
             * that was loaded.
             */
            onScriptLoad: function (evt) {
                //Using currentTarget instead of target for Firefox 2.0's sake. Not
                //all old browsers will be supported, but this one was easy enough
                //to support and still makes sense.
                if (evt.type === 'load' ||
                        (readyRegExp.test((evt.currentTarget || evt.srcElement).readyState))) {
                    //Reset interactive script so a script node is not held onto for
                    //to long.
                    interactiveScript = null;

                    //Pull out the name of the module and the context.
                    var data = getScriptData(evt);
                    context.completeLoad(data.id);
                }
            },

            /**
             * Callback for script errors.
             */
            onScriptError: function (evt) {
                var data = getScriptData(evt);
                if (!hasPathFallback(data.id)) {
                    return onError(makeError('scripterror', 'Script error for: ' + data.id, evt, [data.id]));
                }
            }
        };

        context.require = context.makeRequire();
        return context;
    }

    /**
     * Main entry point.
     *
     * If the only argument to require is a string, then the module that
     * is represented by that string is fetched for the appropriate context.
     *
     * If the first argument is an array, then it will be treated as an array
     * of dependency string names to fetch. An optional function callback can
     * be specified to execute when all of those dependencies are available.
     *
     * Make a local req variable to help Caja compliance (it assumes things
     * on a require that are not standardized), and to give a short
     * name for minification/local scope use.
     */
    req = requirejs = function (deps, callback, errback, optional) {

        //Find the right context, use default
        var context, config,
            contextName = defContextName;

        // Determine if have config object in the call.
        if (!isArray(deps) && typeof deps !== 'string') {
            // deps is a config object
            config = deps;
            if (isArray(callback)) {
                // Adjust args if there are dependencies
                deps = callback;
                callback = errback;
                errback = optional;
            } else {
                deps = [];
            }
        }

        if (config && config.context) {
            contextName = config.context;
        }

        context = getOwn(contexts, contextName);
        if (!context) {
            context = contexts[contextName] = req.s.newContext(contextName);
        }

        if (config) {
            context.configure(config);
        }

        return context.require(deps, callback, errback);
    };

    /**
     * Support require.config() to make it easier to cooperate with other
     * AMD loaders on globally agreed names.
     */
    req.config = function (config) {
        return req(config);
    };

    /**
     * Execute something after the current tick
     * of the event loop. Override for other envs
     * that have a better solution than setTimeout.
     * @param  {Function} fn function to execute later.
     */
    req.nextTick = typeof setTimeout !== 'undefined' ? function (fn) {
        setTimeout(fn, 4);
    } : function (fn) { fn(); };

    /**
     * Export require as a global, but only if it does not already exist.
     */
    if (!require) {
        require = req;
    }

    req.version = version;

    //Used to filter out dependencies that are already paths.
    req.jsExtRegExp = /^\/|:|\?|\.js$/;
    req.isBrowser = isBrowser;
    s = req.s = {
        contexts: contexts,
        newContext: newContext
    };

    //Create default context.
    req({});

    //Exports some context-sensitive methods on global require.
    each([
        'toUrl',
        'undef',
        'defined',
        'specified'
    ], function (prop) {
        //Reference from contexts instead of early binding to default context,
        //so that during builds, the latest instance of the default context
        //with its config gets used.
        req[prop] = function () {
            var ctx = contexts[defContextName];
            return ctx.require[prop].apply(ctx, arguments);
        };
    });

    if (isBrowser) {
        head = s.head = document.getElementsByTagName('head')[0];
        //If BASE tag is in play, using appendChild is a problem for IE6.
        //When that browser dies, this can be removed. Details in this jQuery bug:
        //http://dev.jquery.com/ticket/2709
        baseElement = document.getElementsByTagName('base')[0];
        if (baseElement) {
            head = s.head = baseElement.parentNode;
        }
    }

    /**
     * Any errors that require explicitly generates will be passed to this
     * function. Intercept/override it if you want custom error handling.
     * @param {Error} err the error object.
     */
    req.onError = defaultOnError;

    /**
     * Creates the node for the load command. Only used in browser envs.
     */
    req.createNode = function (config, moduleName, url) {
        var node = config.xhtml ?
                document.createElementNS('http://www.w3.org/1999/xhtml', 'html:script') :
                document.createElement('script');
        node.type = config.scriptType || 'text/javascript';
        node.charset = 'utf-8';
        node.async = true;
        return node;
    };

    /**
     * Does the request to load a module for the browser case.
     * Make this a separate function to allow other environments
     * to override it.
     *
     * @param {Object} context the require context to find state.
     * @param {String} moduleName the name of the module.
     * @param {Object} url the URL to the module.
     */
    req.load = function (context, moduleName, url) {
        var config = (context && context.config) || {},
            node;
        if (isBrowser) {
            //In the browser so use a script tag
            node = req.createNode(config, moduleName, url);

            node.setAttribute('data-requirecontext', context.contextName);
            node.setAttribute('data-requiremodule', moduleName);

            //Set up load listener. Test attachEvent first because IE9 has
            //a subtle issue in its addEventListener and script onload firings
            //that do not match the behavior of all other browsers with
            //addEventListener support, which fire the onload event for a
            //script right after the script execution. See:
            //https://connect.microsoft.com/IE/feedback/details/648057/script-onload-event-is-not-fired-immediately-after-script-execution
            //UNFORTUNATELY Opera implements attachEvent but does not follow the script
            //script execution mode.
            if (node.attachEvent &&
                    //Check if node.attachEvent is artificially added by custom script or
                    //natively supported by browser
                    //read https://github.com/jrburke/requirejs/issues/187
                    //if we can NOT find [native code] then it must NOT natively supported.
                    //in IE8, node.attachEvent does not have toString()
                    //Note the test for "[native code" with no closing brace, see:
                    //https://github.com/jrburke/requirejs/issues/273
                    !(node.attachEvent.toString && node.attachEvent.toString().indexOf('[native code') < 0) &&
                    !isOpera) {
                //Probably IE. IE (at least 6-8) do not fire
                //script onload right after executing the script, so
                //we cannot tie the anonymous define call to a name.
                //However, IE reports the script as being in 'interactive'
                //readyState at the time of the define call.
                useInteractive = true;

                node.attachEvent('onreadystatechange', context.onScriptLoad);
                //It would be great to add an error handler here to catch
                //404s in IE9+. However, onreadystatechange will fire before
                //the error handler, so that does not help. If addEventListener
                //is used, then IE will fire error before load, but we cannot
                //use that pathway given the connect.microsoft.com issue
                //mentioned above about not doing the 'script execute,
                //then fire the script load event listener before execute
                //next script' that other browsers do.
                //Best hope: IE10 fixes the issues,
                //and then destroys all installs of IE 6-9.
                //node.attachEvent('onerror', context.onScriptError);
            } else {
                node.addEventListener('load', context.onScriptLoad, false);
                node.addEventListener('error', context.onScriptError, false);
            }
            node.src = url;

            //For some cache cases in IE 6-8, the script executes before the end
            //of the appendChild execution, so to tie an anonymous define
            //call to the module name (which is stored on the node), hold on
            //to a reference to this node, but clear after the DOM insertion.
            currentlyAddingScript = node;
            if (baseElement) {
                head.insertBefore(node, baseElement);
            } else {
                head.appendChild(node);
            }
            currentlyAddingScript = null;

            return node;
        } else if (isWebWorker) {
            try {
                //In a web worker, use importScripts. This is not a very
                //efficient use of importScripts, importScripts will block until
                //its script is downloaded and evaluated. However, if web workers
                //are in play, the expectation that a build has been done so that
                //only one script needs to be loaded anyway. This may need to be
                //reevaluated if other use cases become common.
                importScripts(url);

                //Account for anonymous modules
                context.completeLoad(moduleName);
            } catch (e) {
                context.onError(makeError('importscripts',
                                'importScripts failed for ' +
                                    moduleName + ' at ' + url,
                                e,
                                [moduleName]));
            }
        }
    };

    function getInteractiveScript() {
        if (interactiveScript && interactiveScript.readyState === 'interactive') {
            return interactiveScript;
        }

        eachReverse(scripts(), function (script) {
            if (script.readyState === 'interactive') {
                return (interactiveScript = script);
            }
        });
        return interactiveScript;
    }

    //Look for a data-main script attribute, which could also adjust the baseUrl.
    if (isBrowser && !cfg.skipDataMain) {
        //Figure out baseUrl. Get it from the script tag with require.js in it.
        eachReverse(scripts(), function (script) {
            //Set the 'head' where we can append children by
            //using the script's parent.
            if (!head) {
                head = script.parentNode;
            }

            //Look for a data-main attribute to set main script for the page
            //to load. If it is there, the path to data main becomes the
            //baseUrl, if it is not already set.
            dataMain = script.getAttribute('data-main');
            if (dataMain) {
                //Preserve dataMain in case it is a path (i.e. contains '?')
                mainScript = dataMain;

                //Set final baseUrl if there is not already an explicit one.
                if (!cfg.baseUrl) {
                    //Pull off the directory of data-main for use as the
                    //baseUrl.
                    src = mainScript.split('/');
                    mainScript = src.pop();
                    subPath = src.length ? src.join('/')  + '/' : './';

                    cfg.baseUrl = subPath;
                }

                //Strip off any trailing .js since mainScript is now
                //like a module name.
                mainScript = mainScript.replace(jsSuffixRegExp, '');

                 //If mainScript is still a path, fall back to dataMain
                if (req.jsExtRegExp.test(mainScript)) {
                    mainScript = dataMain;
                }

                //Put the data-main script in the files to load.
                cfg.deps = cfg.deps ? cfg.deps.concat(mainScript) : [mainScript];

                return true;
            }
        });
    }

    /**
     * The function that handles definitions of modules. Differs from
     * require() in that a string for the module should be the first argument,
     * and the function to execute after dependencies are loaded should
     * return a value to define the module corresponding to the first argument's
     * name.
     */
    define = function (name, deps, callback) {
        var node, context;

        //Allow for anonymous modules
        if (typeof name !== 'string') {
            //Adjust args appropriately
            callback = deps;
            deps = name;
            name = null;
        }

        //This module may not have dependencies
        if (!isArray(deps)) {
            callback = deps;
            deps = null;
        }

        //If no name, and callback is a function, then figure out if it a
        //CommonJS thing with dependencies.
        if (!deps && isFunction(callback)) {
            deps = [];
            //Remove comments from the callback string,
            //look for require calls, and pull them into the dependencies,
            //but only if there are function args.
            if (callback.length) {
                callback
                    .toString()
                    .replace(commentRegExp, '')
                    .replace(cjsRequireRegExp, function (match, dep) {
                        deps.push(dep);
                    });

                //May be a CommonJS thing even without require calls, but still
                //could use exports, and module. Avoid doing exports and module
                //work though if it just needs require.
                //REQUIRES the function to expect the CommonJS variables in the
                //order listed below.
                deps = (callback.length === 1 ? ['require'] : ['require', 'exports', 'module']).concat(deps);
            }
        }

        //If in IE 6-8 and hit an anonymous define() call, do the interactive
        //work.
        if (useInteractive) {
            node = currentlyAddingScript || getInteractiveScript();
            if (node) {
                if (!name) {
                    name = node.getAttribute('data-requiremodule');
                }
                context = contexts[node.getAttribute('data-requirecontext')];
            }
        }

        //Always save off evaluating the def call until the script onload handler.
        //This allows multiple modules to be in a file without prematurely
        //tracing dependencies, and allows for anonymous module support,
        //where the module name is not known until the script onload event
        //occurs. If no context, use the global queue, and get it processed
        //in the onscript load callback.
        (context ? context.defQueue : globalDefQueue).push([name, deps, callback]);
    };

    define.amd = {
        jQuery: true
    };


    /**
     * Executes the text. Normally just uses eval, but can be modified
     * to use a better, environment-specific call. Only used for transpiling
     * loader plugins, not for plain JS modules.
     * @param {String} text the text to execute/evaluate.
     */
    req.exec = function (text) {
        /*jslint evil: true */
        return eval(text);
    };

    //Set up with config info.
    req(cfg);
}(this));

define("node_modules/requirejs/require", function(){});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define('util/assert',[],function () {
	

	var assert = function (cond, msg) {
		if( !cond ) {
			var error = new Error(msg || "ASSERT failed");

			console.log("Throwing", error.stack);
			console.log();
			
			throw error;
		}
	};

	return assert;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */


/*
 * -------- EVENT DIASPATCHER -------
 */

define('eventDispatcher',[], function () {
    var EventDispatcher = function () {
        this._eventList = {};
    };

    EventDispatcher.prototype = {
        _eventList: null,
        _getEvent: function (eventName, create) {
            // Check if Array of Event Handlers has been created
            if (!this._eventList[eventName]) {

                // Check if the calling method wants to create the Array
                // if not created. This reduces unneeded memory usage.
                if (!create) {
                    return null;
                }

                // Create the Array of Event Handlers
                this._eventList[eventName] = [];
                // new Array
            }

            // return the Array of Event Handlers already added
            return this._eventList[eventName];
        },
        addEventListener: function (eventName, handler) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName, true);

            // Add the new Event Handler to the Array
            evt.push(handler);
        },
        removeEventListener: function (eventName, handler) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName);

            if (!evt) {
                return;
            }

            // Helper Method - an Array.indexOf equivalent
            var getArrayIndex = function (array, item) {
                for (var i = 0; i < array.length; i++) {
                    if (array[i] === item) {
                        return i;
                    }
                }
                return -1;
            };

            // Get the Array index of the Event Handler
            var index = getArrayIndex(evt, handler);

            if (index > -1) {
                // Remove Event Handler from Array
                evt.splice(index, 1);
            }
        },
        removeAllEventListeners: function (eventName) {
            // Get the Array of Event Handlers
            var evt = this._getEvent(eventName);

            if (!evt) {
                return;
            }

            evt.splice(0, evt.length);
        },
        dispatchEvent: function (eventName, eventArgs) {
            // Get a function that will call all the Event Handlers internally
            var handler = this._getEventHandler(eventName);
            if (handler) {
                // call the handler function
                // Pass in "sender" and "eventArgs" parameters
                handler(this, eventArgs);
            }
        },
        _getEventHandler: function (eventName) {
            // Get Event Handler Array for this Event
            var evt = this._getEvent(eventName, false);
            if (!evt || evt.length === 0) {
                return null;
            }

            // Create the Handler method that will use currying to
            // call all the Events Handlers internally
            var h = function (sender, args) {
                for (var i = 0; i < evt.length; i++) {
                    evt[i](sender, args);
                }
            };

            // Return this new Handler method
            return h;
        }
    };

    return EventDispatcher;
});
/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Tamas Kecskes
 */

define('util/guid',[],function () {
	

	var guid = function () {
		var S4 = function () {
                return (((1 + Math.random()) * 0x10000) | 0).toString(16).substring(1);
            };

            //return GUID
            return (S4() + S4() + "-" + S4() + "-" + S4() + "-" + S4() + "-" + S4() + S4() + S4());
	};

	return guid;
});
define('util/zssha1',[],function(){
    function SHA1() {

        this.pp = function (b, a) {
            return b << a | b >>> 32 - a
        };

        this.oo = function (l, a, k, b, c) {
            try{
                return l.charCodeAt(a * 64 + k * 4 + b) << c
            } catch(e){}
        };

        this.getHash = function(l) {

            l += "";
            for (var n = Math, c = [1518500249, 1859775393, 2400959708, 3395469782, 1732584193, 4023233417, 2562383102, 271733878, 3285377520, 4294967295], s = n.ceil(l.length / 4) + 2, q = n.ceil(s / 16), g = [], a = 0, h = [], j, d, e, f, m, i, b, k; a < q; a++) {
                g[a] = [];
                for (k = 0; k < 16; k++) {
                    g[a][k] = this.oo(l, a, k, 0, 24) | this.oo(l, a, k, 1, 16) | this.oo(l, a, k, 2, 8) | this.oo(l, a, k, 3, 0)
                }
            }
            i = l.length * 8 - 8;
            a = q - 1;
            g[a][14] = i / (c[9] + 1);
            g[a][14] = n.floor(g[a][14]);
            g[a][15] = i & c[9];
            for (a = 0; a < q; a++) {
                for (b = 0; b < 16; b++)h[b] = g[a][b];
                for (b = 16; b < 80; b++)h[b] = this.pp(h[b - 3] ^ h[b - 8] ^ h[b - 14] ^ h[b - 16], 1);
                j = c[4];
                d = c[5];
                e = c[6];
                f = c[7];
                m = c[8];
                for (b = 0; b < 80; b++) {
                    var r = n.floor(b / 20), t = this.pp(j, 5) + (r < 1 ? d & e ^ ~d & f : r == 2 ? d & e ^ d & f ^ e & f : d ^ e ^ f) + m + c[r] + h[b] & c[9];
                    m = f;
                    f = e;
                    e = this.pp(d, 30);
                    d = j;
                    j = t
                }
                c[4] += j;
                c[5] += d;
                c[6] += e;
                c[7] += f;
                c[8] += m
            }
            i = "";
            for (z = 4; z < 9; z++)
                for (a = 7; a >= 0; a--)
                    i += ((c[z] & c[9]) >>> a * 4 & 15).toString(16);
            return i
        };
    }

    return SHA1;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define('core/future',[], function () {
	

	var maxDepth = 5;

	var ASSERT = function (cond) {
		if (!cond) {
			var error = new Error("future assertion failed");
			console.log(error.stack);
			throw error;
		}
	};

	// ------- Future -------

	var UNRESOLVED = {};

	var Future = function () {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;
	};

	var setValue = function (future, value) {
		ASSERT(future instanceof Future && future.value === UNRESOLVED);

		if (value instanceof Future) {
			setListener(value, setValue, future);
		} else {
			future.value = value;

			if (future.listener !== null) {
				future.listener(future.param, value);
			}
		}
	};

	var setListener = function (future, listener, param) {
		ASSERT(future instanceof Future && future.listener === null && future.value === UNRESOLVED);
		ASSERT(typeof listener === "function" && listener.length === 2);

		future.listener = listener;
		future.param = param;

		if (future.value !== UNRESOLVED) {
			listener(param, future);
		}
	};

	var isUnresolved = function (value) {
		return (value instanceof Future) && value.value === UNRESOLVED;
	};

	var getValue = function (value) {
		if (value instanceof Future) {
			if (value.value instanceof Error) {
				throw value.value;
			} else if (value.value !== UNRESOLVED) {
				return value.value;
			}
		}
		return value;
	};

	// ------- adapt

	var adapt = function (func) {
		ASSERT(typeof func === "function");

		return function adaptx () {
			var args = arguments;
			var future = new Future();

			args[args.length++] = function adaptCallback (error, value) {
				if (error) {
					value = error instanceof Error ? error : new Error(error);
				} else {
					ASSERT(!(value instanceof Error));
				}
				setValue(future, value);
			};

			func.apply(this, args);

			return getValue(future);
		};
	};

	var unadapt = function (func) {
		ASSERT(typeof func === "function");

		if (func.length === 0) {
			return function unadapt0 (callback) {
				var value;
				try {
					value = func.call(this);
				} catch (error) {
					callback(error);
					return;
				}
				then(value, callback);
			};
		} else if (func.length === 1) {
			return function unadapt1 (arg, callback) {
				var value;
				try {
					value = func.call(this, arg);
				} catch (error) {
					callback(error);
					return;
				}
				then(value, callback);
			};
		} else {
			return function unadaptx () {
				var args = arguments;

				var callback = args[--args.length];
				ASSERT(typeof callback === "function");

				var value;
				try {
					value = func.apply(this, args);
				} catch (error) {
					callback(error);
					return;
				}
				then(value, callback);
			};
		}
	};

	var delay = function (delay, value) {
		var future = new Future();
		setTimeout(setValue, delay, future, value);
		return future;
	};

	// ------- call -------

	var Func = function (func, that, args, index) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.func = func;
		this.that = that;
		this.args = args;
		this.index = index;

		setListener(args[index], setArgument, this);
	};

	Func.prototype = Future.prototype;

	var setArgument = function (future, value) {
		if (!(value instanceof Error)) {
			try {
				var args = future.args;
				args[future.index] = value;

				while (++future.index < args.length) {
					value = args[future.index];
					if (isUnresolved(value)) {
						setListener(value, setArgument, future);
						return;
					} else {
						args[future.index] = getValue(value);
					}
				}

				value = future.func.apply(future.that, args);
				ASSERT(!(value instanceof Error));
			} catch (error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var call = function () {
		var args = arguments;

		var func = args[--args.length];
		ASSERT(typeof func === "function");

		for ( var i = 0; i < args.length; ++i) {
			if (isUnresolved(args[i])) {
				return new Func(func, this, args, i);
			} else {
				args[i] = getValue(args[i]);
			}
		}
		return func.apply(this, args);
	};

	// ------- join -------

	var Join = function (first, second) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.missing = 2;
		setListener(first, setJoinand, this);
		setListener(second, setJoinand, this);
	};

	Join.prototype = Object.create(Future.prototype);

	var setJoinand = function (future, value) {
		if (value instanceof Error) {
			setValue(future, value);
		} else if (--future.missing <= 0) {
			setValue(future, undefined);
		}
	};

	var join = function (first, second) {
		if (getValue(first) instanceof Future) {
			if (getValue(second) instanceof Future) {
				if (first instanceof Join) {
					first.missing += 1;
					setListener(second, setJoinand, first);
					return first;
				} else if (second instanceof Join) {
					second.missing += 1;
					setListener(first, setJoinand, second);
					return second;
				} else {
					return new Join(first, second);
				}
			} else {
				return first;
			}
		} else {
			return getValue(second);
		}
	};

	// ------- hide -------

	var Hide = function (future, handler) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.handler = handler;
		setListener(future, hideValue, this);
	};

	Hide.prototype = Future.prototype;

	var hideValue = function (future, value) {
		try {
			if (value instanceof Error) {
				value = future.handler(value);
			}
		} catch (error) {
			value = error instanceof Error ? error : new Error(error);
		}

		setValue(future, value);
	};

	var printStack = function (error) {
		console.log(error.stack);
	};

	var hide = function (future, handler) {
		if (typeof handler !== "function") {
			handler = printStack;
		}

		if (isUnresolved(future)) {
			return new Hide(future, handler);
		} else if (future.value instanceof Error) {
			return handler(future.value);
		} else {
			return getValue(future);
		}
	};

	// ------- array -------

	var Arr = function (array, index) {
		this.value = UNRESOLVED;
		this.listener = null;
		this.param = null;

		this.array = array;
		this.index = index;

		setListener(array[index], setMember, this);
	};

	Arr.prototype = Future.prototype;

	var setMember = function (future, value) {
		if (!(value instanceof Error)) {
			try {
				var array = future.array;
				array[future.index] = value;

				while (++future.index < array.length) {
					value = array[future.index];
					if (isUnresolved(value)) {
						setListener(value, setMember, future);
						return;
					} else {
						array[future.index] = getValue(value);
					}
				}

				value = array;
			} catch (error) {
				value = error instanceof Error ? error : new Error(error);
			}
		}

		setValue(future, value);
	};

	var array = function (array) {
		ASSERT(array instanceof Array);

		for ( var i = 0; i < array.length; ++i) {
			if (isUnresolved(array[i])) {
				return new Arr(array, i);
			}
		}

		return array;
	};

	// ------- then -------

	var thenHandler = function (callback, value) {
		if (value instanceof Error) {
			callback(value);
		} else {
			callback(null, value);
		}
	};

	var calldepth = 0;
	var then = function (future, callback) {
		var error = null, value;

		if (!(future instanceof Future)) {
			value = future;
		} else if (future.value === UNRESOLVED) {
			setListener(future, thenHandler, callback);
			return;
		} else if (future.value instanceof Error) {
			error = future.value;
		} else {
			value = future.value;
		}

		if (calldepth < maxDepth) {
			++calldepth;
			try {
				callback(error, value);
			} catch (err) {
				console.log("unhandled error from callback", err);
			}
			--calldepth;
		} else {
			setTimeout(callback, 0, error, value);
		}
	};

	// -------

	return {
		adapt: adapt,
		unadapt: unadapt,
		delay: delay,
		call: call,
		array: array,
		join: join,
		hide: hide,
		then: then
	};
});

/**
 * The MIT License (MIT)
 * Copyright (c) 2013, Miklos Maroti
 */

(function () {
	

	// ------- assert -------

	var TASYNC_TRACE_ENABLE = true;

	function setTrace (value) {
		TASYNC_TRACE_ENABLE = value;
	}

	function assert (cond) {
		if (!cond) {
			throw new Error("tasync internal error");
		}
	}

	// ------- Future -------

	var STATE_LISTEN = 0;
	var STATE_REJECTED = 1;
	var STATE_RESOLVED = 2;

	var Future = function () {
		this.state = STATE_LISTEN;
		this.value = [];
	};

	Future.prototype.register = function (target) {
		assert(this.state === STATE_LISTEN);
		assert(typeof target === "object" && target !== null);

		this.value.push(target);
	};

	Future.prototype.resolve = function (value) {
		assert(this.state === STATE_LISTEN && !(value instanceof Future));

		var listeners = this.value;

		this.state = STATE_RESOLVED;
		this.value = value;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onResolved(value);
		}
	};

	Future.prototype.reject = function (error) {
		assert(this.state === STATE_LISTEN && error instanceof Error);

		var listeners = this.value;

		this.state = STATE_REJECTED;
		this.value = error;

		var i;
		for (i = 0; i < listeners.length; ++i) {
			listeners[i].onRejected(error);
		}
	};

	// ------- Delay -------

	function delay (timeout, value) {
		if (timeout < 0) {
			return value;
		}

		var future = new Future();
		setTimeout(function () {
			future.resolve(value);
		}, timeout);
		return future;
	}

	// ------- Lift -------

	var FutureLift = function (array, index) {
		Future.call(this);

		this.array = array;
		this.index = index;
	};

	FutureLift.prototype = Object.create(Future.prototype);

	FutureLift.prototype.onResolved = function (value) {
		assert(this.state === STATE_LISTEN);

		var array = this.array;
		array[this.index] = value;

		while (++this.index < array.length) {
			value = array[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		this.array = null;
		this.resolve(array);
	};

	FutureLift.prototype.onRejected = function (error) {
		this.array = null;
		this.reject(error);
	};

	var lift = function (array) {
		if (!(array instanceof Array)) {
			throw new Error("array argument is expected");
		}

		var index;
		for (index = 0; index < array.length; ++index) {
			var value = array[index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					array[index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					var future = new FutureLift(array, index);
					value.register(future);
					return future;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		return array;
	};

	// ------- Apply -------

	var ROOT = {
		subframes: 0
	};

	var FRAME = ROOT;

	var FutureApply = function tasync_trace_end (func, that, args, index) {
		Future.call(this);

		this.caller = FRAME;
		this.position = ++FRAME.subframes;
		this.subframes = 0;

		if (TASYNC_TRACE_ENABLE) {
			this.trace = new Error();
		}

		this.func = func;
		this.that = that;
		this.args = args;
		this.index = index;
	};

	FutureApply.prototype = Object.create(Future.prototype);

	FutureApply.prototype.getPath = function () {
		var future = this.caller, path = [ this.position ];

		while (future !== ROOT) {
			path.push(future.position);
			future = future.caller;
		}

		return path;
	};

	function getSlice (trace) {
		assert(typeof trace === "string");

		var end = trace.indexOf("tasync_trace_start");
		if (end >= 0) {
			end = trace.lastIndexOf("\n", end) + 1;
		} else {
			if (trace.charAt(trace.length - 1) !== "\n") {
				// trace += "\n";
			}
			end = undefined;
		}

		var start = trace.indexOf("tasync_trace_end");
		if (start >= 0) {
			start = trace.indexOf("\n", start) + 1;
			if (start >= 0) {
				start = trace.indexOf("\n", start) + 1;
			}
		} else {
			start = 0;
		}

		return trace.substring(start, end);
	}

	function createError (error, future) {
		if (!(error instanceof Error)) {
			error = new Error(error);
		}

		if (TASYNC_TRACE_ENABLE) {
			error.trace = getSlice(error.stack);
			do {
				error.trace += "*** callback ***\n";
				error.trace += getSlice(future.trace.stack);
				future = future.caller;
			} while (future !== ROOT);
		}

		return error;
	}

	FutureApply.prototype.onRejected = function (error) {
		this.args = null;
		this.reject(error);
	};

	FutureApply.prototype.onResolved = function tasync_trace_start (value) {
		assert(this.state === STATE_LISTEN);

		var args = this.args;
		args[this.index] = value;

		while (--this.index >= 0) {
			value = args[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					args[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		assert(FRAME === ROOT);
		FRAME = this;

		this.args = null;
		try {
			value = this.func.apply(this.that, args);
		} catch (error) {
			FRAME = ROOT;

			this.reject(createError(error, this));
			return;
		}

		FRAME = ROOT;

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);

			this.onResolved = this.resolve;
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	var apply = function (func, args, that) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		} else if (!(args instanceof Array)) {
			throw new Error("array argument is expected");
		}

		var index = args.length;
		while (--index >= 0) {
			var value = args[index];
			if (value instanceof Future) {
				if (value.state === STATE_LISTEN) {
					var future = new FutureApply(func, that, args, index);
					value.register(future);
					return future;
				} else if (value.state === STATE_RESOLVED) {
					args[index] = value.value;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		return func.apply(that, args);
	};

	// ------- Call -------

	var FutureCall = function tasync_trace_end (args, index) {
		Future.call(this);

		this.caller = FRAME;
		this.position = ++FRAME.subframes;
		this.subframes = 0;

		if (TASYNC_TRACE_ENABLE) {
			this.trace = new Error();
		}

		this.args = args;
		this.index = index;
	};

	FutureCall.prototype = Object.create(Future.prototype);

	FutureCall.prototype.getPath = FutureApply.prototype.getPath;
	FutureCall.prototype.onRejected = FutureApply.prototype.onRejected;

	var FUNCTION_CALL = Function.call;

	FutureCall.prototype.onResolved = function tasync_trace_start (value) {
		assert(this.state === STATE_LISTEN);

		var args = this.args;
		args[this.index] = value;

		while (--this.index >= 0) {
			value = args[this.index];
			if (value instanceof Future) {
				if (value.state === STATE_RESOLVED) {
					args[this.index] = value.value;
				} else if (value.state === STATE_LISTEN) {
					value.register(this);
					return;
				} else {
					assert(value.state === STATE_REJECTED);
					this.reject(value.value);
					return;
				}
			}
		}

		assert(FRAME === ROOT);
		FRAME = this;

		this.args = null;
		try {
			var func = args[0];
			args[0] = null;
			value = FUNCTION_CALL.apply(func, args);
		} catch (error) {
			FRAME = ROOT;

			this.reject(createError(error, this));
			return;
		}

		FRAME = ROOT;

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);

			this.onResolved = this.resolve;
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	var call = function () {
		var index = arguments.length;
		while (--index >= 0) {
			var value = arguments[index];
			if (value instanceof Future) {
				if (value.state === STATE_LISTEN) {
					var future = new FutureCall(arguments, index);
					value.register(future);
					return future;
				} else if (value.state === STATE_RESOLVED) {
					arguments[index] = value.value;
				} else {
					assert(value.state === STATE_REJECTED);
					return value;
				}
			}
		}

		var func = arguments[0];
		return FUNCTION_CALL.apply(func, arguments);
	};

	// ------- TryCatch -------

	function FutureTryCatch (handler) {
		Future.call(this);

		this.handler = handler;
	}

	FutureTryCatch.prototype = Object.create(Future.prototype);

	FutureTryCatch.prototype.onRejected = function (error) {
		try {
			var value = this.handler(error);

			if (value instanceof Future) {
				this.onRejected = Future.prorotype.reject;
				value.register(this);
			} else {
				this.resolve(value);
			}
		} catch (err) {
			this.reject(err);
		}
	};

	FutureTryCatch.prototype.onResolved = Future.prototype.resolve;

	function trycatch (func, handler) {
		if (typeof func !== "function" || typeof handler !== "function") {
			throw new Error("function arguments are expected");
		}

		try {
			var value = func();

			if (value instanceof Future) {
				var future = new FutureTryCatch(handler);
				value.register(future);

				return future;
			} else {
				return value;
			}
		} catch (error) {
			return handler(error);
		}
	}

	// ------- Wrap -------

	function wrap (func) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		}

		if (typeof func.tasync_wraped === "undefined") {
			func.tasync_wraped = function () {
				var args = arguments;
				var future = new Future();

				args[args.length++] = function (error, value) {
					if (error) {
						future.reject(error instanceof Error ? error : new Error(error));
					} else {
						future.resolve(value);
					}
				};

				func.apply(this, args);

				if (future.state === STATE_LISTEN) {
					return future;
				} else if (future.state === STATE_RESOLVED) {
					return future.value;
				} else {
					assert(future.state === STATE_REJECTED);
					throw future.value;
				}
			};

			func.tasync_wraped.tasync_unwraped = func;
		}

		return func.tasync_wraped;
	}

	// ------- Unwrap -------

	function UnwrapListener (callback) {
		this.callback = callback;
	}

	UnwrapListener.prototype.onRejected = function (error) {
		this.callback(error);
	};

	UnwrapListener.prototype.onResolved = function (value) {
		this.callback(null, value);
	};

	function unwrap (func) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		}

		if (typeof func.tasync_unwraped === "undefined") {
			func.tasync_unwraped = function () {
				var args = arguments;

				var callback = args[--args.length];
				assert(typeof callback === "function");

				var value;
				try {
					value = func.apply(this, args);
				} catch (error) {
					callback(error);
					return;
				}

				if (value instanceof Future) {
					assert(value.state === STATE_LISTEN);

					var listener = new UnwrapListener(callback);
					value.register(listener);
				} else {
					callback(null, value);
				}
			};

			func.tasync_unwraped.tasync_wraped = func;
		}

		return func.tasync_unwraped;
	}

	// ------- Throttle -------

	function FutureThrottle (func, that, args) {
		Future.call(this);

		this.func = func;
		this.that = that;
		this.args = args;

		this.caller = FRAME;
		this.position = ++FRAME.subframes;

		this.path = this.getPath();
	}

	FutureThrottle.prototype = Object.create(Future.prototype);

	FutureThrottle.prototype.execute = function () {
		var value;
		try {
			assert(FRAME === ROOT);
			FRAME = this;

			value = this.func.apply(this.that, this.args);

			FRAME = ROOT;
		} catch (error) {
			FRAME = ROOT;

			this.reject(error);
			return;
		}

		if (value instanceof Future) {
			assert(value.state === STATE_LISTEN);
			value.register(this);
		} else {
			this.resolve(value);
		}
	};

	FutureThrottle.prototype.getPath = FutureApply.prototype.getPath;
	FutureThrottle.prototype.onResolved = Future.prototype.resolve;
	FutureThrottle.prototype.onRejected = Future.prototype.reject;

	FutureThrottle.prototype.compare = function (second) {
		var first = this.path;
		second = second.path;

		var i, limit = first.length < second.length ? first.length : second.length;
		for (i = 0; i < limit; ++i) {
			if (first[i] !== second[i]) {
				return first[i] - second[i];
			}
		}

		return first.length - second.length;
	};

	function ThrottleListener (limit) {
		this.running = 0;
		this.limit = limit;
		this.queue = [];
	}

	function priorityQueueInsert (queue, elem) {
		var low = 0;
		var high = queue.length;

		while (low < high) {
			var mid = Math.floor((low + high) / 2);
			assert(low <= mid && mid < high);

			if (elem.compare(queue[mid]) < 0) {
				low = mid + 1;
			} else {
				high = mid;
			}
		}

		queue.splice(low, 0, elem);
	}

	ThrottleListener.prototype.execute = function (func, that, args) {
		if (this.running < this.limit) {
			var value = func.apply(that, args);

			if (value instanceof Future) {
				assert(value.state === STATE_LISTEN);

				++this.running;
				value.register(this);
			}

			return value;
		} else {
			var future = new FutureThrottle(func, that, args);
			priorityQueueInsert(this.queue, future);

			return future;
		}
	};

	ThrottleListener.prototype.onResolved = function () {
		if (this.queue.length > 0) {
			var future = this.queue.pop();
			future.register(this);

			future.execute();
		} else {
			--this.running;
		}
	};

	ThrottleListener.prototype.onRejected = ThrottleListener.prototype.onResolved;

	// TODO: prevent recursion, otheriwise throttle will not work
	function throttle (func, limit) {
		if (typeof func !== "function") {
			throw new Error("function argument is expected");
		} else if (typeof limit !== "number") {
			throw new Error("number argument is expected");
		}

		var listener = new ThrottleListener(limit);

		return function () {
			return listener.execute(func, this, arguments);
		};
	}

	// ------- Join -------

	function FutureJoin (first) {
		Future.call(this);

		this.first = first;
		this.missing = first instanceof Future && first.state === STATE_LISTEN ? 1 : 0;
	}

	FutureJoin.prototype = Object.create(Future.prototype);

	FutureJoin.prototype.onResolved = function (value) {
		if (--this.missing === 0) {
			assert(this.state !== STATE_RESOLVED);

			if (this.state === STATE_LISTEN) {
				if (this.first instanceof Future) {
					assert(this.first.state === STATE_RESOLVED);

					this.resolve(this.first.value);
				} else {
					this.resolve(this.first);
				}
			}
		}
	};

	FutureJoin.prototype.onRejected = function (error) {
		if (this.state === STATE_LISTEN) {
			this.reject(error);
		}
	};

	function join (first, second) {
		if (first instanceof Future && first.state === STATE_REJECTED) {
			return first;
		} else if (second instanceof Future) {
			if (second.state === STATE_RESOLVED) {
				return first;
			} else if (second.state === STATE_REJECTED) {
				return second;
			}
		} else {
			return first;
		}

		if (!(first instanceof FutureJoin)) {
			first = new FutureJoin(first);
		}

		first.missing += 1;
		second.register(first);

		return first;
	}

	// ------- TASYNC -------

	var TASYNC = {
		setTrace: setTrace,
		delay: delay,
		lift: lift,
		apply: apply,
		call: call,
		trycatch: trycatch,
		wrap: wrap,
		unwrap: unwrap,
		throttle: throttle,
		join: join
	};

	if (typeof define === "function" && define.amd) {
		define('core/tasync',[], function () {
			return TASYNC;
		});
	} else {
		module.exports = TASYNC;
	}
}());

/* 2012 David Chambers <dc@hashify.me>  */
define('util/canon',[], function() {
    var CANON = {},
        keys, map, nativeMap, pad,
        __slice = [].slice,
        __hasProp = {}.hasOwnProperty;


    CANON.stringify = (function() {
        var canonicalize;
        canonicalize = function(value) {
            var pair, _ref;
            switch (Object.prototype.toString.call(value)) {
                case '[object Array]':
                    return ['Array'].concat(__slice.call(map(value, canonicalize)));
                case '[object Date]':
                    return ['Date'].concat(isFinite(+value) ? value.getUTCFullYear() + '-' + pad(value.getUTCMonth() + 1) + '-' + pad(value.getUTCDate()) + 'T' + pad(value.getUTCHours()) + ':' + pad(value.getUTCMinutes()) + ':' + pad(value.getUTCSeconds()) + '.' + pad(value.getUTCMilliseconds(), 3) + 'Z' : null);
                case '[object Function]':
                    throw new TypeError('functions cannot be serialized');
                    break;
                case '[object Number]':
                    if (isFinite(value)) {
                        return value;
                    } else {
                        return ['Number', "" + value];
                    }
                    break;
                case '[object Object]':
                    pair = function(key) {
                        return [key, canonicalize(value[key])];
                    };
                    return (_ref = ['Object']).concat.apply(_ref, map(keys(value).sort(), pair));
                case '[object RegExp]':
                    return ['RegExp', "" + value];
                case '[object Undefined]':
                    return ['Undefined'];
                default:
                    return value;
            }
        };
        return function(value) {
            return JSON.stringify(canonicalize(value));
        };
    })();

    CANON.parse = (function() {
        var canonicalize;
        canonicalize = function(value) {
            var element, elements, idx, object, what, _i, _ref;
            if (Object.prototype.toString.call(value) !== '[object Array]') {
                return value;
            }
            what = value[0], elements = 2 <= value.length ? __slice.call(value, 1) : [];
            element = elements[0];
            switch (what) {
                case 'Array':
                    return map(elements, canonicalize);
                case 'Date':
                    return new Date(element);
                case 'Number':
                    return +element;
                case 'Object':
                    object = {};
                    for (idx = _i = 0, _ref = elements.length; _i < _ref; idx = _i += 2) {
                        object[elements[idx]] = canonicalize(elements[idx + 1]);
                    }
                    return object;
                case 'RegExp':
                    return (function(func, args, ctor) {
                        ctor.prototype = func.prototype;
                        var child = new ctor, result = func.apply(child, args);
                        return Object(result) === result ? result : child;
                    })(RegExp, /^[/](.+)[/]([gimy]*)$/.exec(element).slice(1), function(){});
                case 'Undefined':
                    return void 0;
                default:
                    throw new Error('invalid input');
            }
        };
        return function(string) {
            return canonicalize(JSON.parse(string));
        };
    })();

    nativeMap = Array.prototype.map;

    map = function(array, iterator) {
        var el, _i, _len, _results;
        if (nativeMap && array.map === nativeMap) {
            return array.map(iterator);
        } else {
            _results = [];
            for (_i = 0, _len = array.length; _i < _len; _i++) {
                el = array[_i];
                _results.push(iterator(el));
            }
            return _results;
        }
    };

    keys = Object.keys || function(object) {
        var key, _results;
        _results = [];
        for (key in object) {
            if (!__hasProp.call(object, key)) continue;
            _results.push(key);
        }
        return _results;
    };

    pad = function(n, min) {
        if (min == null) {
            min = 2;
        }
        return ("" + (1000 + n)).substr(4 - min);
    };

    return CANON;

});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Miklos Maroti
 */

define('core/coretree',[ "util/assert", "util/zssha1", "core/future", "core/tasync", 'util/canon' ], function (ASSERT, ZSSHA1, FUTURE, TASYNC, CANON) {
	

	var HASH_REGEXP = new RegExp("#[0-9a-f]{40}");
	var isValidHash = function (key) {
		return typeof key === "string" && key.length === 41 && HASH_REGEXP.test(key);
	};

	var SHA = new ZSSHA1();

	var MAX_RELID = Math.pow(2, 31);
	var createRelid = function (data) {
		ASSERT(data && typeof data === "object");

		var relid;
		do {
			relid = Math.floor(Math.random() * MAX_RELID);
			// relid = relid.toString();
		} while (data[relid] !== undefined);

		return "" + relid;
	};

	// make relids deterministic
	if (false) {
		var nextRelid = 0;
		createRelid = function (data) {
			ASSERT(data && typeof data === "object");

			var relid;
			do {
				relid = (nextRelid += -1);
			} while (data[relid] !== undefined);

			return "" + relid;
		};
	}

	var rootCounter = 0;

	return function (storage, options) {
		var MAX_AGE = (options && options.maxage) || 3;
		var MAX_TICKS = (options && options.maxticks) || 2000;
		var MAX_MUTATE = (options && options.maxmutate) || 30000;
		var autopersist = (options && options.autopersist) || false;

		var ID_NAME = storage.ID_NAME;
		var EMPTY_DATA = {};

		var roots = [];
		var ticks = 0;

		storage.loadObject = TASYNC.wrap(storage.loadObject);
		storage.insertObject = FUTURE.adapt(storage.insertObject);
		storage.fsyncDatabase = FUTURE.adapt(storage.fsyncDatabase);

		// ------- static methods

		var getParent = function (node) {
			ASSERT(typeof node.parent === "object");

			return node.parent;
		};

		var getRelid = function (node) {
			ASSERT(node.relid === null || typeof node.relid === "string");

			return node.relid;
		};

		var getLevel = function (node) {
			var level = 0;
			while (node.parent !== null) {
				++level;
				node = node.parent;
			}
			return level;
		};

		var getRoot = function (node) {
			while (node.parent !== null) {
				node = node.parent;
			}
			return node;
		};

		var getPath = function (node, base) {
			if (node === null) {
				return null;
			}

			var path = "";
			while (node.relid !== null && node !== base) {
				path = "/" + node.relid + path;
				node = node.parent;
			}
			return path;
		};

		var isValidPath = function (path) {
			return typeof path === "string" && (path === "" || path.charAt(0) === "/");
		};

		var splitPath = function (path) {
			ASSERT(isValidPath(path));

			path = path.split("/");
			path.splice(0, 1);

			return path;
		};

		var buildPath = function (path) {
			ASSERT(path instanceof Array);

			return path.length === 0 ? "" : "/" + path.join("/");
		};

		var joinPaths = function (first, second) {
			ASSERT(isValidPath(first) && isValidPath(second));

			return first + second;
		};

        var getCommonPathPrefixData = function (first, second) {
            ASSERT(typeof first === "string" && typeof second === "string");

            first = splitPath(first);
            second = splitPath(second);

            var common = [];
            for (var i = 0; first[i] === second[i] && i < first.length; ++i) {
                common.push(first[i]);
            }

            return {
                common: buildPath(common),
                first: buildPath(first.slice(i)),
                firstLength: first.length - i,
                second: buildPath(second.slice(i)),
                secondLength: second.length - i
            };
        };

		// ------- memory management

		var __detachChildren = function (node) {
			ASSERT(node.children instanceof Array && node.age >= MAX_AGE - 1);

			var children = node.children;
			node.children = null;
			node.age = MAX_AGE;

			for (var i = 0; i < children.length; ++i) {
				__detachChildren(children[i]);
			}
		};

		var __ageNodes = function (nodes) {
			ASSERT(nodes instanceof Array);

			var i = nodes.length;
			while (--i >= 0) {
				var node = nodes[i];

				ASSERT(node.age < MAX_AGE);
				if (++node.age >= MAX_AGE) {
					nodes.splice(i, 1);
					__detachChildren(node);
				} else {
					__ageNodes(node.children);
				}
			}
		};

		var __ageRoots = function () {
			if (++ticks >= MAX_TICKS) {
				ticks = 0;
				__ageNodes(roots);
			}
		};

		var __getChildNode = function (children, relid) {
			ASSERT(children instanceof Array && typeof relid === "string");

			for (var i = 0; i < children.length; ++i) {
				var child = children[i];
				if (child.relid === relid) {
					ASSERT(child.parent.age === 0);

					child.age = 0;
					return child;
				}
			}

			return null;
		};

		var __getChildData = function (data, relid) {
			ASSERT(typeof relid === "string");

			if (typeof data === "object" && data !== null) {
				data = data[relid];
				return typeof data === "undefined" ? EMPTY_DATA : data;
			} else {
				return null;
			}
		};

		var normalize = function (node) {
			ASSERT(isValidNode(node));
			// console.log("normalize start", printNode(getRoot(node)));

			var parent;

			if (node.children === null) {
				ASSERT(node.age === MAX_AGE);

				if (node.parent !== null) {
					parent = normalize(node.parent);

					var temp = __getChildNode(parent.children, node.relid);
					if (temp !== null) {
						// TODO: make the current node close to the returned one

						// console.log("normalize end1",
						// printNode(getRoot(temp)));
						return temp;
					}

					ASSERT(node.parent.children === null || __getChildNode(node.parent.children, node.relid) === null);
					ASSERT(__getChildNode(parent.children, node.relid) === null);

					node.parent = parent;
					parent.children.push(node);

					temp = __getChildData(parent.data, node.relid);
					if (!isValidHash(temp) || temp !== __getChildData(node.data, ID_NAME)) {
						node.data = temp;
					}
				} else {
					roots.push(node);
				}

				node.age = 0;
				node.children = [];
			} else if (node.age !== 0) {
				parent = node;
				do {
					parent.age = 0;
					parent = parent.parent;
				} while (parent !== null && parent.age !== 0);
			}

			// console.log("normalize end2", printNode(getRoot(node)));
			return node;
		};

		// ------- hierarchy

		var getAncestor = function (first, second) {
			ASSERT(getRoot(first) === getRoot(second));

			first = normalize(first);
			second = normalize(second);

			var a = [];
			do {
				a.push(first);
				first = first.parent;
			} while (first !== null);

			var b = [];
			do {
				b.push(second);
				second = second.parent;
			} while (second !== null);

			var i = a.length - 1;
			var j = b.length - 1;
			while (i !== 0 && j !== 0 && a[i - 1] === b[j - 1]) {
				--i;
				--j;
			}

			ASSERT(a[i] === b[j]);
			return a[i];
		};

		var isAncestor = function (node, ancestor) {
			ASSERT(getRoot(node) === getRoot(ancestor));

			node = normalize(node);
			ancestor = normalize(ancestor);

			do {
				if (node === ancestor) {
					return true;
				}

				node = node.parent;
			} while (node !== null);

			return false;
		};

		var createRoot = function () {
			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: [],
				data: {
					_mutable: true
				},
				rootid: ++rootCounter
			};
			root.data[ID_NAME] = "";
			roots.push(root);

			__ageRoots();
			return root;
		};

		var getChild = function (node, relid) {
			ASSERT(typeof relid === "string" && relid !== ID_NAME);

			node = normalize(node);

			var child = __getChildNode(node.children, relid);
			if (child !== null) {
				return child;
			}

			child = {
				parent: node,
				relid: relid,
				age: 0,
				children: [],
				data: __getChildData(node.data, relid)
			};
			node.children.push(child);

			__ageRoots();
			return child;
		};

		var createChild = function (node) {
			node = normalize(node);

			if (typeof node.data !== "object" || node.data === null) {
				throw new Error("invalid node data");
			}

			var relid = createRelid(node.data);
			var child = {
				parent: node,
				relid: relid,
				age: 0,
				children: [],
				data: EMPTY_DATA
			};

			// TODO: make sure that it is not on the list
			node.children.push(child);

			__ageRoots();
			return child;
		};

		var getDescendant = function (node, head, base) {
			ASSERT(typeof base === "undefined" || isAncestor(head, base));

			node = normalize(node);
			head = normalize(head);
			base = typeof base === "undefined" ? null : normalize(base.parent);

			var path = [];
			while (head.parent !== base) {
				path.push(head.relid);
				head = head.parent;
			}

			var i = path.length;
			while (--i >= 0) {
				node = getChild(node, path[i]);
			}

			return node;
		};

		var getDescendantByPath = function (node, path) {
			ASSERT(path === "" || path.charAt(0) === "/");

			path = path.split("/");

			for (var i = 1; i < path.length; ++i) {
				node = getChild(node, path[i]);
			}

			return node;
		};

		// ------- data manipulation

		var __isMutableData = function (data) {
			return typeof data === "object" && data !== null && data._mutable === true;
		};

		var isMutable = function (node) {
			node = normalize(node);
			return __isMutableData(node.data);
		};

		var isObject = function (node) {
			node = normalize(node);
			return typeof node.data === "object" && node.data !== null;
		};

		var isEmpty = function (node) {
			node = normalize(node);
			if (typeof node.data !== "object" || node.data === null) {
				return false;
			} else if (node.data === EMPTY_DATA) {
				return true;
			}

			return __isEmptyData(node.data);
		};

		var __isEmptyData = function (data) {
			for (var keys in data) {
				return false;
			}
			return true;
		};

		var __areEquivalent = function (data1, data2) {
			return data1 === data2 || (typeof data1 === "string" && data1 === __getChildData(data2, ID_NAME)) || (__isEmptyData(data1) && __isEmptyData(data2));
		};

		var mutateCount = 0;
		var mutate = function (node) {
			ASSERT(isValidNode(node));

			node = normalize(node);
			var data = node.data;

			if (typeof data !== "object" || data === null) {
				return false;
			} else if (data._mutable === true) {
				return true;
			}

			// TODO: infinite cycle if MAX_MUTATE is smaller than depth!
			if (autopersist && ++mutateCount > MAX_MUTATE) {
				mutateCount = 0;

				for (var i = 0; i < roots.length; ++i) {
					if (__isMutableData(roots[i].data)) {
						__saveData(roots[i].data);
					}
				}
			}

			if (node.parent !== null && !mutate(node.parent)) {
				// this should never happen
				return false;
			}

			var copy = {
				_mutable: true
			};

			for (var key in data) {
				copy[key] = data[key];
			}

			ASSERT(copy._mutable === true);

			if (typeof data[ID_NAME] === "string") {
				copy[ID_NAME] = "";
			}

			if (node.parent !== null) {
				ASSERT(__areEquivalent(__getChildData(node.parent.data, node.relid), node.data));
				node.parent.data[node.relid] = copy;
			}

			node.data = copy;
			return true;
		};

		var getData = function (node) {
			node = normalize(node);

			ASSERT(!__isMutableData(node.data));
			return node.data;
		};

		var __reloadChildrenData = function (node) {
			for (var i = 0; i < node.children.length; ++i) {
				var child = node.children[i];

				var data = __getChildData(node.data, child.relid);
				if (!isValidHash(data) || data !== __getChildData(child.data, ID_NAME)) {
					child.data = data;
					__reloadChildrenData(child);
				}
			}
		};

		var setData = function (node, data) {
			ASSERT(data !== null && typeof data !== "undefined");

			node = normalize(node);
			if (node.parent !== null) {
				if (!mutate(node.parent)) {
					throw new Error("incorrect node data");
				}

				node.parent.data[node.relid] = data;
			}

			node.data = data;
			__reloadChildrenData(node);
		};

		var deleteData = function (node) {
			node = normalize(node);

			if (node.parent !== null) {
				if (!mutate(node.parent)) {
					throw new Error("incorrect node data");
				}

				delete node.parent.data[node.relid];
			}

			var data = node.data;

			node.data = EMPTY_DATA;
			__reloadChildrenData(node);

			return data;
		};

		var copyData = function (node) {
			node = normalize(node);

			if (typeof node.data !== "object" || node.data === null) {
				return node.data;
			}

			// TODO: return immutable data without coping
			return JSON.parse(JSON.stringify(node.data));
		};

		var getProperty = function (node, name) {
			ASSERT(typeof name === "string" && name !== ID_NAME);

			var data;
			node = normalize(node);

			if (typeof node.data === "object" && node.data !== null) {
				data = node.data[name];
			}

			// TODO: corerel uses getProperty to get the overlay content which can get mutable
			// ASSERT(!__isMutableData(data));
			return data;
		};

		var setProperty = function (node, name, data) {
			ASSERT(typeof name === "string" && name !== ID_NAME);
			ASSERT(!__isMutableData(data) /*&& data !== null*/ && data !== undefined); //TODO is the 'null' really can be a value of a property???

			node = normalize(node);
			if (!mutate(node)) {
				throw new Error("incorrect node data");
			}

			node.data[name] = data;

			var child = __getChildNode(node.children, name);
			if (child !== null) {
				child.data = data;
				__reloadChildrenData(child);
			}
		};

		var deleteProperty = function (node, name) {
			ASSERT(typeof name === "string" && name !== ID_NAME);

			node = normalize(node);
			if (!mutate(node)) {
				throw new Error("incorrect node data");
			}

			delete node.data[name];

			var child = __getChildNode(node.children, name);
			if (child !== null) {
				child.data = EMPTY_DATA;
				__reloadChildrenData(child);
			}
		};

		var noUnderscore = function (relid) {
			ASSERT(typeof relid === "string");
			return relid.charAt(0) !== "_";
		};

		var getKeys = function (node, predicate) {
			ASSERT(typeof predicate === "undefined" || typeof predicate === "function");

			node = normalize(node);
			predicate = predicate || noUnderscore;

			if (typeof node.data !== "object" || node.data === null) {
				return null;
			}

			var keys = Object.keys(node.data);

			var i = keys.length;
			while (--i >= 0 && !predicate(keys[i])) {
				keys.pop();
			}

			while (--i >= 0) {
				if (!predicate(keys[i])) {
					keys[i] = keys.pop();
				}
			}

			return keys;
		};

		// ------- persistence

		var getHash = function (node) {
			if (node === null) {
				return null;
			}

			var hash;
			node = normalize(node);
			if (typeof node.data === "object" && node.data !== null) {
				hash = node.data[ID_NAME];
			}

			ASSERT(typeof hash === "string" || typeof hash === "undefined");
			return hash;
		};

		var isHashed = function (node) {
			node = normalize(node);
			return typeof node.data === "object" && node.data !== null && typeof node.data[ID_NAME] === "string";
		};

		var setHashed = function (node, hashed) {
			ASSERT(typeof hashed === "boolean");

			node = normalize(node);
			if (!mutate(node)) {
				throw new Error("incorrect node data");
			}

			if (hashed) {
				node.data[ID_NAME] = "";
			} else {
				delete node.data[ID_NAME];
			}

			ASSERT(typeof node.children[ID_NAME] === "undefined");
		};

		var __saveData = function (data) {
			ASSERT(__isMutableData(data));

			var done = EMPTY_DATA;
			delete data._mutable;

			for (var relid in data) {
				var child = data[relid];
				if (__isMutableData(child)) {
					var sub = __saveData(child);
					if (sub === EMPTY_DATA) {
						delete data[relid];
					} else {
						done = FUTURE.join(done, sub);
						if (typeof child[ID_NAME] === "string") {
							data[relid] = child[ID_NAME];
						}
					}
				} else {
					done = undefined;
				}
			}

			if (done !== EMPTY_DATA) {
				var hash = data[ID_NAME];
				ASSERT(hash === "" || typeof hash === "undefined");

				if (hash === "") {
					hash = "#" + SHA.getHash(CANON.stringify(data));
					data[ID_NAME] = hash;

					done = FUTURE.join(done, storage.insertObject(data));
				}
			}

			return done;
		};

		var persist = function (node) {
			node = normalize(node);

			if (!__isMutableData(node.data)) {
				return false;
			}

			var done = __saveData(node.data);
			return FUTURE.join(done, storage.fsyncDatabase());
		};

		var loadRoot = function (hash) {
			ASSERT(isValidHash(hash));

			return TASYNC.call(__loadRoot2, storage.loadObject(hash));
		};

		var __loadRoot2 = function (data) {
			var root = {
				parent: null,
				relid: null,
				age: 0,
				children: [],
				data: data,
				rootid: ++rootCounter
			};
			roots.push(root);

			__ageRoots();
			return root;
		};

		var loadChild = function (node, relid) {
			ASSERT(isValidNode(node));

			node = getChild(node, relid);

			if (isValidHash(node.data)) {
				// TODO: this is a hack, we should avoid loading it multiple
				// times
				return TASYNC.call(__loadChild2, node, storage.loadObject(node.data));
			} else {
				return typeof node.data === "object" && node.data !== null ? node : null;
			}
		};

		var __loadChild2 = function (node, newdata) {
			node = normalize(node);

			// TODO: this is a hack, we should avoid loading it multiple times
			if (isValidHash(node.data)) {
				ASSERT(node.data === newdata[ID_NAME]);

				node.data = newdata;
				__reloadChildrenData(node);
			} else {
				// TODO: if this bites you, use the Cache
                /*if(node.data !== newdata){
                    console.log("kecso",node);
                }
				ASSERT(node.data === newdata);*/
			}

			return node;
		};

		var loadByPath = function (node, path) {
			ASSERT(isValidNode(node));
			ASSERT(path === "" || path.charAt(0) === "/");

			path = path.split("/");
			return __loadDescendantByPath2(node, path, 1);
		};

		var __loadDescendantByPath2 = function (node, path, index) {
			if (node === null || index === path.length) {
				return node;
			}

			var child = loadChild(node, path[index]);
			return TASYNC.call(__loadDescendantByPath2, child, path, index + 1);
		};

		// ------- valid -------

		var printNode = function (node) {
			var str = "{";
			str += "age:" + node.age;

			if (typeof node.relid === "string") {
				str += ", relid: \"" + node.relid + "\"";
			}

			str += ", children:";
			if (node.children === null) {
				str += "null";
			} else {
				str += "[";
				for (var i = 0; i < node.children.length; ++i) {
					if (i !== 0) {
						str += ", ";
					}
					str += printNode(node.children[i]);
				}
				str += "]";
			}

			str += "}";
			return str;
		};

		var __test = function (text, cond) {
			if (!cond) {
				throw new Error(text);
			}
		};

		var checkValidTree = function (node) {
			if (isValidNode(node)) {
				if (node.children instanceof Array) {
					for (var i = 0; i < node.children.length; ++i) {
						checkValidTree(node.children[i]);
					}
				}
			}
		};

		// disable checking for now
		var checkValidTreeRunning = true;

		var isValidNode = function (node) {
			try {
				__test("object", typeof node === "object" && node !== null);
				__test("object 2", node.hasOwnProperty("parent") && node.hasOwnProperty("relid"));
				__test("parent", typeof node.parent === "object");
				__test("relid", typeof node.relid === "string" || node.relid === null);
				__test("parent 2", (node.parent === null) === (node.relid === null));
				__test("age", node.age >= 0 && node.age <= MAX_AGE);
				__test("children", node.children === null || node.children instanceof Array);
				__test("children 2", (node.age === MAX_AGE) === (node.children === null));
				__test("data", typeof node.data === "object" || typeof node.data === "string" || typeof node.data === "number");

				if (node.parent !== null) {
					__test("age 2", node.age >= node.parent.age);
					__test("mutable", !__isMutableData(node.data) || __isMutableData(node.parent.data));
				}

				if (!checkValidTreeRunning) {
					checkValidTreeRunning = true;
					checkValidTree(getRoot(node));
					checkValidTreeRunning = false;
				}

				return true;
			} catch (error) {
				console.log("Wrong node", error.stack);
				return false;
			}
		};

		return {
			getParent: getParent,
			getRelid: getRelid,
			getLevel: getLevel,
			getRoot: getRoot,
			getPath: getPath,
			isValidPath: isValidPath,
			splitPath: splitPath,
			buildPath: buildPath,
			joinPaths: joinPaths,
			getCommonPathPrefixData: getCommonPathPrefixData,

			normalize: normalize,
			getAncestor: getAncestor,
			isAncestor: isAncestor,
			createRoot: createRoot,
			createChild: createChild,
			getChild: getChild,
			getDescendant: getDescendant,
			getDescendantByPath: getDescendantByPath,

			isMutable: isMutable,
			isObject: isObject,
			isEmpty: isEmpty,
			mutate: mutate,
			getData: getData,
			setData: setData,
			deleteData: deleteData,
			copyData: copyData,
			getProperty: getProperty,
			setProperty: setProperty,
			deleteProperty: deleteProperty,
			getKeys: getKeys,

			isHashed: isHashed,
			setHashed: setHashed,
			getHash: getHash,
			persist: TASYNC.wrap(FUTURE.unadapt(persist)),
			loadRoot: loadRoot,
			loadChild: loadChild,
			loadByPath: loadByPath,

			isValidNode: isValidNode
		};
	};
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Miklos Maroti
 */

define('core/corerel',[ "util/assert", "core/coretree", "core/tasync", "util/canon" ], function (ASSERT, CoreTree, TASYNC, CANON) {
	

	// ----------------- RELID -----------------

	var ATTRIBUTES = "atr";
	var REGISTRY = "reg";
	var OVERLAYS = "ovr";
	var COLLSUFFIX = "-inv";

	function isPointerName(name) {
		ASSERT(typeof name === "string");
        //TODO this is needed as now we work with modified data as well
        if(name === "_mutable"){
            return false;
        }
		return name.slice(-COLLSUFFIX.length) !== COLLSUFFIX;
	}

	function isValidRelid(relid) {
		return typeof relid === "string" && parseInt(relid, 10).toString() === relid;
	}

	function __test(text, cond) {
		if (!cond) {
			throw new Error(text);
		}
	}

	// ----------------- Core -----------------

	function CoreRel(coretree) {
		ASSERT(typeof coretree == "object");

		function isValidNode(node) {
			try {
				__test("coretree", coretree.isValidNode(node));
				__test("isobject", coretree.isObject(node));

				return true;
			} catch (error) {
				console.log("Wrong node", error.stack);
				return false;
			}
		}

		function getAttributeNames(node) {
			ASSERT(isValidNode(node));

			node = coretree.getChild(node, ATTRIBUTES);
			var keys = coretree.getKeys(node);
			var i = keys.length;
			while (--i >= 0) {
				if (keys[i].charAt(0) === "") {
					console.log("***** This happens?");
					keys.splice(i, 1);
				}
			}

			return keys;
		}

		function getRegistryNames(node) {
			ASSERT(isValidNode(node));

			node = coretree.getChild(node, REGISTRY);
			var keys = coretree.getKeys(node);
			var i = keys.length;
			while (--i >= 0) {
				if (keys[i].charAt(0) === "") {
					console.log("***** This happens?");
					keys.splice(i, 1);
				}
			}

			return keys;
		}

		function getAttribute(node, name) {
			node = coretree.getChild(node, ATTRIBUTES);
			return coretree.getProperty(node, name);
		}

		function delAttribute(node, name) {
			node = coretree.getChild(node, ATTRIBUTES);
			coretree.deleteProperty(node, name);
		}

		function setAttribute(node, name, value) {
			node = coretree.getChild(node, ATTRIBUTES);
			coretree.setProperty(node, name, value);
		}

		function getRegistry(node, name) {
			node = coretree.getChild(node, REGISTRY);
			return coretree.getProperty(node, name);
		}

		function delRegistry(node, name) {
			node = coretree.getChild(node, REGISTRY);
			coretree.deleteProperty(node, name);
		}

		function setRegistry(node, name, value) {
			node = coretree.getChild(node, REGISTRY);
			coretree.setProperty(node, name, value);
		}

		function overlayInsert(overlays, source, name, target) {
			ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
			ASSERT(coretree.isValidPath(source) && coretree.isValidPath(target) && isPointerName(name));
			ASSERT(coretree.getCommonPathPrefixData(source, target).common === "");

			// console.log("insert", overlays.parent.data.atr.name, source, name, target);

			var node = coretree.getChild(overlays, source);

			ASSERT(coretree.getProperty(node, name) === undefined);
			coretree.setProperty(node, name, target);

			node = coretree.getChild(overlays, target);
			name = name + COLLSUFFIX;

			var array = coretree.getProperty(node, name);
			if (array) {
				ASSERT(array.indexOf(source) < 0);

				array = array.slice(0);
				array.push(source);
				array.sort();
			} else {
				array = [ source ];
			}

			coretree.setProperty(node, name, array);
		}

		function overlayRemove(overlays, source, name, target) {
			ASSERT(isValidNode(overlays) && coretree.getRelid(overlays) === OVERLAYS);
			ASSERT(coretree.isValidPath(source) && coretree.isValidPath(target) && isPointerName(name));
			ASSERT(coretree.getCommonPathPrefixData(source, target).common === "");

			// console.log("remove", overlays.parent.data.atr.name, source, name, target);

			var node = coretree.getChild(overlays, source);
			ASSERT(node && coretree.getProperty(node, name) === target);
			coretree.deleteProperty(node, name);

			node = coretree.getChild(overlays, target);
			ASSERT(node);

			name = name + COLLSUFFIX;

			var array = coretree.getProperty(node, name);
			ASSERT(Array.isArray(array) && array.length >= 1);

			if (array.length === 1) {
				ASSERT(array[0] === source);

				coretree.deleteProperty(node, name);
			} else {
				var index = array.indexOf(source);
				ASSERT(index >= 0);

				array = array.slice(0);
				array.splice(index, 1);

				coretree.setProperty(node, name, array);
			}
		}

		function overlayQuery(overlays, prefix) {
			ASSERT(isValidNode(overlays) && coretree.isValidPath(prefix));

			var prefix2 = prefix + "/";
			var list = [];
			var paths = coretree.getKeys(overlays);

			for (var i = 0; i < paths.length; ++i) {
				var path = paths[i];
				if (path === prefix || path.substr(0, prefix2.length) === prefix2) {
					var node = coretree.getChild(overlays, path);
					var names = coretree.getKeys(node);
					for (var j = 0; j < names.length; ++j) {
						var name = names[j];
						if (isPointerName(name)) {
							list.push({
								s: path,
								n: name,
								t: coretree.getProperty(node, name),
								p: true
							});
						} else {
							var array = coretree.getProperty(node, name);
							ASSERT(Array.isArray(array));
							name = name.slice(0, -COLLSUFFIX.length);
							for (var k = 0; k < array.length; ++k) {
								list.push({
									s: array[k],
									n: name,
									t: path,
									p: false
								});
							}
						}
					}
				}
			}

			// console.log("query", overlays.parent.data.atr.name, prefix, list);

			return list;
		}

		function createNode(parameters) {
			parameters = parameters || {};
			var relid = parameters.relid,
				parent = parameters.parent;

			ASSERT(!parent || isValidNode(parent));
			ASSERT(!relid || typeof relid === 'string');

			var node;
			if (parent) {
				if (relid) {
					node = coretree.getChild(parent, relid);
				} else {
					node = coretree.createChild(parent);
				}
				coretree.setHashed(node, true);
			} else {
				node = coretree.createRoot();
			}

			return node;
		}

        function getDataForSingleHash(node) {
            ASSERT(isValidNode(node));

            var data = {
                attributes: coretree.getProperty(node, ATTRIBUTES),
                registry: coretree.getProperty(node, REGISTRY),
                children: coretree.getKeys(node)
            };
            var prefix = "";

            while (node) {
                var overlays = coretree.getChild(node, OVERLAYS);
                var rels = coretree.getProperty(overlays, prefix);
                data[prefix] = rels;

                prefix = "/" + coretree.getRelid(node) + prefix;
                node = coretree.getParent(node);
            }

            data = JSON.stringify(data);
            return data;
        }

		function deleteNode(node) {
			ASSERT(isValidNode(node));

			var parent = coretree.getParent(node);
			var prefix = "/" + coretree.getRelid(node);
			ASSERT(parent !== null);

			coretree.deleteProperty(parent, coretree.getRelid(node));

			while (parent) {
				var overlays = coretree.getChild(parent, OVERLAYS);

				var list = overlayQuery(overlays, prefix);
				for (var i = 0; i < list.length; ++i) {
					var entry = list[i];
					overlayRemove(overlays, entry.s, entry.n, entry.t);
				}

				prefix = "/" + coretree.getRelid(parent) + prefix;
				parent = coretree.getParent(parent);
			}
		}

		function copyNode(node, parent) {
			ASSERT(isValidNode(node));
			ASSERT(!parent || isValidNode(parent));

			node = coretree.normalize(node);
			var newNode;

			if (parent) {
				var ancestor = coretree.getAncestor(node, parent);

				// cannot copy inside of itself
				if (ancestor === node) {
					return null;
				}

				newNode = coretree.createChild(parent);
				coretree.setHashed(newNode, true);
				coretree.setData(newNode, coretree.copyData(node));

				var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
				var ancestorNewPath = coretree.getPath(newNode, ancestor);

				var base = coretree.getParent(node);
				var baseOldPath = "/" + coretree.getRelid(node);
				var aboveAncestor = 1;

				while (base) {
					var baseOverlays = coretree.getChild(base, OVERLAYS);
					var list = overlayQuery(baseOverlays, baseOldPath);
					var tempAncestor = coretree.getAncestor(base,ancestor);

					aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

					var relativePath = aboveAncestor < 0 ? coretree.getPath(base, ancestor) : coretree.getPath(ancestor, base);

					for (var i = 0; i < list.length; ++i) {
						var entry = list[i];

						if (entry.p) {
							ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
							ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === "/");

							var source, target, overlays;

							if (aboveAncestor < 0) {
								//below ancestor node - further from root
								source = ancestorNewPath + entry.s.substr(baseOldPath.length);
								target = coretree.joinPaths(relativePath, entry.t);
								overlays = ancestorOverlays;
							} else if (aboveAncestor === 0) {
								//at ancestor node
								var data = coretree.getCommonPathPrefixData(ancestorNewPath, entry.t);

								overlays = newNode;
								while (data.firstLength-- > 0) {
									overlays = coretree.getParent(overlays);
								}
								overlays = coretree.getChild(overlays, OVERLAYS);

								source = coretree.joinPaths(data.first, entry.s.substr(baseOldPath.length));
								target = data.second;
							} else {
								//above ancestor node - closer to root
								ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

								source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
								target = entry.t;
								overlays = baseOverlays;
							}

							overlayInsert(overlays, source, entry.n, target);
						}
					}

					baseOldPath = "/" + coretree.getRelid(base) + baseOldPath;
					base = coretree.getParent(base);
				}
			} else {
				newNode = coretree.createRoot();
				coretree.setData(newNode, coretree.copyData(node));
			}

			return newNode;
		}

        //kecso
        function copyNodes(nodes,parent){
            //copying multiple nodes at once for keeping their internal relations
            var paths = [],
                i, j,index,names,pointer,
                copiedNodes = [],
                internalRelationPaths=[]; //every single element will be an object with the internally pointing relations and the index of the target

            for(i=0;i<nodes.length;i++){
                paths.push(coretree.getPath(nodes[i]));
            }

            for(i=0;i<nodes.length;i++){
                names = getPointerNames(nodes[i]);
                pointer = {};
                for(j=0;j<names.length;j++){
                    index = paths.indexOf(getPointerPath(nodes[i],names[j]));
                    if(index !== -1){
                        pointer[names[j]] = index;
                    }
                }
                internalRelationPaths.push(pointer);
            }

            //now we use our simple copy
            for(i=0;i<nodes.length;i++){
                copiedNodes.push(copyNode(nodes[i],parent));
            }

            //and now back to the relations
            for(i=0;i<internalRelationPaths.length;i++){
                names = Object.keys(internalRelationPaths[i]);
                for(j=0;j<names.length;j++){
                    setPointer(copiedNodes[i],names[j],copiedNodes[internalRelationPaths[i][names[j]]]);
                }
            }

            return copiedNodes;
        }

		function moveNode(node, parent) {
			ASSERT(isValidNode(node) && isValidNode(parent));

			node = coretree.normalize(node);
			var ancestor = coretree.getAncestor(node, parent);

			// cannot move inside of itself
			if (ancestor === node) {
				return null;
			}

			var base = coretree.getParent(node);
			var baseOldPath = "/" + coretree.getRelid(node);
			var aboveAncestor = 1;

			var oldNode = node;
			node = coretree.getChild(parent, coretree.getRelid(oldNode));
			if (!coretree.isEmpty(node)) {
				// we have to change the relid of the node, to fit into its new
				// place...
				node = coretree.createChild(parent);
			}
			coretree.setHashed(node, true);
			coretree.setData(node, coretree.copyData(oldNode));

			var ancestorOverlays = coretree.getChild(ancestor, OVERLAYS);
			var ancestorNewPath = coretree.getPath(node, ancestor);

			while (base) {
				var baseOverlays = coretree.getChild(base, OVERLAYS);
				var list = overlayQuery(baseOverlays, baseOldPath);
				var tempAncestor = coretree.getAncestor(base,ancestor);

				aboveAncestor = (base === ancestor ? 0 : tempAncestor === base ? 1 : -1);

				var relativePath = aboveAncestor < 0 ? coretree.getPath(base, ancestor) : coretree.getPath(ancestor, base);

				for (var i = 0; i < list.length; ++i) {
					var entry = list[i];

					overlayRemove(baseOverlays, entry.s, entry.n, entry.t);

					var tmp;
					if (!entry.p) {
						tmp = entry.s;
						entry.s = entry.t;
						entry.t = tmp;
					}

					ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);
					ASSERT(entry.s === baseOldPath || entry.s.charAt(baseOldPath.length) === "/");

					var source, target, overlays;

					if (aboveAncestor < 0) {
						//below ancestor node
						source = ancestorNewPath + entry.s.substr(baseOldPath.length);
						target = coretree.joinPaths(relativePath, entry.t);
						overlays = ancestorOverlays;
					} else if (aboveAncestor === 0) {
						//at ancestor node
						var data = coretree.getCommonPathPrefixData(ancestorNewPath, entry.t);

						overlays = node;
						while (data.firstLength-- > 0) {
							overlays = coretree.getParent(overlays);
						}
						overlays = coretree.getChild(overlays, OVERLAYS);

						source = coretree.joinPaths(data.first, entry.s.substr(baseOldPath.length));
						target = data.second;
					} else {
						//above ancestor node
						ASSERT(entry.s.substr(0, baseOldPath.length) === baseOldPath);

						source = relativePath + ancestorNewPath + entry.s.substr(baseOldPath.length);
						target = entry.t;
						overlays = baseOverlays;
					}

					if (!entry.p) {
						tmp = entry.s;
						entry.s = entry.t;
						entry.t = tmp;

						tmp = source;
						source = target;
						target = tmp;
					}

					//console.log(source, target);
					overlayInsert(overlays, source, entry.n, target);
				}

				baseOldPath = "/" + coretree.getRelid(base) + baseOldPath;
				base = coretree.getParent(base);
			}

			deleteNode(oldNode);

			return node;
		}

		function getChildrenRelids(node) {
			ASSERT(isValidNode(node));

			return coretree.getKeys(node, isValidRelid);
		}

		function getChildrenPaths(node) {
			var path = coretree.getPath(node);

			var relids = getChildrenRelids(node);
			for (var i = 0; i < relids.length; ++i) {
				relids[i] = path + "/" + relids[i];
			}

			return relids;
		}

		function loadChildren(node) {
			ASSERT(isValidNode(node));

			var children = coretree.getKeys(node, isValidRelid);
			for (var i = 0; i < children.length; ++i) {
				children[i] = coretree.loadChild(node, children[i]);
			}

			return TASYNC.lift(children);
		}

		function getPointerNames(node) {
			ASSERT(isValidNode(node));

			var source = "";
			var names = [];

			do {
				var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), source);
				if (child) {
					for (var name in child) {
						ASSERT(names.indexOf(name) === -1);
						if (isPointerName(name)) {
							names.push(name);
						}
					}
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			return names;
		}

		function getPointerPath(node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";
			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if (child) {
					target = coretree.getProperty(child, name);
					if (target !== undefined) {
						break;
					}
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			if (target !== undefined) {
				ASSERT(node);
				target = coretree.joinPaths(coretree.getPath(node), target);
			}

			return target;
		}

		function hasPointer(node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if (child && coretree.getProperty(child, name) !== undefined) {
					return true;
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			return false;
		}

		function getOutsidePointerPath(node, name, source) {
			ASSERT(isValidNode(node) && typeof name === "string");
			ASSERT(typeof source === "string");

			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if (child) {
					target = coretree.getProperty(child, name);
					if (target !== undefined) {
						break;
					}
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			if (target !== undefined) {
				ASSERT(node);
				target = coretree.joinPaths(coretree.getPath(node), target);
			}

			return target;
		}

		function loadPointer(node, name) {
			ASSERT(isValidNode(node) && name);

			var source = "";
			var target;

			do {
				var child = coretree.getChild(node, OVERLAYS);
				ASSERT(child);

				child = coretree.getChild(child, source);
				if (child) {
					target = coretree.getProperty(child, name);
					if (target !== undefined) {
						break;
					}
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			if (target !== undefined) {
				ASSERT(typeof target === "string" && node);
				return coretree.loadByPath(node, target);
			} else {
				return null;
			}
		}

		function getCollectionNames(node) {
			ASSERT(isValidNode(node));

			var target = "";
			var names = [];

			do {
				var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), target);
				if (child) {
					for (var name in child) {
						if (!isPointerName(name)) {
							name = name.slice(0, -COLLSUFFIX.length);
							if (names.indexOf(name) < 0) {
								names.push(name);
							}
						}
					}
				}

				target = "/" + coretree.getRelid(node) + target;
				node = coretree.getParent(node);
			} while (node);

			return names;
		}

		function loadCollection(node, name) {
			ASSERT(isValidNode(node) && name);

			name += COLLSUFFIX;

			var collection = [];
			var target = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);

				child = coretree.getChild(child, target);
				if (child) {
					var sources = coretree.getProperty(child, name);
					if (sources) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						for (var i = 0; i < sources.length; ++i) {
							collection.push(coretree.loadByPath(node, sources[i]));
						}
					}
				}

				target = "/" + coretree.getRelid(node) + target;
				node = coretree.getParent(node);
			} while (node);

			return TASYNC.lift(collection);
		}

		function getCollectionPaths(node, name) {
			ASSERT(isValidNode(node) && name);

			name += COLLSUFFIX;

			var result = [];
			var target = "";

			do {
				var child = coretree.getChild(node, OVERLAYS);

				child = coretree.getChild(child, target);
				if (child) {
					var sources = coretree.getProperty(child, name);
					if (sources) {
						ASSERT(Array.isArray(sources) && sources.length >= 1);

						var prefix = coretree.getPath(node);

						for (var i = 0; i < sources.length; ++i) {
							result.push(coretree.joinPaths(prefix, sources[i]));
						}
					}
				}

				target = "/" + coretree.getRelid(node) + target;
				node = coretree.getParent(node);
			} while (node);

			return result;
		}

		function deletePointer(node, name) {
			ASSERT(isValidNode(node) && typeof name === "string");

			var source = "";

			do {
				var overlays = coretree.getChild(node, OVERLAYS);
				ASSERT(overlays);

				var target = coretree.getProperty(coretree.getChild(overlays, source), name);
				if (target !== undefined) {
					overlayRemove(overlays, source, name, target);
					return true;
				}

				source = "/" + coretree.getRelid(node) + source;
				node = coretree.getParent(node);
			} while (node);

			return false;
		}

		function setPointer(node, name, target) {
			ASSERT(isValidNode(node) && typeof name === "string" && (!target || isValidNode(target)));

			deletePointer(node, name);

			if (target) {
				var ancestor = coretree.getAncestor(node, target);

				var overlays = coretree.getChild(ancestor, OVERLAYS);
				var sourcePath = coretree.getPath(node, ancestor);
				var targetPath = coretree.getPath(target, ancestor);

				overlayInsert(overlays, sourcePath, name, targetPath);
			}
		}

		// copy everything from coretree
		var corerel = {};
		for( var key in coretree) {
			corerel[key] = coretree[key];
		}

		corerel.isValidNode = isValidNode;
		corerel.isValidRelid = isValidRelid;

		corerel.getChildrenRelids = getChildrenRelids;
		corerel.getChildrenPaths = getChildrenPaths;

		corerel.loadChildren = loadChildren;
		corerel.createNode = createNode;
		corerel.deleteNode = deleteNode;
		corerel.copyNode = copyNode;
        corerel.copyNodes = copyNodes;
		corerel.moveNode = moveNode;

		corerel.getAttributeNames = getAttributeNames;
		corerel.getAttribute = getAttribute;
		corerel.setAttribute = setAttribute;
		corerel.delAttribute = delAttribute;

		corerel.getRegistryNames = getRegistryNames;
		corerel.getRegistry = getRegistry;
		corerel.setRegistry = setRegistry;
		corerel.delRegistry = delRegistry;

		corerel.getPointerNames = getPointerNames;
		corerel.getPointerPath = getPointerPath;
		corerel.hasPointer = hasPointer;
		corerel.getOutsidePointerPath = getOutsidePointerPath;
		corerel.loadPointer = loadPointer;
		corerel.deletePointer = deletePointer;
		corerel.setPointer = setPointer;
		corerel.getCollectionNames = getCollectionNames;
		corerel.getCollectionPaths = getCollectionPaths;
		corerel.loadCollection = loadCollection;

        corerel.getDataForSingleHash = getDataForSingleHash;

		corerel.getCoreTree = function() {
			return coretree;
		};

		return corerel;
	}

	return CoreRel;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('core/setcore',[ "util/assert"], function (ASSERT) {
    

    var SETS_ID = '_sets';
    var REL_ID = 'member';

    function SetCore(innerCore){

        //help functions
        var setModified = function(node){
            innerCore.setRegistry(node,'_sets_',(innerCore.getRegistry(node,'_sets_') || 0)+1);
        };
        var getMemberPath = function(node,setElementNode){
            var ownPath = innerCore.getPath(node),
                memberPath = innerCore.getPointerPath(setElementNode,REL_ID);
            ownPath = ownPath.substring(0,ownPath.indexOf('/_')); //TODO this is a hack and should be solved some other way if possible
            if(ownPath !== memberPath){
                return memberPath;
            }

            //now we should check who really set this member as its own
            while(innerCore.getBase(node) !== null && innerCore.getBase(setElementNode) !== null && innerCore.getRegistry(innerCore.getBase(setElementNode),'_') === '_'){
                node = innerCore.getBase(node);
                setElementNode = innerCore.getBase(setElementNode);
                ownPath = innerCore.getPath(node);
                ownPath = ownPath.substring(0,ownPath.indexOf('/_')); //TODO this is a hack and should be solved some other way if possible
            }
            memberPath = innerCore.getPointerPath(setElementNode,REL_ID);


            return memberPath;

        };
        var getMemberRelId = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var elements = innerCore.getChildrenRelids(setNode);

            for(var i=0;i<elements.length;i++){
                if(getMemberPath(node,innerCore.getChild(setNode,elements[i])) === memberPath){
                    return elements[i];
                }
            }
            return null;
        };
        var createNewMemberRelid = function(setNode){
            var MAX_RELID = Math.pow(2, 31);
            var existingRelIds = innerCore.getChildrenRelids(setNode);
            var relid;
            do{
                relid = Math.floor(Math.random() * MAX_RELID);
            } while (existingRelIds.indexOf(relid) !== -1);
            return "" + relid;
        };

        //copy lower layer
        var setcore = {};
        for(var i in innerCore){
            setcore[i] = innerCore[i];
        }

        //adding new functions
        setcore.getSetNumbers = function(node){
            return this.getSetNames(node).length;
        };
        setcore.getSetNames = function(node){
            return  innerCore.getPointerNames(innerCore.getChild(node,SETS_ID))|| [];
        };
        setcore.getPointerNames = function(node){
            var sorted = [],
                raw = innerCore.getPointerNames(node);
            for(var i=0;i<raw.length;i++){
                if(raw[i].indexOf(REL_ID) === -1){
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };
        setcore.getCollectionNames = function(node){
            var sorted = [],
                raw = innerCore.getCollectionNames(node);
            for(var i=0;i<raw.length;i++){
                if(raw[i].indexOf(REL_ID) === -1){
                    sorted.push(raw[i]);
                }
            }
            return sorted;
        };
        setcore.getMemberPaths = function(node,setName){
            ASSERT(typeof setName === 'string');
            var setNode = innerCore.getChild(innerCore.getChild(node,SETS_ID),setName);
            var members = [];
            var elements = innerCore.getChildrenRelids(setNode);
            elements = elements.sort(); //TODO this should be removed at some point
            for(var i=0;i<elements.length;i++){
                var path = getMemberPath(node,innerCore.getChild(setNode,elements[i]));
                if(path){
                    members.push(path);
                }
            }
            return members;
        };
        setcore.delMember = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            //we only need the path of the member so we allow to enter only it
            if(typeof memberPath !== 'string'){
                memberPath = innerCore.getPath(memberPath);
            }

            var setMemberRelId = getMemberRelId(node,setName,memberPath);
            if(setMemberRelId){
                var setMemberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),setMemberRelId);
                innerCore.deleteNode(setMemberNode,true);
                setModified(node);
            }
        };
        setcore.addMember = function(node,setName,member){
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID);
            //TODO decide if the member addition should really create the set or it should fail...
            if(innerCore.getPointerPath(setsNode,setName) === undefined){
                setcore.createSet(node,setName);
            }
            var setNode = innerCore.getChild(setsNode,setName);
            var setMemberRelId = getMemberRelId(node,setName,setcore.getPath(member));
            if(setMemberRelId === null){
                var setMember =  innerCore.getChild(setNode,createNewMemberRelid(setNode));
                innerCore.setPointer(setMember,'member',member);
                innerCore.setRegistry(setMember,"_","_");//TODO hack, somehow the empty children have been removed during persist
                setModified(node);
            }
        };

        setcore.getMemberAttributeNames = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getAttributeNames(memberNode);
            }
            return [];
        };
        setcore.getMemberAttribute = function(node,setName,memberPath,attrName){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getAttribute(memberNode,attrName);
            }
        };
        setcore.setMemberAttribute = function(node,setName,memberPath,attrName,attrValue){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string' && attrValue !== undefined);
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.setAttribute(memberNode,attrName,attrValue);
                setModified(node);
            }
        };
        setcore.delMemberAttribute = function(node,setName,memberPath,attrName){
            ASSERT(typeof setName === 'string' && typeof attrName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delAttribute(memberNode,attrName);
                setModified(node);
            }
        };

        setcore.getMemberRegistryNames = function(node,setName,memberPath){
            ASSERT(typeof setName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getRegistryNames(memberNode);
            }
            return [];
        };
        setcore.getMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                return innerCore.getRegistry(memberNode,regName);
            }
        };
        setcore.setMemberRegistry = function(node,setName,memberPath,regName,regValue){
            ASSERT(typeof setName === 'string' && typeof regName === 'string' && regValue !== undefined);
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.setRegistry(memberNode,regName,regValue);
                setModified(node);
            }
        };
        setcore.delMemberRegistry = function(node,setName,memberPath,regName){
            ASSERT(typeof setName === 'string' && typeof regName === 'string');
            var memberRelId = getMemberRelId(node,setName,memberPath);
            if(memberRelId){
                var memberNode = innerCore.getChild(innerCore.getChild(innerCore.getChild(node,SETS_ID),setName),memberRelId);
                innerCore.delRegistry(memberNode,regName);
                setModified(node);
            }
        };
        setcore.createSet = function(node,setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID),
                setNode = innerCore.getChild(setsNode,setName);
            innerCore.setRegistry(setNode,"_","_");//TODO hack, somehow the empty children have been removed during persist
            innerCore.setPointer(innerCore.getChild(node,SETS_ID), setName, null);
            setModified(node);
        };
        setcore.deleteSet = function(node,setName) {
            ASSERT(typeof setName === 'string');
            var setsNode = innerCore.getChild(node,SETS_ID),
                setNode = innerCore.getChild(setsNode,setName);
            innerCore.deletePointer(setsNode,setName);
            innerCore.deleteNode(setNode,true);
            setModified(node);
        };

        setcore.isMemberOf = function(node){
            //TODO we should find a proper way to do this - or at least some support from lower layers would be fine
            var coll = setcore.getCollectionPaths(node,REL_ID);
            var sets = {};
            for(var i=0;i<coll.length;i++){
                var pathArray = coll[i].split('/');
                if(pathArray.indexOf('_meta') === -1){
                    //now we simply skip META sets...
                    var index = pathArray.indexOf(SETS_ID);
                    if(index>0 && pathArray.length>index+1){
                        //otherwise it is not a real set
                        var ownerPath = pathArray.slice(0,index).join('/');
                        if(sets[ownerPath] === undefined){
                            sets[ownerPath] = [];
                        }
                        sets[ownerPath].push(pathArray[index+1]);
                    }
                }
            }
            return sets;
        };

        setcore.getDataForSingleHash = function(node){
            ASSERT(setcore.isValidNode(node));
            var datas = innerCore.getDataForSingleHash(node);

            //now we should stir all the sets hashes into the node's hash to get changes deep inside
            var names = setcore.getSetNames(node);
            for(var i=0;i<names.length;i++){
                var setNode = setcore.getChild(setcore.getChild(node,SETS_ID),names[i]);
                var memberRelids = setcore.getChildrenRelids(setNode);
                for(var j=0;j<memberRelids.length;j++){
                    datas = datas.concat(innerCore.getDataForSingleHash(setcore.getChild(setNode,memberRelids[j])));
                }
            }

            return datas;
        };

        return setcore;

    }

    return SetCore;
});



/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('core/guidcore',[ "util/assert", "util/guid", "core/tasync" ], function (ASSERT, GUID, TASYNC) {
	

	var GUID_REGEXP = new RegExp("[a-z0-9]{8}(-[a-z0-9]{4}){3}-[a-z0-9]{12}", 'i');
    var OWN_GUID = "_relguid";

	function guidCore (_innerCore) {

		//helper functions
		function toInternalGuid (myGuid) {
			return myGuid.replace(/-/g, "");
		}

		function toExternalGuid (myGuid) {
			var out = myGuid.substr(0, 8) + '-' + myGuid.substr(8, 4) + '-' + myGuid.substr(12, 4) + '-' + myGuid.substr(16, 4) + '-' + myGuid.substr(20);
			return out;
		}

		function guidToArray (guid) {
            if(guid === null || guid === undefined){
                return [0,0,0,0,0,0,0,0];
            }
			var array = [];
			for ( var i = 0; i < guid.length / 4; i++) {
				array.push(parseInt(guid.substr(4 * i, 4), 16));
			}
			return array;
		}

        function getRelidGuid(node){
            //TODO we always should know what structure we should expect as a relid, now we think it is a number so it can be converted to 0xsomething
            var relid = _core.getRelid(node);
            relid = Number(relid);
            if (relid ==="NaN"){
                return null
            }
            if (relid < 0){
                relid = relid *(-1);
            }

            relid = relid.toString(16);

            //now we should fill up with 0's in the beggining
            while(relid.length<32){
                relid=relid+"0"; //TODO we pad to the end so the final result will be more visible during debug
            }
            return relid
        }

		function xorGuids (a, b) {
			var arrayA = guidToArray(a);
			var arrayB = guidToArray(b);

			ASSERT(arrayA.length === arrayB.length);

			var arrayOut = [];
			for ( var i = 0; i < arrayA.length; i++) {
				arrayOut.push(arrayA[i] ^ arrayB[i]);
			}
			for (i = 0; i < arrayOut.length; i++) {
				arrayOut[i] = Number(arrayOut[i]).toString(16);
				var difi = 4 - arrayOut[i].length;
				while (difi > 0) {
					arrayOut[i] = '0' + arrayOut[i];
					difi--;
				}
			}
			return arrayOut.join("");
		}

		var _core = {};
		for ( var i in _innerCore) {
			_core[i] = _innerCore[i];
		}

		//new functions
        _core.getMiddleGuid = function(node){
            var outGuid = _core.getAttribute(node, OWN_GUID);
            var tempnode = _core.getParent(node);
            while (tempnode) {
                outGuid = xorGuids(outGuid, _core.getAttribute(tempnode, OWN_GUID));
                tempnode = _core.getParent(tempnode);
            }
            return outGuid;
        };

		_core.getGuid = function (node) {
            var middle = _core.getMiddleGuid(node),
                relid = getRelidGuid(node),
                guid = xorGuids(middle,relid);
            return toExternalGuid(guid);
		};

        _core.setGuid = function(node,guid){
            ASSERT(GUID_REGEXP.test(guid));
            var children = _core.loadChildren(node);
            return TASYNC.call(function(nodeArray){
                var newGuid = toInternalGuid(guid);
                //first setting the node's OWN_GUID
                var oldOwn = _core.getAttribute(node,OWN_GUID);
                var parent = _core.getParent(node);
                if (parent) {
                    _core.setAttribute(node, OWN_GUID, xorGuids(newGuid,xorGuids(_core.getMiddleGuid(parent),getRelidGuid(node))));
                } else {
                    _core.setAttribute(node, OWN_GUID, xorGuids(newGuid,getRelidGuid(node)));
                }
                var newOwn = _core.getAttribute(node,OWN_GUID);
                //now modify its children's
                for ( var i = 0; i < nodeArray.length; i++) {
                    var oldGuid = _core.getAttribute(nodeArray[i],OWN_GUID);
                    _core.setAttribute(nodeArray[i], OWN_GUID, xorGuids(oldGuid,xorGuids(oldOwn,newOwn)));
                }


                return;
            },children);
        };

		//modified functions
		_core.createNode = function (parameters) {
			parameters = parameters || {};
			var guid = parameters.guid || GUID(),
				parent = parameters.parent;

			ASSERT(GUID_REGEXP.test(guid));

			var node = _innerCore.createNode(parameters);
			guid = toInternalGuid(guid);

			var relguid = "";
			if (parent) {
				relguid = xorGuids(toInternalGuid(_core.getMiddleGuid(_core.getParent(node))),xorGuids(guid,getRelidGuid(node)));
			} else {
				relguid = xorGuids(guid,getRelidGuid(node));
			}
			_innerCore.setAttribute(node, OWN_GUID, relguid);

			return node;
		};

        _core.moveNode = function(node,parent){
            var oldGuid = toInternalGuid(_core.getGuid(node)),
                newNode = _innerCore.moveNode(node,parent);

            _core.setAttribute(newNode,OWN_GUID,xorGuids(_core.getMiddleGuid(parent),xorGuids(oldGuid,getRelidGuid(newNode))));

            return newNode;
        };

        _core.copyNode = function(node,parent){
            var newNode = _innerCore.copyNode(node,parent);
            _core.setAttribute(newNode,OWN_GUID,toInternalGuid(GUID()));
            return newNode;
        };

        _core.copyNodes = function(nodes,parent){
            var copiedNodes = _innerCore.copyNodes(nodes,parent),
                i;
            for(i=0;i<copiedNodes.length;i++){
                _core.setAttribute(copiedNodes[i],OWN_GUID,toInternalGuid(GUID()));
            }

            return copiedNodes;
        };

		return _core;
	}

	return guidCore;
});

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('core/nullpointercore',[], function () {
    

    var NULLPTR_NAME = "_null_pointer";
    var NULLPTR_RELID = "_nullptr";


    function nullPointerCore (_innerCore) {
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }

        
        //extra functions
        _core.setPointer = function(node,name, target){
            if(target === null){
                var nullChild = _innerCore.getChild(node,NULLPTR_RELID);
                _innerCore.setAttribute(nullChild,'name',NULLPTR_NAME);
                _innerCore.setPointer(node,name,nullChild);
            } else {
                _innerCore.setPointer(node,name,target);
            }
        };
        _core.getPointerPath = function(node,name){
            var path = _innerCore.getPointerPath(node,name);
            if(path && path.indexOf(NULLPTR_RELID) !== -1){
                return null;
            } else {
                return path;
            }
        };
        _core.loadPointer = function(node,name){
            var path = _core.getPointerPath(node,name);
            if(path === null){
                return null;
            } else {
                return _innerCore.loadPointer(node,name);
            }
        };

        
        return _core;
    }

    return nullPointerCore;
});



/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define('core/coreunwrap',[ "util/assert", "core/tasync" ], function(ASSERT, TASYNC) {
	

	// ----------------- CoreUnwrap -----------------

	var CoreUnwrap = function(oldcore) {

		function checkNode(node) {
			if (node === null || oldcore.isValidNode(node)) {
				return node;
			} else {
				throw new Error("Invalid result node");
			}
		}

		function checkNodes(nodes) {
			ASSERT(nodes instanceof Array);

			var i;
			for (i = 0; i < nodes.length; ++i) {
				if (!oldcore.isValidNode(nodes[i])) {
					throw new Error("Invalid result node array");
				}
			}

			return nodes;
		}

		// copy all operations
		var core = {};
		for ( var key in oldcore) {
			core[key] = oldcore[key];
		}

		core.loadRoot = TASYNC.unwrap(oldcore.loadRoot);
		core.persist = TASYNC.unwrap(oldcore.persist);

		// core.loadChild = TASYNC.unwrap(oldcore.loadChild);
		core.loadChild = TASYNC.unwrap(function(node, relid) {
			return TASYNC.call(checkNode, oldcore.loadChild(node, relid));
		});

		// core.loadByPath = TASYNC.unwrap(oldcore.loadByPath);
		core.loadByPath = TASYNC.unwrap(function(node, path) {
			return TASYNC.call(checkNode, oldcore.loadByPath(node, path));
		});

		// core.loadChildren = TASYNC.unwrap(oldcore.loadChildren);
		core.loadChildren = TASYNC.unwrap(function(node) {
			return TASYNC.call(checkNodes, oldcore.loadChildren(node));
		});

		core.loadPointer = TASYNC.unwrap(oldcore.loadPointer);
		core.loadCollection = TASYNC.unwrap(oldcore.loadCollection);

		return core;
	};

	return CoreUnwrap;
});

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('core/descriptorcore',[], function () {
    

    var DESCR_ID = "_desc";

    function descriptorCore (_innerCore) {

        //helper functions
        function updateDescriptorHash(node){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var dCount = _innerCore.getRegistry(node,'d_count') || 0;
            _innerCore.setRegistry(node,'d_count',dCount + 1);
        }
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }


        //extra functions
        _core.getAttributeDescriptor = function(node,attributename){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setAttributeDescriptor = function(node,attributename,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delAttributeDescriptor = function(node,attributename){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"a_"+attributename);
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };

        _core.getPointerDescriptor = function(node,pointername){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setPointerDescriptor = function(node,pointername,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delPointerDescriptor = function(node,pointername){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"p_"+pointername);
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };


        _core.getNodeDescriptor = function(node){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            return _innerCore.getRegistry(descriptor,'descriptor');
        };
        _core.setNodeDescriptor = function(node,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            _innerCore.setRegistry(descriptor,'descriptor',descobject);
            updateDescriptorHash(node);
        };
        _core.delNodeDescriptor = function(node,descobject){
            var descriptors = _innerCore.getChild(node,DESCR_ID);
            var descriptor = _innerCore.getChild(descriptors,"n_");
            _innerCore.deleteNode(descriptor);
            updateDescriptorHash(node);
        };


        return _core;
    }

    return descriptorCore;
});


/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define('core/coretype',[ "util/assert", "core/core", "core/tasync" ], function(ASSERT, Core, TASYNC) {
	

	// ----------------- CoreType -----------------

    //FIXME TODO these stuff have been simply copied from lower layer, probably it should be put to some constant place
    var OVERLAYS = "ovr";
    var COLLSUFFIX = "-inv";

    var CoreType = function(oldcore) {
		// copy all operations
		var core = {};
		for ( var key in oldcore) {
			core[key] = oldcore[key];
		}

		// ----- validity

		function __test(text, cond) {
			if (!cond) {
				throw new Error(text);
			}
		}

		function isValidNode(node) {
			try {
				__test("core", oldcore.isValidNode(node));
				__test("base", typeof node.base === "object");
				return true;
			} catch (error) {
				console.log("Wrong node", error.stack);
				return false;
			}
		}

        function isFalseNode(node) {
            //TODO this hack should be removed, but now it seems just fine :)
            if(typeof oldcore.getPointerPath(node,"base") === "undefined"){
                return true;
            }
            return false;
        }

		core.isValidNode = isValidNode;

		// ----- navigation

		core.getBase = function(node) {
			ASSERT(isValidNode(node));

			// TODO: check if base has moved
			return node.base;
		};

        core.getBaseRoot = function(node) {
            ASSERT(isValidNode(node));
            while (node.base !== null){
                node = node.base;
            }

            return node;
        };

		core.loadRoot = function(hash) {
			return TASYNC.call(__loadRoot2, oldcore.loadRoot(hash));
		};

		function __loadRoot2(node) {
            ASSERT(typeof node.base === "undefined" || node.base === null); //kecso - TODO it should be undefined, but maybe because of the cache it can be null

			node.base = null;
			return node;
		}

        core.loadChild = function(node,relid){
            var child = null,
                base = core.getBase(node),
                basechild = null;
            if(base){
                //the parent is inherited
                if(oldcore.getChildrenRelids(base).indexOf(relid) !== -1) {
                    //inherited child
                    if (oldcore.getChildrenRelids(node).indexOf(relid) !== -1) {
                        //but it is overwritten so we should load it
                        child = oldcore.loadChild(node, relid);
                    }
                    basechild = core.loadChild( base, relid);
                    return TASYNC.call(function(b,c,n,r){
                        child = c || core.getChild(n,r);
                        child.base = b;
                        core.getCoreTree().setHashed(child,true);
                        return child;
                    },basechild,child,node,relid);
                }
            }
            //normal child
            return TASYNC.call(__loadBase,oldcore.loadChild(node,relid));
        };

        core.loadByPath = function(node,path){
            ASSERT(isValidNode(node));
            ASSERT(path === "" || path.charAt(0) === "/");
            path = path.split("/");
            return loadDescendantByPath(node, path, 1);
        };
        var loadDescendantByPath = function(node,pathArray,index){
            if (node === null || index === pathArray.length) {
                return node;
            }

            var child = core.loadChild(node, pathArray[index]);
            return TASYNC.call(loadDescendantByPath, child, pathArray, index + 1);
        };

        //TODO the pointer loading is totally based upon the loadByPath...
        core.loadPointer = function(node,name){
            var pointerPath = core.getPointerPath(node,name);
            return TASYNC.call(core.loadByPath,core.getRoot(node),pointerPath);
        };

        function __loadBase(node) {
            ASSERT(node === null || typeof node.base === "undefined" || typeof node.base === "object");

            if (typeof node.base === "undefined") {
                if(core.isEmpty(node)) {
                    //empty nodes do not have a base
                    node.base = null;
                    return node;
                } else if(isFalseNode(node)){
                    var root = core.getRoot(node);
                    oldcore.deleteNode(node);
                    core.persist(root);
                    return null;
                } else {
                    var basepath = oldcore.getPointerPath(node,'base');
                    ASSERT(basepath !== undefined);
                    if(basepath === null){
                        node.base = null;
                        return node;
                    } else {
                        return TASYNC.call(__loadBase2, node, core.loadByPath(core.getRoot(node),basepath));
                    }
                }
            } else {
                //TODO can the base change at this point???
                return node;
            }
        }

		function __loadBase2(node, target) {
            if(typeof node.base !== null && typeof node.base === 'object' && (oldcore.getPath(node.base) === oldcore.getPath(target))){
                //TODO somehow the object already loaded properly and we do no know about it!!!
                return node;
            } else {
                ASSERT(typeof node.base === "undefined" || node.base === null); //kecso

                if(target === null) {
                    node.base = null;
                    return node;
                }  else {
                    return TASYNC.call(function(n,b){n.base = b; return n;},node,__loadBase(target));
                }
            }
		}

        core.getChildrenRelids = function(node){
            var inheritRelIds = node.base === null ? [] : core.getChildrenRelids(core.getBase(node));
            var ownRelIds = oldcore.getChildrenRelids(node);
            for(var i=0;i<inheritRelIds.length;i++){
                if(ownRelIds.indexOf(inheritRelIds[i]) === -1){
                    ownRelIds.push(inheritRelIds[i]);
                }
            }
            return ownRelIds;
        };
        
        core.loadChildren = function(node) {
            ASSERT(isValidNode(node));
            var relids = core.getChildrenRelids(node);
            relids = relids.sort(); //TODO this should be temporary
            var children = [];
            for(var i = 0; i< relids.length; i++)
                children[i] = core.loadChild(node,relids[i]);
            return TASYNC.call(function(n){
                var newn = [];
                for(var i=0; i<n.length;i++){
                    if(n[i] !== null){
                        newn.push(n[i]);
                    }
                }
                return newn;
            },TASYNC.lift(children));
        };

        //collection handling and needed functions
        function _isInheritedChild(node){
            var parent = core.getParent(node),
                base = core.getBase(node),
                parentBase = parent ? core.getBase(parent) : null,
                baseParent = base ? core.getParent(base) : null;

            if(baseParent && parentBase && core.getPath(baseParent) === core.getPath(parentBase)){
                return true;
            }
            return false;
        }

        function _getInstanceRoot(node){

            while(_isInheritedChild(node)){
                node = core.getParent(node);
            }

            return node;
        }
        //TODO copied function from corerel
        function isPointerName(name) {
            ASSERT(typeof name === "string");

            return name.slice(-COLLSUFFIX.length) !== COLLSUFFIX;
        }

        function _getInheritedCollectionNames(node){
            var target = "",
                names = [],
                coretree = core.getCoreTree(),
                startNode = node,
                endNode = _getInstanceRoot(node),
                exit;

            if(core.getPath(startNode) === core.getPath(endNode)){
                return names;
            }

            do{
                startNode = core.getBase(startNode);
                endNode = core.getBase(endNode);
                node = startNode;
                exit = false;
                target = "";
                do {
                    if(core.getPath(node) === core.getPath(endNode)){
                        exit = true;
                    }
                    var child = coretree.getProperty(coretree.getChild(node, OVERLAYS), target);
                    if (child) {
                        for ( var name in child) {
                            if (!isPointerName(name)) {
                                name = name.slice(0, -COLLSUFFIX.length);
                                if (names.indexOf(name) < 0) {
                                    names.push(name);
                                }
                            }
                        }
                    }

                    target = "/" + coretree.getRelid(node) + target;
                    node = coretree.getParent(node);
                } while (!exit);
            } while (_isInheritedChild(startNode));

            return names;
        }
        function _getInheritedCollectionPaths(node,name){
            var target = "",
                result = [],
                coretree = core.getCoreTree(),
                startNode = node,
                endNode = _getInstanceRoot(node),
                prefixStart = startNode,
                prefixNode = prefixStart,
                exit,
                collName = name + COLLSUFFIX,
                notOverwritten = function(sNode,eNode,source){
                    var result = true,
                        tNode = sNode,
                        child,target;

                    while(core.getPath(tNode) !== core.getPath(eNode)){
                        child = coretree.getChild(tNode,OVERLAYS);
                        child = coretree.getChild(child,source);
                        if(child){
                            target = coretree.getProperty(child,name);
                            if(target){
                                return false;
                            }
                        }
                        tNode = core.getBase(tNode);
                    }

                    return result;
                };

            if(core.getPath(startNode) === core.getPath(endNode)){
                return result;
            }

            do{
                startNode = core.getBase(startNode);
                endNode = core.getBase(endNode);
                node = startNode;
                prefixNode = prefixStart;
                exit = false;
                target = "";
                do {
                    if(core.getPath(node) === core.getPath(endNode)){
                        exit = true;
                    }
                    var child = coretree.getChild(node, OVERLAYS);
                    child = coretree.getChild(child,target);
                    if (child) {
                        var sources = coretree.getProperty(child, collName);
                        if (sources) {
                            ASSERT(Array.isArray(sources) && sources.length >= 1);

                            var prefix = coretree.getPath(prefixNode);

                            for ( var i = 0; i < sources.length; ++i) {
                                if(notOverwritten(prefixNode,node,sources[i])){
                                    result.push(coretree.joinPaths(prefix, sources[i]));
                                }
                            }
                        }
                    }

                    target = "/" + coretree.getRelid(node) + target;
                    node = coretree.getParent(node);
                    prefixNode = core.getParent(prefixNode);
                } while (!exit);
            } while (_isInheritedChild(startNode));

            return result;
        }
        core.getCollectionNames = function(node){
            ASSERT(isValidNode(node));
            var checkCollNames = function(draft){
                    var i,filtered = [],sources;
                    for(i=0;i<draft.length;i++){
                        sources = core.getCollectionPaths(node,draft[i]);
                        if(sources.length > 0){
                            filtered.push(draft[i])
                        }
                    }
                    return filtered;
                },
                ownNames = oldcore.getCollectionNames(node),
                inhNames = checkCollNames(_getInheritedCollectionNames(node)),
                i;
            for(i=0;i<ownNames.length;i++){
                if(inhNames.indexOf(ownNames[i]) < 0){
                    inhNames.push(ownNames[i])
                }
            }

            return inhNames;
        };

        core.getCollectionPaths = function(node,name){
            ASSERT(isValidNode(node) && name);
            var ownPaths = oldcore.getCollectionPaths(node,name),
                inhPaths = _getInheritedCollectionPaths(node,name);

            inhPaths = inhPaths.concat(ownPaths);

            return inhPaths;
        };

        core.loadCollection = function(node, name) {
            var root =  core.getRoot(node);
            var paths = core.getCollectionPaths(node,name);

            var nodes = [];
            for(var i = 0; i < paths.length; i++) {
                nodes[i] = core.loadByPath(root, paths[i]);
            }

            return TASYNC.lift(nodes);
        };

		// ----- creation

		core.createNode = function(parameters) {
			parameters = parameters || {};
			var base = parameters.base || null,
				parent = parameters.parent;


			ASSERT(!parent || isValidNode(parent));
			ASSERT(!base || isValidNode(base));
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

			var node = oldcore.createNode(parameters);
            node.base = base;
            oldcore.setPointer(node,"base",base);

			return node;
		};

		// ----- properties

		core.getAttributeNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getAttributeNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};
        core.getOwnAttributeNames = function(node){
            return oldcore.getAttributeNames(node);
        };

		core.getRegistryNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getRegistryNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};
        core.getOwnRegistryNames = function(node){
            return oldcore.getRegistryNames(node);
        };

		core.getAttribute = function(node, name) {
			ASSERT(isValidNode(node));
            var value;
			do {
				value = oldcore.getAttribute(node, name);
				node = node.base;
			} while (typeof value === "undefined" && node !== null);

			return value;
		};
        core.getOwnAttribute = function(node,name) {
            return oldcore.getAttribute(node,name);
        };

		core.getRegistry = function(node, name) {
			ASSERT(isValidNode(node));
            var value;
			do {
				value = oldcore.getRegistry(node, name);
				node = node.base;
			} while (typeof value === "undefined" && node !== null);

			return value;
		};
        core.getOwnRegistry = function(node,name) {
            return oldcore.getRegistry(node,name);
        };


		// ----- pointers

		core.getPointerNames = function(node) {
			ASSERT(isValidNode(node));

			var merged = {};
			do {
				var names = oldcore.getPointerNames(node);
				for ( var i = 0; i < names.length; ++i) {
					if (!(names[i] in merged)) {
						merged[names[i]] = true;
					}
				}

				node = node.base;
			} while (node);

			return Object.keys(merged);
		};
        core.getOwnPointerNames = function(node){
            ASSERT(isValidNode(node));
            return oldcore.getPointerNames(node);
        };

        core.getPointerPath = function (node, name) {
            ASSERT(isValidNode(node) && typeof name === "string");

            var ownPointerPath = oldcore.getPointerPath(node,name);
            if(ownPointerPath !== undefined){
                return ownPointerPath;
            }
            var source = "",
                target,
                coretree = core.getCoreTree(),
                basePath,
                hasNullTarget = false,
                getProperty = function(node,name){
                    var property;
                    while(property === undefined && node !== null){
                        property = coretree.getProperty(node,name);
                        node = core.getBase(node);
                    }
                    return property;
                },
                getSimpleBasePath = function(node){
                    var path = oldcore.getPointerPath(node,name);
                    if(path === undefined){
                        if(node.base !== null && node.base !== undefined){
                            return getSimpleBasePath(node.base);
                        } else {
                            return undefined;
                        }
                    } else {
                        return path;
                    }
                },
                getParentOfBasePath = function(node){
                    if(node.base){
                        var parent = core.getParent(node.base);
                        if(parent){
                            return core.getPath(parent);
                        } else {
                            return undefined;
                        }
                    } else {
                        return undefined;
                    }
                },
                getBaseOfParentPath = function(node){
                    var parent = core.getParent(node);
                    if(parent){
                        if(parent.base){
                            return core.getPath(parent.base);
                        } else {
                            return undefined;
                        }
                    } else {
                        return undefined;
                    }
                },
                getTargetRelPath = function(node,relSource,name){
                    var ovr = core.getChild(node,'ovr');
                    var source = core.getChild(ovr,relSource);
                    return getProperty(source,name);
                };

            basePath = node.base ? getSimpleBasePath(node.base) : undefined;

            while(node){
                target = getTargetRelPath(node,source,name);
                if( target !== undefined){
                    if(target.indexOf('_nullptr') !== -1){
                        hasNullTarget = true;
                        target = undefined;
                    } else {
                        break;
                    }
                }

                source = "/" + core.getRelid(node) + source;
                if(getParentOfBasePath(node) === getBaseOfParentPath(node)){
                    node = core.getParent(node);
                } else {
                    node = null;
                }
            }


            if (target !== undefined) {
                ASSERT(node);
                target = coretree.joinPaths(oldcore.getPath(node), target);
            }
            return target || basePath || (hasNullTarget ? null : undefined);
        };
        core.getOwnPointerPath = function(node,name){
            oldcore.getPointerPath(node,name);
        };

        core.setBase = function(node,base){
            ASSERT(isValidNode(node) && (base === undefined || base === null || isValidNode(base)));
            ASSERT(!base || core.getPath(core.getParent(node)) !== core.getPath(base));
            ASSERT(!base || core.getPath(node) !== core.getPath(base));
            if(!!base){
                //TODO maybe this is not the best way, needs to be double checked
                node.base = base;
                var parent = core.getParent(node),
                    parentBase,baseParent;
                if(parent){
                    parentBase = core.getBase(parent);
                    baseParent = core.getParent(base);
                    if(core.getPath(parentBase) !== core.getPath(baseParent)){
                        //we have to set an exact pointer only if it is not inherited child
                        oldcore.setPointer(node, "base", base);
                    } else {
                        oldcore.deletePointer(node,"base"); //we remove the pointer just in case
                    }
                } else {
                    //if for some reason the node doesn't have a parent it is surely not an inherited child
                    oldcore.setPointer(node,"base",base);
                }
            } else {
                oldcore.setPointer(node,'base',null);
                node.base = null;
            }
        };

        core.getChild = function(node,relid){
            ASSERT(isValidNode(node) && (typeof node.base === 'undefined' || typeof node.base === 'object'));
            var child = oldcore.getChild(node,relid);
            if(node.base !== null && node.base !== undefined){
                if(child.base === null || child.base === undefined){
                    child.base = core.getChild(node.base,relid);
                }
            } else {
                child.base = null;
            }
            return child;
        };
        core.moveNode = function(node,parent){
            //TODO we have to check if the move is really allowed!!!
            ASSERT(isValidNode(node) && isValidNode(parent));
            var base = node.base,
                parentBase = parent.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));
            ASSERT(!parentBase || core.getPath(parentBase) !== core.getPath(node));

            var moved = oldcore.moveNode(node,parent);
            moved.base = base;
            return moved;
        };
        core.copyNode = function(node,parent){
            var base = node.base;
            ASSERT(!base || core.getPath(base) !== core.getPath(parent));

            var newnode = oldcore.copyNode(node,parent);
            newnode.base = base;
            oldcore.setPointer(newnode,'base',base);
            return newnode;
        };
        function _inheritedPointerNames(node){
            var allNames = core.getPointerNames(node),
                ownNames = core.getOwnPointerNames(node),
                names = [],
                i;

            for(i=0;i<allNames.length;i++){
                if(ownNames.indexOf(allNames[i]) === -1){
                    names.push(allNames[i]);
                }
            }

            return names;
        }

        core.copyNodes = function(nodes,parent){
            var copiedNodes,
                i, j,index,base,
                relations = [],
                names,pointer,
                paths = [];

            //here we also have to copy the inherited relations which points inside the copy area
            for(i=0;i<nodes.length;i++){
                paths.push(core.getPath(nodes[i]));
            }

            for(i=0;i<nodes.length;i++){
                names = _inheritedPointerNames(nodes[i]);
                pointer = {};
                for(j=0;j<names.length;j++){
                    index = paths.indexOf(core.getPointerPath(nodes[i],names[j]));
                    if(index !== -1){
                        pointer[names[j]] = index;
                    }
                }
                relations.push(pointer);
            }

            //making the actual copy
            copiedNodes = oldcore.copyNodes(nodes,parent);
            
            //setting internal-inherited relations
            for(i=0;i<nodes.length;i++){
                names = Object.keys(relations[i]);
                for(j=0;j<names.length;j++){
                    core.setPointer(copiedNodes[i],names[j],copiedNodes[relations[i][names[j]]]);
                }
            }

            //setting base relation
            for(i=0;i<nodes.length;i++){
                base = nodes[i].base;
                copiedNodes[i].base = base;
                oldcore.setPointer(copiedNodes[i],'base',base);
            }


            return copiedNodes;
        };

        core.getDataForSingleHash = function(node){
            ASSERT(isValidNode(node));
            var datas = [];
            while(node){
                datas.push(oldcore.getDataForSingleHash(node));
                node = core.getBase(node);
            }
            return datas;
        };

        core.getChildrenPaths = function(node){
            var path = core.getPath(node);

            var relids = core.getChildrenRelids(node);
            for ( var i = 0; i < relids.length; ++i) {
                relids[i] = path + "/" + relids[i];
            }

            return relids;
        };

        core.deleteNode = function(node,technical){
            //currently we only check if the node is inherited from its parents children
            if(node && (node.base !== null || technical === true)){
                var parent = core.getParent(node),
                    parentsBase = parent ? core.getBase(node) : null,
                    base = core.getBase(node),
                    basesParent = base ? core.getParent(node) : null;

                if(parent && parentsBase && base && basesParent){
                    if(core.getPath(parentsBase) !== core.getPath(basesParent)){
                        oldcore.deleteNode(node);
                    }
                } else {
                    oldcore.deleteNode(node);
                }
            }
        };

        core.getTypeRoot = function(node){
            if(node.base){
                while(node.base !== null){
                    node = core.getBase(node);
                }
                return node;
            } else {
                return null;
            }
        };

        // -------- kecso

		return core;
	};

	return CoreType;
});

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
/*
example constraint structure for the outside world:
{
script:string,
priority:integer,
name:string,
message:string
}
provided API:
getConstraint(node,name) -> constraintObj
setConstraint(node,constraintObj)
getConstraintNames(node)
delConstraint(node,name)
 */
define('core/constraintcore',[ "util/assert" ], function (ASSERT) {
    
    var CONSTRAINTS_RELID = "_constraints";
    var C_DEF_PRIORITY = 1;
    function constraintCore (_innerCore) {
        var _core = {};
        for(var i in _innerCore){
            _core[i] = _innerCore[i];
        }

        var createNewConstraintRelId = function(constraintsNode){
            var max = Math.pow(2, 31);
            var existingRelIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            do{
                relId = Math.floor(Math.random() * max);
            } while (existingRelIds.indexOf(relId) !== -1);
            return "" + relId;
        };

        var getConstraintRelId = function(constraintsNode,name){
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var relId;
            for(var i=0;i<relIds.length;i++){
                if(name === _innerCore.getAttribute(_innerCore.getChild(constraintsNode,relIds[i]),"name")){
                    relId = relIds[i];
                    break;
                }
            }
            return relId;
        };
        var getRegConstName = function(name){
            return "_ch#_"+name;
        };
        
        _core.getConstraint = function(node,name){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(constRelId){
                var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
                return {
                    "script":_innerCore.getAttribute(constraintNode,"script"),
                    "priority":_innerCore.getAttribute(constraintNode,"priority"),
                    "info":_innerCore.getAttribute(constraintNode,"info")
                };
            } else {
                return null;
            }
        };

        _core.setConstraint = function(node,name,constraintObj){
            ASSERT(_innerCore.isValidNode(node));
            ASSERT(typeof constraintObj === 'object' && typeof name === 'string');
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(!constRelId){
                //we should create a new one
                constRelId = createNewConstraintRelId(constraintsNode);
            }

            var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
            constraintObj.priority = constraintObj.priority || C_DEF_PRIORITY;
            constraintObj.script = constraintObj.script || "console.log(\"empty constraint\");";
            constraintObj.info = constraintObj.info || "";
            _innerCore.setAttribute(constraintNode,"name",name);
            _innerCore.setAttribute(constraintNode,"script",constraintObj.script);
            _innerCore.setAttribute(constraintNode,"priority",constraintObj.priority);
            _innerCore.setAttribute(constraintNode,"info",constraintObj.info);
            _innerCore.setRegistry(node,getRegConstName(name),(_innerCore.getRegistry(node,getRegConstName(name)) || 0)+1);
        };

        _core.delConstraint = function(node,name){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var constRelId = getConstraintRelId(constraintsNode,name);
            if(constRelId){
                var constraintNode = _innerCore.getChild(constraintsNode,constRelId);
                _innerCore.deleteNode(constraintNode,true);
            }
            _innerCore.delRegistry(node,getRegConstName(name));
        };

        _core.getConstraintNames = function(node){
            ASSERT(_innerCore.isValidNode(node));
            var constraintsNode = _innerCore.getChild(node,CONSTRAINTS_RELID);
            var relIds = _innerCore.getChildrenRelids(constraintsNode);
            var names = [];
            for(var i=0;i<relIds.length;i++){
                names.push(_innerCore.getAttribute(_innerCore.getChild(constraintsNode,relIds[i]),"name"));
            }
            return names;
        };

        //TODO this means we always have to have this layer above type/inheritance layer
        _core.getOwnConstraintNames = function(node){
            ASSERT(_innerCore.isValidNode(node));
            var names = _core.getConstraintNames(node),
                base = _core.getBase(node),
                baseNames = [], i,index;

            if(base){
                baseNames = _core.getConstraintNames(base);
            }

            for(i=0;i<baseNames.length;i++){
                index = names.indexOf(baseNames[i]);
                if(index !== -1){
                    names.splice(index,1);
                }
            }

            return names;
        };

        return _core;
    }

    return constraintCore;
});

/* jshint proto: true */

/**
 * jjv.js -- A javascript library to validate json input through a json-schema.
 *
 * Copyright (c) 2013 Alex Cornejo.
 *
 * Redistributable under a MIT-style open source license.
 */

(function () {
  var clone = function (obj) {
      // Handle the 3 simple types (string, number, function), and null or undefined
      if (obj === null || typeof obj !== 'object') return obj;
      var copy;

      // Handle Date
      if (obj instanceof Date) {
          copy = new Date();
          copy.setTime(obj.getTime());
          return copy;
      }

      // handle RegExp
      if (obj instanceof RegExp) {
        copy = new RegExp(obj);
        return copy;
      }

      // Handle Array
      if (obj instanceof Array) {
          copy = [];
          for (var i = 0, len = obj.length; i < len; i++)
              copy[i] = clone(obj[i]);
          return copy;
      }

      // Handle Object
      if (obj instanceof Object) {
          copy = {};
//           copy = Object.create(Object.getPrototypeOf(obj));
          for (var attr in obj) {
              if (obj.hasOwnProperty(attr))
                copy[attr] = clone(obj[attr]);
          }
          return copy;
      }

      throw new Error("Unable to clone object!");
  };

  var clone_stack = function (stack) {
    var stack_last = stack.length-1, key = stack[stack_last].key;
    var new_stack = stack.slice(0);
    new_stack[stack_last].object[key] = clone(new_stack[stack_last].object[key]);
    return new_stack;
  };

  var copy_stack = function (new_stack, old_stack) {
    var stack_last = new_stack.length-1, key = new_stack[stack_last].key;
    old_stack[stack_last].object[key] = new_stack[stack_last].object[key];
  };

  var handled = {
    'type': true,
    'not': true,
    'anyOf': true,
    'allOf': true,
    'oneOf': true,
    '$ref': true,
    '$schema': true,
    'id': true,
    'exclusiveMaximum': true,
    'exclusiveMininum': true,
    'properties': true,
    'patternProperties': true,
    'additionalProperties': true,
    'items': true,
    'additionalItems': true,
    'required': true,
    'default': true,
    'title': true,
    'description': true,
    'definitions': true,
    'dependencies': true
  };

  var fieldType = {
    'null': function (x) {
      return x === null;
    },
    'string': function (x) {
      return typeof x === 'string';
    },
    'boolean': function (x) {
      return typeof x === 'boolean';
    },
    'number': function (x) {
      return typeof x === 'number' && !isNaN(x);
    },
    'integer': function (x) {
      return typeof x === 'number' && x%1 === 0;
    },
    'object': function (x) {
      return x && typeof x === 'object' && !Array.isArray(x);
    },
    'array': function (x) {
      return Array.isArray(x);
    },
    'date': function (x) {
      return x instanceof Date;
    }
  };

  // missing: uri, date-time, ipv4, ipv6
  var fieldFormat = {
    'alpha': function (v) {
      return (/^[a-zA-Z]+$/).test(v);
    },
    'alphanumeric': function (v) {
      return (/^[a-zA-Z0-9]+$/).test(v);
    },
    'identifier': function (v) {
      return (/^[-_a-zA-Z0-9]+$/).test(v);
    },
    'hexadecimal': function (v) {
      return (/^[a-fA-F0-9]+$/).test(v);
    },
    'numeric': function (v) {
      return (/^[0-9]+$/).test(v);
    },
    'date-time': function (v) {
      return !isNaN(Date.parse(v)) && v.indexOf('/') === -1;
    },
    'uppercase': function (v) {
      return v === v.toUpperCase();
    },
    'lowercase': function (v) {
      return v === v.toLowerCase();
    },
    'hostname': function (v) {
      return v.length < 256 && (/^([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9])(\.([a-zA-Z0-9]|[a-zA-Z0-9][a-zA-Z0-9\-]{0,61}[a-zA-Z0-9]))*$/).test(v);
    },
    'uri': function (v) {
      return (/[-a-zA-Z0-9@:%_\+.~#?&//=]{2,256}\.[a-z]{2,4}\b(\/[-a-zA-Z0-9@:%_\+.~#?&//=]*)?/).test(v);
    },
    'email': function (v) { // email, ipv4 and ipv6 adapted from node-validator
      return (/^(?:[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+\.)*[\w\!\#\$\%\&\'\*\+\-\/\=\?\^\`\{\|\}\~]+@(?:(?:(?:[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!\.)){0,61}[a-zA-Z0-9]?\.)+[a-zA-Z0-9](?:[a-zA-Z0-9\-](?!$)){0,61}[a-zA-Z0-9]?)|(?:\[(?:(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\.){3}(?:[01]?\d{1,2}|2[0-4]\d|25[0-5])\]))$/).test(v);
    },
    'ipv4': function (v) {
      if ((/^(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)\.(\d?\d?\d)$/).test(v)) {
        var parts = v.split('.').sort();
        if (parts[3] <= 255)
          return true;
      }
      return false;
    },
    'ipv6': function(v) {
      return (/^((?=.*::)(?!.*::.+::)(::)?([\dA-F]{1,4}:(:|\b)|){5}|([\dA-F]{1,4}:){6})((([\dA-F]{1,4}((?!\3)::|:\b|$))|(?!\2\3)){2}|(((2[0-4]|1\d|[1-9])?\d|25[0-5])\.?\b){4})$/).test(v);
     /*  return (/^::|^::1|^([a-fA-F0-9]{1,4}::?){1,7}([a-fA-F0-9]{1,4})$/).test(v); */
    }
  };

  var fieldValidate = {
    'readOnly': function (v, p) {
      return false;
    },
    // ****** numeric validation ********
    'minimum': function (v, p, schema) {
      return !(v < p || schema.exclusiveMinimum && v <= p);
    },
    'maximum': function (v, p, schema) {
      return !(v > p || schema.exclusiveMaximum && v >= p);
    },
    'multipleOf': function (v, p) {
      return (v/p)%1 === 0 || typeof v !== 'number';
    },
    // ****** string validation ******
    'pattern': function (v, p) {
      if (typeof v !== 'string')
        return true;
      var pattern, modifiers;
      if (typeof p === 'string')
        pattern=p;
      else {
        pattern=p[0];
        modifiers=p[1];
      }
      var regex = new RegExp(pattern, modifiers);
      return regex.test(v);
    },
    'minLength': function (v, p) {
      return v.length >= p || typeof v !== 'string';
    },
    'maxLength': function (v, p) {
      return v.length <= p || typeof v !== 'string';
    },
    // ***** array validation *****
    'minItems': function (v, p) {
      return v.length >= p || !Array.isArray(v);
    },
    'maxItems': function (v, p) {
      return v.length <= p || !Array.isArray(v);
    },
    'uniqueItems': function (v, p) {
      var hash = {}, key;
      for (var i = 0, len = v.length; i < len; i++) {
        key = JSON.stringify(v[i]);
        if (hash.hasOwnProperty(key))
          return false;
        else
          hash[key] = true;
      }
      return true;
    },
    // ***** object validation ****
    'minProperties': function (v, p) {
      if (typeof v !== 'object')
        return true;
      var count = 0;
      for (var attr in v) if (v.hasOwnProperty(attr)) count = count + 1;
      return count >= p;
    },
    'maxProperties': function (v, p) {
      if (typeof v !== 'object')
        return true;
      var count = 0;
      for (var attr in v) if (v.hasOwnProperty(attr)) count = count + 1;
      return count <= p;
    },
    // ****** all *****
    'enum': function (v, p) {
      var i, len, vs;
      if (typeof v === 'object') {
        vs = JSON.stringify(v);
        for (i = 0, len = p.length; i < len; i++)
          if (vs === JSON.stringify(p[i]))
            return true;
      } else {
        for (i = 0, len = p.length; i < len; i++)
          if (v === p[i])
            return true;
      }
      return false;
    }
  };

  var normalizeID = function (id) {
    return id.indexOf("://") === -1 ? id : id.split("#")[0];
  };

  var resolveURI = function (env, schema_stack, uri) {
    var curschema, components, hash_idx, name;

    hash_idx = uri.indexOf('#');

    if (hash_idx === -1) {
      if (!env.schema.hasOwnProperty(uri))
        return null;
      return [env.schema[uri]];
    }

    if (hash_idx > 0) {
      name = uri.substr(0, hash_idx);
      uri = uri.substr(hash_idx+1);
      if (!env.schema.hasOwnProperty(name)) {
        if (schema_stack && schema_stack[0].id === name)
          schema_stack = [schema_stack[0]];
        else
          return null;
      } else
        schema_stack = [env.schema[name]];
    } else {
      if (!schema_stack)
        return null;
      uri = uri.substr(1);
    }

    if (uri === '')
      return [schema_stack[0]];

    if (uri.charAt(0) === '/') {
      uri = uri.substr(1);
      curschema = schema_stack[0];
      components = uri.split('/');
      while (components.length > 0) {
        if (!curschema.hasOwnProperty(components[0]))
          return null;
        curschema = curschema[components[0]];
        schema_stack.push(curschema);
        components.shift();
      }
      return schema_stack;
    } else // FIX: should look for subschemas whose id matches uri
      return null;
  };

  var resolveObjectRef = function (object_stack, uri) {
    var components, object, last_frame = object_stack.length-1, skip_frames, frame, m = /^(\d+)/.exec(uri);

    if (m) {
      uri = uri.substr(m[0].length);
      skip_frames = parseInt(m[1], 10);
      if (skip_frames < 0 || skip_frames > last_frame)
        return;
      frame = object_stack[last_frame-skip_frames];
      if (uri === '#')
        return frame.key;
    } else
      frame = object_stack[0];

    object = frame.object[frame.key];

    if (uri === '')
      return object;

    if (uri.charAt(0) === '/') {
      uri = uri.substr(1);
      components = uri.split('/');
      while (components.length > 0) {
        components[0] = components[0].replace(/~1/g, '/').replace(/~0/g, '~');
        if (!object.hasOwnProperty(components[0]))
          return;
        object = object[components[0]];
        components.shift();
      }
      return object;
    } else
      return;
  };

  var checkValidity = function (env, schema_stack, object_stack, options) {
    var i, len, count, hasProp, hasPattern;
    var p, v, malformed = false, objerrs = {}, objerr, objreq, errors = {}, props, matched, isArray;
    var sl = schema_stack.length-1, schema = schema_stack[sl];
    var ol = object_stack.length-1, object = object_stack[ol].object, name = object_stack[ol].key, prop = object[name];

    if (schema.hasOwnProperty('$ref')) {
      schema_stack= resolveURI(env, schema_stack, schema.$ref);
      if (!schema_stack)
        return {'$ref': schema.$ref};
      else
        return checkValidity(env, schema_stack, object_stack, options);
    }

    if (schema.hasOwnProperty('type')) {
      if (typeof schema.type === 'string') {
        if (options.useCoerce && env.coerceType.hasOwnProperty(schema.type))
          prop = object[name] = env.coerceType[schema.type](prop);
        if (!env.fieldType[schema.type](prop))
          return {'type': schema.type};
      } else {
        malformed = true;
        for (i = 0, len = schema.type.length; i < len && malformed; i++)
          if (env.fieldType[schema.type[i]](prop))
            malformed = false;
        if (malformed)
          return {'type': schema.type};
      }
    }

    if (schema.hasOwnProperty('allOf')) {
      for (i = 0, len = schema.allOf.length; i < len; i++) {
        objerr = checkValidity(env, schema_stack.concat(schema.allOf[i]), object_stack, options);
        if (objerr)
          return objerr;
      }
    }

    if (!options.useCoerce && !options.useDefault && !options.removeAdditional) {
      if (schema.hasOwnProperty('oneOf')) {
        for (i = 0, len = schema.oneOf.length, count = 0; i < len; i++) {
          objerr = checkValidity(env, schema_stack.concat(schema.oneOf[i]), object_stack, options);
          if (!objerr) {
            count = count + 1;
            if (count > 1)
              break;
          } else {
            objerrs = objerr;
          }
        }
        if (count > 1)
          return {'oneOf': true};
        else if (count < 1)
          return objerrs;
        objerrs = {};
      }

      if (schema.hasOwnProperty('anyOf')) {
        for (i = 0, len = schema.anyOf.length; i < len; i++) {
          objerr = checkValidity(env, schema_stack.concat(schema.anyOf[i]), object_stack, options);
          if (!objerr)
            break;
        }
        if (objerr)
          return objerr;
      }

      if (schema.hasOwnProperty('not')) {
        objerr = checkValidity(env, schema_stack.concat(schema.not), object_stack, options);
        if (!objerr)
          return {'not': true};
      }
    } else {
      if (schema.hasOwnProperty('oneOf')) {
        for (i = 0, len = schema.oneOf.length, count = 0; i < len; i++) {
          new_stack = clone_stack(object_stack);
          objerr = checkValidity(env, schema_stack.concat(schema.oneOf[i]), new_stack, options);
          if (!objerr) {
            count = count + 1;
            if (count > 1)
              break;
            else
              copy_stack(new_stack, object_stack);
          } else {
            objerrs = objerr;
          }
        }
        if (count > 1)
          return {'oneOf': true};
        else if (count < 1)
          return objerrs;
        objerrs = {};
      }

      if (schema.hasOwnProperty('anyOf')) {
        for (i = 0, len = schema.anyOf.length; i < len; i++) {
          new_stack = clone_stack(object_stack);
          objerr = checkValidity(env, schema_stack.concat(schema.anyOf[i]), new_stack, options);
          if (!objerr) {
            copy_stack(new_stack, object_stack);
            break;
          }
        }
        if (objerr)
          return objerr;
      }

      if (schema.hasOwnProperty('not')) {
        objerr = checkValidity(env, schema_stack.concat(schema.not), clone_stack(object_stack), options);
        if (!objerr)
          return {'not': true};
      }
    }

    if (schema.hasOwnProperty('dependencies')) {
      for (p in schema.dependencies)
        if (schema.dependencies.hasOwnProperty(p) && prop.hasOwnProperty(p)) {
          if (Array.isArray(schema.dependencies[p])) {
            for (i = 0, len = schema.dependencies[p].length; i < len; i++)
              if (!prop.hasOwnProperty(schema.dependencies[p][i])) {
                return {'dependencies': true};
              }
          } else {
            objerr = checkValidity(env, schema_stack.concat(schema.dependencies[p]), object_stack, options);
            if (objerr)
              return objerr;
          }
        }
    }

    if (!Array.isArray(prop)) {
      props = [];
      objerrs = {};
      for (p in prop)
        if (prop.hasOwnProperty(p))
          props.push(p);

      if (options.checkRequired && schema.required) {
        for (i = 0, len = schema.required.length; i < len; i++)
          if (!prop.hasOwnProperty(schema.required[i])) {
            objerrs[schema.required[i]] = {'required': true};
            malformed = true;
          }
      }

      hasProp = schema.hasOwnProperty('properties');
      hasPattern = schema.hasOwnProperty('patternProperties');
      if (hasProp || hasPattern) {
        i = props.length;
        while (i--) {
          matched = false;
          if (hasProp && schema.properties.hasOwnProperty(props[i])) {
            matched = true;
            objerr = checkValidity(env, schema_stack.concat(schema.properties[props[i]]), object_stack.concat({object: prop, key: props[i]}), options);
            if (objerr !== null) {
              objerrs[props[i]] = objerr;
              malformed = true;
            }
          }
          if (hasPattern) {
            for (p in schema.patternProperties)
              if (schema.patternProperties.hasOwnProperty(p) && props[i].match(p)) {
                matched = true;
                objerr = checkValidity(env, schema_stack.concat(schema.patternProperties[p]), object_stack.concat({object: prop, key: props[i]}), options);
                if (objerr !== null) {
                  objerrs[props[i]] = objerr;
                  malformed = true;
                }
              }
          }
          if (matched)
            props.splice(i, 1);
        }
      }

      if (options.useDefault && hasProp && !malformed) {
        for (p in schema.properties)
          if (schema.properties.hasOwnProperty(p) && !prop.hasOwnProperty(p) && schema.properties[p].hasOwnProperty('default'))
            prop[p] = schema.properties[p]['default'];
      }

      if (options.removeAdditional && hasProp && schema.additionalProperties !== true && typeof schema.additionalProperties !== 'object') {
        for (i = 0, len = props.length; i < len; i++)
          delete prop[props[i]];
      } else {
        if (schema.hasOwnProperty('additionalProperties')) {
          if (typeof schema.additionalProperties === 'boolean') {
            if (!schema.additionalProperties) {
              for (i = 0, len = props.length; i < len; i++) {
                objerrs[props[i]] = {'additional': true};
                malformed = true;
              }
            }
          } else {
            for (i = 0, len = props.length; i < len; i++) {
              objerr = checkValidity(env, schema_stack.concat(schema.additionalProperties), object_stack.concat({object: prop, key: props[i]}), options);
              if (objerr !== null) {
                objerrs[props[i]] = objerr;
                malformed = true;
              }
            }
          }
        }
      }
      if (malformed)
        return {'schema': objerrs};
    } else {
      if (schema.hasOwnProperty('items')) {
        if (Array.isArray(schema.items)) {
          for (i = 0, len = schema.items.length; i < len; i++) {
            objerr = checkValidity(env, schema_stack.concat(schema.items[i]), object_stack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
          if (prop.length > len && schema.hasOwnProperty('additionalItems')) {
            if (typeof schema.additionalItems === 'boolean') {
              if (!schema.additionalItems)
                return {'additionalItems': true};
            } else {
              for (i = len, len = prop.length; i < len; i++) {
                objerr = checkValidity(env, schema_stack.concat(schema.additionalItems), object_stack.concat({object: prop, key: i}), options);
                if (objerr !== null) {
                  objerrs[i] = objerr;
                  malformed = true;
                }
              }
            }
          }
        } else {
          for (i = 0, len = prop.length; i < len; i++) {
            objerr = checkValidity(env, schema_stack.concat(schema.items), object_stack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
        }
      } else if (schema.hasOwnProperty('additionalItems')) {
        if (typeof schema.additionalItems !== 'boolean') {
          for (i = 0, len = prop.length; i < len; i++) {
            objerr = checkValidity(env, schema_stack.concat(schema.additionalItems), object_stack.concat({object: prop, key: i}), options);
            if (objerr !== null) {
              objerrs[i] = objerr;
              malformed = true;
            }
          }
        }
      }
      if (malformed)
        return {'schema': objerrs};
    }

    for (v in schema) {
      if (schema.hasOwnProperty(v) && !handled.hasOwnProperty(v)) {
        if (v === 'format') {
          if (env.fieldFormat.hasOwnProperty(schema[v]) && !env.fieldFormat[schema[v]](prop, schema, object_stack, options)) {
            objerrs[v] = true;
            malformed = true;
          }
        } else {
          if (env.fieldValidate.hasOwnProperty(v) && !env.fieldValidate[v](prop, schema[v].hasOwnProperty('$data') ? resolveObjectRef(object_stack, schema[v].$data) : schema[v], schema, object_stack, options)) {
            objerrs[v] = true;
            malformed = true;
          }
        }
      }
    }

    if (malformed)
      return objerrs;
    else
      return null;
  };

  var defaultOptions = {
    useDefault: false,
    useCoerce: false,
    checkRequired: true,
    removeAdditional: false
  };

  function Environment() {
    if (!(this instanceof Environment))
      return new Environment();

    this.coerceType = {};
    this.fieldType = clone(fieldType);
    this.fieldValidate = clone(fieldValidate);
    this.fieldFormat = clone(fieldFormat);
    this.defaultOptions = clone(defaultOptions);
    this.schema = {};
  }

  Environment.prototype = {
    validate: function (name, object, options) {
      var schema_stack = [name], errors = null, object_stack = [{object: {'__root__': object}, key: '__root__'}];

      if (typeof name === 'string') {
        schema_stack = resolveURI(this, null, name);
        if (!schema_stack)
          throw new Error('jjv: could not find schema \'' + name + '\'.');
      }

      if (!options) {
        options = this.defaultOptions;
      } else {
        for (var p in this.defaultOptions)
          if (this.defaultOptions.hasOwnProperty(p) && !options.hasOwnProperty(p))
            options[p] = this.defaultOptions[p];
      }

      errors = checkValidity(this, schema_stack, object_stack, options);

      if (errors)
        return {validation: errors.hasOwnProperty('schema') ? errors.schema : errors};
      else
        return null;
    },

    resolveRef: function (schema_stack, $ref) {
      return resolveURI(this, schema_stack, $ref);
    },

    addType: function (name, func) {
      this.fieldType[name] = func;
    },

    addTypeCoercion: function (type, func) {
      this.coerceType[type] = func;
    },

    addCheck: function (name, func) {
      this.fieldValidate[name] = func;
    },

    addFormat: function (name, func) {
      this.fieldFormat[name] = func;
    },

    addSchema: function (name, schema) {
      if (!schema && name) {
        schema = name;
        name = undefined;
      }
      if (schema.hasOwnProperty('id') && typeof schema.id === 'string' && schema.id !== name) {
        if (schema.id.charAt(0) === '/')
          throw new Error('jjv: schema id\'s starting with / are invalid.');
        this.schema[normalizeID(schema.id)] = schema;
      } else if (!name) {
        throw new Error('jjv: schema needs either a name or id attribute.');
      }
      if (name)
        this.schema[normalizeID(name)] = schema;
    }
  };

  // Export for use in server and client.
  if (typeof module !== 'undefined' && typeof module.exports !== 'undefined')
    module.exports = Environment;
  else if (typeof define === 'function' && define.amd)
    define('util/jjv',[],function () {return Environment;});
  else
    window.jjv = Environment;
})();

define('core/metacore',[ "util/assert", "core/core", "core/tasync", "util/jjv" ], function(ASSERT, Core, TASYNC, JsonValidator) {
    

    // ----------------- CoreType -----------------

    var MetaCore = function(oldcore) {
        // copy all operations
        var core = {};
        for ( var key in oldcore) {
            core[key] = oldcore[key];
        }

        var sameNode = function(nodeA,nodeB){
            if(core.getPath(nodeA) === core.getPath(nodeB)){
                return true;
            }
            return false;
        };

        var realNode = function(node){ //TODO we have to make some more sophisticated distinction
            if(core.getPath(node).indexOf('_') !== -1){
                return false;
            }
            return true;
        };

        var MetaNode = function(node){
            return core.getChild(node,"_meta");
        };
        var MetaChildrenNode = function(node){
            return core.getChild(MetaNode(node),"children");
        };
        var MetaPointerNode = function(node,name){
            var meta = MetaNode(node),
                pointerNames = core.getPointerNames(meta) || [];
            if(pointerNames.indexOf(name) !== -1){
                return core.getChild(meta,"_p_"+name);
            }
            return null;
        };
        var _MetaPointerNode = function(node,name){
            //this function always gives back a node, use this if you just want to create the node as well
            core.setPointer(MetaNode(node),name,null);
            return core.getChild(MetaNode(node),"_p_"+name);
        };

        var MetaAspectsNode = function(node){
            return core.getChild(MetaNode(node),'aspects');
        };
        var MetaAspectNode = function(node,name){
            var aspectNode = MetaAspectsNode(node),
                names = core.getPointerNames(aspectNode) ||[];
            if(names.indexOf(name) !== -1){
                return core.getChild(aspectNode,"_a_"+name);
            }
            return null;
        };

        var _MetaAspectNode = function(node,name){
            //this function always gives back a node, use this if you just want to create the node as well
            var aspectNode = core.getChild(MetaNode(node),'aspects');

            core.setPointer(aspectNode,name,null);
            return core.getChild(aspectNode,"_a_"+name);
        };
        //now the additional functions
        core.isTypeOf = function(node, typeNode){
            if(!realNode(node)){
                return false;
            }
            while(node){
                if(sameNode(node,typeNode)){
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.isValidChildOf = function(node,parentNode){
            if(!realNode(node)){
                return true;
            }
            var validChildTypePaths = core.getMemberPaths(MetaChildrenNode(parentNode),"items") || [];
            while(node){
                if(validChildTypePaths.indexOf(core.getPath(node)) !== -1){
                    return true;
                }
                node = core.getBase(node);
            }
            return false;
        };

        core.getValidPointerNames = function(node){
            var validNames = core.getPointerNames(MetaNode(node)) || [],
                i,
                validPointerNames = [],
                metaPointerNode;

            for(i=0;i<validNames.length;i++){
                metaPointerNode = MetaPointerNode(node,validNames[i]);
                if(metaPointerNode.max === 1){ //TODO specify what makes something a pointer and what a set??? - can you extend a pointer to a set????
                    validPointerNames.push(validNames[i]);
                }
            }

            return validPointerNames;
        };

        core.getValidSetNames = function(node){
            var validNames = core.getPointerNames(MetaNode(node)) || [],
                i,
                validSetNames = [],
                metaPointerNode;

            for(i=0;i<validNames.length;i++){
                metaPointerNode = MetaPointerNode(node,validNames[i]);
                if(metaPointerNode.max === undefined || metaPointerNode.max === -1 || metaPointerNode.max > 1){ //TODO specify what makes something a pointer and what a set??? - can you extend a pointer to a set????
                    validSetNames.push(validNames[i]);
                }
            }

            return validSetNames;
        };

        core.isValidTargetOf = function(node,source,name){
            if(!realNode(source) || node === null){ //we position ourselves over the null-pointer layer
                return true;
            }
            var pointerMetaNode = MetaPointerNode(source,name);
            if(pointerMetaNode){
                var validTargetTypePaths = core.getMemberPaths(pointerMetaNode,"items") || [];
                while(node){
                    if(validTargetTypePaths.indexOf(core.getPath(node)) !== -1){
                        return true;
                    }
                    node = core.getBase(node);
                }
            }
            return false;
        };

        core.getValidAttributeNames = function(node){
            var names = [];
            if(realNode(node)){
                names = core.getAttributeNames(MetaNode(node)) || [];
            }
            return names;
        };

        core.isValidAttributeValueOf = function(node,name,value){
            //currently it only checks the name and the type
            if(!realNode(node)){
                return true;
            }
            if(core.getValidAttributeNames(node).indexOf(name) === -1){
                return false;
            }
            var meta = core.getAttribute(MetaNode(node),name);
            switch(meta.type){
                case "boolean":
                    if(value === true || value === false){
                        return true;
                    }
                    break;
                case "string":
                case "asset":
                    if(typeof value === 'string'){
                        return true;
                    }
                    break;
                case "integer":
                    if(!isNaN(parseInt(value)) && parseFloat(value) === parseInt(value)) {
                        return true;
                    }
                    break;
                case "float":
                    if(!isNaN(parseFloat(value))) {
                        return true;
                    }
                    break;
            }
            return false;
        };



        core.getValidAspectNames = function(node){
            return core.getPointerNames(MetaAspectsNode(node)) ||[];
        };

        //additional meta functions for getting meta definitions
        core.getJsonMeta = function(node){
            var meta = {children:{},attributes:{},pointers:{},aspects:{},constraints:{}},
                tempNode,
                names,
                pointer,
                i,j;

            //fill children part
            tempNode = MetaChildrenNode(node);

            meta.children.minItems = [];
            meta.children.maxItems = [];
            meta.children.items = core.getMemberPaths(tempNode,"items");
            for(i=0;i<meta.children.items.length;i++){
                meta.children.minItems.push(core.getMemberAttribute(tempNode,"items",meta.children.items[i],"min") || -1);
                meta.children.maxItems.push(core.getMemberAttribute(tempNode,"items",meta.children.items[i],"max") || -1);
            }
            meta.children.min = core.getAttribute(tempNode,"min");
            meta.children.max = core.getAttribute(tempNode,"max");

            //attributes
            names = core.getValidAttributeNames(node);
            for(i=0;i<names.length;i++){
                meta.attributes[names[i]] = core.getAttribute(MetaNode(node),names[i]);
            }

            //pointers
            names = core.getPointerNames(MetaNode(node));
            for(i=0;i<names.length;i++){
                tempNode = MetaPointerNode(node,names[i]);
                pointer = {};

                pointer.items = core.getMemberPaths(tempNode,"items");
                pointer.min = core.getAttribute(tempNode,"min");
                pointer.max = core.getAttribute(tempNode,"max");
                pointer.minItems = [];
                pointer.maxItems = [];

                for(j=0;j<pointer.items.length;j++){
                    pointer.minItems.push(core.getMemberAttribute(tempNode,"items",pointer.items[j],"min") || -1);
                    pointer.maxItems.push(core.getMemberAttribute(tempNode,"items",pointer.items[j],"max") || -1);

                }

                meta.pointers[names[i]] = pointer;
            }

            //aspects
            names = core.getValidAspectNames(node);

            for(i=0;i<names.length;i++){
                tempNode = MetaAspectNode(node,names[i]);
                meta.aspects[names[i]] = core.getMemberPaths(tempNode,'items') || [];
            }

            //constraints
            names = core.getConstraintNames(node);
            for(i=0;i<names.length;i++){
                meta.constraints[names[i]] = core.getConstraint(node,names[i]);
            }

            return meta;
        };

        var isEmptyObject = function(object){
            if(Object.keys(object).length === 0){
                return true;
            }
            return false;
        };
        var getObjectDiff = function(bigger,smaller){
            var diff = {},
                names, i,temp;
            if(smaller === null || smaller === undefined || isEmptyObject(smaller)){
                if(bigger === null || bigger === undefined){
                    return {};
                }
                return bigger;
            }

            names = Object.keys(bigger);
            for(i=0;i<names.length;i++){
                if(smaller[names[i]] === undefined){
                    //extra attribute of the bigger object
                    if(bigger[names[i]] !== undefined){
                        diff[names[i]] = bigger[names[i]];
                    } //if both are undefined, then they are equal :)
                } else {
                    //they share the attribute
                    if(typeof smaller[names[i]] === 'object'){
                        if(typeof bigger[names[i]] === 'object'){
                            temp = getObjectDiff(bigger[names[i]],smaller[names[i]]);
                            if(!isEmptyObject(temp)){
                                diff[names[i]] = temp;
                            }
                        } else {
                            diff[names[i]] = bigger[names[i]];
                        }
                    } else {
                        if(JSON.stringify(smaller[names[i]]) !== JSON.stringify(bigger[names[i]])){
                            diff[names[i]] = bigger[names[i]];
                        }
                    }
                }
            }

            return diff;

        };

        core.getOwnJsonMeta = function(node){
            var base = core.getBase(node),
                baseMeta = base ? core.getJsonMeta(base) : {},
                meta = core.getJsonMeta(node);

            return getObjectDiff(meta,baseMeta);
        };

        core.clearMetaRules = function(node){
            core.deleteNode(MetaNode(node));
        };

        core.setAttributeMeta = function(node,name,value){
            ASSERT(typeof value === 'object' && typeof name === 'string' && name);

            core.setAttribute(MetaNode(node),name,value);
        };
        core.delAttributeMeta = function(node,name){
            core.delAttribute(MetaNode(node),name);
        };
        core.getAttributeMeta = function(node,name){
            return core.getAttribute(MetaNode(node),name);
        };

        core.setChildMeta = function(node,child,min,max){
            core.addMember(MetaChildrenNode(node),'items',child);
            min = min || -1;
            max = max || -1;
            core.setMemberAttribute(MetaChildrenNode(node),'items',core.getPath(child),'min',min);
            core.setMemberAttribute(MetaChildrenNode(node),'items',core.getPath(child),'max',max);
        };
        core.delChildMeta = function(node,childPath){
            core.delMember(MetaChildrenNode(node),'items',childPath);
        };
        core.setChildrenMetaLimits = function(node,min,max){
            if(min){
                core.setAttribute(MetaChildrenNode(node),'min',min);
            }
            if(max){
                core.setAttribute(MetaChildrenNode(node),'max',max);
            }
        };

        core.setPointerMetaTarget = function(node,name,target,min,max){
            core.addMember(_MetaPointerNode(node,name),'items',target);
            min = min || -1;
            core.setMemberAttribute(_MetaPointerNode(node,name),'items',core.getPath(target),'min',min);
            max = max || -1;
            core.setMemberAttribute(_MetaPointerNode(node,name),'items',core.getPath(target),'max',max);
        };
        core.delPointerMetaTarget = function(node,name,targetPath){
            var metaNode = MetaPointerNode(node,name);
            if(metaNode){
                core.delMember(metaNode,'items',targetPath);
            }
        };
        core.setPointerMetaLimits = function(node,name,min,max){
            if(min){
                core.setAttribute(_MetaPointerNode(node,name),'min',min);
            }
            if(max){
                core.setAttribute(_MetaPointerNode(node,name),'max',max);
            }
        };
        core.delPointerMeta = function(node,name){
            core.deletePointer(MetaNode(node),name);
            core.deleteNode(_MetaPointerNode(node,name));
        };

        core.setAspectMetaTarget = function(node,name,target){
            core.addMember(_MetaAspectNode(node,name),'items',target);
        };
        core.delAspectMetaTarget = function(node,name,targetPath){
            var metaNode = MetaAspectNode(node,name);
            if(metaNode){
                core.delMember(metaNode,'items',targetPath);
            }
        };
        core.delAspectMeta = function(node,name){
            core.deletePointer(MetaAspectsNode(node),name);
            core.deleteNode(_MetaAspectNode(node,name));
        };

        //type related extra query functions
        var isOnMetaSheet = function(node){
            //MetaAspectSet
            var sets = core.isMemberOf(node);

            if(sets && sets[""] && sets[""].indexOf("MetaAspectSet") !== -1){ //TODO this is all should be global constant values
                return true;
            }
            return false;
        };
        core.getBaseType = function(node){
            //TODO this functions now uses the fact that we think of META as the MetaSetContainer of the ROOT
            while(node){
                if(isOnMetaSheet(node)){
                    return node;
                }
                node = core.getBase(node);
            }
            return null;
        };
        core.isInstanceOf = function(node,name){
            //TODO this is name based query - doesn't check the node's own name
            node = core.getBase(node);
            while(node){
                if(core.getAttribute(node,'name') === name){
                    return true;
                }
                node = core.getBase(node);
            }

            return false;
        };

        return core;
    };

    return MetaCore;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('core/core',["core/corerel",'core/setcore','core/guidcore','core/nullpointercore','core/coreunwrap', 'core/descriptorcore', 'core/coretype', 'core/constraintcore', 'core/coretree', 'core/metacore'],
			function (CoreRel, Set, Guid, NullPtr, UnWrap, Descriptor, Type, Constraint, CoreTree, MetaCore)
{
    

    function core(storage,options){
        options = options || {};
        options.usetype = options.usertype || 'nodejs';

        var corecon = new MetaCore(new Constraint(new Descriptor(new Guid(new Set(new NullPtr(new Type(new NullPtr(new CoreRel(new CoreTree(storage, options))))))))));

        if(options.usertype === 'tasync'){
            return corecon;
        } else {
            return new UnWrap(corecon);
        }
    }

    return core;
});

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/client',[ "util/assert", "util/guid" ], function (ASSERT, GUID) {
    

    function Database (options) {
        ASSERT(typeof options === "object");

        options.type = options.type || "browser";
        options.timeout = options.timeout || 100000;

        var _hostAddress = null;
        if(options.type === "browser") {
            _hostAddress = options.host || window.location.protocol + '//' + window.location.host;
        } else {
            _hostAddress = options.host + (options.port ? ':'+options.port : "");
        }


        var socketConnected = false,
            socket = null,
            status = null,
            reconnect = false,
            getDbStatusCallbacks = {},
            callbacks = {},
            getBranchHashCallbacks = {},
            IO = null,
            projects = {},
            references = {},
            ERROR_DISCONNECTED = 'The socket.io is disconnected',
            ERROR_TIMEOUT = "no valid response arrived in time",
            STATUS_NETWORK_DISCONNECTED = "socket.io is disconnected";

        function clearDbCallbacks () {
            var myCallbacks = [];
            for ( var i in getDbStatusCallbacks) {
                myCallbacks.push(getDbStatusCallbacks[i]);
                clearTimeout(getDbStatusCallbacks[i].to);
            }
            getDbStatusCallbacks = {};
            for (i = 0; i < myCallbacks.length; i++) {
                myCallbacks[i].cb(null, status);
            }
        }

        function clearCallbacks () {
            var myCallbacks = [];
            for ( var i in callbacks) {
                myCallbacks.push(callbacks[i]);
                clearTimeout(callbacks[i].to);
            }
            callbacks = {};
            for (i = 0; i < myCallbacks.length; i++) {
                myCallbacks[i].cb(ERROR_DISCONNECTED);
            }
        }

        function reSendGetBranches () {
            //this function should be called after reconnecting
            for ( var i in getBranchHashCallbacks) {
                projects[getBranchHashCallbacks[i].project].getBranchHash(i, getBranchHashCallbacks[i].oldhash, getBranchHashCallbacks[i].cb);
            }
        }

        function callbackTimeout (guid) {
            var cb = null, oldhash = "";
            if (callbacks[guid]) {
                cb = callbacks[guid].cb;
                delete callbacks[guid];
                cb(new Error(ERROR_TIMEOUT));
            } else if (getDbStatusCallbacks[guid]) {
                cb = getDbStatusCallbacks[guid].cb;
                delete getDbStatusCallbacks[guid];
                cb(null, status);
            } else if (getBranchHashCallbacks[guid]) {
                cb = getBranchHashCallbacks[guid].cb;
                oldhash = getBranchHashCallbacks[guid].oldhash;
                delete getBranchHashCallbacks[guid];
                cb(new Error(ERROR_TIMEOUT), null, null);
            }
        }

        function registerProject (id, name) {
            if (!references[name]) {
                references[name] = [];
            }
            if (references[name].indexOf(id) === -1) {
                references[name].push(id);
            }
        }

        function unRegisterProject (id, name) {
            if (references[name]) {
                var index = references[name].indexOf(id);
                if (index > -1) {
                    references[name].splice(index, 1);
                    if (references[name].length === 0) {
                        delete references[name];
                        return true;
                    } else {
                        return false;
                    }
                } else {
                    return false;
                }
            } else {
                return false;
            }
        }

        function openDatabase (callback) {
            ASSERT(typeof callback === "function");

            if (socket) {
                if (socketConnected) {
                    callback(null);
                } else {
                    //we should try to reconnect
                    callback(null);
                    socket.socket.reconnect();
                }
            } else {
                var guid = GUID(), firstConnection = true;
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };

                var IOReady = function () {
                    socket = IO.connect(_hostAddress,{
                        'connect timeout': 10,
                        'reconnection delay': 1,
                        'force new connection': true,
                        'reconnect': false,
                        'query':"webGMESessionId="+options.webGMESessionId
                    });

                    socket.on('connect', function () {
                        socketConnected = true;
                        if (firstConnection) {
                            firstConnection = false;
                            socket.emit('openDatabase', function (err) {
                                if (!err) {
                                    socket.emit('getDatabaseStatus', null, function (err, newstatus) {
                                        if (!err && newstatus) {
                                            status = newstatus;
                                        }
                                        if (callbacks[guid]) {
                                            clearTimeout(callbacks[guid].to);
                                            delete callbacks[guid];
                                            callback(err);
                                        }
                                    });
                                } else {
                                    socket.emit('disconnect');
                                    socket = null;
                                    if (callbacks[guid]) {
                                        clearTimeout(callbacks[guid].to);
                                        delete callbacks[guid];
                                        callback(err);
                                    }
                                }
                            });
                        } else {
                            socket.emit('getDatabaseStatus', status, function (err, newstatus) {
                                if (!err && newstatus) {
                                    status = newstatus;
                                    clearDbCallbacks();
                                    reSendGetBranches();
                                }
                            });
                        }
                    });

                    socket.on('disconnect', function () {
                        status = STATUS_NETWORK_DISCONNECTED;
                        socketConnected = false;
                        clearDbCallbacks();
                        clearCallbacks();
                        //socket.socket.reconnect();
                    });
                };

                if (options.type === 'browser') {
                    require([ _hostAddress + "/socket.io/socket.io.js" ], function () {
                        IO = io;
                        IOReady();
                    });
                } else {
                    /*IO = require("socket.io-client");
                     IOReady();*/
                    require([ 'socket.io-client' ], function (io) {
                        IO = io;
                        IOReady();
                    });
                }
            }
        }

        function closeDatabase (callback) {
            callback = callback || function () {
            };
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('closeDatabase', function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function fsyncDatabase (callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('fsyncDatabase', function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getDatabaseStatus (oldstatus, callback) {
            ASSERT(typeof callback === 'function');
            if (status !== oldstatus) {
                callback(null, status);
            } else {
                var guid = GUID();
                getDbStatusCallbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                if (status !== STATUS_NETWORK_DISCONNECTED) {
                    socket.emit('getDatabaseStatus', oldstatus, function (err, newstatus) {
                        if (!err && newstatus) {
                            status = newstatus;
                        }
                        if (callbacks[guid]) {
                            clearTimeout(getDbStatusCallbacks[guid].to);
                            delete getDbStatusCallbacks[guid];
                            callback(err,newstatus);
                            //TODO why this common error check is missing and what was redo meant???
                            /*commonErrorCheck(err, function (err2, needRedo) {
                                if (needRedo) {
                                    getDatabaseStatus(oldstatus, callback);
                                } else {
                                    callback(err2, newstatus);
                                }
                            });*/
                        }
                    });
                }
            }
        }

        function getProjectNames (callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('getProjectNames', function (err, names) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, names);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getAllowedProjectNames (callback){
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('getAllowedProjectNames', function (err, names) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, names);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function getAuthorizationInfo (name,callback){
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('getAuthorizationInfo', name, function (err, authInfo) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err, authInfo);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function deleteProject (project, callback) {
            ASSERT(typeof callback === 'function');
            if (socketConnected) {
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout, options.timeout, guid)
                };
                socket.emit('deleteProject', project, function (err) {
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }

        function getNextServerEvent(latestGuid,callback){
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,options.timeout, guid)
                };
                socket.emit('getNextServerEvent',latestGuid,function(err,newGuid,eventParams){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,newGuid,eventParams);
                    }
                });
            }
        }
        function openProject (project, callback) {
            ASSERT(typeof callback === 'function');
            var ownId = GUID();
            if (projects[project]) {
                registerProject(ownId, project);
                callback(null, projects[project]);
            } else {
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('openProject', project, function (err) {
                        if (!err) {
                            registerProject(ownId, project);
                            if (callbacks[guid]) {
                                clearTimeout(callbacks[guid].to);
                                delete callbacks[guid];
                                projects[project] = {
                                    fsyncDatabase: fsyncDatabase,
                                    getDatabaseStatus: getDatabaseStatus,
                                    closeProject: closeProject,
                                    loadObject: loadObject,
                                    insertObject: insertObject,
                                    findHash: findHash,
                                    dumpObjects: dumpObjects,
                                    getBranchNames: getBranchNames,
                                    getBranchHash: getBranchHash,
                                    setBranchHash: setBranchHash,
                                    getCommits: getCommits,
                                    makeCommit: makeCommit,
                                    ID_NAME: "_id"
                                };
                                callback(null, projects[project]);
                            }
                        } else {
                            callback(err, null);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            //functions

            function fsyncDatabase (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('fsyncDatabase', function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getDatabaseStatus (oldstatus, callback) {
                ASSERT(typeof callback === 'function');
                if (status !== oldstatus) {
                    callback(null, status);
                } else {
                    var guid = GUID();
                    getDbStatusCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    if (socketConnected) {
                        socket.emit('getDatabaseStatus', oldstatus, function (err, newstatus) {
                            if (getDbStatusCallbacks[guid]) {
                                clearTimeout(getDbStatusCallbacks[guid].to);
                                delete getDbStatusCallbacks[guid];
                                if (!err && newstatus) {
                                    status = newstatus;
                                }
                                callback(err, newstatus);
                            }
                        });
                    }
                }
            }

            function closeProject (callback) {
                callback = callback || function () {
                };
                if (unRegisterProject(ownId, project)) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('closeProject', project, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(null);
                }
            }

            function _loadObject(hash,callback){
                socket.emit('loadObject',project,hash,callback);
            }
            function loadObject (hash, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    if(loadBucketSize === 0){
                        ++loadBucketSize;
                        loadBucket.push({hash:hash,cb:callback});
                        loadBucketTimer = setTimeout(function(){
                            var myBucket = loadBucket;
                            loadBucket = [];
                            loadBucketTimer = null;
                            loadBucketSize = 0;
                            loadObjects(myBucket);
                        },10);
                    } else if (loadBucketSize === 99){
                        loadBucket.push({hash:hash,cb:callback});
                        var myBucket = loadBucket;
                        loadBucket = [];
                        clearTimeout(loadBucketTimer);
                        loadBucketTimer = null;
                        loadBucketSize = 0;
                        loadObjects(myBucket);
                    } else {
                        loadBucket.push({hash:hash,cb:callback});
                        ++loadBucketSize;
                    }
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            var loadBucket = [],
                loadBucketSize = 0,
                loadBucketTimer;
            function loadObjects (hashedObjects){
                var hashes = {},i;
                for(i=0;i<hashedObjects.length;i++){
                    hashes[hashedObjects[i].hash] = true;
                }
                hashes = Object.keys(hashes);
                socket.emit('loadObjects',project,hashes,function(err,results){
                    for(i=0;i<hashedObjects.length;i++){
                        hashedObjects[i].cb(err,results[hashedObjects[i].hash]);
                    }
                });

            }

            function insertObject (object, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    if(saveBucketSize === 0){
                        ++saveBucketSize;
                        saveBucket.push({object:object,cb:callback});
                        saveBucketTimer = setTimeout(function(){
                            var myBucket = saveBucket;
                            saveBucket = [];
                            saveBucketTimer = null;
                            saveBucketSize = 0;
                            insertObjects(myBucket);
                        },10);
                    } else if (saveBucketSize === 99){
                        saveBucket.push({object:object,cb:callback});
                        var myBucket = saveBucket;
                        saveBucket = [];
                        clearTimeout(saveBucketTimer);
                        saveBucketTimer = null;
                        saveBucketSize = 0;
                        insertObjects(myBucket);
                    } else {
                        ++saveBucketSize;
                        saveBucket.push({object:object,cb:callback});
                    }
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            var saveBucket = [],
                saveBucketSize = 0,
                saveBucketTimer;
            function insertObjects (objects) {
                var storeObjects = [],i;
                for(i=0;i<objects.length;i++){
                    storeObjects.push(objects[i].object);
                }
                socket.emit('insertObjects',project,storeObjects,function(err){
                    for(i=0;i<objects.length;i++){
                        objects[i].cb(err);
                    }
                });
            }
            function _insertObject (object, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('insertObject', project, object, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function findHash (beginning, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('findHash', project, beginning, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function dumpObjects (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('dumpObjects', project, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchNames (callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('getBranchNames', project, function (err, names) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err, names);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getBranchHash (branch, oldhash, callback) {
                ASSERT(typeof callback === 'function');
                var guid = GUID();
                if (getBranchHashCallbacks[branch]) {
                    //internal hack for recalling
                    guid = branch;
                    branch = getBranchHashCallbacks[guid].branch;
                } else {
                    getBranchHashCallbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid),
                        branch: branch,
                        oldhash: oldhash,
                        project: project
                    };
                }

                if (socketConnected) {
                    socket.emit('getBranchHash', project, branch, oldhash, function (err, newhash, forkedhash) {
                        if (getBranchHashCallbacks[guid]) {
                            clearTimeout(getBranchHashCallbacks[guid].to);
                            delete getBranchHashCallbacks[guid];
                            callback(err, newhash, forkedhash);
                        }
                    });
                }

            }

            function setBranchHash (branch, oldhash, newhash, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('setBranchHash', project, branch, oldhash, newhash, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function getCommits (before, number, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('getCommits', project, before, number, function (err, commits) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err, commits);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }

            function makeCommit (parents, roothash, msg, callback) {
                ASSERT(typeof callback === 'function');
                if (socketConnected) {
                    var guid = GUID();
                    callbacks[guid] = {
                        cb: callback,
                        to: setTimeout(callbackTimeout, options.timeout, guid)
                    };
                    socket.emit('makeCommit', project, parents, roothash, msg, function (err) {
                        if (callbacks[guid]) {
                            clearTimeout(callbacks[guid].to);
                            delete callbacks[guid];
                            callback(err);
                        }
                    });
                } else {
                    callback(new Error(ERROR_DISCONNECTED));
                }
            }
        }

        function simpleRequest (parameters,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
                };
                socket.emit('simpleRequest',parameters,function(err,resId){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,resId);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function simpleResult (resultId,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
                };
                socket.emit('simpleResult',resultId,function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function simpleQuery (workerId,parameters,callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
                };
                socket.emit('simpleQuery',workerId,parameters,function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        function getToken(callback){
            ASSERT(typeof callback === 'function');
            if(socketConnected){
                var guid = GUID();
                callbacks[guid] = {
                    cb: callback,
                    to: setTimeout(callbackTimeout,100*options.timeout, guid)
                };
                socket.emit('getToken',function(err,result){
                    if(callbacks[guid]){
                        clearTimeout(callbacks[guid].to);
                        delete callbacks[guid];
                        callback(err,result);
                    }
                });
            } else {
                callback(new Error(ERROR_DISCONNECTED));
            }
        }
        return {
            openDatabase: openDatabase,
            closeDatabase: closeDatabase,
            fsyncDatabase: fsyncDatabase,
            getDatabaseStatus: getDatabaseStatus,
            getProjectNames: getProjectNames,
            getAllowedProjectNames: getAllowedProjectNames,
            getAuthorizationInfo: getAuthorizationInfo,
            deleteProject: deleteProject,
            openProject: openProject,
            simpleRequest: simpleRequest,
            simpleResult: simpleResult,
            simpleQuery: simpleQuery,
            getNextServerEvent: getNextServerEvent,
            getToken: getToken
        };
    }
    return Database;
});

/**
 * Created by tkecskes on 5/10/2014.
 */
;
/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/failsafe',[ "util/assert", "util/guid" ], function (ASSERT, GUID) {
	
	var BRANCH_OBJ_ID = '*branch*';
	var BRANCH_STATES = {
		SYNC: 'sync',
		FORKED: 'forked',
		DISCONNECTED: 'disconnected',
		AHEAD: 'ahead'
	};

	function Database (_database, options) {
		ASSERT(typeof options === "object" && typeof _database === "object");
		options.failsafe = options.failsafe || "memory";
		options.failsafefrequency = options.failsafefrequency || 10000;
		options.timeout = options.timeout || 10000;

		var exceptionErrors = [], fsId = "FS", dbId = options.database || "noID", SEPARATOR = "$", STATUS_CONNECTED = "connected", pendingStorage = {}, storage = null;

		function loadPending () {
			for ( var i = 0; i < storage.length; i++) {
				if (storage.key(i).indexOf(fsId) === 0) {
					var keyArray = storage.key(i).split(SEPARATOR);
					ASSERT(keyArray.length === 4);
					if (keyArray[1] === dbId) {
						var object = JSON.parse(storage.getItem(storage.key(i)));
						pendingStorage[keyArray[2]] = object;
					}
				}
			}
			for (i in pendingStorage) {
				if (!pendingStorage[i][BRANCH_OBJ_ID]) {
					pendingStorage[i][BRANCH_OBJ_ID] = {};
				}
			}
		}

		function savePending () {
			//TODO maybe some check would be good, but not necessarily
			for ( var i in pendingStorage) {
				storage.setItem(fsId + SEPARATOR + dbId + SEPARATOR + i, JSON.stringify(pendingStorage[i]));
			}
		}

		function openDatabase (callback) {
			if (options.failsafe === "local" && localStorage) {
				storage = localStorage;
			} else if (options.failsafe === "session" && sessionStorage) {
				storage = sessionStorage;
			} else if (options.failsafe === "memory") {
				storage = {
					length: 0,
					keys: [],
					data: {},
					getItem: function (key) {
						ASSERT(typeof key === "string");
						return this.data[key];
					},
					setItem: function (key, object) {
						ASSERT(typeof key === "string" && typeof object === "string");
						this.data[key] = object;
						this.keys.push(key);
						this.length++;
					},
					key: function (index) {
						return this.keys[index];
					}
				};
			}

			if (storage) {
				loadPending();
				setInterval(savePending, options.failsafefrequency);
				_database.openDatabase(callback);
			} else {
				callback(new Error('cannot initialize fail safe storage'));
			}
		}

		function closeDatabase (callback) {
			_database.closeDatabase(callback);
		}

		function fsyncDatabase (callback) {
			_database.fsyncDatabase(function (err) {
				//TODO we should start to select amongst errors
				callback(null);
			});
		}

		function getProjectNames (callback) {
			_database.getProjectNames(callback);
		}

        function getAllowedProjectNames(callback) {
            _database.getAllowedProjectNames(callback);
        }

		function deleteProject (project, callback) {
			_database.deleteProject(project, callback);
		}

		function openProject (projectName, callback) {
			var project = null;
			var inSync = true;
			_database.openProject(projectName, function (err, proj) {
				if (!err && proj) {
					project = proj;
					if (!pendingStorage[projectName]) {
						pendingStorage[projectName] = {};
						pendingStorage[projectName][BRANCH_OBJ_ID] = {};
					}
					callback(null, {
						fsyncDatabase: fsyncDatabase,
						getDatabaseStatus: project.getDatabaseStatus,
						closeProject: project.closeProject,
						loadObject: loadObject,
						insertObject: insertObject,
						findHash: project.findHash,
						dumpObjects: project.dumpObjects,
						getBranchNames: getBranchNames,
						getBranchHash: getBranchHash,
						setBranchHash: setBranchHash,
						getCommits: project.getCommits,
						makeCommit: project.makeCommit,
						ID_NAME: project.ID_NAME
					});
				} else {
					callback(err, project);
				}
			});

			function synchronise (callback) {
				if (pendingStorage[projectName]) {
					var objects = [];
					var count = 0;
					var savingObject = function (object, cb) {
						project.insertObject(object, function (err) {
							if (err) {
								if (!pendingStorage[projectName]) {
									pendingStorage[projectName] = {};
								}
								pendingStorage[projectName][object._id] = object;
							}
							cb();
						});
					};
					var objectProcessed = function () {
						if (--count === 0) {
							callback();
						}
					};

					for ( var i in pendingStorage[projectName]) {
						if (i !== BRANCH_OBJ_ID) {
							objects.push(pendingStorage[projectName][i]);
						}
					}
					var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID];
					pendingStorage[projectName] = {};
					pendingStorage[projectName][BRANCH_OBJ_ID] = branchObj;

					//synchronizing the branches
					var aheadBranches = [];
					for (i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
						if (pendingStorage[projectName][BRANCH_OBJ_ID][i].state === BRANCH_STATES.DISCONNECTED) {
							if (pendingStorage[projectName][BRANCH_OBJ_ID][i].local.length > 0) {
								pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.AHEAD;
								//we try to save our local head
								aheadBranches.push(i);
							} else {
								pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.SYNC;
							}
						}
					}

					count = objects.length + aheadBranches.length;
					for (i = 0; i < aheadBranches.length; i++) {
						synchroniseBranch(aheadBranches[i], objectProcessed);
					}
					for (i = 0; i < objects.length; i++) {
						savingObject(objects[i], objectProcessed);
					}
					if (objects.length === 0) {
						callback();
					}
				} else {
					callback();
				}
			}

			function synchroniseBranch (branchname, callback) {
				var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branchname];
				project.getBranchHash(branchname, branchObj.local[0], function (err, newhash, forked) {
					if (!err && newhash) {
						if (branchObj.local.indexOf(newhash) !== -1) {
							project.setBranchHash(branchname, newhash, branchObj.local[0], callback);
						} else {
							//we forked
							branchObj.state = BRANCH_STATES.FORKED;
							branchObj.fork = newhash;
							callback(null);
						}
					} else {
						callback(err);
					}
				});
			}

			function errorMode () {
				if (inSync) {
					inSync = false;
					for ( var i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
						if (pendingStorage[projectName][BRANCH_OBJ_ID][i].state !== BRANCH_STATES.FORKED) {
							pendingStorage[projectName][BRANCH_OBJ_ID][i].state = BRANCH_STATES.DISCONNECTED;
						}
					}
					var checkIfAvailable = function (err, newstate) {
						if (newstate === STATUS_CONNECTED) {
							synchronise(function () {
								inSync = true;
							});
						} else {
							project.getDatabaseStatus(newstate, checkIfAvailable);
						}
					};
					project.getDatabaseStatus(null, checkIfAvailable);
				}
			}

			function loadObject (hash, callback) {
				project.loadObject(hash, function (err, object) {
					if (!err && object) {
						callback(null, object);
					} else {
						errorMode();
						if (exceptionErrors.indexOf(err) !== -1) {
							callback(err, object);
						} else {
							if (pendingStorage[projectName] && pendingStorage[projectName][hash]) {
								callback(null, pendingStorage[projectName][hash]);
							} else {
								callback(err, object);
							}
						}
					}
				});
			}

			function insertObject (object, callback) {
				project.insertObject(object, function (err) {
					if (err) {
						errorMode();
						if (exceptionErrors.indexOf(err) !== -1) {
							callback(err);
						} else {
							//TODO have to check if the id is already taken...
							if (!pendingStorage[projectName]) {
								pendingStorage[projectName] = {};
							}
							pendingStorage[projectName][object._id] = object;
							callback(null);
						}
					} else {
						callback(err);
					}
				});
			}

			function getBranchNames (callback) {
				project.getBranchNames(function (err, names) {
					//we need the locally stored names either way
					var locals = {};
					for ( var i in pendingStorage[projectName][BRANCH_OBJ_ID]) {
						if (pendingStorage[projectName][BRANCH_OBJ_ID][i].local.length > 0) {
							locals[i] = pendingStorage[projectName][BRANCH_OBJ_ID][i].local[0];
						} else if (pendingStorage[projectName][BRANCH_OBJ_ID][i].fork === null && pendingStorage[projectName][BRANCH_OBJ_ID][i].remote !== null) {
							locals[i] = pendingStorage[projectName][BRANCH_OBJ_ID][i].remote;
						}
					}

					if (err) {
						errorMode();
						if (exceptionErrors.indexOf(err) !== -1) {
							callback(err);
						} else {
							callback(null, locals);
						}
					} else {
						for (i in names) {
							if (!locals[i]) {
								locals[i] = names[i];
							} else if (locals[i] === pendingStorage[projectName][BRANCH_OBJ_ID][i].remote) {
								locals[i] = names[i];
							}
						}
						callback(err, locals);
					}
				});
			}

			function getBranchHash (branch, oldhash, callback) {
				if (!pendingStorage[projectName][BRANCH_OBJ_ID][branch]) {
					pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {
						local: [],
						fork: null,
						state: BRANCH_STATES.SYNC,
						remote: null
					};
				}
				var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

				if (branchObj.state === BRANCH_STATES.SYNC || branchObj.state === BRANCH_STATES.AHEAD) {
					project.getBranchHash(branch, oldhash, function (err, newhash, forkedhash) {
						if (!err && newhash) {
							branchObj.remote = newhash;
						}
						switch (branchObj.state) {
						case BRANCH_STATES.SYNC:
							callback(err, newhash, forkedhash);
							break;
						case BRANCH_STATES.AHEAD:
							if (err) {
								callback(err, newhash, forkedhash);
							} else {
								if (newhash && branchObj.local.indexOf(newhash) !== -1) {
									callback(err, newhash, forkedhash);
								} else {
									//we forked!!!
									branchObj.state = BRANCH_STATES.FORKED;
									branchObj.fork = newhash;
									callback(null, branchObj.local[0], branchObj.fork);
								}
							}
							break;
						case BRANCH_STATES.DISCONNECTED:
							callback(null, branchObj.local[0], branchObj.fork);
							break;
						default://forked
							callback(null, branchObj.local[0], branchObj.fork);
							break;
						}
					});
				} else {
					//served locally
					ASSERT((branchObj.local[0] && branchObj.local[0] !== "") || branchObj.remote);
					var myhash = null;
					if (branchObj.local[0]) {
						myhash = branchObj.local[0];
					} else {
						myhash = branchObj.remote;
					}

					if (myhash === oldhash) {
						setTimeout(function () {
							callback(null, oldhash, branchObj.fork);
						}, options.timeout);
					} else {
						callback(null, myhash, branchObj.fork);
					}

				}
			}

			function setBranchHash (branch, oldhash, newhash, callback) {
				ASSERT(typeof oldhash === 'string' && typeof newhash === 'string');
				if (!pendingStorage[projectName][BRANCH_OBJ_ID][branch]) {
					pendingStorage[projectName][BRANCH_OBJ_ID][branch] = {
						local: [],
						fork: null,
						state: BRANCH_STATES.SYNC
					};
				}
				var branchObj = pendingStorage[projectName][BRANCH_OBJ_ID][branch];

				var returnFunction = function (err) {
					if (!err) {
						var index = branchObj.local.indexOf(newhash);
						ASSERT(index !== -1);
						branchObj.local.splice(index, branchObj.local.length - index);
						if (branchObj.local.length === 0) {
							branchObj.state = BRANCH_STATES.SYNC;
						}
					} else {
						/*//we go to disconnected state
						ASSERT(branchObj.local.length > 0);
						if(branchObj.state !== BRANCH_STATES.DISCONNECTED){
						    branchObj.state = BRANCH_STATES.DISCONNECTED;
						    var reSyncBranch = function(err,newhash,forkedhash){
						        if(!err && newhash){
						            if(branchObj.local.indexOf(newhash) === -1){
						                //we forked
						                branchObj.fork = newhash;
						                branchObj.state = BRANCH_STATES.FORKED;
						            } else {
						                setBranchHash(branch,newhash,branchObj.local[0],function(){});
						            }
						        } else {
						            //timeout or something not correct, so we should retry
						            project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
						        }
						    };
						    project.getBranchHash(branch,branchObj.local[0],reSyncBranch);
						}*/
						//we have ancountered an error
						errorMode();
					}
				};

				switch (branchObj.state) {
				case BRANCH_STATES.SYNC:
					ASSERT(branchObj.local.length === 0);
					branchObj.state = BRANCH_STATES.AHEAD;
					branchObj.local = [ newhash, oldhash ];
					project.setBranchHash(branch, oldhash, newhash, returnFunction);
					callback(null);
					return;
				case BRANCH_STATES.AHEAD:
					ASSERT(branchObj.local.length > 0);
					if (oldhash === branchObj.local[0]) {
						branchObj.local.unshift(newhash);
						project.setBranchHash(branch, oldhash, newhash, returnFunction);
						callback(null);
					} else {
						callback(new Error("branch hash mismatch"));
					}
					return;
				case BRANCH_STATES.DISCONNECTED:
					/*ASSERT(branchObj.local.length > 0 || branchObj.remote);
					if(oldhash === branchObj.local[0] || oldhash === branchObj.remote){
					    if(branchObj.local.length === 0){
					        branchObj.local = [newhash,oldhash];
					    } else {
					        branchObj.local.unshift(newhash);
					    }
					    callback(null);
					} else {
					    callback(new Error("branch hash mismatch"));
					}*/
					if (branchObj.local.length === 0) {
						branchObj.local = [ newhash, oldhash ];
						callback(null);
					} else {
						if (oldhash === branchObj.local[0]) {
							branchObj.local.unshift(newhash);
							callback(null);
						} else {
							callback(new Error("branch hash mismatch"));
						}
					}
					return;
				default: //BRANCH_STATES.FORKED
					ASSERT(branchObj.local.length > 0 && branchObj.fork);
					if (oldhash === branchObj.local[0]) {
						if (branchObj.fork === newhash) {
							//clearing the forked leg
							branchObj.fork = null;
							branchObj.state = BRANCH_STATES.SYNC;
							branchObj.local = [];
						} else {
							branchObj.local.unshift(newhash);
						}
						callback(null);
					} else {
						callback(new Error("branch hash mismatch"));
					}
					return;
				}
			}
		}

		return {
			openDatabase: openDatabase,
			closeDatabase: closeDatabase,
			fsyncDatabase: fsyncDatabase,
			getProjectNames: getProjectNames,
            getAllowedProjectNames: getAllowedProjectNames,
            getAuthorizationInfo: _database.getAuthorizationInfo,
			getDatabaseStatus: _database.getDatabaseStatus,
			openProject: openProject,
			deleteProject: deleteProject,
            simpleRequest: _database.simpleRequest,
            simpleResult: _database.simpleResult,
            simpleQuery: _database.simpleQuery,
            getNextServerEvent: _database.getNextServerEvent,
            getToken: _database.getToken
		};
	}

	return Database;
});

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/hashcheck',[ "util/assert", "util/zssha1", "util/canon" ], function (ASSERT,SHA1,CANON) {
    

    var zsSHA = new SHA1();

    function Database (_innerDb, options) {
        ASSERT(typeof options === "object" && typeof _innerDb === "object");
        var database = {};
        for(var i in _innerDb){
            database[i] = _innerDb[i];
        }

        //we have to modify the openProject function
        database.openProject = function(projectName, callback){
            _innerDb.openProject(projectName,function(err,innerProject){
                if(!err && innerProject){
                    var project = {};
                    for(var i in innerProject){
                        project[i] = innerProject[i];
                    }

                    //we add the hash check to insertObject
                    project.insertObject = function(object, cb){
                        var inHash = object[project.ID_NAME];
                        object[project.ID_NAME] = "";
                        var checkHash = "#" + zsSHA.getHash(CANON.stringify(object));
                        object[project.ID_NAME] = inHash;

                        if(inHash !== checkHash){
                            cb("wrong hash: expeced - "+checkHash+", received - "+inHash);
                        } else {
                            innerProject.insertObject(object,cb);
                        }
                    };

                    callback(null,project);

                } else {
                    callback(err);
                }
            });
        };

        return database;
    }

    return Database;
});

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 * 
 * Author: Miklos Maroti
 */

define('storage/cache',[ "util/assert" ], function (ASSERT) {
	

	var Lock = function () {
		var waiters = [];

		return {
			lock: function (func) {
				waiters.push(func);
				if (waiters.length === 1) {
					func();
				}
			},

			unlock: function () {
                waiters.shift();
				if (waiters.length >= 1) {
					var func = waiters[0];
					func();
				}
			}
		};
	};

	var Database = function (database, options) {
		ASSERT(typeof database === "object" && typeof options === "object");

		options.cache = options.cache || 2000;

		var projects = {};
		var dlock = new Lock();

		function openProject (name, callback) {
			ASSERT(typeof name === "string" && typeof callback === "function");

			dlock.lock(function () {
				if (typeof projects[name] !== "undefined") {
					projects[name].reopenProject(callback);
					dlock.unlock();
				} else {
					database.openProject(name, function (err, project) {
						if (err) {
							callback(err);
						} else {
							project = wrapProject(name, project);
							projects[name] = project;
							project.reopenProject(callback);
						}
						dlock.unlock();
					});
				}
			});
		}

		function closeDatabase (callback) {
			dlock.lock(function () {
				var n;
				for (n in projects) {
					projects[n].abortProject();
				}
				projects = {};
				database.closeDatabase(callback);
				dlock.unlock();
			});
		}

		function deleteProject (name, callback) {
			if (typeof projects[name] !== "undefined") {
				projects[name].deleteProject();
			}

			database.deleteProject(name, callback);
		}

		function wrapProject (name, project) {
			var ID_NAME = project.ID_NAME;

			var refcount = 0;
			var branches = {};
			var missing = {};
			var backup = {};
			var cache = {};
			var cacheSize = 0;

			function deepFreeze (obj) {
				ASSERT(typeof obj === "object");


                try{
				    Object.freeze(obj);
                }
                catch(e){
                    //TODO find the proper answer why this can occur
                    return;
                }

				var key;
				for (key in obj) {
					if (obj[key] !== null && typeof obj[key] === "object") {
						deepFreeze(obj[key]);
					}
				}
			}

			function cacheInsert (key, obj) {
				ASSERT(typeof cache[key] === "undefined" && obj[ID_NAME] === key);

				deepFreeze(obj);
				cache[key] = obj;

				if (++cacheSize >= options.cache) {
					backup = cache;
					cache = {};
					cacheSize = 0;
				}
			}

			function loadObject (key, callback) {
				ASSERT(typeof key === "string" && typeof callback === "function");
				ASSERT(project !== null);

				var obj = cache[key];
				if (typeof obj === "undefined") {
					obj = backup[key];
					if (typeof obj === "undefined") {
						obj = missing[key];
						if (typeof obj === "undefined") {
							obj = [ callback ];
							missing[key] = obj;
							project.loadObject(key, function (err, obj2) {
								ASSERT(typeof obj2 === "object" || typeof obj2 === "undefined");

								if (obj.length !== 0) {
									ASSERT(missing[key] === obj);

									delete missing[key];
									if (!err && obj2) {
										cacheInsert(key, obj2);
									}

									var cb;
									while ((cb = obj.pop())) {
										cb(err, obj2);
									}
								}
							});
						} else {
							obj.push(callback);
						}
						return;
					} else {
						cacheInsert(key, obj);
					}
				}

				ASSERT(typeof obj === "object" && obj !== null && obj[ID_NAME] === key);
				callback(null, obj);
			}

			function insertObject (obj, callback) {
				ASSERT(typeof obj === "object" && obj !== null && typeof callback === "function");

				var key = obj[ID_NAME];
				ASSERT(typeof key === "string");

				if (typeof cache[key] !== "undefined") {
					callback(null);
					return;
				} else {
					var item = backup[key];
					cacheInsert(key, obj);

					if (typeof item !== "undefined") {
						callback(null);
						return;
					} else {
						item = missing[key];
						if (typeof item !== "undefined") {
							delete missing[key];

							var cb;
							while ((cb = item.pop())) {
								cb(null, obj);
							}
						}
					}
				}

				project.insertObject(obj, callback);
			}

			function abortProject (callback) {
				if (project !== null) {
					var p = project;
					project = null;
					delete projects[name];
					deleteProject();
					p.closeProject(callback);
				} else if (typeof callback === "function ") {
					callback(null);
				}
			}

			function closeProject (callback) {
				ASSERT(refcount >= 1);

				if (--refcount === 0) {
					abortProject(callback);
				} else if (typeof callback === "function") {
					callback(null);
				}
			}

			function deleteProject () {
				var key, callbacks, cb, err = new Error("cache closed");
				for (key in missing) {
					callbacks = missing[key];
					while ((cb = callbacks.pop())) {
						cb(err);
					}
				}

				for (key in branches) {
					callbacks = branches[key];
					while ((cb = callbacks.pop())) {
						cb(err);
					}
				}

				branches = {};
				missing = {};
				backup = {};
				cache = {};
				cacheSize = 0;
			}

			function getBranchHash (name, oldhash, callback) {
				ASSERT(typeof name === "string" && typeof callback === "function");
				ASSERT(typeof oldhash === "string" || oldhash === null);

				var tag = name + "@" + oldhash;
				var branch = branches[tag];
				if (typeof branch === "undefined") {
					branch = [ callback ];
					branches[tag] = branch;

					project.getBranchHash(name, oldhash, function (err, newhash, forkedhash) {
						if (branches[tag] === branch) {
							var cb;
							delete branches[tag];

							while ((cb = branch.pop())) {
								cb(err, newhash, forkedhash);
							}
						}
					});
				} else {
					branch.push(callback);
				}
			}

			function setBranchHash (name, oldhash, newhash, callback) {
				ASSERT(typeof name === "string" && typeof oldhash === "string");
				ASSERT(typeof newhash === "string" && typeof callback === "function");

				project.setBranchHash(name, oldhash, newhash, function (err) {
					if (!err) {
						var prefix = name + "@", tag;
						for (tag in branches) {
							if (tag.substr(0, prefix.length) === prefix) {
								var cb, branch = branches[tag];
								delete branches[tag];

								while ((cb = branch.pop())) {
									cb(err, newhash, null);
								}
							}
						}
					}

					callback(err);
				});
			}

			function reopenProject (callback) {
				ASSERT(project !== null && refcount >= 0 && typeof callback === "function");

				++refcount;
				callback(null, {
					fsyncDatabase: project.fsyncDatabase,
					getDatabaseStatus: project.getDatabaseStatus,
					closeProject: closeProject,
					loadObject: loadObject,
					insertObject: insertObject,
					findHash: project.findHash,
					dumpObjects: project.dumpObjects,
					getBranchNames: project.getBranchNames,
					getBranchHash: getBranchHash,
					setBranchHash: setBranchHash,
          //getBranchHash: project.getBranchHash,
          //setBranchHash: project.setBranchHash,
					getCommits: project.getCommits,
					makeCommit: project.makeCommit,
					ID_NAME: project.ID_NAME
				});
			}

			return {
				reopenProject: reopenProject,
				abortProject: abortProject,
				deleteProject: deleteProject
			};
		}

		return {
			openDatabase: database.openDatabase,
			closeDatabase: closeDatabase,
			fsyncDatabase: database.fsyncDatabase,
			getDatabaseStatus: database.getDatabaseStatus,
			getProjectNames: database.getProjectNames,
            getAllowedProjectNames: database.getAllowedProjectNames,
            getAuthorizationInfo: database.getAuthorizationInfo,
			openProject: openProject,
			deleteProject: deleteProject,
            simpleRequest: database.simpleRequest,
            simpleResult: database.simpleResult,
            simpleQuery: database.simpleQuery,
            getNextServerEvent: database.getNextServerEvent,
            getToken: database.getToken
		};
	};

	return Database;
});

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/commit',[ "util/assert", "util/zssha1", "util/canon" ], function (ASSERT, SHA1, CANON) {
	
	var HASH_REGEXP = new RegExp("^#[0-9a-zA-Z_]*$");
    var zsSHA = new SHA1();

	function Database (_database,_options) {
        _options = _options || {};
		ASSERT(typeof _database === "object");

		function openProject (projectName, callback) {

			var _project = null;
			_database.openProject(projectName, function (err, proj) {
				if (!err && proj) {
					_project = proj;
					callback(null, {
						fsyncDatabase: _project.fsyncDatabase,
						closeProject: _project.closeProject,
						loadObject: _project.loadObject,
						insertObject: _project.insertObject,
						findHash: _project.findHash,
						dumpObjects: _project.dumpObjects,
						getBranchNames: _project.getBranchNames,
						getBranchHash: _project.getBranchHash,
						setBranchHash: _project.setBranchHash,
						getCommits: _project.getCommits,
						makeCommit: makeCommit,
                        setUser: setUser,
						ID_NAME: _project.ID_NAME
					});
				} else {
					callback(err, proj);
				}
			});

			function makeCommit (parents, roothash, msg, callback) {
				ASSERT(HASH_REGEXP.test(roothash));
				ASSERT(typeof callback === 'function');

				parents = parents || [];
				msg = msg || "n/a";

				var commitObj = {
					root: roothash,
					parents: parents,
					updater: [ _options.user ],
					time: (new Date()).getTime(),
					message: msg,
					type: "commit"
				};

				var id = '#' + zsSHA.getHash(CANON.stringify(commitObj));
				commitObj[_project.ID_NAME] = id;

				_project.insertObject(commitObj, function (err) {
					if (err) {
						callback(err);
					} else {
						callback(null, id);
					}
				});

				return id;
			}

            function setUser (userId){
                if(typeof userId === 'string'){
                    _options.user = userId;
                };
            }
		}

		return {
			openDatabase: _database.openDatabase,
			closeDatabase: _database.closeDatabase,
			fsyncDatabase: _database.fsyncDatabase,
			getProjectNames: _database.getProjectNames,
            getAllowedProjectNames: _database.getAllowedProjectNames,
            getAuthorizationInfo: _database.getAuthorizationInfo,
			getDatabaseStatus: _database.getDatabaseStatus,
			openProject: openProject,
			deleteProject: _database.deleteProject,
            simpleRequest: _database.simpleRequest,
            simpleResult: _database.simpleResult,
            simpleQuery: _database.simpleQuery,
            getNextServerEvent: _database.getNextServerEvent,
            getToken: _database.getToken
		};
	}

	return Database;
});

/*
 * Copyright (C) 2012-2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/log',[ "util/assert" ], function (ASSERT) {
	

	function Database (_database, options) {
		ASSERT(typeof options === "object" && typeof _database === "object");
		options.log = options.log || {
			debug: function (msg) {
				console.log("DEBUG - " + msg);
			},
			error: function (msg) {
				console.log("ERROR - " + msg);
			}
		};
		var logger = options.log;

		function openDatabase (callback) {
			logger.debug('openDatabase()');
			_database.openDatabase(callback);
		}

		function closeDatabase (callback) {
			logger.debug('closeDatabase()');
			_database.closeDatabase(callback);
		}

		function fsyncDatabase (callback) {
			logger.debug('fsyncDatabase()');
			_database.fsyncDatabase(callback);
		}

		function getProjectNames (callback) {
			logger.debug('getProjectNames()');
			_database.getProjectNames(callback);
		}

        function getAllowedProjectNames (callback) {
            logger.debug('getAllowedProjectNames()');
            _database.getAllowedProjectNames(callback);
        }

        function getAuthorizationInfo (name,callback) {
            logger.debug('getAuthorizationInfo('+name+')');
            _database.getAuthorizationInfo(name,callback);
        }

		function deleteProject (project, callback) {
			logger.debug('deleteProject(' + project + ")");
			_database.deleteProject(project, callback);
		}

		function getDatabaseStatus (oldstatus, callback) {
			logger.debug('getDatabaseStatus(' + oldstatus + ")");
			_database.getDatabaseStatus(oldstatus, callback);
		}

		function openProject (projectName, callback) {
			logger.debug('openProject(' + projectName + ")");
			var project = null;
			_database.openProject(projectName, function (err, proj) {
				if (!err && proj) {
					project = proj;
					callback(null, {
						fsyncDatabase: fsyncDatabase,
						closeProject: closeProject,
						loadObject: loadObject,
						insertObject: insertObject,
						findHash: findHash,
						dumpObjects: dumpObjects,
						getBranchNames: getBranchNames,
						getBranchHash: getBranchHash,
						setBranchHash: setBranchHash,
						getCommits: getCommits,
						makeCommit: makeCommit,
                        setUser: project.setUser,
						ID_NAME: project.ID_NAME
					});
				} else {
					callback(err, proj);
				}
			});

			function fsyncDatabase (callback) {
				logger.debug(projectName + '.fsyncDatabase()');
				project.fsyncDatabase(callback);
			}

			function closeProject (callback) {
				logger.debug(projectName + '.closeProject()');
				project.closeProject(callback);
			}

			function insertObject (object, callback) {
				logger.debug(projectName + '.insertObject(' + object[project.ID_NAME] + ")");
				project.insertObject(object, callback);
			}

			function loadObject (hash, callback) {
				logger.debug(projectName + '.loadObject(' + hash + ")");
				project.loadObject(hash, callback);
			}

			function findHash (beginning, callback) {
				logger.debug(projectName + ".findHash(" + beginning + ")");
				project.findHash(beginning, callback);
			}

			function dumpObjects (callback) {
				logger.debug(projectName + "dumpObjects()");
				project.dumpObjects(callback);
			}

			function getBranchNames (callback) {
				logger.debug(projectName + '.getBranchNames()');
				project.getBranchNames(callback);
			}

			function getBranchHash (branch, oldhash, callback) {
				logger.debug(projectName + '.getBranchHash(' + branch + ',' + oldhash + ')');
				project.getBranchHash(branch, oldhash, function (err, newhash, forked) {
					logger.debug(projectName + '.getBranchHash(' + branch + ',' + oldhash + ')->(' + JSON.stringify(err) + ',' + newhash + ',' + forked + ')');
					callback(err, newhash, forked);
				});
			}

			function setBranchHash (branch, oldhash, newhash, callback) {
				logger.debug(projectName + '.setBranchHash(' + branch + ',' + oldhash + ',' + newhash + ')');
				project.setBranchHash(branch, oldhash, newhash, function (err) {
					logger.debug(projectName + '.setBranchHash(' + branch + ',' + oldhash + ',' + newhash + ') ->(' + JSON.stringify(err) + ')');
					callback(err);
				});
			}

			function getCommits (before, number, callback) {
				logger.debug(projectName + '.getCommits(' + before + ',' + number + ')');
				project.getCommits(before, number, callback);
			}

			function makeCommit (parents, roothash, msg, callback) {
				logger.debug(projectName + '.makeCommit(' + parents + ',' + roothash + ',' + msg + ')');
				return project.makeCommit(parents, roothash, msg, callback);
			}
		}

        function simpleRequest (parameters,callback){
            logger.debug('simpleRequest()');
            _database.simpleRequest(parameters,callback);
        }
        function simpleResult(resultId,callback){
            logger.debug('simpleResult('+resultId+')');
            _database.simpleResult(resultId,callback);
        }
        function simpleQuery(workerId,parameters,callback){
            logger.debug('simpleQuery('+workerId+','+parameters+')');
            _database.simpleResult(resultId,callback);
        }
        function getToken(callback){
            logger.debug('getToken()');
            _database.getToken(callback);
        }
        function getNextServerEvent(latestGuid,callback){
            logger.debug('getNextServerEvent('+latestGuid+")");
            _database.getNextServerEvent(latestGuid,callback);
        }
		return {
			openDatabase: openDatabase,
			closeDatabase: closeDatabase,
			fsyncDatabase: fsyncDatabase,
			getProjectNames: getProjectNames,
            getAllowedProjectNames: getAllowedProjectNames,
            getAuthorizationInfo: getAuthorizationInfo,
			getDatabaseStatus: getDatabaseStatus,
			openProject: openProject,
			deleteProject: deleteProject,
            simpleRequest: simpleRequest,
            simpleResult: simpleResult,
            simpleQuery: simpleQuery,
            getNextServerEvent: getNextServerEvent,
            getToken: getToken
		};
	}

	return Database;
});

/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */

define('storage/clientstorage',['storage/client', 'storage/failsafe', 'storage/hashcheck', 'storage/cache', 'storage/commit', 'storage/log'], function (Client,Failsafe,Hashcheck,Cache,Commit,Log) {
    
    function client(options){
        //return  new Log(new Commit(new Cache(new Failsafe(new Client(options),options),options),options),options);
        return  new Commit(new Cache(new Failsafe(new Client(options),options),options),options);
    }



    return client;
});



/*
 * Copyright (C) 2012 Vanderbilt University, All rights reserved.
 *
 * Author: Robert Kereskenyi
 */


/*
 * -------- LOGMANAGER -------
 */

define('logManager',[], function () {

	var logLevels = {
		"ALL": 5,
		"DEBUG": 4,
		"INFO": 3,
		"WARNING": 2,
		"ERROR": 1,
		"OFF": 0
	},
    logColors = {
		"DEBUG": "90",
		"INFO": "36",
		"WARNING": "33",
		"ERROR": "31"
	},
    currentLogLevel = logLevels.WARNING,
    useColors = false,
    excludedComponents = [],
    FS = null,
    logFilePath = null,
    logFileBuffer = [],
    Logger,
    isComponentAllowedToLog,
    printLogMessageToFile,
    logMessage;

	isComponentAllowedToLog = function (componentName) {
		var i, excludedComponentName;

		for (i = 0; i < excludedComponents.length; i += 1) {
			excludedComponentName = excludedComponents[i];

			if (excludedComponentName.substr(-1) === "*") {
				excludedComponentName = excludedComponentName.substring(0, excludedComponentName.length - 1);

				if (componentName.substring(0, excludedComponentName.length) === excludedComponentName) {
					return false;
				}
			} else {
				if (excludedComponentName === componentName) {
					return false;
				}
			}

		}

		return true;
	};

	printLogMessageToFile = function () {
		var message = logFileBuffer[0];
		if (message) {
			FS.appendFile(logFilePath, message, function (err) {
				logFileBuffer.shift();
				if (err) {
					//something wrong so we should fallback to console logging
					logFilePath = null;
					logFileBuffer = [];
				} else {
					if (logFileBuffer.length > 0) {
						printLogMessageToFile();
					}
				}
			});
		}
	};

	logMessage = function (level, componentName, msg) {
		var logTime = new Date(), logTimeStr = (logTime.getHours() < 10) ? "0" + logTime.getHours() : logTime.getHours(), levelStr = level, concreteLogger = console.log;

		//logTimeString
		logTimeStr += ":";
		logTimeStr += (logTime.getMinutes() < 10) ? "0" + logTime.getMinutes() : logTime.getMinutes();
		logTimeStr += ":";
		logTimeStr += (logTime.getSeconds() < 10) ? "0" + logTime.getSeconds() : logTime.getSeconds();
		logTimeStr += ".";
		logTimeStr += (logTime.getMilliseconds() < 10) ? "00" + logTime.getMilliseconds() : ((logTime.getMilliseconds() < 100) ? "0" + logTime.getMilliseconds() : logTime.getMilliseconds());

		//levelStr
		if (useColors === true && logFilePath === null) {
			levelStr = '\u001B[' + logColors[level] + 'm' + level + '\u001B[39m';
		}

		if (isComponentAllowedToLog(componentName) === true) {
			if (logFilePath) {
				msg = levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg + "\n";
				if (logFileBuffer.length === 0) {
					logFileBuffer.push(msg);
					printLogMessageToFile();
				} else {
					logFileBuffer.push(msg);
				}
			} else {
				//console logging
				//log only what meets configuration
				if (logLevels[level] <= currentLogLevel) {
					//see whether console exists
					if (console && console.log) {

						if ((logLevels[level] === logLevels.ERROR) && (console.error)) {
							concreteLogger = console.error;
						}

						if ((logLevels[level] === logLevels.WARNING) && (console.warn)) {
							concreteLogger = console.warn;
						}

						if ((logLevels[level] === logLevels.INFO) && (console.info)) {
							concreteLogger = console.info;
						}

						concreteLogger.call(console, levelStr + " - " + logTimeStr + " [" + componentName + "] - " + msg);
					}
				}
			}
		}
	};

	Logger = function (componentName) {
		this.debug = function (msg) {
			logMessage("DEBUG", componentName, msg);
		};

		this.info = function (msg) {
			logMessage("INFO", componentName, msg);
		};

		this.warning = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.warn = function (msg) {
			logMessage("WARNING", componentName, msg);
		};

		this.error = function (msg) {
			logMessage("ERROR", componentName, msg);
		};
	};

    var _setLogLevel = function (level) {
        if ((level >= 0) && (level <= logLevels.ALL)) {
            currentLogLevel = level;
        }
    };

    var _getLogLevel = function () {
        return currentLogLevel;
    };

    var _setFileLogPath = function (logPath) {
        if (FS === null) {
            try {
                FS = require('fs');
                if (FS.appendFile) {
                    logFilePath = logPath;
                }
            } catch (e) {
                FS = {};
                logFilePath = null;
            }
        } else {
            if (FS.appendFile) {
                logFilePath = logPath;
            }
        }
    };

    var _getFileLogPath = function () {
        return logFilePath;
    };

    var _useColors = function (enabled) {
        if ((enabled === true) || (enabled === false)) {
            useColors = enabled;
        } else {
            useColors = false;
        }
    };

    var _excludeComponent = function (componentName) {
        if (excludedComponents.indexOf(componentName) === -1) {
            excludedComponents.push(componentName);
        }
    };

	return {
		logLevels: logLevels,
		setLogLevel: _setLogLevel,
		getLogLevel: _getLogLevel,

		// this function is only for server side!!!
		setFileLogPath:_setFileLogPath,
		getFileLogPath: _getFileLogPath,

		useColors: _useColors,
        excludeComponent: _excludeComponent,

		create: function (componentName) {
			return new Logger(componentName);
		}
	};
});

define('util/url',[],function(){
    function decodeUrl(url){
        var start = url.indexOf('%');
        while(start>-1){
            var char = String.fromCharCode(parseInt(url.substr(start+1, 2), 16));
            url=url.replace(url.substr(start, 3),char);
            start = url.indexOf('%');
        }
        return url;
    }
    function parseCookie(cookie){
        cookie = decodeUrl(cookie);
        var parsed = {};
        var elements = cookie.split(/[;,] */);
        for(var i=0;i<elements.length;i++){
            var pair = elements[i].split('=');
            parsed[pair[0]] = pair[1];
        }
        return parsed;
    }
    function removeSpecialChars(text){
        text = text.replace(/%23/g,'#');
        text = text.replace(/%2f/g,'/');text = text.replace(/%2F/g,'/');
        return text;
    }
    function addSpecialChars(text){
        if(text === undefined){
            return text;
        }
        text = text.replace(/#/g,'%23');
        text = text.replace(/\//g,'%2F');
        return text;
    }
    function urlToRefObject(url){
        return {
            '$ref':url
        };
    }
    return {
        decodeUrl : decodeUrl,
        parseCookie : parseCookie,
        removeSpecialChars : removeSpecialChars,
        addSpecialChars : addSpecialChars,
        urlToRefObject : urlToRefObject
    };
});

/*
 * Copyright (C) 2013 Vanderbilt University, All rights reserved.
 *
 * Author: Tamas Kecskes
 */
define('coreclient/meta',[], function () {
    

    function metaStorage () {
        var _core = null,
            _nodes = null,
            _save = function(){},
            _initialized = false;

        function initialize(core,nodes,save){
            _core = core;
            _nodes = nodes;
            _save = save;
            _initialized = true;
        }

        function isValidMeta(meta){
            /*if( typeof meta === 'object'){
                if(
                    //children
                    typeof meta.children === 'object' &&
                    (meta.children.types === null || typeof meta.children.types === 'array') &&
                    (typeof meta.children.min === 'undefined' || typeof meta.children.min === 'number') &&
                    (typeof meta.children.max === 'undefined' || typeof meta.children.max === 'number')){

                    //attributes
                }
            }

            return false;*/
            //TODO implement it :)
            return true;
        }

        function isValidAttributeSchema(atrSchema){
            //TODO implement :)
            return true;
        }

        //TODO this may change
        function pathToRefObject(path){
            var ref = {};
            ref['$ref'] = path;
            return ref;
        }

        //TODO this may change
        function refObjectToPath(ref){
            if(typeof ref['$ref'] === 'string'){
                return ref['$ref']/*.substring(1)*/;
            } else {
                return null;
            }
        }

        //getter setter functions
        function getMeta(path){
            var meta = {children:{},attributes:{},pointers:{},aspects:{}};
            if(_nodes === null || _nodes === undefined){
                return meta;
            }
            var node = _nodes[path] || null;
            if(node){
                var metaNode = _core.getChild(node,"_meta");
                var childrenNode = _core.getChild(metaNode,"children");
                //children
                meta.children = {};
                meta.children.minItems = [];
                meta.children.maxItems = [];
                meta.children.items = _core.getMemberPaths(childrenNode,"items");
                for(var i=0;i<meta.children.items.length;i++){
                    meta.children.minItems.push(_core.getMemberAttribute(childrenNode,"items",meta.children.items[i],"min") || -1);
                    meta.children.maxItems.push(_core.getMemberAttribute(childrenNode,"items",meta.children.items[i],"max") || -1);
                    meta.children.items[i] = pathToRefObject(meta.children.items[i]);
                }
                meta.children.min = _core.getAttribute(childrenNode,"min");
                meta.children.max = _core.getAttribute(childrenNode,"max");

                //attributes - they are simple json objects from our point of view
                var atrNames = _core.getAttributeNames(metaNode);
                for(var i=0;i<atrNames.length;i++){
                    meta.attributes[atrNames[i]] = JSON.parse(JSON.stringify(_core.getAttribute(metaNode,atrNames[i])));
                }

                //pointers and pointer lists
                var pointerNames = _core.getPointerNames(metaNode) || [];
                for(var i=0;i<pointerNames.length;i++){
                    var pointerNode = _core.getChild(metaNode,"_p_"+pointerNames[i]);
                    var pointer = {};
                    pointer.items = _core.getMemberPaths(pointerNode,"items");
                    pointer.min = _core.getAttribute(pointerNode,"min");
                    pointer.max = _core.getAttribute(pointerNode,"max");
                    pointer.minItems = [];
                    pointer.maxItems = [];

                    for(var j=0;j<pointer.items.length;j++){
                        pointer.minItems.push(_core.getMemberAttribute(pointerNode,"items",pointer.items[j],"min") || -1);
                        pointer.maxItems.push(_core.getMemberAttribute(pointerNode,"items",pointer.items[j],"max") || -1);
                        pointer.items[j] = pathToRefObject(pointer.items[j]);

                    }

                    meta.pointers[pointerNames[i]] = pointer;
                }

                //aspects
                var aspectsNode = _core.getChild(metaNode,"aspects");
                var aspectNames = _core.getPointerNames(aspectsNode);
                if (aspectNames.length > 0){
                    meta.aspects = {};
                    for(var i=0;i<aspectNames.length;i++){
                        var aspectNode = _core.getChild(aspectsNode,"_a_"+aspectNames[i]);
                        meta.aspects[aspectNames[i]] = {items:[]};
                        var items = _core.getMemberPaths(aspectNode,"items");
                        for(var j=0;j<items.length;j++){
                            meta.aspects[aspectNames[i]].items.push(pathToRefObject(items[j]));
                        }
                    }
                }

                return meta;
            } else {
                return null;
            }
        }
        function setMeta(path,meta){
            if(!isValidMeta){
                return;
            }
            var node = _nodes[path] || null;
            if(node){
                var metaNode = _core.getChild(node,"_meta");
                _core.deleteNode(metaNode,true);
                metaNode = _core.getChild(node,"_meta");
                if(meta.children){
                    var childrenNode = _core.getChild(metaNode,"children");
                    if(meta.children.items && meta.children.items.length){
                        if(meta.children.min){
                            _core.setAttribute(childrenNode,"min",meta.children.min);
                        }
                        if(meta.children.max){
                            _core.setAttribute(childrenNode,"max",meta.children.max);
                        }

                        for(var i=0;i<meta.children.items.length;i++){
                            var targetPath = refObjectToPath(meta.children.items[i]);
                            if(typeof targetPath ==='string' && _nodes[targetPath]){
                                _core.addMember(childrenNode,"items",_nodes[targetPath]);
                                if(meta.children.minItems[i] !== -1){
                                    _core.setMemberAttribute(childrenNode,"items",targetPath,"min",meta.children.minItems[i]);
                                }
                                if(meta.children.maxItems[i] !== -1){
                                    _core.setMemberAttribute(childrenNode,"items",targetPath,"max",meta.children.maxItems[i]);
                                }
                            }
                        }

                    } else {
                        _core.deleteNode(childrenNode,true);
                    }
                }

                if(meta.attributes){
                    for(var i in meta.attributes){
                        _core.setAttribute(metaNode,i,meta.attributes[i]);
                    }
                }

                if(meta.pointers){
                    for(var i in meta.pointers){
                        _core.setPointer(metaNode,i,null);
                        var pointerNode = _core.getChild(metaNode,"_p_"+i);
                        if(meta.pointers[i].items && meta.pointers[i].items.length){
                            if(meta.pointers[i].min){
                                _core.setAttribute(pointerNode,"min",meta.pointers[i].min);
                            }
                            if(meta.pointers[i].max){
                                _core.setAttribute(pointerNode,"max",meta.pointers[i].max);
                            }

                            for(var j=0;j<meta.pointers[i].items.length;j++){
                                var targetPath = refObjectToPath(meta.pointers[i].items[j]);
                                if(typeof targetPath === 'string' && _nodes[targetPath]){
                                    _core.addMember(pointerNode,"items",_nodes[targetPath]);
                                    if(meta.pointers[i].minItems[j] !== -1){
                                        _core.setMemberAttribute(pointerNode,"items",targetPath,"min",meta.pointers[i].minItems[j]);
                                    }
                                    if(meta.pointers[i].maxItems[j] !== -1){
                                        _core.setMemberAttribute(pointerNode,"items",targetPath,"max",meta.pointers[i].maxItems[j]);
                                    }
                                }
                            }

                        }
                    }
                }

                if(meta.aspects){
                    var aspectsNode = _core.getChild(metaNode,"aspects"),
                        aspectNames = [];
                    for(var i in meta.aspects){
                        _core.setPointer(aspectsNode,i,null);
                        var aspectNode = _core.getChild(aspectsNode,"_a_"+i);
                        if(meta.aspects[i].items){
                            for(j=0;j<meta.aspects[i].items.length;j++){
                                var member = _nodes[refObjectToPath(meta.aspects[i].items[j])];
                                if(member){
                                    _core.addMember(aspectNode,"items",member);
                                }
                            }
                        }
                        aspectNames.push(i);
                    }
                    if (aspectNames.length > 0){
                        meta.aspects = {};
                        for(var i=0;i<aspectNames.length;i++){
                            var aspectNode = _core.getChild(aspectsNode,"_a_"+aspectNames[i]);
                            meta.aspects[aspectNames[i]] = {items:[]};
                            var items = _core.getMemberPaths(aspectNode,"items");
                            for(var j=0;j<items.length;j++){
                                meta.aspects[aspectNames[i]].items.push(pathToRefObject(items[j]));
                            }
                        }
                    }
                }

                var meta_event = _core.getRegistry(node,"_meta_event_") || 0;
                    _core.setRegistry(node,"_meta_event_",meta_event+1);
                _save("setMeta("+path+")");
            }
        }


        //validation functions
        function getBaseChain(path){
            var chain = [];
            var node = _nodes[path];
            if(node){
                while(node !== null){
                    chain.push(_core.getPath(node));
                    node = _core.getBase(node);
                }
            }
            return chain;
        }
        function isTypeOf(path,typePath){
            var node = _nodes[path];
            if(node){
                var chain = getBaseChain(path);
                if(chain.indexOf(typePath) !== -1){
                    return true;
                }
            }
            return false;
        }
        function isValidTypeOfArray(path,typePathArray){
            var i=0, isGood=false;
            while(i<typePathArray.length && !isGood){
                isGood = isTypeOf(path,typePathArray[i]);
                i++;
            }
            return isGood;
        }

        function isValidChild(path,childPath){
            var node = _nodes[path];
            var child = _nodes[childPath];
            if(node && child){
                var metaNode = _core.getChild(node,"_meta");
                var childrenNode = _core.getChild(metaNode,"children");
                var items = _core.getMemberPaths(childrenNode,"items");
                return isValidTypeOfArray(childPath,items);
            }
            return false;
        }

        function isValidTarget(path,name,targetPath){
            var node = _nodes[path];
            var target = _nodes[targetPath];
            if(node && target){
                var meta = _core.getChild(node,"_meta");
                var pointer = _core.getChild(meta,"_p_"+name);
                var items = _core.getMemberPaths(pointer,"items");
                return isValidTypeOfArray(targetPath,items);
            }
            return false;
        }

        function isValidAttribute(path,name,attribute){
            //TODO we should check against schema
            return true;
        }

        function getValidChildrenTypes(path){
            var node = _nodes[path];
            if(node){
                return _core.getMemberPaths(_core.getChild(_core.getChild(node,"_meta"),"children"),"items");
            }
            return [];
        }

        function getValidTargetTypes(path,name){
            var node = _nodes[path];
            if(node){
                return _core.getMemberPaths(_core.getChild(_core.getChild(node,"_meta"),"_p_"+name),"items");
            }
            return [];
        }

        function hasOwnMetaRules(path){
            var node = _nodes[path];
            if(node){
                var own = getMeta(path);
                var base = getMeta(_core.getPath(_core.getBase(node)));
                return own === base;
            }
            return false;
        }

        function filterValidTarget(path,name,paths){
            var targets = [];
            for(var i=0;i<paths.length;i++){
                if(isValidTarget(path,name,paths[i])){
                    targets.push(paths[i]);
                }
            }
            return targets;
        }

        function getOwnValidChildrenTypes(path){
            var node = _nodes[path];
            var items = [];
            if(node){
                var own = getValidChildrenTypes(path);
                var base = getValidChildrenTypes(_core.getPath(_core.getBase(node)));
                for(var i= 0;i<own.length;i++){
                    if(base.indexOf(own[i]) === -1){
                        items.push(own[i]);
                    }
                }
            }
            return items;
        }

        function getOwnValidTargetTypes(path,name){
            var node = _nodes[path];
            var items = [];
            if(node){
                var own = getValidTargetTypes(path,name);
                var base = getValidTargetTypes(_core.getPath(_core.getBase(node)),name);
                for(var i= 0;i<own.length;i++){
                    if(base.indexOf(own[i]) === -1){
                        items.push(own[i]);
                    }
                }
            }
            return items;
        }

        function getValidAttributeNames(path){
            var rawMeta = getMeta(path),
                names = [];
            if( rawMeta ){
                for(var i in rawMeta.attributes){
                    names.push(i);
                }
            }
            return names;
        }

        function getOwnValidAttributeNames(path){
            var names = [],
                node = _nodes[path];

            if(node){
                var own = getValidAttributeNames(path);
                var base = getValidAttributeNames(_core.getPath(_core.getBase(node)));
                for(var i=0;i<own.length;i++){
                    if(base.indexOf(own[i]) === -1){
                        names.push(own[i]);
                    }
                }
            }
            return names;
        }

        function indexOfPathInRefObjArray(array,path){
            var index = 0;
            while(index < array.length){
                if(path === refObjectToPath(array[index])){
                    return index;
                }
                index++;
            }
            return -1;
        }
        function getChildrenMeta(path){
            //the returned object structure is : {"min":0,"max":0,"items":[{"id":path,"min":0,"max":0},...]}
            var rawMeta = getMeta(path);
            if(rawMeta){
                var childrenMeta = {};
                childrenMeta.min = rawMeta.children.min;
                childrenMeta.max = rawMeta.children.max;
                childrenMeta.items = rawMeta.children.items;
                if(childrenMeta.items !== null){
                    for(var i=0;i<childrenMeta.items.length;i++){
                        var child = {};
                        child.id = refObjectToPath(childrenMeta.items[i]);
                        if(rawMeta.children.minItems){
                            child.min = rawMeta.children.minItems[i] === -1 ? undefined : rawMeta.children.minItems[i];
                        }
                        if(rawMeta.children.maxItems){
                            child.max = rawMeta.children.maxItems[i] === -1 ? undefined : rawMeta.children.maxItems[i];
                        }

                        childrenMeta.items[i] = child;
                    }
                }

                return childrenMeta;
            }
            return null;
        }

        function getChildrenMetaAttribute(path,attrName){
            var childrenMeta = getChildrenMeta(path);
            if(childrenMeta){
                return childrenMeta.attrName;
            }
            return null;
        }
        function setChildrenMetaAttribute(path,attrName,value){
            if(attrName !== "items"){
                var rawMeta = getMeta(path);
                rawMeta.children[attrName] = value;
                setMeta(path,rawMeta);
            }
        }

        function getValidChildrenItems(path){
            var childrenMeta = getChildrenMeta(path);
            if(childrenMeta){
                return childrenMeta.items;
            }
            return null;
        }

        function updateValidChildrenItem(path,newTypeObj){
            if(newTypeObj && newTypeObj.id){
                var rawMeta = getMeta(path);
                if(rawMeta){
                    if(rawMeta.children.minItems === null || rawMeta.children.minItems == undefined){
                        rawMeta.children.minItems = [];
                        for(var i=0;i<rawMeta.children.items.length;i++){
                            rawMeta.children.minItems.push(-1);
                        }
                    }
                    if(rawMeta.children.maxItems === null || rawMeta.children.maxItems == undefined){
                        rawMeta.children.maxItems = [];
                        for(var i=0;i<rawMeta.children.items.length;i++){
                            rawMeta.children.maxItems.push(-1);
                        }
                    }
                    var refObj = pathToRefObject(newTypeObj.id);
                    var index = indexOfPathInRefObjArray(rawMeta.children.items,newTypeObj.id);
                    if(index === -1){
                        index = rawMeta.children.items.length;
                        rawMeta.children.items.push(refObj);
                        rawMeta.children.minItems.push(-1);
                        rawMeta.children.maxItems.push(-1);
                    }
                    (newTypeObj.min === null || newTypeObj.min === undefined) ? rawMeta.children.minItems[index] = -1 : rawMeta.children.minItems[index] = newTypeObj.min;
                    (newTypeObj.max === null || newTypeObj.max === undefined) ? rawMeta.children.maxItems[index] = -1 : rawMeta.children.maxItems[index] = newTypeObj.max;

                    setMeta(path,rawMeta);
                }
            }
        }
        function removeValidChildrenItem(path,typeId){
            var rawMeta = getMeta(path);
            if(rawMeta){
                var refObj = pathToRefObject(typeId);
                var index = indexOfPathInRefObjArray(rawMeta.children.items,typeId);
                if(index !== -1){
                    rawMeta.children.items.splice(index,1);
                    if(rawMeta.children.minItems){
                        rawMeta.children.minItems.splice(index,1);
                    }
                    if(rawMeta.children.maxItems){
                        rawMeta.children.maxItems.splice(index,1);
                    }
                    setMeta(path,rawMeta);
                }
            }
        }

        function getAttributeSchema(path,name){
            var rawMeta = getMeta(path);
            if(rawMeta){
                if(rawMeta.attributes[name]){
                    return rawMeta.attributes[name];
                }
            }
            return null;
        }

        function setAttributeSchema(path,name,schema){
            var rawMeta = getMeta(path);
            if(rawMeta){
                //TODO check schema validity - but it is also viable to check it only during setMeta
                rawMeta.attributes[name] = schema;
                setMeta(path,rawMeta);
            }
        }

        function removeAttributeSchema(path,name){
            var rawMeta = getMeta(path);
            if(rawMeta){
                delete rawMeta.attributes[name];
                setMeta(path,rawMeta);
            }
        }

        function getPointerMeta(path,name){
            //the returned object structure is : {"min":0,"max":0,"items":[{"id":path,"min":0,"max":0},...]}
            var rawMeta = getMeta(path);
            if(rawMeta && rawMeta.pointers[name]){
                var pointerMeta = {};
                pointerMeta.min = rawMeta.pointers[name].min;
                pointerMeta.max = rawMeta.pointers[name].max;
                pointerMeta.items = rawMeta.pointers[name].items;
                if(pointerMeta.items !== null){
                    for(var i=0;i<pointerMeta.items.length;i++){
                        var child = {};
                        child.id = refObjectToPath(pointerMeta.items[i]);
                        if(rawMeta.pointers[name].minItems){
                            child.min = rawMeta.pointers[name].minItems[i] === -1 ? undefined : rawMeta.pointers[name].minItems[i];
                        }
                        if(rawMeta.pointers[name].maxItems){
                            child.max = rawMeta.pointers[name].maxItems[i] === -1 ? undefined : rawMeta.pointers[name].maxItems[i];
                        }
                        pointerMeta.items[i] = child;
                    }
                }
                return pointerMeta;
            }
            return null;
        }

        function getValidTargetItems(path,name){
            var pointerMeta = getPointerMeta(path,name);
            if(pointerMeta){
                return pointerMeta.items;
            }
            return null;
        }

        function updateValidTargetItem(path,name,targetObj){
            var rawMeta = getMeta(path);
            if(rawMeta && targetObj && targetObj.id){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer === null){
                    rawMeta.pointers[name] = {"items":[],"minItems":[],"maxItems":[]};
                    pointer = rawMeta.pointers[name];
                }
                var refObj = pathToRefObject(targetObj.id);
                var index = indexOfPathInRefObjArray(pointer.items,targetObj.id);
                if(index === -1){
                    index = pointer.items.length;
                    pointer.items.push(refObj);
                    pointer.minItems.push(-1);
                    pointer.maxItems.push(-1);
                }

                (targetObj.min === null || targetObj.min === undefined) ? pointer.minItems[index] = -1 : pointer.minItems[index] = targetObj.min;
                (targetObj.max === null || targetObj.max === undefined) ? pointer.maxItems[index] = -1 : pointer.maxItems[index] = targetObj.max;

                setMeta(path,rawMeta);
            }
        }

        function removeValidTargetItem(path,name,targetId){
            var rawMeta = getMeta(path);
            if(rawMeta){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer !== null){
                    var refObj = pathToRefObject(targetId);
                    var index = indexOfPathInRefObjArray(pointer.items,targetId);
                    if(index !== -1){
                        pointer.items.splice(index,1);
                        if(pointer.minItems){
                            pointer.minItems.splice(index,1);
                        }
                        if(pointer.maxItems){
                            pointer.maxItems.splice(index,1);
                        }
                        setMeta(path,rawMeta);
                    }
                }
            }
        }

        function deleteMetaPointer(path,name){
            var rawMeta = getMeta(path);
            if(rawMeta){
                delete rawMeta.pointers[name];
                setMeta(path,rawMeta);
            }
        }

        function setPointerMeta(path,name,meta){
            var rawMeta = getMeta(path);
            if(rawMeta){
                var pointer = rawMeta.pointers[name] || null;
                if(pointer === null){
                    rawMeta.pointers[name] = {"items":[],"minItems":[],"maxItems":[]};
                    pointer = rawMeta.pointers[name];
                }
                pointer.min = meta.min;
                pointer.max = meta.max;
                if(meta.items && meta.items.length){
                    for(var i=0;i<meta.items.length;i++){
                        pointer.items.push(pathToRefObject(meta.items[i].id));
                        pointer.minItems.push(meta.items[i].min || -1);
                        pointer.maxItems.push(meta.items[i].max || -1);
                    }
                }
                setMeta(path,rawMeta);
            }
        }

        function setChildrenMeta(path,name,meta){
            var rawMeta = getMeta(path);
            if(rawMeta){
                var children = rawMeta.children;

                children.min = meta.min;
                children.max = meta.max;
                if(meta.items && meta.items.length){
                    for(var i=0;i<meta.items.length;i++){
                        children.items.push(pathToRefObject(meta.items[i].id));
                        children.minItems.push(meta.items[i].min || -1);
                        children.maxItems.push(meta.items[i].max || -1);
                    }
                }
                setMeta(path,rawMeta);
            }
        }

        function getMetaAspectNames(path){
            var rawMeta = getMeta(path),
                names = [];

            if(rawMeta && rawMeta.aspects){
                for(var i in rawMeta.aspects){
                    names.push(i);
                }
            }
            return names;
        }

        function getOwnMetaAspectNames(path){
            var names = getMetaAspectNames(path),
                ownNames = [];
            if(_nodes[path]){
                var baseNames = getMetaAspectNames(_core.getPath(_core.getBase(_nodes[path])));
                for(var i=0;i<names.length;i++){
                    if(baseNames.indexOf(names[i]) === -1){
                        ownNames.push(names[i]);
                    }
                }
            }
            return ownNames;
        }

        function getMetaAspect(path,name){
            var rawMeta = getMeta(path);
            if (rawMeta){
                if(rawMeta.aspects[name]){
                    var aspect = {items:[]};
                    for(var i=0;i<rawMeta.aspects[name].items.length;i++){
                        aspect.items.push(refObjectToPath(rawMeta.aspects[name].items[i]));
                    }
                    if (aspect.items.length === 0){
                        delete aspect.items;
                    }
                    return aspect;
                }
                return null;
            }
            return null;
        }

        function setMetaAspect(path,name,aspect){
            var rawMeta = getMeta(path);
            if(rawMeta){

                rawMeta.aspects = rawMeta.aspects || {};
                rawMeta.aspects[name] = {'items': []};
                for(var i=0;i<aspect.items.length;i++){
                    rawMeta.aspects[name].items.push(pathToRefObject(aspect.items[i]));
                }
                setMeta(path,rawMeta);
            }
        }

        function getAspectTerritoryPattern(path,name){
            var aspect = getMetaAspect(path,name);
            if( aspect !== null){
                aspect.children = 1; //TODO now it is fixed, maybe we can change that in the future
                return aspect;
            }
            return null;
        }

        function deleteMetaAspect(path,name){
            var rawMeta = getMeta(path);
            if(rawMeta){
                if(rawMeta.aspects && rawMeta.aspects[name]){
                    delete rawMeta.aspects[name];
                    setMeta(path,rawMeta);
                }
            }
        }

        return {
            refObjectToPath : refObjectToPath,
            pathToRefObject : pathToRefObject,





            initialize      : initialize,
            getMeta         : getMeta,
            setMeta         : setMeta,
            isTypeOf        : isTypeOf,
            hasOwnMetaRules : hasOwnMetaRules,

            //containment
            isValidChild             : isValidChild,
            getChildrenMeta          : getChildrenMeta,
            setChildrenMeta          : setChildrenMeta,
            getChildrenMetaAttribute : getChildrenMetaAttribute,
            setChildrenMetaAttribute : setChildrenMetaAttribute,
            getValidChildrenTypes    : getValidChildrenTypes,
            getOwnValidChildrenTypes : getOwnValidChildrenTypes,
            getValidChildrenItems    : getValidChildrenItems,
            updateValidChildrenItem  : updateValidChildrenItem,
            removeValidChildrenItem  : removeValidChildrenItem,

            //attribute
            isValidAttribute          : isValidAttribute,
            getAttributeSchema        : getAttributeSchema,
            setAttributeSchema        : setAttributeSchema,
            removeAttributeSchema     : removeAttributeSchema,
            getValidAttributeNames    : getValidAttributeNames,
            getOwnValidAttributeNames : getOwnValidAttributeNames,

            //pointer
            isValidTarget          : isValidTarget,
            getPointerMeta         : getPointerMeta,
            setPointerMeta         : setPointerMeta,
            getValidTargetItems    : getValidTargetItems,
            getValidTargetTypes    : getValidTargetTypes,
            getOwnValidTargetTypes : getOwnValidTargetTypes,
            filterValidTarget      : filterValidTarget,
            updateValidTargetItem  : updateValidTargetItem,
            removeValidTargetItem  : removeValidTargetItem,
            deleteMetaPointer      : deleteMetaPointer,

            //aspect
            getMetaAspectNames        : getMetaAspectNames,
            getOwnMetaAspectNames     : getOwnMetaAspectNames,
            getMetaAspect             : getMetaAspect,
            setMetaAspect             : setMetaAspect,
            getAspectTerritoryPattern : getAspectTerritoryPattern,
            deleteMetaAspect          : deleteMetaAspect

        };
    }

    return metaStorage;
});

define('coreclient/tojson',[
    'coreclient/meta',
    'util/url'
],function(
    BaseMeta,
    URL
    ){

    var _refTypes = {
        'url':'url',
        'path':'path',
        'guid':'guid'
    };
    var META = new BaseMeta();

    var changeRefObjects = function(refType,urlPrefix,object,core,root,callback){
        if(typeof object === 'object'){
            var needed = 0,
                neededNames = [],
                error = null;
            for(var i in object){
                if(object[i] !== null && typeof object[i] === 'object'){
                    needed++;
                    neededNames.push(i);
                }
            }
            if(needed > 0){
                for(var i=0;i<neededNames.length;i++){
                    if(object[neededNames[i]]['$ref']){
                        //refrence object
                        pathToRefObjAsync(refType,urlPrefix,object[neededNames[i]]['$ref']/*.substring(1)*/,core,root,function(err,refObj){
                            error = error || err;
                            object[neededNames[i]] = refObj;
                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    } else {
                        changeRefObjects(refType,urlPrefix,object[neededNames[i]],core,root,function(err){
                            error = error || err;
                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    }
                }
            } else {
                callback(null);
            }
        } else {
            callback(null);
        }
    };
    var pathToRefObj = function(refType,urlPrefix,path){
        switch (refType){
            case _refTypes.url:
                if(path === null){
                    return URL.urlToRefObject(null);
                }
                return URL.urlToRefObject(urlPrefix+'&path='+URL.addSpecialChars(path));
                break;
            case _refTypes.path:
                return URL.urlToRefObject(path);
                break;
            default:
                return URL.urlToRefObject(null);
        }
    };
    var getParentRefObject = function(refType,urlPrefix,core,node){
        var parent = core.getParent(node),
            path = null;
        if(parent){
            path = core.getPath(parent);
        }
        switch (refType){
            case _refTypes.url:
                if(path === null){
                    return URL.urlToRefObject(null);
                }
                return URL.urlToRefObject(urlPrefix+'&path='+URL.addSpecialChars(path));
                break;
            case _refTypes.path:
                return URL.urlToRefObject(path);
            case _refTypes.guid:
                if(path === null){
                    return URL.urlToRefObject(null);
                } else {
                    var refObj = URL.urlToRefObject(path);
                    refObj.GUID = core.getGuid(parent);
                    return refObj;
                }
        }
    };
    var pathToRefObjAsync = function(refType,urlPrefix,path,core,root,callback){
        switch (refType){
            case _refTypes.url:
                if(path === null){
                    callback(null,URL.urlToRefObject(null));
                }
                callback(null,URL.urlToRefObject(urlPrefix+'&path='+URL.addSpecialChars(path)));
                break;
            case _refTypes.path:
                callback(null,URL.urlToRefObject(path));
                break;
            case _refTypes.guid:
                core.loadByPath(root,path,function(err,node){
                    if(err){
                        callback(err,null);
                    } else {
                        var refObj = URL.urlToRefObject(path);
                        refObj.GUID = core.getGuid(node);
                        callback(null,refObj);
                    }
                });
                break;
            default:
                callback(null,URL.urlToRefObject(null));
        }
    };
    var getChildrenGuids = function(core,node,callback){
        var GUIDHash = {};
        core.loadChildren(node,function(err,children){
            if(err){
                callback(err,null);
            } else {
                for(var i=0;i<children.length;i++){
                    GUIDHash[core.getPath(children[i])] = core.getGuid(children[i]);
                }
                callback(null,GUIDHash);
            }
        });
    };
    var getMetaOfNode = function(core,node,urlPrefix,refType,callback){
        var meta = META.getMeta(core.getPath(node));
        changeRefObjects(refType,urlPrefix,meta,core,core.getRoot(node),function(err){
            callback(err,meta);
        });
    };
    var getChildrenOfNode = function(core,node,urlPrefix,refType,callback){
        if(refType === _refTypes.guid){
            getChildrenGuids(core,node,function(err,gHash){
                if(err){
                    callback(err);
                } else {
                    //TODO possibly it needs some ordering
                    var children = [];
                    for(var i in gHash){
                        var refObj = URL.urlToRefObject(i);
                        refObj.GUID = gHash[i];
                        children.push(refObj);
                    }
                    callback(null,children);
                }
            });
        } else {
            var paths = core.getChildrenPaths(node);
            var children = [];
            for(var i=0;i<paths.length;i++){
                children.push(pathToRefObj(refType,urlPrefix,paths[i]));
            }
            callback(null,children);
        }
    };
    var getSetAttributesAndRegistry = function(core,node,setName,setOwnerPath,callback){
        var path = core.getPath(node);
        core.loadByPath(core.getRoot(node),setOwnerPath,function(err,owner){
            if(err){
                callback(err);
            } else {
                if(owner){
                    var atrAndReg = {attributes:{},registry:{}};
                    var names = core.getMemberAttributeNames(owner,setName,path);
                    for(var i=0;i<names.length;i++){
                        atrAndReg.attributes[names[i]] = core.getMemberAttribute(owner,setName,path,names[i]);
                    }
                    names = core.getMemberRegistryNames(owner,setName,path);
                    for(var i=0;i<names.length;i++){
                        atrAndReg.registry[names[i]] = core.getMemberRegistry(owner,setName,path,names[i]);
                    }
                    callback(null,atrAndReg);
                } else {
                    callback('internal error',null);
                }
            }
        });
    };
    var getMemberAttributesAndRegistry = function(core,node,setName,memberPath){
        var retObj = {attributes:{},registry:{}};
        var names,i;
        names = core.getMemberAttributeNames(node,setName,memberPath);
        for(i=0;i<names.length;i++){
            retObj.attributes[names[i]] = core.getMemberAttribute(node,setName,memberPath,names[i]);
        }
        names = core.getMemberRegistryNames(node,setName,memberPath);
        for(i=0;i<names.length;i++){
            retObj.registry[names[i]] = core.getMemberRegistry(node,setName,memberPath,names[i]);
        }
        return retObj;
    };
    var getSetsOfNode = function(core,node,urlPrefix,refType,callback){
        var setsInfo = {};
        var createOneSetInfo = function(setName,callback){
            var needed,
                members = (core.getMemberPaths(node,setName)).sort(), //TODO we should remove the sort part at some point
                info = {from:[],to:[],set:true},
                i,
                error = null,
                containers = [],
                collectSetInfo = function(nodePath,container,callback){
                    if(container === true){
                        pathToRefObjAsync(refType,urlPrefix,nodePath,core,core.getRoot(node),function(err,refObj){
                            if(!err && refObj !== undefined && refObj !== null){
                                getSetAttributesAndRegistry(core,node,setName,nodePath,function(err,atrAndReg){
                                    if(atrAndReg){
                                        for(var j in atrAndReg){
                                            refObj[j] = atrAndReg[j];
                                        }
                                    }
                                    callback(err,refObj);
                                });
                            } else {
                                callback(err,null);
                            }
                        });
                    } else {
                        //member
                        pathToRefObjAsync(refType,urlPrefix,nodePath,core,core.getRoot(node),function(err,refObj){
                            if(refObj !== undefined && refObj !== null){
                                var atrAndReg = getMemberAttributesAndRegistry(core,node,setName,nodePath);
                                for(var j in atrAndReg){
                                    refObj[j] = atrAndReg[j];
                                }
                                callback(err,refObj);
                            }
                        });
                    }
                };

            for(i in memberOfInfo){
                if(memberOfInfo[i].indexOf(setName) !== -1){
                    containers.push(i);
                }
            }

            needed = members.length + containers.length;
            if(needed > 0){
                for(i=0;i<members.length;i++){
                    collectSetInfo(members[i],false,function(err,refObj){
                        error = error || err;
                        if(refObj !== undefined && refObj !== null){
                            info.to.push(refObj);
                        }

                        if(--needed === 0){
                            if(error === null){
                                setsInfo[setName] = info;
                            }
                            callback(error);
                        }
                    });
                }

                for(i=0;i<containers.length;i++){
                    collectSetInfo(containers[i],true,function(err,refObj){
                        error = error || err;
                        if(refObj !== undefined && refObj !== null){
                            info.from.push(refObj);
                        }

                        if(--needed === 0){
                            if(error === null){
                                setsInfo[setName] = info;
                            }
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        };

        var tArray = core.getSetNames(node),
            memberOfInfo = core.isMemberOf(node),
            i, j, needed, error = null;
        for(j in memberOfInfo){
            for(i=0;i<memberOfInfo[j].length;i++){
                if(tArray.indexOf(memberOfInfo[j][i]) === -1){
                    tArray.push(memberOfInfo[j][i]);
                }
            }
        }
        needed = tArray.length;
        if(needed>0){
            for(i=0;i<tArray.length;i++){
                createOneSetInfo(tArray[i],function(err){
                    error = error || err;
                    if(--needed === 0){
                        callback(error,setsInfo);
                    }
                })
            }
        } else {
            callback(null,setsInfo);
        }
    };
    var getPointersGUIDs = function(core,node,callback){
        var gHash = {},
            pointerNames = core.getPointerNames(node),
            collectionNames = core.getCollectionNames(node),
            needed = pointerNames.length+collectionNames.length,
            error = null;
        if(needed > 0){
            //pointers
            for(var i=0;i<pointerNames.length;i++){
                core.loadPointer(node,pointerNames[i],function(err,pointer){
                    error = error || err;
                    if(pointer){
                        if(gHash[core.getPath(pointer)] === undefined){
                            gHash[core.getPath(pointer)] = core.getGuid(pointer);
                        }
                    }

                    if(--needed === 0){
                        callback(error,gHash);
                    }
                });
            }
            //collections
            for(var i=0;i<collectionNames.length;i++){
                core.loadCollection(node,collectionNames[i],function(err,collection){
                    error = error || err;
                    if(collection){
                        for(var j=0;j<collection.length;j++){
                            if(gHash[core.getPath(collection[j])] === undefined){
                                gHash[core.getPath(collection[j])] = core.getGuid(collection[j]);
                            }
                        }
                    }

                    if(--needed === 0){
                        callback(error,gHash);
                    }
                });
            }
        } else {
            callback(error,gHash);
        }
    };
    var getPointersOfNode = function(core,node,urlPrefix,refType,callback){
        var GUIDHash = {};
        var getRefObj = function(path){
            if(refType === _refTypes.guid){
                var refObj = URL.urlToRefObject(path);
                refObj.GUID = GUIDHash[path];
                return refObj;
            } else {
                return pathToRefObj(refType,urlPrefix,path);
            }
        };
        var initialized = function(){
            var pointers = {},
                tArray = core.getPointerNames(node),
                t2Array = core.getCollectionNames(node);
            for(var i=0;i<t2Array.length;i++){
                if(tArray.indexOf(t2Array[i]) === -1){
                    tArray.push(t2Array[i]);
                }
            }
            for(var i=0;i<tArray.length;i++){
                var coll = core.getCollectionPaths(node,tArray[i]);
                var pointer = {to:[],from:[],set:false},
                    pPath = core.getPointerPath(node,tArray[i]);
                if(pPath !== undefined){
                    pointer.to.push(getRefObj(pPath));
                }
                for(var j=0;j<coll.length;j++){
                    pointer.from.push(getRefObj(coll[j]));
                }
                pointers[tArray[i]] = pointer;
            }
            callback(null,pointers);
        };

        //start
        if(refType === _refTypes.guid){
            getPointersGUIDs(core,node,function(err,gHash){
                if(err){
                    callback(err,null);
                } else {
                    GUIDHash = gHash;
                    initialized();
                }
            });
        } else {
            initialized();
        }
    };
    var getOwnPartOfNode = function(core,node){
        var own = {attributes:[],registry:[],pointers:[]};
        own.attributes = core.getOwnAttributeNames(node);
        own.registry = core.getOwnRegistryNames(node);
        own.pointers = core.getOwnPointerNames(node);
        return own;
    } ;
    var getJsonNode = function(core,node,urlPrefix,refType,callback){
        var nodes = {},
            tArray,
            i,
            jNode;

        if(refType === _refTypes.guid && typeof core.getGuid !== 'function'){
            callback(new Error('cannot provide GUIDs'),null);
        }

        nodes[core.getPath(node)] = node;
        META.initialize(core,nodes,function(){});
        jNode = {'meta':{},'registry':{},'children':[],'attributes':{},'pointers':{}, 'registry':{}};


        //basic parts of the node
        //GUID
        if(typeof core.getGuid === 'function'){
            jNode.GUID = core.getGuid(node);
        }
        //RELID
        jNode.RELID = core.getRelid(node);
        //registry entries
        tArray = core.getRegistryNames(node);
        for(i=0;i<tArray.length;i++){
            jNode['registry'][tArray[i]] = core.getRegistry(node,tArray[i]);
        }
        //attribute entries
        tArray = core.getAttributeNames(node);
        for(i=0;i<tArray.length;i++){
            jNode['attributes'][tArray[i]] = core.getAttribute(node,tArray[i]);
        }

        //own part of the node
        jNode.OWN = getOwnPartOfNode(core,node);

        //reference to parent
        jNode.parent = getParentRefObject(refType,urlPrefix,core,node);


        //now calling the relational parts
        var needed = 4,
            error = null;
        getChildrenOfNode(core,node,urlPrefix,refType,function(err,children){
            error = error || err;
            jNode.children = children;
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getMetaOfNode(core,node,urlPrefix,refType,function(err,meta){
            error = error || err;
            jNode.meta = meta;
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getPointersOfNode(core,node,urlPrefix,refType,function(err,pointers){
            error = error || err;
            for(var i in pointers){
                jNode.pointers[i] = pointers[i];
            }
            if(--needed === 0){
                callback(error,jNode);
            }
        });
        getSetsOfNode(core,node,urlPrefix,refType,function(err,sets){
            error = error || err;
            for(var i in sets){
                jNode.pointers[i] = sets[i];
            }
            if(--needed === 0){
                callback(error,jNode);
            }
        });
    };
    return getJsonNode;
});

define('coreclient/dump',[
    'coreclient/meta',
    'coreclient/tojson',
    'util/url'
],function(
    BaseMeta,
    ToJson,
    URL
    ){
    var _refTypes = {
        'url':'url',
        'path':'path',
        'guid':'guid'
        },
        _cache = {},
        _rootPath = "",
        _refType = 'url',
        _core = null,
        META = new BaseMeta();

    var isRefObject = function(obj){
        if(obj && typeof obj['$ref'] === 'string'){
            return true;
        }
        return false;
    };
    var getRefObjectPath = function(obj){
        if(isRefObject(obj) === true){
            var refValue = obj['$ref'];
            switch(_refType){
                case _refTypes.url:
                    if(refValue === null){
                        return null;
                    }
                    refValue = refValue.split('/');
                    return URL.removeSpecialChars(refValue[refValue.length-1]);
                    break;
                case _refTypes.path:
                case _refTypes.guid:
                    return refValue;
                    break;
                default:
                    return null;
            }

        } else {
            return null;
        }
    };

    var pathToRelRefObject = function(path){
        if(_cache[path]){
            return {'$ref': _cache[path]};
        }
        return {'$ref': null};
    };

    var refToRelRefObj = function(path,refObj){
        if(_cache[path]){
            refObj['$ref'] = _cache[path];
        } else {
            refObj = {'$ref': null};
        }
    };

    var isSubordinate = function(path){
        if(path.indexOf(_rootPath) === 0){
            return true;
        }
        return false;
    };

    var dumpChildren = function(node,dumpObject,urlPrefix,relPath,callback){
        var needed = dumpObject.children.length;
        if(needed > 0){
            _core.loadChildren(node,function(err,children){
                if(err){
                    callback(err);
                } else {
                    if(children === null || children === undefined || ! children.length > 0){
                        callback(new Error('invalid children info found'));
                    } else {
                        var setChildJson = function(child,cb){
                            ToJson(_core,child,urlPrefix,_refType,function(err,jChild){
                                if(err){
                                    cb(err);
                                } else {
                                    if(jChild){
                                        var childRelPath,
                                            childPath = _core.getPath(child);
                                        for(var j=0;j<dumpObject.children.length;j++){
                                            if(childPath === getRefObjectPath(dumpObject.children[j])){
                                                childRelPath = relPath+'/children['+j+']';
                                                _cache[childPath] = childRelPath;
                                                dumpObject.children[j] = jChild;
                                                break;
                                            }
                                        }
                                        dumpChildren(child,dumpObject.children[j],urlPrefix,childRelPath,cb);
                                    }
                                }
                            })
                        };
                        var error = null;

                        for(var i=0;i<children.length;i++){
                            setChildJson(children[i],function(err){
                                error = error || err;
                                if(--needed === 0){
                                    callback(error);
                                }
                            })
                        }
                    }
                }
            });
        } else {
            callback(null);
        }
    };
    var checkForInternalReferences = function(dumpObject){
        if(typeof dumpObject === 'object'){
            for(var i in dumpObject){
                if(typeof dumpObject[i] === 'object'){
                    if(isRefObject(dumpObject[i])){
                        var path = getRefObjectPath(dumpObject[i]);
                        if(isSubordinate(path)){
                            refToRelRefObj(path,dumpObject[i]);
                        }
                    } else {
                        checkForInternalReferences(dumpObject[i]);
                    }
                }
            }
        }
    };
    var dumpJsonNode = function(core,node,urlPrefix,refType,callback){
        _cache = {};
        _core = core;
        _rootPath = core.getPath(node);
        _refType = refType;

        //TODO this needs to be done in another way
        ToJson(core,node,urlPrefix,_refType,function(err,jDump){
            if(err){
                callback(err,null);
            } else {
                if(jDump){
                    _cache[_rootPath] = "#";
                }
                dumpChildren(node,jDump,urlPrefix,_cache[_rootPath],function(err){
                    if(err){
                        callback(err);
                    } else {
                        checkForInternalReferences(jDump);
                        callback(null,jDump);
                    }
                });
            }
        });
    };

    return dumpJsonNode;
});


define('coreclient/dumpmore',[
    'coreclient/meta',
    'coreclient/tojson',
    'util/url'
],function(
    BaseMeta,
    ToJson,
    URL
    ){
    var _refTypes = {
            'url':'url',
            'path':'path',
            'guid':'guid'
        },
        _cache = {},
        _rootPath = "",
        _refType = 'url',
        _core = null,
        _urlPrefix = "",
        META = new BaseMeta();

    var isRefObject = function(obj){
        if(obj && obj['$ref']){
            return true;
        }
        return false;
    };
    var getRefObjectPath = function(obj){
        if(isRefObject(obj) === true){
            var refValue = obj['$ref'];
            switch(_refType){
                case _refTypes.url:
                    if(refValue === null){
                        return null;
                    }
                    refValue = refValue.split('/');
                    return URL.removeSpecialChars(refValue[refValue.length-1]);
                    break;
                case _refTypes.path:
                case _refTypes.guid:
                    return refValue;
                    break;
                default:
                    return null;
            }

        } else {
            return null;
        }
    };

    var pathToRelRefObject = function(path){
        if(_cache[path]){
            return {'$ref': _cache[path]};
        }
        return {'$ref': null};
    };

    var refToRelRefObj = function(path,refObj){
        if(_cache[path]){
            refObj['$ref'] = _cache[path];
        }
    };

    var isSubordinate = function(path){
        if(path.indexOf(_rootPath) === 0){
            return true;
        }
        return false;
    };

    var dumpChildren = function(node,dumpObject,urlPrefix,relPath,callback){
        var needed = dumpObject.children.length;
        if(needed > 0){
            _core.loadChildren(node,function(err,children){
                if(err){
                    callback(err);
                } else {
                    if(children === null || children === undefined || ! children.length > 0){
                        callback(new Error('invalid children info found'));
                    } else {
                        var setChildJson = function(child,cb){
                            ToJson(_core,child,urlPrefix,_refType,function(err,jChild){
                                if(err){
                                    cb(err);
                                } else {
                                    if(jChild){
                                        var childRelPath,
                                            childPath = _core.getPath(child);
                                        for(var j=0;j<dumpObject.children.length;j++){
                                            if(childPath === getRefObjectPath(dumpObject.children[j])){
                                                childRelPath = relPath+'/children['+j+']';
                                                _cache[childPath] = childRelPath;
                                                dumpObject.children[j] = jChild;
                                                break;
                                            }
                                        }
                                        dumpChildren(child,dumpObject.children[j],urlPrefix,childRelPath,cb);
                                    }
                                }
                            })
                        };
                        var error = null;

                        for(var i=0;i<children.length;i++){
                            setChildJson(children[i],function(err){
                                error = error || err;
                                if(--needed === 0){
                                    callback(error);
                                }
                            })
                        }
                    }
                }
            });
        } else {
            callback(null);
        }
    };
    var checkForInternalReferences = function(dumpObject){
        if(typeof dumpObject === 'object'){
            for(var i in dumpObject){
                if(typeof dumpObject[i] === 'object'){
                    if(isRefObject(dumpObject[i])){
                        var path = getRefObjectPath(dumpObject[i]);
                        refToRelRefObj(path,dumpObject[i]);
                    } else {
                        checkForInternalReferences(dumpObject[i]);
                    }
                }
            }
        }
    };
    var dumpJsonNode = function(core,node,urlPrefix,refType,callback){
        _cache = {};
        _core = core;
        _rootPath = core.getPath(node);
        _refType = refType;

        //TODO this needs to be done in another way
        ToJson(core,node,urlPrefix,_refType,function(err,jDump){
            if(err){
                callback(err,null);
            } else {
                if(jDump){
                    _cache[_rootPath] = "#";
                }
                dumpChildren(node,jDump,urlPrefix,_cache[_rootPath],function(err){
                    if(err){
                        callback(err);
                    } else {
                        checkForInternalReferences(jDump);
                        callback(null,jDump);
                    }
                });
            }
        });
    };

    var dumpNode = function(node,relPath,containerDump,index,callback){
        //first we should check if the node is already dumped or not
        var path = _core.getPath(node);
        if(_cache[path]){
            containerDump[index] = {
                'GUID':_core.getGuid(node),
                '$ref':relPath
            };
            callback(null);
        } else {
            //we try to dump this path for the first time
            ToJson(_core,node,_urlPrefix,_refType,function(err,jNode){
                if(err){
                    callback(err);
                } else {
                    containerDump[index] = jNode;
                    _cache[path] = relPath;

                    //now we should recursively call ourselves if the node has children
                    if(containerDump[index].children.length > 0){
                        var needed = containerDump[index].children.length,
                            error = null;
                        _core.loadChildren(node,function(err,children){
                            if(err){
                                callback(err);
                            } else {
                                for(var i=0;i<children.length;i++){
                                    dumpNode(children[i],relPath+'/children['+i+']',containerDump[index].children,i,function(err){
                                        error = error || err;
                                        if(--needed === 0){
                                            callback(error);
                                        }
                                    });
                                }
                            }
                        });
                    } else {
                        callback(null);
                    }
                }
            });
        }
    };
    var dumpMoreNodes = function(core,nodes,urlPrefix,refType,callback){
        _cache = {};
        _core = core;
        _refType = refType;
        _urlPrefix = urlPrefix;

        var dumpNodes = [],
            needed = nodes.length,
            error = null,
            postProcessing = function(err){
                if(err){
                    callback(err);
                } else {
                    checkForInternalReferences(dumpNodes);
                    callback(null,dumpNodes);
                }
            };
        if(needed > 0){
            for(var i=0;i<nodes.length;i++){
                dumpNodes.push({});
                dumpNode(nodes[i],'#['+i+']',dumpNodes,i,function(err){
                    error = error || err;
                    if(--needed === 0){
                        postProcessing(error);
                    }
                });
            }
        } else {
            callback('no node to dump!!!',null);
        }
    };

    return dumpMoreNodes;
});



/*
this type of import is for merge purposes
it tries to import not only the outgoing relations but the incoming ones as well
it also tries to keep both the GUID and the relid's
if it finds the same guid in the same place then it overwrites the node with the imported one!!!
it not searches for GUID!!! so be careful when to use this method
*/

define('coreclient/import',[
    'coreclient/meta'
],function(
    BaseMeta
    ){
    var _core = null,
        _root = null,
        _rootPath = "",
        _cache = {},
        _underImport = {},
        _internalRefHash = {},
        META = new BaseMeta();

    function internalRefCreated(intPath,node){
        _cache[_core.getPath(node)] = node;
        _internalRefHash[intPath] = _core.getPath(node);
        var callbacks = _underImport[intPath] || [];
        delete _underImport[intPath];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](null,node);
        }
    }
    function objectLoaded(error,node){
        if(error === null){
            _cache[_core.getPath(node)] = node;
        }

        var callbacks = _underImport[_core.getPath(node)] || [];
        delete _underImport[_core.getPath(node)];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](error,node);
        }
    }
    function isInternalReference(refObj){
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                return true;
            }
        }
        return false;
    }
    function getReferenceNode(refObj,callback){
        //we allow the internal references and the
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                //we assume that it is an internal reference
                if(_internalRefHash[refObj['$ref']] !== undefined){
                    callback(null,_cache[_internalRefHash[refObj['$ref']]]);
                } else if(_underImport[refObj['$ref']] !== undefined){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback]; //TODO we should check if the loading order is really finite this way
                }
            } else if(refObj['$ref'] === null){
                callback(null,null);
            } else {
                if(_cache[refObj['$ref']]){
                    callback(null,_cache[refObj['$ref']]);
                } else if(_underImport[refObj['$ref']]){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback];
                    _core.loadByPath(_root,refObj['$ref'],function(err,node){
                        if(err){
                            objectLoaded(err, null);
                        } else {
                            if(refObj['GUID']){
                                if(refObj['GUID'] === _core.getGuid(node)){
                                    objectLoaded(err,node);
                                } else {
                                    objectLoaded('GUID mismatch',node);
                                }
                            } else {
                                objectLoaded(err,node);
                            }
                        }
                    });
                }
            }
        } else {
            callback(null,null);
        }
    }
    function importChildren(node,jNode,pIntPath,callback){
        if(jNode && jNode.children && jNode.children.length){
            var needed = jNode.children.length;

            if(needed > 0){
                var error = null;
                for(var i=0;i<jNode.children.length;i++){
                    importNode(jNode.children[i],node,pIntPath+'/children['+i+']',true,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }

        } else {
            callback(null); //TODO maybe we should be more strict
        }
    }
    function importAttributes(node,jNode){
        if(typeof jNode.attributes === 'object'){
            var names = Object.keys(jNode.attributes);
            if(jNode.OWN){
                names = jNode.OWN.attributes;
            }

            for(var i=0;i<names.length;i++){
                var value = jNode.attributes[names[i]];
                if(value !== undefined){
                    _core.setAttribute(node,names[i],value);
                }
            }
        }
    }
    function importRegistry(node,jNode){
        if(typeof jNode.registry === 'object'){
            var names = Object.keys(jNode.registry);
            if(jNode.OWN){
                names = jNode.OWN.registry;
            }

            for(var i=0;i<names.length;i++){
                var value = jNode.registry[names[i]];
                if(value !== undefined){
                    _core.setRegistry(node,names[i],value);
                }
            }
        }
    }
    function importPointer(node,jNode,pName,callback){
        if(jNode.pointers[pName].to && jNode.pointers[pName].from){
            var needed = jNode.pointers[pName].to.length + jNode.pointers[pName].from.length,
                i,
                error = null;
            var ownPointer = true;
            if(jNode.OWN){
                if(jNode.OWN.pointers.indexOf(pName) === -1){
                    ownPointer = false;
                    needed -= jNode.pointers[pName].to.length;
                }
            }
            if(needed === 0){
                callback(null);
            } else {
                if(ownPointer){
                    for(i=0;i<jNode.pointers[pName].to.length;i++){
                        getReferenceNode(jNode.pointers[pName].to[i],function(err,target){
                            error = error || err;
                            _core.setPointer(node,pName,target);

                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    }
                }

                for(i=0;i<jNode.pointers[pName].from.length;i++){
                    if(!isInternalReference(jNode.pointers[pName].from[i])){
                        getReferenceNode(jNode.pointers[pName].from[i],function(err,source){
                            error = error || err;
                            if(source){
                                _core.setPointer(source,pName,node);
                            }

                            if(--needed === 0){
                                callback(error);
                            }
                        });
                    } else {
                        if(--needed === 0){
                            callback(error);
                        }
                    }
                }
            }
        } else {
            callback(null);
        }
    }
    function importSet(node,jNode,sName, callback){
        if(jNode.pointers[sName].to && jNode.pointers[sName].from){
            var needed = 0,
                importSetRegAndAtr = function(sOwner,sMember,atrAndReg){
                    _core.addMember(sOwner,sName,sMember);
                    var mPath = _core.getPath(sMember);
                    atrAndReg.attributes = atrAndReg.attributes || {};
                    for(var i in atrAndReg.attributes){
                        _core.setMemberAttribute(sOwner,sName,mPath,i,atrAndReg.attributes[i]);
                    }
                    atrAndReg.registry = atrAndReg.registry || {};
                    for(var i in atrAndReg.registry){
                        _core.setMemberRegistry(sOwner,sName,mPath,i,atrAndReg.registry[i]);
                    }
                },
                importSetReference = function(isTo,index,cb){
                    var jObj = isTo === true ? jNode.pointers[sName].to[index] : jNode.pointers[sName].from[index];
                    getReferenceNode(jObj,function(err,sNode){
                        if(err){
                            cb(err);
                        } else {
                            if(sNode){
                                var sOwner = isTo === true ? node : sNode,
                                    sMember = isTo === true ? sNode : node;
                                importSetRegAndAtr(sOwner,sMember,jObj);
                            }
                            cb(null);
                        }
                    });
                },
                error = null;

            if(jNode.pointers[sName].to.length > 0){
                needed += jNode.pointers[sName].to.length;
                _core.createSet(node,sName);
            }
            if(jNode.pointers[sName].from.length > 0){
                needed += jNode.pointers[sName].from.length;
            }

            if(needed > 0){
                for(var i=0;i<jNode.pointers[sName].to.length;i++){
                    importSetReference(true,i,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
                for(var i=0;i<jNode.pointers[sName].from.length;i++){
                    importSetReference(false,i,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        } else {
            callback(null); //TODO now we just simply try to ignore faulty data import
        }
    }
    function importRelations(node,jNode,callback){
        //TODO now se use the pointer's 'set' attribute to decide if it is a set or a pointer really
        var pointers = [],
            sets = [],
            needed = 0,
            error = null,
            i;
        if(! typeof jNode.pointers === 'object'){
            callback(null); //TODO should we drop an error???
        } else {
            for(i in jNode.pointers){
                if(jNode.pointers[i].set === true){
                    sets.push(i);
                } else {
                    pointers.push(i);
                }
            }

            needed = sets.length + pointers.length;

            if(needed > 0){
                for(i=0;i<pointers.length;i++){
                    importPointer(node,jNode,pointers[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
                for(i=0;i<sets.length;i++){
                    importSet(node,jNode,sets[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        }
    }
    function importMeta(node,jNode,callback){
        //TODO now this function searches the whole meta data for reference objects and load them, then call setMeta
        var loadReference = function(refObj,cb){
                getReferenceNode(refObj,function(err,rNode){
                    if(err){
                        cb(err);
                    } else {
                        if(rNode){
                            refObj['$ref'] = _core.getPath(rNode);
                        }
                        cb(null);
                    }
                });
            },
            loadMetaReferences = function(jObject,cb){
                var needed = 0,
                    error = null;
                for(var i in jObject){
                    if(jObject[i] !== null && typeof jObject[i] === 'object'){
                        needed++;
                    }
                }

                if(needed>0){
                    for(var i in jObject){
                        if(jObject[i] !== null && typeof jObject[i] === 'object'){
                            if(jObject[i]['$ref']){
                                loadReference(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                });
                            } else {
                                loadMetaReferences(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                });
                            }
                        }
                    }
                } else {
                    cb(error);
                }
            };

        loadMetaReferences(jNode.meta || {}, function(err){
            if(err){
                callback(err);
            } else {
                META.setMeta(_core.getPath(node),jNode.meta || {});
                callback(null);
            }
        });
    };
    function importRoot(jNode,callback){
        //first we create the root node itself, then the other parts of the function is pretty much like the importNode
        _root = _core.createNode({guid:jNode.GUID});
        internalRefCreated('#',_root);
        importAttributes(_root,jNode);
        importRegistry(_root,jNode);
        importChildren(_root,jNode,'#',function(err){
            if(err){
                callback(err);
            } else {
                importRelations(_root,jNode,function(err){
                    if(err){
                        callback(err);
                    } else {
                        importMeta(_root,jNode,function(err){
                            callback(err,_root);
                        });
                    }
                });
            }
        });
    }
    function clearOldNode(relid,guid,parentNode,callback){
        var relids = _core.getChildrenRelids(parentNode);
        if(relids.indexOf(relid) !== -1){
            _core.loadChild(parentNode,relid,function(err,oldChild){
                if(err){
                    callback(err);
                } else {
                    if(_core.getGuid(oldChild) === guid){
                        var root = _core.getRoot(oldChild);
                        _core.deleteNode(oldChild);
                        _core.persist(root,function(){
                            callback(null)
                        });
                    } else {
                        callback(null);
                    }
                }
            });
        } else {
            callback(null);
        }
    }
    function getEmptyNode(jNode,parentNode,baseNode,noClear,callback){
        var relids = _core.getChildrenRelids(parentNode),
            returnNewNode = function(){
                var node = _core.createNode({base:baseNode,parent:parentNode,relid:jNode.RELID,guid:jNode.GUID});
                callback(null,node);
            };
        if(relids.indexOf(jNode.RELID) != -1){
            _core.loadChild(parentNode,jNode.RELID,function(err,oldChild){
                if(err){
                    callback(err,null);
                } else {
                    if(_core.getGuid(oldChild) === jNode.GUID){
                        if(noClear === true){
                            callback(null,oldChild);
                        } else {
                            var root = _core.getRoot(oldChild);
                            _core.deleteNode(oldChild);
                            _core.persist(root,function(){
                                returnNewNode();
                            });
                        }
                    } else {
                        returnNewNode();
                    }
                }
            });
        } else {
            returnNewNode();
        }
    }
    function importNode(jNode,parentNode,intPath,noClear,callback){
        //first we have to get the base of the node
        if(jNode.pointers && jNode.pointers.base && jNode.pointers.base.to){
            getReferenceNode(jNode.pointers.base.to[0],function(err,base){
                if(err){
                    callback(err);
                } else {
                   getEmptyNode(jNode,parentNode,base,noClear,function(err,node){
                        if(err){
                            callback(err);
                        } else {
                            internalRefCreated(intPath,node);
                            importAttributes(node,jNode);
                            importRegistry(node,jNode);
                            importChildren(node,jNode,intPath,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    importRelations(node,jNode,function(err){
                                        if(err){
                                            callback(err);
                                        } else {
                                            importMeta(node,jNode,function(err){
                                                callback(err);
                                            });
                                        }
                                    });
                                }
                            });
                        }
                    });
                }
            });
        } else {
            callback('wrong import format: base info is wrong');
        }
    }

    function importing(core,parent,jNode,callback){
        _core = core;
        _cache = {};
        _underImport = {};
        _internalRefHash = {};
        META.initialize(_core,_cache,function(){});

        if(jNode.length){
            //multiple objects
            if(parent){
                var needed = jNode.length,
                    error = null;
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                for(var i=0;i<jNode.length;i++){
                    importNode(jNode[i],parent,'#['+i+']',false,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback('no parent given!!!');
            }
        } else {
            //single object
            if(parent){
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                importNode(jNode,parent,'#',false,callback);
            } else {
                importRoot(jNode,callback);
            }
        }
    }

    return importing;
});


// This import will only enter the outgoing relations and the internal ones.
// This import will try to import an array of objects as well as a single object.
// Although this import also asume that there is no loop in the references so it can simply wait for

define('coreclient/copyimport',[
    'coreclient/meta'
],function(
    BaseMeta
    ){
    var _core = null,
        _root = null,
        _cache = {},
        _underImport = {},
        _internalRefHash = {},
        META = new BaseMeta();

    function internalRefCreated(intPath,node){
        _cache[_core.getPath(node)] = node;
        _internalRefHash[intPath] = _core.getPath(node);
        var callbacks = _underImport[intPath] || [];
        delete _underImport[intPath];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](null,node);
        }
    }
    function objectLoaded(error,node){
        if(error === null){
            _cache[_core.getPath(node)] = node;
        }

        var callbacks = _underImport[_core.getPath(node)] || [];
        delete _underImport[_core.getPath(node)];
        for(var i=0;i<callbacks.length;i++){
            callbacks[i](error,node);
        }
    }
    function isInternalReference(refObj){
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                return true;
            }
        }
        return false;
    }
    function getReferenceNode(refObj,callback){
        //we allow the internal references and the
        if(refObj && typeof refObj['$ref'] === 'string'){
            if(refObj['$ref'].indexOf('#') === 0){
                //we assume that it is an internal reference
                if(_internalRefHash[refObj['$ref']] !== undefined){
                    callback(null,_cache[_internalRefHash[refObj['$ref']]]);
                } else if(_underImport[refObj['$ref']] !== undefined){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback]; //TODO we should check if the loading order is really finite this way
                }
            } else if(refObj['$ref'] === null){
                callback(null,null);
            } else {
                if(_cache[refObj['$ref']]){
                    callback(null,_cache[refObj['$ref']]);
                } else if(_underImport[refObj['$ref']]){
                    _underImport[refObj['$ref']].push(callback);
                } else {
                    _underImport[refObj['$ref']] = [callback];
                    _core.loadByPath(_root,refObj['$ref'],function(err,node){
                        if(err){
                            objectLoaded(err, null);
                        } else {
                            if(refObj['GUID']){
                                if(refObj['GUID'] === _core.getGuid(node)){
                                    objectLoaded(err,node);
                                } else {
                                    objectLoaded('GUID mismatch',node);
                                }
                            } else {
                                objectLoaded(err,node);
                            }
                        }
                    });
                }
            }
        } else {
            callback(null,null);
        }
    }
    function importChildren(node,jNode,pIntPath,callback){
        if(jNode && jNode.children && jNode.children.length){
            var needed = jNode.children.length;

            if(needed > 0){
                var error = null;
                for(var i=0;i<jNode.children.length;i++){
                    importNode(jNode.children[i],node,pIntPath+'/children['+i+']',function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }

        } else {
            callback(null); //TODO maybe we should be more strict
        }
    }
    function importAttributes(node,jNode){
        if(typeof jNode.attributes === 'object'){
            for(var i in jNode.attributes){
                _core.setAttribute(node,i,jNode.attributes[i]);
            }
        }
    }
    function importRegistry(node,jNode){
        if(typeof jNode.registry === 'object'){
            for(var i in jNode.registry){
                _core.setRegistry(node,i,jNode.registry[i]);
            }
        }
    }
    function importPointer(node,jNode,pName,callback){
        if(jNode.pointers[pName].to && jNode.pointers[pName].to.length > 0){
            var needed = jNode.pointers[pName].to.length,
                i,
                error = null;

            for(i=0;i<jNode.pointers[pName].to.length;i++){
                getReferenceNode(jNode.pointers[pName].to[i],function(err,target){
                    error = error || err;
                    if(target !== undefined){
                        _core.setPointer(node,pName,target);
                    }

                    if(--needed === 0){
                        callback(error);
                    }
                });
            }

        } else {
            callback(null);
        }
    }
    function importSet(node,jNode,sName, callback){
        if(jNode.pointers[sName].to && jNode.pointers[sName].to.length > 0){
            var needed = 0,
                importSetRegAndAtr = function(sOwner,sMember,atrAndReg){
                    _core.addMember(sOwner,sName,sMember);
                    var mPath = _core.getPath(sMember);
                    atrAndReg.attributes = atrAndReg.attributes || {};
                    for(var i in atrAndReg.attributes){
                        _core.setMemberAttribute(sOwner,sName,mPath,i,atrAndReg.attributes[i]);
                    }
                    atrAndReg.registry = atrAndReg.registry || {};
                    for(var i in atrAndReg.registry){
                        _core.setMemberRegistry(sOwner,sName,mPath,i,atrAndReg.registry[i]);
                    }
                },
                importSetReference = function(isTo,index,cb){
                    var jObj = isTo === true ? jNode.pointers[sName].to[index] : jNode.pointers[sName].from[index];
                    getReferenceNode(jObj,function(err,sNode){
                        if(err){
                            cb(err);
                        } else {
                            if(sNode){
                                var sOwner = isTo === true ? node : sNode,
                                    sMember = isTo === true ? sNode : node;
                                importSetRegAndAtr(sOwner,sMember,jObj);
                            }
                            cb(null);
                        }
                    });
                },
                error = null;

            _core.createSet(node,sName);
            needed = jNode.pointers[sName].to.length;
            for(var i=0;i<jNode.pointers[sName].to.length;i++){
                importSetReference(true,i,function(err){
                    error = error || err;
                    if(--needed === 0){
                        callback(error);
                    }
                });
            }
        } else {
            callback(null); //TODO now we just simply try to ignore faulty data import
        }
    }
    function _importSet(node,jNode,sName, callback){
        if(jNode.pointers[sName].to){
            var needed = 0,
                importSetRegAndAtr = function(sOwner,sMember,atrAndReg){
                    _core.addMember(sOwner,sName,sMember);
                    var mPath = _core.getPath(sMember);
                    atrAndReg.attributes = atrAndReg.attributes || {};
                    for(var i in atrAndReg.attributes){
                        _core.setMemberAttribute(sOwner,sName,mPath,i,atrAndReg.attributes[i]);
                    }
                    atrAndReg.registry = atrAndReg.registry || {};
                    for(var i in atrAndReg.registry){
                        _core.setMemberRegistry(sOwner,sName,mPath,i,atrAndReg.registry[i]);
                    }
                },
                importSetReference = function(isTo,index,cb){
                    var jObj = isTo === true ? jNode.pointers[sName].to[index] : jNode.pointers[sName].from[index];
                    getReferenceNode(jObj,function(err,sNode){
                        if(err){
                            cb(err);
                        } else {
                            if(sNode){
                                var sOwner = isTo === true ? node : sNode,
                                    sMember = isTo === true ? sNode : node;
                                importSetRegAndAtr(sOwner,sMember,jObj);
                            }
                            cb(null);
                        }
                    });
                },
                error = null;

            if(jNode.pointers[sName].to.length > 0){
                needed += jNode.pointers[sName].to.length;
                _core.createSet(node,sName);
            }

            if(needed > 0){
                for(var i=0;i<jNode.pointers[sName].to.length;i++){
                    importSetReference(true,i,function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        } else {
            callback(null); //TODO now we just simply try to ignore faulty data import
        }
    }
    function importRelations(node,jNode,callback){
        //TODO now se use the pointer's 'set' attribute to decide if it is a set or a pointer really
        var pointers = [],
            sets = [],
            needed = 0,
            error = null,
            i;
        if(! typeof jNode.pointers === 'object'){
            callback(null); //TODO should we drop an error???
        } else {
            for(i in jNode.pointers){
                if(jNode.pointers[i].set === true){
                    sets.push(i);
                } else {
                    pointers.push(i);
                }
            }

            needed = sets.length + pointers.length;

            if(needed > 0){
                for(i=0;i<pointers.length;i++){
                    importPointer(node,jNode,pointers[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
                for(i=0;i<sets.length;i++){
                    importSet(node,jNode,sets[i],function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback(null);
            }
        }
    }
    function importMeta(node,jNode,callback){

        //TODO now this function searches the whole meta data for reference objects and load them, then call setMeta
        var loadReference = function(refObj,cb){
                getReferenceNode(refObj,function(err,rNode){
                    if(err){
                        cb(err);
                    } else {
                        if(rNode){
                            refObj['$ref'] = _core.getPath(rNode);
                        }
                        cb(null);
                    }
                });
            },
            loadMetaReferences = function(jObject,cb){
                var needed = 0,
                    error = null;
                for(var i in jObject){
                    if(jObject[i] !== null && typeof jObject[i] === 'object'){
                        needed++;
                    }
                }

                if(needed>0){
                    for(var i in jObject){
                        if(jObject[i] !== null && typeof jObject[i] === 'object'){
                            if(jObject[i]['$ref']){
                                loadReference(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                });
                            } else {
                                loadMetaReferences(jObject[i],function(err){
                                    error = error || err;
                                    if(--needed === 0){
                                        cb(error);
                                    }
                                })
                            }
                        }
                    }
                } else {
                    cb(error);
                }
            };

        loadMetaReferences(jNode.meta || {}, function(err){
            if(err){
                callback(err);
            } else {
                META.setMeta(_core.getPath(node),jNode.meta || {});
                callback(null);
            }
        });
    };
    function importRoot(jNode,callback){
        //first we create the root node itself, then the other parts of the function is pretty much like the importNode

        _root = _core.createNode();
        internalRefCreated('#',_root);
        importAttributes(_root,jNode);
        importRegistry(_root,jNode);
        importChildren(_root,jNode,'#',function(err){
            if(err){
                callback(err);
            } else {
                importRelations(_root,jNode,function(err){
                    if(err){
                        callback(err);
                    } else {
                        importMeta(_root,jNode,function(err){
                            callback(err,_root);
                        });
                    }
                });
            }
        });
    }
    function importNode(jNode,parentNode,intPath,callback){
        //return callback('not implemented');
        //first we have to get the base of the node
        if(jNode.pointers && jNode.pointers.base && jNode.pointers.base.to){
            getReferenceNode(jNode.pointers.base.to[0],function(err,base){
                if(err){
                    callback(err);
                } else {
                    //now we are ready to create the node itself
                    var node = _core.createNode({base:base,parent:parentNode});
                    internalRefCreated(intPath,node);
                    importAttributes(node,jNode);
                    importRegistry(node,jNode);
                    importChildren(node,jNode,intPath,function(err){
                        if(err){
                            callback(err);
                        } else {
                            importRelations(node,jNode,function(err){
                                if(err){
                                    callback(err);
                                } else {
                                    importMeta(node,jNode,callback);
                                }
                            });
                        }
                    });
                }
            });
        } else {
            callback('wrong import format: base info is wrong');
        }
    }
    function importing(core,parent,jNode,callback){
        _core = core;
        _cache = {};
        _underImport = {};
        _internalRefHash = {};
        META.initialize(_core,_cache,function(){});

        if(jNode.length){
            //multiple objects
            if(parent){
                var needed = jNode.length,
                    error = null;
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                for(var i=0;i<jNode.length;i++){
                    importNode(jNode[i],parent,'#['+i+']',function(err){
                        error = error || err;
                        if(--needed === 0){
                            callback(error);
                        }
                    });
                }
            } else {
                callback('no parent given!!!');
            }
        } else {
            //single object
            if(parent){
                _cache[core.getPath(parent)] = parent;
                _root = core.getRoot(parent);
                importNode(jNode,parent,'#',callback);
            } else {
                importRoot(jNode,callback);
            }
        }
    }
    return importing;
});
define('coreclient/serialization',['util/assert'],function(ASSERT){

    
    var _nodes = {},
        _core = null,
        _pathToGuidMap = {},
        _guidKeys = [], //ordered list of GUIDs
        _extraBasePaths = {},
        _export = {},
        _import = {},
        _newNodeGuids = [],
        _removedNodeGuids = [],
        _updatedNodeGuids = [],
        _log = "";

    function log(txt){
        if(_log){
            _log+="\n"+txt;
        } else {
            _log = ""+txt;
        }
    }
    function exportLibrary(core,libraryRoot,callback){
        //initialization
        _core = core;
        _nodes = {};
        _pathToGuidMap = {};
        _guidKeys = [];
        _extraBasePaths = {};
        _export = {};

        //loading all library element
        gatherNodesSlowly(libraryRoot,function(err){

            if(err){
                return callback(err);
            }

            _guidKeys = _guidKeys.sort();
            gatherAncestors(); //collecting the 'external' base classes - probably we should avoid these

            var keys = Object.keys(_extraBasePaths),
                i;
            _export.bases = {};
            for(i=0;i<keys.length;i++){
                _export.bases[_extraBasePaths[keys[i]]] = keys[i];
            }
            //_export.bases = _extraBasePaths; //we save this info alongside with the library export, to be on the safe side

            _export.root = getLibraryRootInfo(libraryRoot);
            _export.relids = getRelIdInfo();
            _export.containment = {}; fillContainmentTree(libraryRoot,_export.containment);
            _export.nodes = getNodesData();
            _export.metaSheets = core.getParent(libraryRoot) ? getMetaSheetInfo(_core.getRoot(libraryRoot)) : {}; //we export MetaSheet info only if not the whole project is exported!!!

            callback(null,_export);

        });
    }
    function getMetaSheetInfo(root){
        var getMemberRegistry = function(setname,memberpath){
                var names = _core.getMemberRegistryNames(root,setname,memberpath),
                    i,
                    registry = {};
                for(i=0;i<names.length;i++){
                    registry[names[i]] = _core.getMemberRegistry(root,setname,memberpath,names[i]);
                }
                return registry;
            },
            getMemberAttributes = function(setname,memberpath){
                var names = _core.getMemberAttributeNames(root,setname,memberpath),
                    i,
                    attributes = {};
                for(i=0;i<names.length;i++){
                    attributes[names[i]] = _core.getMemberAttribute(root,setname,memberpath,names[i]);
                }
                return attributes;
            },
            getRegistryEntry = function(setname){
                var index = registry.length;

                while(--index >= 0){
                    if(registry[index].SetID === setname){
                        return registry[index];
                    }
                }
                return {};
            },
            sheets = {},
            registry = _core.getRegistry(root,"MetaSheets"),
            keys = _core.getSetNames(root),
            elements,guid,
            i,j;
        for(i=0;i<keys.length;i++){
            if(keys[i].indexOf("MetaAspectSet") === 0){
                elements = _core.getMemberPaths(root,keys[i]);
                for(j=0;j<elements.length;j++){
                    guid = _pathToGuidMap[elements[j]] || _extraBasePaths[elements[j]];
                    if(guid){
                        sheets[keys[i]] = sheets[keys[i]] || {};
                        sheets[keys[i]][guid] = {registry:getMemberRegistry(keys[i],elements[j]),attributes:getMemberAttributes(keys[i],elements[j])};
                    }
                }

                if(sheets[keys[i]] && keys[i] !== "MetaAspectSet"){
                    //we add the global registry values as well
                    sheets[keys[i]].global = getRegistryEntry(keys[i]);
                }
            }
        }
        console.log('sheets',sheets);
        return sheets;
    }
    function importMetaSheetInfo(root){
        var setMemberAttributesAndRegistry = function(setname,memberguid){
                var attributes = oldSheets[setname][memberguid].attributes || {},
                    registry = oldSheets[setname][memberguid].registry || {},
                    keys,i;
                keys = Object.keys(attributes);
                for(i=0;i<keys.length;i++) {
                    _core.setMemberAttribute(root,setname,_core.getPath(_nodes[memberguid]),keys[i],attributes[keys[i]]);
                }
                keys = Object.keys(registry);
                for(i=0;i<keys.length;i++) {
                    _core.setMemberRegistry(root,setname,_core.getPath(_nodes[memberguid]),keys[i],registry[keys[i]]);
                }
            },
            updateSheet = function(name){
                //the removed object should be already removed...
                //if some element is extra in the place of import, then it stays untouched
                var oldMemberGuids = Object.keys(oldSheets[name]),
                    i;
                oldMemberGuids.splice(oldMemberGuids.indexOf("global"),1);
                for(i=0;i<oldMemberGuids.length;i++) {
                    _core.addMember(root,name,_nodes[oldMemberGuids[i]]);
                    setMemberAttributesAndRegistry(name,oldMemberGuids[i]);
                }
            },
            addSheet = function(name) {
                var registry = JSON.parse(JSON.stringify(_core.getRegistry(root,"MetaSheets")) || {}),
                    i,
                    memberpath,
                    memberguids = Object.keys(oldSheets[name]);

                memberguids.splice(memberguids.indexOf('global'),1);

                if(name !== 'MetaAspectSet'){
                  registry.push(oldSheets[name].global);
                  _core.setRegistry(root,"MetaSheets",registry);
                }

                _core.createSet(root,name);
                for(i=0;i<memberguids.length;i++) {
                    memberpath = _core.getPath(_nodes[memberguids[i]]);
                    _core.addMember(root,name,_nodes[memberguids[i]]);
                    setMemberAttributesAndRegistry(name,memberguids[i]);
                }
            },
            oldSheets = _import.metaSheets || {},
            newSheets = _export.metaSheets || {},
            oldSheetNames = Object.keys(oldSheets),
            newSheetNames = Object.keys(newSheets),
            i;

        for(i=0;i<oldSheetNames.length;i++) {
            if(newSheetNames.indexOf(oldSheetNames[i]) !== -1){
                updateSheet(oldSheetNames[i]);
            } else {
                addSheet(oldSheetNames[i]);
            }
        }
    }
    function getLibraryRootInfo(node){
        return {
            path: _core.getPath(node),
            guid: _core.getGuid(node)
        };
    }
    function gatherNodesSlowly(node,callback){
        //this function collects all the containment sub-tree of the given node
        var children,
            guid = _core.getGuid(node),
            loadNextChildsubTree = function(index){
                if(index<children.length){
                    gatherNodesSlowly(children[index],function(err){
                        if(err){
                            return callback(err);
                        }

                        loadNextChildsubTree(index+1);
                    });
                } else {
                    callback(null);
                }
            };

        _nodes[guid] = node;
        _guidKeys.push(guid);
        _pathToGuidMap[_core.getPath(node)] = guid;
        _core.loadChildren(node,function(err,c){
            if(err){
                return callback(err);
            }

            children = c;
            loadNextChildsubTree(0);
        });
    }
    function gatherAncestors(){
        //this function inserts the needed base classes which were not included in the library
        var i,base,guid;
        for(i=0;i<_guidKeys.length;i++){
            base = _nodes[_guidKeys[i]];
            while(base!== null){
                guid = _core.getGuid(base);
                if(!_nodes[guid]) {
                    _nodes[guid] = base;
                    _extraBasePaths[_core.getPath(base)] = guid;
                } else if(_guidKeys.indexOf(guid) === -1){
                    _extraBasePaths[_core.getPath(base)] = guid;
                }
                base = _core.getBase(base);
            }
        }
    }
    function pathsToSortedGuidList(pathsList){ //it will also filter out not wanted elements
        var i,guids = [];
        for(i=0;i<pathsList.length;i++){
            if(_pathToGuidMap[pathsList[i]]){
                guids.push(_pathToGuidMap[pathsList[i]]);
            }
        }
        return guids.sort();
    }
    function fillContainmentTree(node,myTreeObject){
        var childrenGuids = pathsToSortedGuidList(_core.getChildrenPaths(node)),
            i;
        for(i=0;i<childrenGuids.length;i++){
            myTreeObject[childrenGuids[i]] = {};
            fillContainmentTree(_nodes[childrenGuids[i]],myTreeObject[childrenGuids[i]]);
        }
    }
    function fillInheritanceTree(node,myTreeObject){
        var i,
            descendantGuids = pathsToSortedGuidList(_core.getCollectionPaths(node,'base'));
        for(i=0;i<descendantGuids.length;i++){
            myTreeObject[descendantGuids[i]] = {};
            fillInheritanceTree(_nodes[descendantGuids[i]],myTreeObject[descendantGuids[i]]);
        }
    }
    function getRelIdInfo(){
        var i,
            relIdInfo={};
        for(i=0;i<_guidKeys.length;i++){
            relIdInfo[_guidKeys[i]] = _core.getRelid(_nodes[_guidKeys[i]]);
        }
        return relIdInfo;
    }
    function getNodesData(){
        var data = {},
            i;
        for(i=0;i<_guidKeys.length;i++){
            data[_guidKeys[i]] = getNodeData(_nodes[_guidKeys[i]]);
        }
        return data;
    }
    function getNodeData(node){
        /*{
            //only the ones defined on this level
            attributes:{name:value},
            base:GUID,
            registry:{name:value},
            parent:GUID,
            pointers:{name:targetGuid},
            sets:{name:[{guid:GUID,attributes:{name:value},registy:{name:value}}]}
            meta:{}
        }*/
        return {
            attributes:getAttributesOfNode(node),
            base: _core.getBase(node) ? _core.getGuid(_core.getBase(node)) : null,
            meta:pathsToGuids(JSON.parse(JSON.stringify(_core.getOwnJsonMeta(node)) || {})),
            parent:_core.getParent(node) ? _core.getGuid(_core.getParent(node)) : null,
            pointers:getPointersOfNode(node),
            registry:getRegistryOfNode(node),
            sets:getSetsOfNode(node)
        };
    }
    function baseGuid(path){
       /*var keys = Object.keys(_extraBasePaths),
            i;
        for(i=0;i<keys.length;i++){
            if(_extraBasePaths[keys[i]] === path){
                return keys[i];
            }
        }
        return null;*/
        return _extraBasePaths[path];
    }

    var sortMultipleArrays = function () {
        var index = getSortedIndex(arguments[0]);
        for (var j = 0; j < arguments.length; j++) {
            var _arr = arguments[j].slice();
            for(var i = 0; i < _arr.length; i++) {
                arguments[j][i] = _arr[index[i]];
            }
        }
    };

    var getSortedIndex = function (arr) {
        var index = [];
        for (var i = 0; i < arr.length; i++) {
            index.push(i);
        }
        index = index.sort((function(arr){
            return function (a, b) {return ((arr[a] > arr[b]) ? 1 : ((arr[a] < arr[b]) ? -1 : 0));
            };
        })(arr));
        return index;
    };

    function pathsToGuids(jsonObject){
        if(jsonObject && typeof jsonObject === 'object'){
            var keys = Object.keys(jsonObject),
                i, j, k,toDelete,tArray;

            for(i=0;i<keys.length;i++){
                if(keys[i] === 'items') {
                    //here comes the transformation itself
                    toDelete = [];
                    for (j = 0; j < jsonObject.items.length; j++) {
                        if (_pathToGuidMap[jsonObject.items[j]]) {
                            jsonObject.items[j] = _pathToGuidMap[jsonObject.items[j]];
                        } else if (baseGuid(jsonObject.items[j])) {
                            jsonObject.items[j] = baseGuid(jsonObject.items[j]);
                        } else {
                            toDelete.push(j);
                        }
                    }

                    if (toDelete.length > 0) {
                        toDelete = toDelete.sort();
                        toDelete = toDelete.reverse();
                        for (j = 0; j < toDelete.length; j++) {
                            jsonObject.items.splice(toDelete[j], 1);
                            jsonObject.minItems.splice(toDelete[j], 1);
                            jsonObject.maxItems.splice(toDelete[j], 1);
                        }
                    }
                    sortMultipleArrays(jsonObject.items, jsonObject.minItems, jsonObject.maxItems);
                } else if(keys[i] === 'aspects'){
                    //aspects are a bunch of named path list, so we have to handle them separately
                    tArray = Object.keys(jsonObject[keys[i]]);
                    for(j=0;j<tArray.length;j++){
                        //here comes the transformation itself
                        toDelete = [];
                        for(k=0;k<jsonObject[keys[i]][tArray[j]].length;k++) {
                            if (_pathToGuidMap[jsonObject[keys[i]][tArray[j]][k]]) {
                                jsonObject[keys[i]][tArray[j]][k] = _pathToGuidMap[jsonObject[keys[i]][tArray[j]][k]];
                            } else if (baseGuid(jsonObject[keys[i]][tArray[j]][k])) {
                                jsonObject[keys[i]][tArray[j]][k] = baseGuid(jsonObject[keys[i]][tArray[j]][k]);
                            } else {
                                toDelete.push(j);
                            }
                        }

                        if (toDelete.length > 0) {
                            toDelete = toDelete.sort();
                            toDelete = toDelete.reverse();
                            for (k = 0; k < toDelete.length; k++) {
                                jsonObject.items.splice(jsonObject[keys[i]][tArray[j]][k], 1);
                            }
                        }

                    }
                } else {
                    if(typeof jsonObject[keys[i]] === 'object'){
                        jsonObject[keys[i]] = pathsToGuids(jsonObject[keys[i]]);
                    }
                }
            }

        }
        return jsonObject;
    }
    function getAttributesOfNode(node){
        var names = _core.getOwnAttributeNames(node).sort(),
            i,
            result = {};
        for(i=0;i<names.length;i++){
            result[names[i]] = _core.getAttribute(node,names[i]);
        }
        return result;
    }
    function getRegistryOfNode(node){
        var names = _core.getOwnRegistryNames(node).sort(),
            i,
            result = {};
        for(i=0;i<names.length;i++){
            result[names[i]] = _core.getRegistry(node,names[i]);
        }
        return result;
    }
    function getPointersOfNode(node){
        var names = _core.getOwnPointerNames(node).sort(),
            i,
            result = {},
            target;
        for(i=0;i<names.length;i++){
            target = _core.getPointerPath(node,names[i]);
            if(_pathToGuidMap[target] || baseGuid(target) || target === null){
                result[names[i]] = _pathToGuidMap[target] || baseGuid(target) || null;
            }
        }
        return result;
    }
    function getOwnMemberPaths(node,setName){
        var base = _core.getBase(node),
            baseMembers = base === null ? [] : _core.getMemberPaths(base,setName),
            members = _core.getMemberPaths(node,setName),
            ownMembers=[],
            i;
        for(i=0;i<members.length;i++){
            if(baseMembers.indexOf(members[i]) === -1){
                ownMembers.push(members[i]);
            }
        }
        return ownMembers;
    }
    function getSetsOfNode(node){
        var names = _core.getSetNames(node).sort(),
            i, j, k,
            result = {},
            targetGuids,
            attributeNames,
            registryNames,
            memberInfo,
            path;
        for(i=0;i<names.length;i++){
            targetGuids = pathsToSortedGuidList(getOwnMemberPaths(node,names[i]));
            result[names[i]] = [];
            for(j=0;j<targetGuids.length;j++){
                path = _core.getPath(_nodes[targetGuids[j]]);
                memberInfo = {
                    attributes:{},
                    guid:targetGuids[j],
                    registry:{}
                };

                //attributes
                attributeNames = _core.getMemberAttributeNames(node,names[i],path).sort();
                for(k=0;k<attributeNames.length;k++){
                    memberInfo.attributes[attributeNames[k]] = _core.getMemberAttribute(node,names[i],path,attributeNames[k]);
                }

                //registry
                registryNames = _core.getMemberRegistryNames(node,names[i],path).sort();
                for(k=0;k<registryNames.length;k++){
                    memberInfo.registry[registryNames[k]] = _core.getMemberRegistry(node,names[i],path,registryNames[k]);
                }

                result[names[i]].push(memberInfo);
            }
        }
        return result;
    }

    function logId(nodes,id){
        var txtId = id+"";
        if(nodes[id] && nodes[id].attributes && nodes[id].attributes.name){
            txtId = nodes[id].attributes.name+"("+id+")";
        }

        return txtId;
    }
    function loadImportBases(guids,root,callback){
        var needed = [],
            error = null,
            stillToGo = 0,
            i,
            guidList = Object.keys(guids),
            loadBase = function(guid,path,cb){
                _core.loadByPath(root,path,function(err,node){
                    if(err){
                        return cb(err);
                    }
                    if(_core.getGuid(node) !== guid){
                        return cb("GUID mismatch");
                    }

                    _nodes[guid] = node;
                    cb(null);
                });
            };

        for(i=0;i<guidList.length;i++){
            if(_nodes[guidList[i]] === undefined){
                needed.push(guidList[i]);
            }
        }

        if(needed.length > 0){
            stillToGo = needed.length;
            for(i=0;i<needed.length;i++){
                loadBase(needed[i],guids[needed[i]],function(err){
                    error = error || err;
                    if(--stillToGo === 0){
                        callback(error);
                    }
                });
            }
        } else {
            return callback(null);
        }


    }
    function importLibrary(core,originLibraryRoot,updatedLibraryJson,callback){
        _core = core;
        _import = updatedLibraryJson;
        _newNodeGuids = [];
        _updatedNodeGuids = [];
        _removedNodeGuids = [];
        _log = "";

        synchronizeRoots(originLibraryRoot,_import.root.guid);
        exportLibrary(core,originLibraryRoot,function(err){
            //we do not need the returned json object as that is stored in our global _export variable
            if(err){
                return callback(err);
            }

            //now we will search for the bases of the import and load them
            loadImportBases(_import.bases,_core.getRoot(originLibraryRoot),function(err){
                if(err){
                    return callback(err);
                }

                //now we fill the insert/update/remove lists of GUIDs
                var oldkeys = Object.keys(_export.nodes),
                    newkeys = Object.keys(_import.nodes),
                    i;

                //TODO now we make three rounds although one would be sufficient on ordered lists
                for(i=0;i<oldkeys.length;i++){
                    if(newkeys.indexOf(oldkeys[i]) === -1){
                        log("node "+logId(_export.nodes,oldkeys[i])+", all of its sub-types and its children will be removed");
                        _removedNodeGuids.push(oldkeys[i]);
                    }
                }

                for(i=0;i<oldkeys.length;i++){
                    if(newkeys.indexOf(oldkeys[i]) !== -1){
                        log("node "+logId(_export.nodes,oldkeys[i])+" will be updated")
                        _updatedNodeGuids.push(oldkeys[i]);
                    }
                }

                for(i=0;i<newkeys.length;i++){
                    if(oldkeys.indexOf(newkeys[i]) === -1){
                        log("node "+logId(_import.nodes,newkeys[i])+" will be added")
                        _newNodeGuids.push(newkeys[i]);
                    }
                }

                //Now we normalize the removedGUIDs by containment and remove them
                var toDelete = [],
                    parent;
                for(i=0;i<_removedNodeGuids.length;i++){
                    parent = _core.getParent(_nodes[_removedNodeGuids[i]]);
                    if(parent && _removedNodeGuids.indexOf(_core.getGuid(parent)) === -1){
                        toDelete.push(_removedNodeGuids[i]);
                    }
                }
                //and as a final step we remove all that is needed
                for(i=0;i<toDelete.length;i++){
                    _core.deleteNode(_nodes[toDelete[i]]);
                }

                //as a second step we should deal with the updated nodes
                //we should go among containment hierarchy
                updateNodes(_import.root.guid,null,_import.containment);

                //now we can add or modify the relations of the nodes - we go along the hierarchy chain
                updateRelations(_import.root.guid,_import.containment);

                //now update inheritance chain
                //we assume that our inheritance chain comes from the FCO and that it is identical everywhere
                updateInheritance();

                //finally we need to update the meta rules of each node - again along the containment hierarchy
                updateMetaRules(_import.root.guid,_import.containment);

                //after everything is done we try to synchronize the metaSheet info
                importMetaSheetInfo(_core.getRoot(originLibraryRoot));

                callback(null,_log);
            });
        });
    }

    function synchronizeRoots(oldRoot,newGuid){
        _core.setGuid(oldRoot,newGuid);
    }
    //it will update the modified nodes and create the new ones regarding their place in the hierarchy chain
    function updateNodes(guid,parent,containmentTreeObject){
        if(_updatedNodeGuids.indexOf(guid) !== -1){
            updateNode(guid,parent);
        }

        var keys = Object.keys(containmentTreeObject),
            i,
            node = _nodes[guid],
            relid;

        for(i=0;i<keys.length;i++){
            if(_updatedNodeGuids.indexOf(keys[i]) === -1){
                relid = _import.relids[keys[i]];
                if(_core.getChildrenRelids(node).indexOf(relid) !== -1){
                    relid = undefined;
                }
                //this child is a new one so we should create
                _nodes[keys[i]] = _core.createNode({parent:node,guid:keys[i],relid:relid});
                addNode(keys[i]);
            }
            updateNodes(keys[i],node,containmentTreeObject[keys[i]]);
        }
    }

    function updateRegistry(guid){
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnRegistryNames(node);
        for(i=0;i<keys.length;i++){
            _core.delRegistry(node,keys[i]);
        }
        keys = Object.keys(jsonNode.registry);
        for(i=0;i<keys.length;i++){
            _core.setRegistry(node,keys[i],jsonNode.registry[keys[i]]);
        }
    }
    function updateAttributes(guid){
        var keys, i,
            node = _nodes[guid],
            jsonNode = _import.nodes[guid];

        keys = _core.getOwnAttributeNames(node);
        for(i=0;i<keys.length;i++){
            _core.delAttribute(node,keys[i]);
        }
        keys = Object.keys(jsonNode.attributes);
        for(i=0;i<keys.length;i++){
            _core.setAttribute(node,keys[i],jsonNode.attributes[keys[i]]);
        }
    }
    //this function does not cover relations - it means only attributes and registry have been updated here
    function updateNode(guid,parent){
        //first we check if the node have to be moved
        var node = _nodes[guid];

        if(parent && _core.getParent(node) && _core.getGuid(parent) !== _core.getGuid(_core.getParent(node))){
            //parent changed so it has to be moved...
            _nodes[guid] = _core.moveNode(node,parent);
        }

        updateAttributes(guid);
        updateRegistry(guid);
    }

    //this function doesn't not cover relations - so only attributes and registry have been taken care of here
    function addNode(guid){
        //at this point we assume that an empty vessel has been already created and part of the _nodes
        updateAttributes(guid);
        updateRegistry(guid);
    }

    function updateRelations(guid,containmentTreeObject){
        var keys,i;
        updateNodeRelations(guid);
        keys = Object.keys(containmentTreeObject);
        for(i=0;i<keys.length;i++){
            updateRelations(keys[i],containmentTreeObject[keys[i]]);
        }
    }
    function updateNodeRelations(guid){
        //although it is possible that we set the base pointer at this point we should go through inheritance just to be sure
        var node = _nodes[guid],
            jsonNode = _import.nodes[guid],
            keys, i, j, k,target,memberGuid;

        //pointers
        keys = _core.getOwnPointerNames(node);
        for(i=0;i<keys.length;i++){
            _core.deletePointer(node,keys[i]);
        }
        keys = Object.keys(jsonNode.pointers);
        for(i=0;i<keys.length;i++){
            target = jsonNode.pointers[keys[i]];
            if(target === null){
                _core.setPointer(node,keys[i],null);
            } else if(_nodes[target] && _removedNodeGuids.indexOf(target) === -1){
                _core.setPointer(node,keys[i],_nodes[target]);
            } else {
                console.log("error handling needed???!!!???");
            }
        }

        //sets
        keys = _core.getSetNames(node);
        for(i=0;i<keys.length;i++){
            _core.deleteSet(node,keys[i]);
        }
        keys = Object.keys(jsonNode.sets);
        for(i=0;i<keys.length;i++){
            //for every set we create it, go through its members...
            _core.createSet(node,keys[i]);
            for(j=0;j<jsonNode.sets[keys[i]].length;j++){
                memberGuid = jsonNode.sets[keys[i]][j].guid;
                if(_nodes[memberGuid]){
                    _core.addMember(node,keys[i],_nodes[memberGuid]);
                    for(k in jsonNode.sets[keys[i]][j].attributes){
                        _core.setMemberAttribute(node,keys[i],_core.getPath(_nodes[memberGuid]),k,jsonNode.sets[keys[i]][j].attributes[k]);
                    }
                    for(k in jsonNode.sets[keys[i]][j].registry){
                        _core.setMemberRegistry(node,keys[i],_core.getPath(_nodes[memberGuid]),k,jsonNode.sets[keys[i]][j].registry[k]);
                    }
                }
            }
        }
    }

    function updateInheritance(){
        var i,guidList = Object.keys(_import.nodes),base;
        for(i=0;i<guidList.length;i++){
            base = _core.getBase(_nodes[guidList[i]]);
            if((base && _core.getGuid(base) !== _import.nodes[guidList[i]].base) || (base === null && _import.nodes[guidList[i]].base !== null)){
                updateNodeInheritance(guidList[i]);
            }
        }
    }
    function updateNodeInheritance(guid){
        _core.setBase(_nodes[guid],_nodes[_import.nodes[guid].base]);
    }

    function updateMetaRules(guid,containmentTreeObject){

        var keys,i;

        updateMeta(guid);

        keys = Object.keys(containmentTreeObject);
        for(i=0;i<keys.length;i++){
            updateMetaRules(keys[i],containmentTreeObject[keys[i]]);
        }
    }

    function updateMeta(guid) {
        _core.clearMetaRules(_nodes[guid]);

        updateAttributeMeta(guid);
        updateChildrenMeta(guid);
        updatePointerMeta(guid);
        updateAspectMeta(guid);
        updateConstraintMeta(guid);
    }

    function updateAttributeMeta(guid){
        var jsonMeta = _import.nodes[guid].meta.attributes || {},
            node = _nodes[guid],
            keys,i;

        keys = Object.keys(jsonMeta);
        for(i=0;i<keys.length;i++){
            _core.setAttributeMeta(node,keys[i],jsonMeta[keys[i]]);
        }
    }
    function updateChildrenMeta(guid){
        var jsonMeta = _import.nodes[guid].meta.children || {items:[],minItems:[],maxItems:[]},
            i;
        ASSERT(jsonMeta.items.length === jsonMeta.minItems.length && jsonMeta.minItems.length === jsonMeta.maxItems.length);

        _core.setChildrenMetaLimits(_nodes[guid],jsonMeta.min,jsonMeta.max);
        for(i=0;i<jsonMeta.items.length;i++){
            _core.setChildMeta(_nodes[guid],_nodes[jsonMeta.items[i]],jsonMeta.minItems[i],jsonMeta.maxItems[i]);
        }
    }
    function updatePointerMeta(guid){
        var jsonMeta = _import.nodes[guid].meta.pointers || {},
            keys = Object.keys(jsonMeta),
            i, j;

        for(i=0;i<keys.length;i++){
            ASSERT(jsonMeta[keys[i]].items.length === jsonMeta[keys[i]].minItems.length && jsonMeta[keys[i]].maxItems.length === jsonMeta[keys[i]].minItems.length);
            for(j=0;j<jsonMeta[keys[i]].items.length;j++){
                _core.setPointerMetaTarget(_nodes[guid],keys[i],_nodes[jsonMeta[keys[i]].items[j]],jsonMeta[keys[i]].minItems[j],jsonMeta[keys[i]].maxItems[j]);
            }
            _core.setPointerMetaLimits(_nodes[guid],keys[i],jsonMeta[keys[i]].min,jsonMeta[keys[i]].max);
        }
    }
    function updateAspectMeta(guid){
        var jsonMeta = _import.nodes[guid].meta.aspects || {},
            keys = Object.keys(jsonMeta),
            i,j;

        for(i=0;i<keys.length;i++){
            for(j=0;j<jsonMeta[keys[i]].length;j++){
                _core.setAspectMetaTarget(_nodes[guid],keys[i],_nodes[jsonMeta[keys[i]][j]]);
            }
        }
    }
    function updateConstraintMeta(guid){
        var jsonMeta = _import.nodes[guid].meta.constraints || {},
            keys = Object.keys(jsonMeta),
            i;

        for(i=0;i<keys.length;i++){
            _core.setConstraint(_nodes[guid],keys[i],jsonMeta[keys[i]]);
        }
    }

    return {
        export : exportLibrary,
        import : importLibrary
    };
});

/*globals define, _, requirejs, WebGMEGlobal*/

define('client',[
    'util/assert',
    'eventDispatcher',
    'util/guid',
    'core/core',
    'storage/clientstorage',
    'logManager',
    'util/url',
    'coreclient/meta',
    'coreclient/tojson',
    'coreclient/dump',
    'coreclient/dumpmore',
    'coreclient/import',
    'coreclient/copyimport',
    'coreclient/serialization'
  ],
  function (
    ASSERT,
    EventDispatcher,
    GUID,
    Core,
    Storage,
    LogManager,
    URL,
    BaseMeta,
    ToJson,
    Dump,
    DumpMore,
    MergeImport,
    Import,
    Serialization) {

    

    var ROOT_PATH = '';

    function COPY(object) {
      if (object) {
        return JSON.parse(JSON.stringify(object));
      }
      return null;
    }


    function getNewCore(project) {
      //return new NullPointerCore(new DescriptorCore(new SetCore(new GuidCore(new Core(project)))));
      return Core(project, {autopersist: true, usertype: 'nodejs'});
    }

    function UndoRedo(_client) {
      var
        currentModification = null,
        canDoUndo = false,
        canDoRedo = false,
        currentTarget = null,
        addModification = function (commitHash, info) {
          var newElement = {
            previous: currentModification,
            commit: commitHash,
            info: info,
            next: null
          };
          if(currentModification){
              currentModification.next = newElement;
          }
          currentModification = newElement;
        },
        undo = function (branch, callback) {
          var from, to, project;
          if (canDoUndo && currentModification && currentModification.previous) {
            project = _client.getProjectObject();
            from = currentModification.commit;
            to = currentModification.previous.commit;
            currentModification = currentModification.previous;
            currentTarget = to;
            project.setBranchHash(branch, from, to, callback);
          } else {
            callback(new Error('unable to execute undo'));
          }
        },
        redo = function (branch, callback) {
          var from, to, project;
          if (canDoRedo && currentModification && currentModification.next) {
            project = _client.getProjectObject();
            from = currentModification.commit;
            to = currentModification.next.commit;
            currentModification = currentModification.next;
            currentTarget = to;
            project.setBranchHash(branch, from, to, callback);
          } else {
            callback(new Error('unable to execute redo'));
          }
        },
        clean = function() {
          currentModification = null;
          canDoUndo = false;
          canDoRedo = false;
        },
        checkStatus = function(){
          return {
            undo: currentModification ? currentModification.previous !== null && currentModification.previous !== undefined : false,
            redo: currentModification ? currentModification.next !== null && currentModification.next !== undefined : false
          };
        },
        isCurrentTarget = function(commitHash){
          if(currentTarget === commitHash){
            currentTarget = null;
            return true;
          }
          return false;
        };

      _client.addEventListener(_client.events.UNDO_AVAILABLE,function(client,parameters){
        canDoUndo = parameters === true;
      });
      _client.addEventListener(_client.events.REDO_AVAILABLE,function(client,parameters){
        canDoRedo = parameters === true;
      });
      return {
        undo: undo,
        redo: redo,
        addModification: addModification,
        clean: clean,
        checkStatus: checkStatus,
        isCurrentTarget: isCurrentTarget
      };

    }

    function Client(_configuration) {
      var _self = this,
        logger = LogManager.create("client"),
        _database = null,
        _projectName = null,
        _project = null,
        _core = null,
        _branch = null,
        _branchState = null,
        _nodes = {},
        _metaNodes = {},
        _inTransaction = false,
        _users = {},
        _patterns = {},
        _networkStatus = '',
        _msg = "",
        _recentCommits = [],
        _viewer = false,
        _readOnlyProject = false,
        _loadNodes = {},
        _loadError = 0,
        _commitCache = null,
        _offline = false,
        _networkWatcher = null,
        _TOKEN = null,
        META = new BaseMeta(),
        _rootHash = null,
        _root = null,
        _gHash = 0,
        _addOns = {},
        _constraintCallback = null,
        _redoer = null,
        _selfCommits = {},
        AllPlugins, AllDecorators;

      if (!_configuration.host) {
        if (window) {
          _configuration.host = window.location.protocol + "//" + window.location.host;
        } else {
          _configuration.host = "";
        }
      }
      require([_configuration.host + '/listAllDecorators', _configuration.host + '/listAllPlugins'], function (d, p) {
        AllDecorators = WebGMEGlobal.allDecorators;
        AllPlugins = WebGMEGlobal.allPlugins;
      });

      function print_nodes(pretext) {
        if (pretext) {
          console.log(pretext);
        }
        var nodes = "loaded: ";
        for (var k in _loadNodes) {
          nodes += "(" + k + "," + _loadNodes[k].hash + ")";
        }
        console.log(nodes);
        nodes = "stored: ";
        for (var k in _nodes) {
          nodes += "(" + k + "," + _nodes[k].hash + ")";
        }
        console.log(nodes);
        return;
      }

      //default configuration
      _configuration = _configuration || {};
      _configuration.autoreconnect = _configuration.autoreconnect === null || _configuration.autoreconnect === undefined ? true : _configuration.autoreconnect;
      _configuration.reconndelay = _configuration.reconndelay || 1000;
      _configuration.reconnamount = _configuration.reconnamount || 1000;
      _configuration.autostart = _configuration.autostart === null || _configuration.autostart === undefined ? false : _configuration.autostart;


      //TODO remove the usage of jquery
      //$.extend(_self, new EventDispatcher());
      var eDisp = new EventDispatcher();
      for (var i in eDisp) {
        _self[i] = eDisp[i];
      }
      _self.events = {
        "NETWORKSTATUS_CHANGED": "NETWORKSTATUS_CHANGED",
        "BRANCHSTATUS_CHANGED": "BRANCHSTATUS_CHANGED",
        "BRANCH_CHANGED": "BRANCH_CHANGED",
        "PROJECT_CLOSED": "PROJECT_CLOSED",
        "PROJECT_OPENED": "PROJECT_OPENED",

        "SERVER_PROJECT_CREATED": "SERVER_PROJECT_CREATED",
        "SERVER_PROJECT_DELETED": "SERVER_PROJECT_DELETED",
        "SERVER_BRANCH_CREATED": "SERVER_BRANCH_CREATED",
        "SERVER_BRANCH_UPDATED": "SERVER_BRANCH_UPDATED",
        "SERVER_BRANCH_DELETED": "SERVER_BRANCH_DELETED",

        "UNDO_AVAILABLE": "UNDO_AVAILABLE",
        "REDO_AVAILABLE": "REDO_AVAILABLE"
      };
      _self.networkStates = {
        'CONNECTED': "connected",
        'DISCONNECTED': "socket.io is disconnected"
      };
      _self.branchStates = {
        'SYNC': 'inSync',
        'FORKED': 'forked',
        'OFFLINE': 'offline'
      };

      function getUserId() {
        var cookies = URL.parseCookie(document.cookie);
        if (cookies.webgme) {
          return cookies.webgme;
        } else {
          return 'n/a';
        }
      }

      function newDatabase() {
        return Storage({log: LogManager.create('client-storage'), user: getUserId(), host: _configuration.host});
      }

      function changeBranchState(newstate) {
        if (_branchState !== newstate) {
          _branchState = newstate;
          _self.dispatchEvent(_self.events.BRANCHSTATUS_CHANGED, _branchState);
        }
      }

      function connect() {
        //this is when the user force to go online on network level
        //TODO implement :) - but how, there is no such function on the storage's API
        if (_database) {
          _database.openDatabase(function (err) {
          });
        }
      }

      //branch handling functions
      function goOffline() {
        //TODO stop watching the branch changes
        _offline = true;
        changeBranchState(_self.branchStates.OFFLINE);
      }

      function goOnline() {
        //TODO we should try to update the branch with our latest commit
        //and 'restart' listening to branch changes
        if (_offline) {
          stopRunningAddOns();
          branchWatcher(_branch);
        }
      }

      function addCommit(commitHash) {
        _commitCache.newCommit(commitHash);
        _recentCommits.unshift(commitHash);
        if (_recentCommits.length > 100) {
          _recentCommits.pop();
        }
      }

      function serverEventer() {
        var lastGuid = '',
          nextServerEvent = function (err, guid, parameters) {
            lastGuid = guid || lastGuid;
            if (!err && parameters) {
              switch (parameters.type) {
                case "PROJECT_CREATED":
                  _self.dispatchEvent(_self.events.SERVER_PROJECT_CREATED, parameters.project);
                  break;
                case "PROJECT_DELETED":
                  _self.dispatchEvent(_self.events.SERVER_PROJECT_DELETED, parameters.project);
                  break;
                case "BRANCH_CREATED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_CREATED, {project: parameters.project, branch: parameters.branch, commit: parameters.commit});
                  break;
                case "BRANCH_DELETED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_DELETED, {project: parameters.project, branch: parameters.branch});
                  break;
                case "BRANCH_UPDATED":
                  _self.dispatchEvent(_self.events.SERVER_BRANCH_UPDATED, {project: parameters.project, branch: parameters.branch, commit: parameters.commit});
                  break;
              }
              return _database.getNextServerEvent(lastGuid, nextServerEvent);
            } else {
              setTimeout(function () {
                return _database.getNextServerEvent(lastGuid, nextServerEvent);
              }, 1000);
            }
          };
        _database.getNextServerEvent(lastGuid, nextServerEvent);
      }

      //addOn functions
      function startAddOnAsync(name, projectName, branchName, callback) {
        if (_addOns[name] === undefined) {
          _addOns[name] = "loading";
          _database.simpleRequest({command: 'connectedWorkerStart', workerName: name, project: projectName, branch: branchName}, function (err, id) {
            if (err) {
              delete _addOns[name];
              return callback(err);
            }

            _addOns[name] = id;
            callback(null);
          });
        }
      }

      function startAddOn(name) {
        if (_addOns[name] === undefined) {
          _addOns[name] = "loading";
          _database.simpleRequest({command: 'connectedWorkerStart', workerName: name, project: _projectName, branch: _branch}, function (err, id) {
            console.log('started addon', err);
            if (err) {
              delete _addOns[name];
              return logger.error(err);
            }

            _addOns[name] = id;
          });
        }

      }

      function queryAddOn(name, query, callback) {
        if (!_addOns[name] || _addOns[name] === "loading") {
          return callback(new Error('no such addOn is ready for queries'));
        }
        _database.simpleQuery(_addOns[name], query, callback);
      }

      function stopAddOn(name, callback) {
        if (_addOns[name] && _addOns[name] !== "loading") {
          _database.simpleResult(_addOns[name], callback);
          delete _addOns[name];
        } else {
          callback(_addOns[name] ? new Error("addon loading") : null);
        }
      }

      //generic project related addOn handling
      function updateRunningAddOns(root) {
        var neededAddOns = _core.getRegistry(root, "usedAddOns"),
          i,
          runningAddOns = getRunningAddOnNames();
        neededAddOns = neededAddOns ? neededAddOns.split(" ") : [];
        for (i = 0; i < neededAddOns.length; i++) {
          if (!_addOns[neededAddOns[i]]) {
            startAddOn(neededAddOns[i]);
          }
        }
        for (i = 0; i < runningAddOns.length; i++) {
          if (neededAddOns.indexOf(runningAddOns[i]) === -1) {
            stopAddOn(runningAddOns[i], function (err) {
            });
          }
        }
      }

      function stopRunningAddOns() {
        var i,
          keys = Object.keys(_addOns),
          callback = function (err) {
            if (err) {
              console.log("stopAddOn", err);
            }
          };
        for (i = 0; i < keys.length; i++) {
          stopAddOn(keys[i], callback);
        }
      }

      function getRunningAddOnNames() {
        var i,
          names = [],
          keys = Object.keys(_addOns);
        for (i = 0; i < keys.length; i++) {
          if (_addOns[keys[i]] !== 'loading') {
            names.push(keys[i]);
          }
        }
        return names;
      }

      //core addOns
      function startCoreAddOnsAsync(project, branch, callback) {
        var needed = 2,
          error = null,
          icb = function (err) {
            error = error || err;
            if (--needed === 0) {
              callback(error);
            }
          };

        startHistoryAsync(project, branch, icb);
        startConstraintAsync(project, branch, icb);
      }

      //history
      function startHistoryAsync(project, branch, callback) {
        if (_addOns['HistoryAddOn'] && _addOns['HistoryAddOn'] !== 'loading') {
          stopAddOn('HistoryAddOn', function (err) {
            if (err) {
              callback(err);
            } else {
              startAddOnAsync('HistoryAddOn', project, branch, callback);
            }
          });
        } else {
          startAddOnAsync('HistoryAddOn', project, branch, callback);
        }
      }

      function getDetailedHistoryAsync(callback) {
        if (_addOns['HistoryAddOn'] && _addOns['HistoryAddOn'] !== 'loading') {
          queryAddOn('HistoryAddOn', {}, callback);
        } else {
          callback(new Error('history information is not available'));
        }
      }

      //constraint
      function startConstraintAsync(project, branch, callback) {
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          stopAddOn('ConstraintAddOn', function (err) {
            if (err) {
              callback(err);
            } else {
              startAddOnAsync('ConstraintAddOn', project, branch, callback);
            }
          });
        } else {
          startAddOnAsync('ConstraintAddOn', project, branch, callback);
        }
      }

      function validateProjectAsync(callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkProject'}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function validateModelAsync(path, callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkModel', path: path}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function validateNodeAsync(path, callback) {
        callback = callback || _constraintCallback || function (err, result) {
        };
        if (_addOns['ConstraintAddOn'] && _addOns['ConstraintAddOn'] !== 'loading') {
          queryAddOn("ConstraintAddOn", {querytype: 'checkNode', path: path}, callback);
        } else {
          callback(new Error('constraint checking is not available'));
        }
      }

      function setValidationCallback(cFunction) {
        if (typeof cFunction === 'function' || cFunction === null) {
          _constraintCallback = cFunction;
        }
      }

      //core addOns end

      function tokenWatcher() {
        var token = null,
          refreshToken = function () {
            _database.getToken(function (err, t) {
              if (!err) {
                token = t || "_";
              }
            });
          },
          getToken = function () {
            return token;
          };

        setInterval(refreshToken, 10000); //maybe it could be configurable
        refreshToken();

        //TODO check if this is okay to set it here
        WebGMEGlobal.getToken = getToken;
        return {
          getToken: getToken
        };
      }

      function branchWatcher(branch, callback) {
        ASSERT(_project);
        callback = callback || function () {
        };
        var myCallback = null;
        var redoerNeedsClean = true;
        var branchHashUpdated = function (err, newhash, forked) {
          var doUpdate = false;
          if (branch === _branch && !_offline) {
            if (!err && typeof newhash === 'string') {
              if (newhash === '') {
                logger.warning('The current branch ' + branch + ' have been deleted!');
                //we should open a viewer with our current commit...
                var latestCommit = _recentCommits[0];
                viewerCommit(latestCommit, function (err) {
                  if (err) {
                    logger.error('Current branch ' + branch + ' have been deleted, and unable to open the latest commit ' + latestCommit + '! [' + JSON.stringify(err) + ']');
                  }
                });
              } else {
                if(_redoer.isCurrentTarget(newhash)){
                  addCommit(newhash);
                  doUpdate = true;
                } else if(!_selfCommits[newhash] || redoerNeedsClean){
                  redoerNeedsClean = false;
                  _redoer.clean();
                  _redoer.addModification(newhash,"branch initial");
                  _selfCommits={};
                  _selfCommits[newhash] = true;
                  doUpdate = true;
                  addCommit(newhash);
                }
                var redoInfo = _redoer.checkStatus(),
                  canUndo = false,
                  canRedo = false;

                if(_selfCommits[newhash]){
                  if(redoInfo.undo) {
                    canUndo = true;
                  }
                  if(redoInfo.redo) {
                    canRedo = true;
                  }
                }
                _self.dispatchEvent(_self.events.UNDO_AVAILABLE, canUndo);
                _self.dispatchEvent(_self.events.REDO_AVAILABLE, canRedo);

                if(doUpdate){
                  _project.loadObject(newhash, function (err, commitObj) {
                    if (!err && commitObj) {
                      loading(commitObj.root);
                    } else {
                      setTimeout(function () {
                        _project.loadObject(newhash, function (err, commitObj) {
                          if (!err && commitObj) {
                            loading(commitObj.root);
                          } else {
                            console.log("second load try failed on commit!!!", err);
                          }
                        });
                      }, 1000);
                    }
                  });
                }

                if (callback) {
                  myCallback = callback;
                  callback = null;
                  myCallback();
                }

                //branch status update
                if (_offline) {
                  changeBranchState(_self.branchStates.OFFLINE);
                } else {
                  if (forked) {
                    changeBranchState(_self.branchStates.FORKED);
                  }
                }

                return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);

                /*if(redoerNeedsClean || !_selfCommits[newhash]){
                  redoerNeedsClean = false;
                  _redoer.clean();
                  _redoer.addModification(newhash,"branch initial");
                  _selfCommits={};_selfCommits[newhash] = true;
                }
                var redoInfo = _redoer.checkStatus(),
                  canUndo = false,
                  canRedo = false;

                if(_selfCommits[newhash]){
                  if(redoInfo.undo) {
                    canUndo = true;
                  }
                  if(redoInfo.redo) {
                    canRedo = true;
                  }
                }
                _self.dispatchEvent(_self.events.UNDO_AVAILABLE, canUndo);
                _self.dispatchEvent(_self.events.REDO_AVAILABLE, canRedo);


                if (/*_recentCommits.indexOf(newhash) === -1/_recentCommits.indexOf(newhash) !== 0) {

                  addCommit(newhash);

                  //TODO here we have to start with a syncronous root object load...
                  _project.loadObject(newhash, function (err, commitObj) {
                    if (!err && commitObj) {
                      loading(commitObj.root);
                    } else {
                      setTimeout(function () {
                        _project.loadObject(newhash, function (err, commitObj) {
                          if (!err && commitObj) {
                            loading(commitObj.root);
                          } else {
                            console.log("second load try failed on commit!!!", err);
                          }
                        });
                      }, 1000);
                    }
                  });
                }

                if (callback) {
                  myCallback = callback;
                  callback = null;
                  myCallback();
                }

                //branch status update
                if (_offline) {
                  changeBranchState(_self.branchStates.OFFLINE);
                } else {
                  if (forked) {
                    changeBranchState(_self.branchStates.FORKED);
                  }
                  /* else {
                   changeBranchState(_self.branchStates.SYNC);
                   }/
                }

                return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);*/
              }
            } else {
              if (callback) {
                myCallback = callback;
                callback = null;
                myCallback();
              }
              return _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
            }
          } else {
            if (callback) {
              myCallback = callback;
              callback = null;
              myCallback();
            }
          }
        };

        if (_branch !== branch) {
          _branch = branch;
          _viewer = false;
          _offline = false;
          _recentCommits = [""];
          _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
          changeBranchState(_self.branchStates.SYNC);
          _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
        } else {
          if (_offline) {
            _viewer = false;
            _offline = false;
            changeBranchState(_self.branchStates.SYNC);
            _project.getBranchHash(branch, _recentCommits[0], branchHashUpdated);
          } else {
            callback(null);
          }
        }
      }

      function networkWatcher() {
        _networkStatus = "";
        var running = true;
        var autoReconnect = _configuration.autoreconnect ? true : false;
        var reConnDelay = _configuration.reconndelay || 1000;
        var reConnAmount = _configuration.reconnamount || 1000;
        var reconnecting = function () {
          var counter = 0;
          var timerId = setInterval(function () {
            if (counter < reConnAmount && _networkStatus === _self.networkStates.DISCONNECTED && running) {
              _database.openDatabase(function (err) {
              });
              counter++;
            } else {
              clearInterval(timerId);
            }
          }, reConnDelay);
        };
        var dbStatusUpdated = function (err, newstatus) {
          if (running) {
            if (!err && newstatus && _networkStatus !== newstatus) {
              _networkStatus = newstatus;
              if (_networkStatus === _self.networkStates.DISCONNECTED && autoReconnect) {
                reconnecting();
              }
              _self.dispatchEvent(_self.events.NETWORKSTATUS_CHANGED, _networkStatus);
            }
            return _database.getDatabaseStatus(_networkStatus, dbStatusUpdated);
          }
          return;
        };
        var stop = function () {
          running = false;
        }
        _database.getDatabaseStatus('', dbStatusUpdated);

        return {
          stop: stop
        };
      }

      function commitCache() {
        var _cache = {},
          _timeOrder = [];

        function clearCache() {
          _cache = {};
          _timeOrder = [];
        }

        function addCommit(commitObject) {
          if (_cache[commitObject._id]) {
            //already in the cache we do not have to do anything
            return;
          } else {
            _cache[commitObject._id] = commitObject;
            var index = 0;
            while (index < _timeOrder.length && _cache[_timeOrder[index]].time > commitObject.time) {
              index++;
            }
            _timeOrder.splice(index, 0, commitObject._id);
          }
          return;
        }

        function getNCommitsFrom(commitHash, number, callback) {
          var fillCache = function (time, number, cb) {
            _project.getCommits(time, number, function (err, commits) {
              if (!err && commits) {
                for (var i = 0; i < commits.length; i++) {
                  addCommit(commits[i]);
                }
                cb(null);
              } else {
                //we cannot get new commits from the server
                //we should use our very own ones
                cb(null);
              }
            });
          };
          var returnNCommitsFromHash = function (hash, num, cb) {
            //now we should have all the commits in place
            var index = _timeOrder.indexOf(hash),
              commits = [];
            if (index > -1 || hash === null) {
              if (hash === null) {
                index = 0;
              } else {
                index++;

              }
              while (commits.length < num && index < _timeOrder.length) {
                commits.push(_cache[_timeOrder[index]]);
                index++;
              }
              cb(null, commits);
            } else {
              cb('cannot found starting commit');
            }
          };
          var cacheFilled = function (err) {
            if (err) {
              callback(err);
            } else {
              returnNCommitsFromHash(commitHash, number, callback);
            }
          };


          if (commitHash) {
            if (_cache[commitHash]) {
              //we can be lucky :)
              var index = _timeOrder.indexOf(commitHash);
              if (_timeOrder.length > index + number) {
                //we are lucky
                cacheFilled(null);
              } else {
                //not that lucky
                fillCache(_cache[_timeOrder[_timeOrder.length - 1]].time, number - (_timeOrder.length - (index + 1)), cacheFilled);
              }
            } else {
              //we are not lucky enough so we have to download the commit
              _project.loadObject(commitHash, function (err, commitObject) {
                if (!err && commitObject) {
                  addCommit(commitObject);
                  fillCache(commitObject.time, number, cacheFilled);
                } else {
                  callback(err);
                }
              });
            }
          } else {
            //initial call
            fillCache((new Date()).getTime(), number, cacheFilled);
          }
        }

        function newCommit(commitHash) {
          if (_cache[commitHash]) {
            return;
          } else {
            _project.loadObject(commitHash, function (err, commitObj) {
              if (!err && commitObj) {
                addCommit(commitObj);
              }
              return;
            });
          }
        }

        return {
          getNCommitsFrom: getNCommitsFrom,
          clearCache: clearCache,
          newCommit: newCommit
        };
      }

      function viewLatestCommit(callback) {
        _commitCache.getNCommitsFrom(null, 1, function (err, commits) {
          if (!err && commits && commits.length > 0) {
            viewerCommit(commits[0][_project.ID_NAME], callback)
          } else {
            logger.error('Cannot get latest commit! [' + JSON.stringify(err) + ']');
            callback(err);
          }
        });
      }

      function openProject(name, callback) {
        //this function cannot create new project
        ASSERT(_database);
        var waiting = 1,
          innerCallback = function (err) {
            error = error || err;
            if (--waiting === 0) {
              if (error) {
                logger.error('The branch ' + firstName + ' of project ' + name + ' cannot be selected! [' + JSON.stringify(error) + ']');
              }
              callback(error);
            }
          },
          firstName = null,
          error = null;
        _database.getProjectNames(function (err, names) {
          if (err) {
            return callback(err);
          }
          if (names.indexOf(name) !== -1) {
            _database.openProject(name, function (err, p) {
              if (!err && p) {
                _database.getAuthorizationInfo(name, function (err, authInfo) {
                  _readOnlyProject = authInfo ? (authInfo.write === true ? false : true) : true;
                  _project = p;
                  _projectName = name;
                  _inTransaction = false;
                  _nodes = {};
                  _metaNodes = {};
                  _core = getNewCore(_project);
                  META.initialize(_core, _metaNodes, saveRoot);
                  if (_commitCache) {
                    _commitCache.clearCache();
                  } else {
                    _commitCache = commitCache();
                  }
                  _self.dispatchEvent(_self.events.PROJECT_OPENED, _projectName);

                  //check for master or any other branch
                  _project.getBranchNames(function (err, names) {
                    if (!err && names) {

                      if (names['master']) {
                        firstName = 'master';
                      } else {
                        firstName = Object.keys(names)[0] || null;
                      }

                      if (firstName) {
                        stopRunningAddOns();
                        branchWatcher(firstName, innerCallback);
                        //startCoreAddOnsAsync(_projectName,firstName,innerCallback);
                      } else {
                        //we should try the latest commit
                        viewLatestCommit(callback);
                      }
                    } else {
                      //we should try the latest commit
                      viewLatestCommit(callback);
                    }
                  });
                });
              } else {
                logger.error('The project ' + name + ' cannot be opened! [' + JSON.stringify(err) + ']');
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no such project'));
          }

        });
      }

      //internal functions
      function cleanUsersTerritories() {
        for (var i in _users) {
          var events = [];
          for (var j in _users[i].PATHS) {
            events.push({etype: 'unload', eid: j});
          }
          // TODO events.push({etype:'complete',eid:null});


          _users[i].FN(events);
          _users[i].PATTERNS = {};
          _users[i].PATHS = {};
          _users[i].SENDEVENTS = true;
        }
      }

      function reLaunchUsers() {
        for (var i in _users) {
          if (_users[i].UI.reLaunch) {
            _users[i].UI.reLaunch();
          }
        }
      }

      function closeOpenedProject(callback) {
        callback = callback || function () {
        };
        var returning = function (e) {
          var oldProjName = _projectName;
          _projectName = null;
          _inTransaction = false;
          _core = null;
          _nodes = {};
          _metaNodes = {};
          //_commitObject = null;
          _patterns = {};
          _msg = "";
          _recentCommits = [];
          _viewer = false;
          _readOnlyProject = false;
          _loadNodes = {};
          _loadError = 0;
          _offline = false;
          cleanUsersTerritories();
          if (oldProjName) {
            //otherwise there were no open project at all
            _self.dispatchEvent(_self.events.PROJECT_CLOSED, oldProjName);
          }

          callback(e);
        };
        if (_branch) {
          //otherwise the branch will not 'change'
          _self.dispatchEvent(_self.events.BRANCH_CHANGED, null);
        }
        _branch = null;
        if (_project) {
          var project = _project;
          _project = null;
          project.closeProject(function (err) {
            //TODO what if for some reason we are in transaction???
            returning(err);
          });
        } else {
          returning(null);
        }
      }

      function createEmptyProject(project, callback) {
        var core = getNewCore(project),
          root = core.createNode(),
          rootHash = '',
          commitHash = '';
        core.persist(root,function(err){
          rootHash = core.getHash(root);
          commitHash = project.makeCommit([],rootHash,'project creation commit',function(err){
            project.setBranchHash('master',"",commitHash, function (err) {
                    callback(err, commitHash);
                });
          });
        });

      }

      //loading functions
      function getStringHash(node) {
        //TODO there is a memory issue with the huge strings so we have to replace it with something
        return _gHash++;
        /*
         var datas = _core.getDataForSingleHash(node),
         i,hash="";
         for(i=0;i<datas.length;i++){
         hash+=datas[i];
         }
         return hash;
         */

      }

      function getModifiedNodes(newerNodes) {
        var modifiedNodes = [];
        for (var i in _nodes) {
          if (newerNodes[i]) {
            if (newerNodes[i].hash !== _nodes[i].hash && _nodes[i].hash !== "") {
              modifiedNodes.push(i);
            }
          }
        }
        return modifiedNodes;
      }

      //this is just a first brute implementation it needs serious optimization!!!
      function fitsInPatternTypes(path, pattern) {
        if (pattern.items && pattern.items.length > 0) {
          for (var i = 0; i < pattern.items.length; i++) {
            if (META.isTypeOf(path, pattern.items[i])) {
              return true;
            }
          }
          return false;
        } else {
          return true;
        }
      }

      function patternToPaths(patternId, pattern, pathsSoFar) {
        if (_nodes[patternId]) {
          pathsSoFar[patternId] = true;
          if (pattern.children && pattern.children > 0) {
            var children = _core.getChildrenPaths(_nodes[patternId].node);
            var subPattern = COPY(pattern);
            subPattern.children--;
            for (var i = 0; i < children.length; i++) {
              if (fitsInPatternTypes(children[i], pattern)) {
                patternToPaths(children[i], subPattern, pathsSoFar);
              }
            }
          }
        } else {
          _loadError++;
        }

      }

      function userEvents(userId, modifiedNodes) {
        var newPaths = {};
        var startErrorLevel = _loadError;
        for (var i in _users[userId].PATTERNS) {
          if (_nodes[i]) { //TODO we only check pattern if its root is there...
            patternToPaths(i, _users[userId].PATTERNS[i], newPaths);
          }
        }

        if (startErrorLevel !== _loadError) {
          return; //we send events only when everything is there correctly
        }
        var events = [];

        //deleted items
        for (i in _users[userId].PATHS) {
          if (!newPaths[i]) {
            events.push({etype: 'unload', eid: i});
          }
        }

        //added items
        for (i in newPaths) {
          if (!_users[userId].PATHS[i]) {
            events.push({etype: 'load', eid: i});
          }
        }

        //updated items
        for (i = 0; i < modifiedNodes.length; i++) {
          if (newPaths[modifiedNodes[i]]) {
            events.push({etype: 'update', eid: modifiedNodes[i]});
          }
        }

        _users[userId].PATHS = newPaths;


        if (events.length > 0) {
          if (_loadError > startErrorLevel) {
            // TODO events.unshift({etype:'incomplete',eid:null});
          } else {
            // TODO events.unshift({etype:'complete',eid:null});
          }

          _users[userId].FN(events);
        }
      }

      function storeNode(node, basic) {
        //basic = basic || true;
        if (node) {
          var path = _core.getPath(node);
          _metaNodes[path] = node;
          if (_nodes[path]) {
            //TODO we try to avoid this
          } else {
            _nodes[path] = {node: node, hash: ""/*,incomplete:true,basic:basic*/};
          }
          return path;
        }
        return null;
      }

      function _loadChildrenPattern(core, nodesSoFar, node, level, callback) {
        var path = core.getPath(node);
        _metaNodes[path] = node;
        if (!nodesSoFar[path]) {
          nodesSoFar[path] = {node: node, incomplete: true, basic: true, hash: getStringHash(node)};
        }
        if (level > 0) {
          if (core.getChildrenRelids(nodesSoFar[path].node).length > 0) {
            core.loadChildren(nodesSoFar[path].node, function (err, children) {
              if (!err && children) {
                var missing = children.length;
                var error = null;
                for (var i = 0; i < children.length; i++) {
                  loadChildrenPattern(core, nodesSoFar, children[i], level - 1, function (err) {
                    error = error || err;
                    if (--missing === 0) {
                      callback(error);
                    }
                  });
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(null);
          }
        } else {
          callback(null);
        }
      }

      //partially optimized
      function loadChildrenPattern(core, nodesSoFar, node, level, callback) {
        var path = core.getPath(node),
          childrenPaths = core.getChildrenPaths(node),
          childrenRelids = core.getChildrenRelids(node),
          missing = childrenPaths.length,
          error = null,
          i;
        _metaNodes[path] = node;
        if (!nodesSoFar[path]) {
          nodesSoFar[path] = {node: node, incomplete: true, basic: true, hash: getStringHash(node)};
        }
        if (level > 0) {
          if (missing > 0) {
            for (i = 0; i < childrenPaths.length; i++) {
              if (nodesSoFar[childrenPaths[i]]) {
                loadChildrenPattern(core, nodesSoFar, nodesSoFar[childrenPaths[i]].node, level - 1, function (err) {
                  error = error || err;
                  if (--missing === 0) {
                    callback(error);
                  }
                });
              } else {
                core.loadChild(node, childrenRelids[i], function (err, child) {
                  if (err || child === null) {
                    error = error || err;
                    if (--missing === 0) {
                      callback(error);
                    }
                  } else {
                    loadChildrenPattern(core, nodesSoFar, child, level - 1, function (err) {
                      error = error || err;
                      if (--missing === 0) {
                        callback(error);
                      }
                    });
                  }
                });
              }
            }
          } else {
            callback(error);
          }
        } else {
          callback(error);
        }
      }

      function loadPattern(core, id, pattern, nodesSoFar, callback) {
        var base = null;
        var baseLoaded = function () {
          if (pattern.children && pattern.children > 0) {
            var level = pattern.children;
            loadChildrenPattern(core, nodesSoFar, base, level, callback);
          } else {
            callback(null);
          }
        };

        if (nodesSoFar[id]) {
          base = nodesSoFar[id].node;
          baseLoaded();
        } else {
          base = null;
          if (_loadNodes[ROOT_PATH]) {
            base = _loadNodes[ROOT_PATH].node;
          } else if (_nodes[ROOT_PATH]) {
            base = _nodes[ROOT_PATH].node;
          }
          core.loadByPath(base, id, function (err, node) {
            if (!err && node && !core.isEmpty(node)) {
              var path = core.getPath(node);
              _metaNodes[path] = node;
              if (!nodesSoFar[path]) {
                nodesSoFar[path] = {node: node, incomplete: false, basic: true, hash: getStringHash(node)};
              }
              base = node;
              baseLoaded();
            } else {
              callback(err);
            }
          });
        }
      }

      function orderStringArrayByElementLength(strArray) {
        var ordered = [],
          i, j, index;

        for (i = 0; i < strArray.length; i++) {
          index = -1;
          j = 0;
          while (index === -1 && j < ordered.length) {
            if (ordered[j].length > strArray[i].length) {
              index = j;
            }
            j++;
          }

          if (index === -1) {
            ordered.push(strArray[i]);
          } else {
            ordered.splice(index, 0, strArray[i]);
          }
        }
        return ordered;
      }

      function loadRoot(newRootHash, callback) {
        //with the newer approach we try to optimize a bit the mechanizm of the loading and try to get rid of the paralellism behind it
        var patterns = {},
          orderedPatternIds = [],
          error = null,
          i, j, keysi, keysj,
          loadNextPattern = function (index) {
            if (index < orderedPatternIds.length) {
              loadPattern(_core, orderedPatternIds[index], patterns[orderedPatternIds[index]], _loadNodes, function (err) {
                error = error || err;
                loadNextPattern(index + 1);
              });
            } else {
              callback(error);
            }
          };
        _loadNodes = {};
        _loadError = 0;

        //gathering the patterns
        keysi = Object.keys(_users);
        for (i = 0; i < keysi.length; i++) {
          keysj = Object.keys(_users[keysi[i]].PATTERNS);
          for (j = 0; j < keysj.length; j++) {
            if (patterns[keysj[j]]) {
              //we check if the range is bigger for the new definition
              if (patterns[keysj[j]].children < _users[keysi[i]].PATTERNS[keysj[j]].children) {
                patterns[keysj[j]].children = _users[keysi[i]].PATTERNS[keysj[j]].children;
              }
            } else {
              patterns[keysj[j]] = _users[keysi[i]].PATTERNS[keysj[j]];
            }
          }
        }
        //getting an orderd keylist
        orderedPatternIds = Object.keys(patterns);
        orderedPatternIds = orderStringArrayByElementLength(orderedPatternIds);


        //and now the one-by-one loading
        _core.loadRoot(newRootHash, function (err, root) {
          ASSERT(err || root);
          _root = root;
          error = error || err;
          if (!err) {
            //TODO here is the point where we can start / stop our addOns - but we will not wait for them to start
            updateRunningAddOns(root);
            _loadNodes[_core.getPath(root)] = {node: root, incomplete: true, basic: true, hash: getStringHash(root)};
            _metaNodes[_core.getPath(root)] = root;
            if (orderedPatternIds.length === 0 && Object.keys(_users) > 0) {
              //we have user, but they do not interested in any object -> let's relaunch them :D
              callback(null);
              reLaunchUsers();
            } else {
              loadNextPattern(0);
            }
          } else {
            callback(err);
          }
        });
      }

      //this is just a first brute implementation it needs serious optimization!!!
      function loading(newRootHash, callback) {
        callback = callback || function () {
        };
        var incomplete = false;
        var modifiedPaths = {};
        var missing = 2;
        var finalEvents = function () {
          if (_loadError > 0) {
            //we assume that our immediate load was only partial
            modifiedPaths = getModifiedNodes(_loadNodes);
            _nodes = _loadNodes;
            _loadNodes = {};
            for (var i in _users) {
              userEvents(i, modifiedPaths);
            }
            _loadError = 0;
          } else if (_loadNodes[ROOT_PATH]) {
            //we left the stuff in the loading rack, probably because there were no _nodes beforehand
            _nodes = _loadNodes;
            _loadNodes = {};
          }
          callback(null);
        };

        _rootHash = newRootHash
        loadRoot(newRootHash, function (err) {
          if (err) {
            _rootHash = null;
            callback(err);
          } else {
            if (--missing === 0) {
              finalEvents();
            }
          }
        });
        //here we try to make an immediate event building
        //TODO we should deal with the full unloading!!!
        //TODO we should check not to hide any issue related to immediate loading!!!
        var hasEnoughNodes = false;
        var counter = 0;
        var limit = 0;
        for (var i in _nodes) {
          counter++;
        }
        limit = counter / 2;
        counter = 0;
        for (i in _loadNodes) {
          counter++;
        }
        hasEnoughNodes = limit <= counter;
        if (/*hasEnoughNodes*/false) {
          modifiedPaths = getModifiedNodes(_loadNodes);
          _nodes = {};
          for (i in _loadNodes) {
            _nodes[i] = _loadNodes[i];
          }

          for (i in _users) {
            userEvents(i, modifiedPaths);
          }

          if (--missing === 0) {
            finalEvents();
          }

        } else {
          _loadError++;
          if (--missing === 0) {
            finalEvents();
          }
        }
      }

      function saveRoot(msg, callback) {
        callback = callback || function () {
        };
        if (!_viewer && !_readOnlyProject) {
          if (_msg) {
            _msg += "\n" + msg;
          } else {
            _msg += msg;
          }
          if (!_inTransaction) {
            ASSERT(_project && _core && _branch);
            _core.persist(_nodes[ROOT_PATH].node, function (err) {
            });
            var newRootHash = _core.getHash(_nodes[ROOT_PATH].node);
            var newCommitHash = _project.makeCommit([_recentCommits[0]], newRootHash, _msg, function (err) {
              //TODO now what??? - could we end up here?
            });
            _msg = "";
            addCommit(newCommitHash);
            _selfCommits[newCommitHash] = true;
            _redoer.addModification(newCommitHash,"");
            _project.setBranchHash(_branch, _recentCommits[1], _recentCommits[0], function (err) {
              //TODO now what??? - could we screw up?
              loading(newRootHash);
              callback(err);
            });
            //loading(newRootHash);
          } else {
            _core.persist(_nodes[ROOT_PATH].node, function (err) {
            });
          }
        } else {
          _msg = "";
        }
      }

      function getActiveProject() {
        return _projectName;
      }

      function getAvailableProjectsAsync(callback) {
        if (_database) {
          _database.getProjectNames(callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getViewableProjectsAsync(callback) {
        if (_database) {
          _database.getAllowedProjectNames(callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getProjectAuthInfoAsync(projectname, callback) {
        if (_database) {
          _database.getAuthorizationInfo(projectname, callback);
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getFullProjectListAsync(callback) {
        _database.getProjectNames(function (err, names) {
          if (!err && names) {
            var wait = names.length || 0;
            var fullList = {};
            if (wait > 0) {
              var getProjectAuthInfo = function (name, cb) {
                _database.getAuthorizationInfo(name, function (err, authObj) {
                  if (!err && authObj) {
                    fullList[name] = authObj;
                  }
                  cb(err);
                });
              };

              for (var i = 0; i < names.length; i++) {
                getProjectAuthInfo(names[i], function (err) {
                  if (--wait === 0) {
                    callback(null, fullList);
                  }
                })
              }
            } else {
              callback(null, {});
            }
          } else {
            callback(err, {});
          }
        });
      }

      function selectProjectAsync(projectname, callback) {
        if (_database) {
          if (projectname === _projectName) {
            callback(null);
          } else {
            closeOpenedProject(function (err) {
              //TODO what can we do with the error??
              openProject(projectname, function (err) {
                //TODO is there a meaningful error which we should propagate towards user???
                if(!err){
                  reLaunchUsers();
                }
                callback(err);
              });
            });
          }
        } else {
          callback(new Error('there is no open database connection!!!'));
        }
      }

      function createProjectAsync(projectname, callback) {
        if (_database) {
          getAvailableProjectsAsync(function (err, names) {
            if (!err && names) {
              if (names.indexOf(projectname) === -1) {
                _database.openProject(projectname, function (err, p) {
                  if (!err && p) {
                    createEmptyProject(p, function (err, commit) {
                      if (!err && commit) {
                        callback(null);
                      } else {
                        callback(err);
                      }
                    });
                  } else {
                    callback(err);
                  }
                });
              } else {
                //TODO maybe the selectProjectAsync could be called :)
                callback('the project already exists!');
              }
            } else {
              callback(err);
            }
          });
        } else {
          callback(new Error('there is no open database connection!'));
        }

      }

      function deleteProjectAsync(projectname, callback) {
        if (_database) {
          if (projectname === _projectName) {
            closeOpenedProject();
          }
          _database.deleteProject(projectname, callback);

        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      //branching functionality
      function getBranchesAsync(callback) {
        if (_database) {
          if (_project) {
            _project.getBranchNames(function (err, names) {
              if (!err && names) {
                var missing = 0;
                var branchArray = [];
                var error = null;
                var getBranchValues = function (name) {
                  _project.getBranchHash(name, '#hack', function (err, newhash, forked) {
                    if (!err && newhash) {
                      var element = {name: name, commitId: newhash};
                      if (forked) {
                        element.sync = false;
                      } else {
                        element.sync = true;
                      }
                      branchArray.push(element);
                    } else {
                      error = error || err;
                    }

                    if (--missing === 0) {
                      callback(error, branchArray);
                    }
                  });
                };

                for (var i in names) {
                  missing++;
                }
                if (missing > 0) {
                  for (i in names) {
                    getBranchValues(i);
                  }
                } else {
                  callback(null, branchArray);
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no opened database connection!'));
        }
      }

      function viewerCommit(hash, callback) {
        //no project change
        //we stop watching branch
        //we create the core
        //we use the existing territories
        //we set viewer mode, so there will be no modification allowed to send to server...
        _branch = null;
        _viewer = true;
        _recentCommits = [hash];
        _self.dispatchEvent(_self.events.BRANCH_CHANGED, _branch);
        _project.loadObject(hash, function (err, commitObj) {
          if (!err && commitObj) {
            loading(commitObj.root, callback);
          } else {
            logger.error('Cannot view given ' + hash + ' commit as it\'s root cannot be loaded! [' + JSON.stringify(err) + ']');
            callback(err);
          }
        });
      }

      function selectCommitAsync(hash, callback) {
        //this should proxy to branch selection and viewer functions
        if (_database) {
          if (_project) {
            viewerCommit(hash, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function selectBranchAsync(branch, callback) {
        var waiting = 1,
          error = null,
          innerCallback = function (err) {
            error = error || err;
            if (--waiting === 0) {
              callback(error);
            }
          }
        if (_database) {
          if (_project) {
            _project.getBranchNames(function (err, names) {
              if (err) {
                return callback(err);
              }

              if (names[branch]) {
                stopRunningAddOns();
                branchWatcher(branch, innerCallback);
                //startCoreAddOnsAsync(_projectName,branch,innerCallback);
              } else {
                callback(new Error('there is no such branch!'));
              }

            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getCommitsAsync(commitHash, number, callback) {
        if (_database) {
          if (_project) {
            ASSERT(_commitCache);
            if (commitHash === undefined) {
              commitHash = null;
            }
            _commitCache.getNCommitsFrom(commitHash, number, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function getActualCommit() {
        return _recentCommits[0];
      }

      function getActualBranch() {
        return _branch;
      }

      function getActualNetworkStatus() {
        return _networkStatus;
      }

      function getActualBranchStatus() {
        return _branchState;
      }

      function createBranchAsync(branchName, commitHash, callback) {
        //it doesn't changes anything, just creates the new branch
        if (_database) {
          if (_project) {
            _project.setBranchHash(branchName, '', commitHash, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function deleteBranchAsync(branchName, callback) {
        if (_database) {
          if (_project) {
            _project.getBranchHash(branchName, '', function (err, newhash, forkedhash) {
              if (!err && newhash) {
                if (forkedhash) {
                  _project.setBranchHash(branchName, newhash, forkedhash, function (err) {
                    if (!err) {
                      changeBranchState(_self.branchStates.SYNC);
                    }
                    callback(err);
                  });
                } else {
                  _project.setBranchHash(branchName, newhash, '', callback);
                }
              } else {
                callback(err);
              }
            });
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function commitAsync(params, callback) {
        if (_database) {
          if (_project) {
            var msg = params.message || '';
            saveRoot(msg, callback);
          } else {
            callback(new Error('there is no open project!'));
          }
        } else {
          callback(new Error('there is no open database connection!'));
        }
      }

      function connectToDatabaseAsync(options, callback) {
        var oldcallback = callback;
        callback = function (err) {
          _TOKEN = tokenWatcher();
          reLaunchUsers();
          oldcallback(err);
        }; //we add tokenWatcher start at this point
        options = options || {};
        callback = callback || function () {
        };
        options.open = (options.open !== undefined || options.open !== null) ? options.open : false;
        options.project = options.project || null;
        if (_database) {
          //we have to close the current
          closeOpenedProject(function () {
          });
          _database.closeDatabase(function () {
          });
          _networkStatus = "";
          changeBranchState(null);
        }
        _database = newDatabase();

        _database.openDatabase(function (err) {
          if (!err) {
            if (_networkWatcher) {
              _networkWatcher.stop();
            }
            _networkWatcher = networkWatcher();
            serverEventer();

            if (options.open) {
              if (options.project) {
                openProject(options.project, callback);
              } else {
                //default opening routine
                _database.getProjectNames(function (err, names) {
                  if (!err && names && names.length > 0) {
                    openProject(names[0], callback);
                  } else {
                    logger.error('Cannot get project names / There is no project on the server');
                    callback(err);
                  }
                });
              }
            } else {
              callback(null);
            }
          } else {
            logger.error('Cannot open database');
            callback(err);
          }
        });
      }

      //MGA
      function copyMoreNodes(parameters, msg) {
        var pathestocopy = [];
        if (typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
          for (var i in parameters) {
            if (i !== "parentId") {
              pathestocopy.push(i);
            }
          }

          msg = msg || 'copyMoreNodes(' + pathestocopy + ',' + parameters.parentId + ')';
          if (pathestocopy.length < 1) {
          } else if (pathestocopy.length === 1) {
            var newNode = _core.copyNode(_nodes[pathestocopy[0]].node, _nodes[parameters.parentId].node);
            storeNode(newNode);
            if (parameters[pathestocopy[0]]) {
              for (var j in parameters[pathestocopy[0]].attributes) {
                _core.setAttribute(newNode, j, parameters[pathestocopy[0]].attributes[j]);
              }
              for (j in parameters[pathestocopy[0]].registry) {
                _core.setRegistry(newNode, j, parameters[pathestocopy[0]].registry[j]);
              }
            }
            saveRoot(msg);
          } else {
            copyMoreNodesAsync(pathestocopy, parameters.parentId, function (err, copyarr) {
              if (err) {
                //rollBackModification();
              }
              else {
                for (var i in copyarr) {
                  if (parameters[i]) {
                    for (var j in parameters[i].attributes) {
                      _core.setAttribute(copyarr[i], j, parameters[i].attributes[j]);
                    }
                    for (j in parameters[i].registry) {
                      _core.setRegistry(copyarr[i], j, parameters[i].registry[j]);
                    }
                  }
                }
                saveRoot(msg);
              }
            });
          }
        } else {
          console.log('wrong parameters for copy operation - denied -');
        }
      }


      function copyMoreNodesAsync(nodePaths, parentPath, callback) {
        var checkPaths = function () {
          var result = true;
          for (var i = 0; i < nodePaths.length; i++) {
            result = result && (_nodes[nodePaths[i]] && typeof _nodes[nodePaths[i]].node === 'object');
          }
          return result;
        };

        if (_nodes[parentPath] && typeof _nodes[parentPath].node === 'object' && checkPaths()) {
          var helpArray = {},
            subPathArray = {},
            parent = _nodes[parentPath].node,
            returnArray = {};

          //creating the 'from' object
          var tempFrom = _core.createNode({parent: parent, base: _core.getTypeRoot(_nodes[nodePaths[0]].node)});
          //and moving every node under it
          for (var i = 0; i < nodePaths.length; i++) {
            helpArray[nodePaths[i]] = {};
            helpArray[nodePaths[i]].origparent = _core.getParent(_nodes[nodePaths[i]].node);
            helpArray[nodePaths[i]].tempnode = _core.moveNode(_nodes[nodePaths[i]].node, tempFrom);
            subPathArray[_core.getRelid(helpArray[nodePaths[i]].tempnode)] = nodePaths[i];
            delete _nodes[nodePaths[i]];
          }

          //do the copy
          var tempTo = _core.copyNode(tempFrom, parent);

          //moving back the temporary source
          for (var i = 0; i < nodePaths.length; i++) {
            helpArray[nodePaths[i]].node = _core.moveNode(helpArray[nodePaths[i]].tempnode, helpArray[nodePaths[i]].origparent);
            storeNode(helpArray[nodePaths[i]].node);
          }

          //gathering the destination nodes
          _core.loadChildren(tempTo, function (err, children) {
            if (!err && children && children.length > 0) {
              for (i = 0; i < children.length; i++) {
                if (subPathArray[_core.getRelid(children[i])]) {
                  var newNode = _core.moveNode(children[i], parent);
                  storeNode(newNode);
                  returnArray[subPathArray[_core.getRelid(children[i])]] = newNode;
                } else {
                  console.log('635 - should never happen!!!');
                }
              }
              _core.deleteNode(tempFrom);
              _core.deleteNode(tempTo);
              callback(null, returnArray);
            } else {
              //clean up the mess and return
              _core.deleteNode(tempFrom);
              _core.deleteNode(tempTo);
              callback(err, {});
            }
          });
        }
      }

      function _copyMoreNodes(parameters) {
        //now we will use the multiple copy function of the core
        var nodes = [],
          copiedNodes,
          i, j, paths, keys,
          parent = _nodes[parameters.parentId].node,
          resultMap = {};
        keys = Object.keys(parameters);
        keys.splice(keys.indexOf('parentId'), 1);
        paths = keys;
        for (i = 0; i < paths.length; i++) {
          nodes.push(_nodes[paths[i]].node);
        }

        copiedNodes = _core.copyNodes(nodes, parent);

        for (i = 0; i < paths.length; i++) {
          keys = Object.keys(parameters[paths[i]].attributes || {});
          for (j = 0; j < keys.length; j++) {
            _core.setAttribute(copiedNodes[i], keys[j], parameters[paths[i]].attributes[keys[j]]);
          }

          keys = Object.keys(parameters[paths[i]].registry || {});
          for (j = 0; j < keys.length; j++) {
            _core.setRegistry(copiedNodes[i], keys[j], parameters[paths[i]].registry[keys[j]]);
          }
        }


        //creating the result map and storing the nodes to our cache, so the user will know which path became which
        for (i = 0; i < paths.length; i++) {
          resultMap[paths[i]] = storeNode(copiedNodes[i]);
        }

        return resultMap;
      }

      function moveMoreNodes(parameters) {
        var pathsToMove = [],
          returnParams = {};
        for (var i in parameters) {
          if (i !== 'parentId') {
            pathsToMove.push(i);
          }
        }

        if (pathsToMove.length > 0 && typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
          for (var i = 0; i < pathsToMove.length; i++) {
            if (_nodes[pathsToMove[i]] && typeof _nodes[pathsToMove[i]].node === 'object') {
              var newNode = _core.moveNode(_nodes[pathsToMove[i]].node, _nodes[parameters.parentId].node);
              returnParams[pathsToMove[i]] = _core.getPath(newNode);
              if (parameters[pathsToMove[i]].attributes) {
                for (var j in parameters[pathsToMove[i]].attributes) {
                  _core.setAttribute(newNode, j, parameters[pathsToMove[i]].attributes[j]);
                }
              }
              if (parameters[pathsToMove[i]].registry) {
                for (var j in parameters[pathsToMove[i]].registry) {
                  _core.setRegistry(newNode, j, parameters[pathsToMove[i]].registry[j]);
                }
              }

              delete _nodes[pathsToMove[i]];
              storeNode(newNode, true);
            }
          }
        }

        return returnParams;
      }

      function createChildren(parameters, msg) {
        //TODO we also have to check out what is happening with the sets!!!
        var result = {},
          paths = [],
          nodes = [], node,
          parent = _nodes[parameters.parentId].node,
          names, i, j, index, keys, pointer,
          newChildren = [], relations = [];

        //to allow 'meaningfull' instantiation of multiple objects we have to recreate the internal relations - except the base
        paths = Object.keys(parameters);
        paths.splice(paths.indexOf('parentId'), 1);
        for (i = 0; i < paths.length; i++) {
          node = _nodes[paths[i]].node;
          nodes.push(node);
          pointer = {};
          names = _core.getPointerNames(node);
          index = names.indexOf('base');
          if (index !== -1) {
            names.splice(index, 1);
          }

          for (j = 0; j < names.length; j++) {
            index = paths.indexOf(_core.getPointerPath(node, names[j]));
            if (index !== -1) {
              pointer[names[j]] = index;
            }
          }
          relations.push(pointer);
        }

        //now the instantiation
        for (i = 0; i < nodes.length; i++) {
          newChildren.push(_core.createNode({parent: parent, base: nodes[i]}));
        }

        //now for the storage and relation setting
        for (i = 0; i < paths.length; i++) {
          //attributes
          names = Object.keys(parameters[paths[i]].attributes || {});
          for (j = 0; j < names.length; j++) {
            _core.setAttribute(newChildren[i], names[j], parameters[paths[i]].attributes[names[j]]);
          }
          //registry
          names = Object.keys(parameters[paths[i]].registry || {});
          for (j = 0; j < names.length; j++) {
            _core.setRegistry(newChildren[i], names[j], parameters[paths[i]].registry[names[j]]);
          }

          //relations
          names = Object.keys(relations[i]);
          for (j = 0; j < names.length; j++) {
            _core.setPointer(newChildren[i], names[j], newChildren[relations[i][names[j]]]);
          }

          //store
          result[paths[i]] = storeNode(newChildren[i]);

        }

        msg = msg || 'createChildren(' + JSON.stringify(result) + ')';
        saveRoot(msg);
        return result;
      }


      function startTransaction(msg) {
        if (_core) {
          _inTransaction = true;
          msg = msg || 'startTransaction()';
          saveRoot(msg);
        }
      }

      function completeTransaction(msg, callback) {
        _inTransaction = false;
        if (_core) {
          msg = msg || 'completeTransaction()';
          saveRoot(msg, callback);
        }
      }

      function setAttributes(path, name, value, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setAttribute(_nodes[path].node, name, value);
          msg = msg || 'setAttribute(' + path + ',' + name + ',' + value + ')';
          saveRoot(msg);
        }
      }

      function delAttributes(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delAttribute(_nodes[path].node, name);
          msg = msg || 'delAttribute(' + path + ',' + name + ')';
          saveRoot(msg);
        }
      }

      function setRegistry(path, name, value, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setRegistry(_nodes[path].node, name, value);
          msg = msg || 'setRegistry(' + path + ',' + ',' + name + ',' + value + ')';
          saveRoot(msg);
        }
      }

      function delRegistry(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delRegistry(_nodes[path].node, name);
          msg = msg || 'delRegistry(' + path + ',' + ',' + name + ')';
          saveRoot(msg);
        }
      }

      function deleteNode(path, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.deleteNode(_nodes[path].node);
          //delete _nodes[path];
          msg = msg || 'deleteNode(' + path + ')';
          saveRoot(msg);
        }
      }

      function delMoreNodes(paths, msg) {
        if (_core) {
          for (var i = 0; i < paths.length; i++) {
            if (_nodes[paths[i]] && typeof _nodes[paths[i]].node === 'object') {
              _core.deleteNode(_nodes[paths[i]].node);
              //delete _nodes[paths[i]];
            }
          }
          msg = msg || 'delMoreNodes(' + paths + ')';
          saveRoot(msg);
        }
      }

      function createChild(parameters, msg) {
        var newID;

        if (_core) {
          if (typeof parameters.parentId === 'string' && _nodes[parameters.parentId] && typeof _nodes[parameters.parentId].node === 'object') {
            var baseNode = null;
            if (_nodes[parameters.baseId]) {
              baseNode = _nodes[parameters.baseId].node || baseNode;
            }
            var child = _core.createNode({parent: _nodes[parameters.parentId].node, base: baseNode, guid: parameters.guid, relid: parameters.relid});
            if (parameters.position) {
              _core.setRegistry(child, "position", { "x": parameters.position.x || 100, "y": parameters.position.y || 100});
            } else {
              _core.setRegistry(child, "position", { "x": 100, "y": 100});
            }
            storeNode(child);
            newID = _core.getPath(child);
            msg = msg || 'createChild(' + parameters.parentId + ',' + parameters.baseId + ',' + newID + ')';
            saveRoot(msg);
          }
        }

        return newID;
      }

      function makePointer(id, name, to, msg) {
        if (to === null) {
          _core.setPointer(_nodes[id].node, name, to);
        } else {


          _core.setPointer(_nodes[id].node, name, _nodes[to].node);
        }

        msg = msg || 'makePointer(' + id + ',' + name + ',' + to + ')';
        saveRoot(msg);
      }

      function delPointer(path, name, msg) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setPointer(_nodes[path].node, name, undefined);
          msg = msg || 'delPointer(' + path + ',' + name + ')';
          saveRoot(msg);
        }
      }


      //MGAlike - set functions
      function addMember(path, memberpath, setid, msg) {
        if (_nodes[path] &&
          _nodes[memberpath] &&
          typeof _nodes[path].node === 'object' &&
          typeof _nodes[memberpath].node === 'object') {
          _core.addMember(_nodes[path].node, setid, _nodes[memberpath].node);
          msg = msg || 'addMember(' + path + ',' + memberpath + ',' + setid + ')';
          saveRoot(msg);
        }
      }

      function removeMember(path, memberpath, setid, msg) {
        if (_nodes[path] &&
          typeof _nodes[path].node === 'object') {
          _core.delMember(_nodes[path].node, setid, memberpath);
          msg = msg || 'removeMember(' + path + ',' + memberpath + ',' + setid + ')';
          saveRoot(msg);
        }
      }

      function setMemberAttribute(path, memberpath, setid, name, value, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setMemberAttribute(_nodes[path].node, setid, memberpath, name, value);
          msg = msg || 'setMemberAttribute(' + path + "," + memberpath + "," + setid + "," + name + "," + value + ")";
          saveRoot(msg);
        }
      }

      function delMemberAttribute(path, memberpath, setid, name, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delMemberAttribute(_nodes[path].node, setid, memberpath, name);
          msg = msg || 'delMemberAttribute(' + path + "," + memberpath + "," + setid + "," + name + ")";
          saveRoot(msg);
        }
      }

      function setMemberRegistry(path, memberpath, setid, name, value, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setMemberRegistry(_nodes[path].node, setid, memberpath, name, value);
          msg = msg || 'setMemberRegistry(' + path + "," + memberpath + "," + setid + "," + name + "," + value + ")";
          saveRoot(msg);
        }
      }

      function delMemberRegistry(path, memberpath, setid, name, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delMemberRegistry(_nodes[path].node, setid, memberpath, name);
          msg = msg || 'delMemberRegistry(' + path + "," + memberpath + "," + setid + "," + name + ")";
          saveRoot(msg);
        }
      }

      function createSet(path, setid, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.createSet(_nodes[path].node, setid);
          msg = msg || 'createSet(' + path + "," + setid + ")";
          saveRoot(msg);
        }
      }

      function deleteSet(path, setid, msg) {
        if (_nodes[path] && typeof _nodes[path].node === 'object') {
          _core.deleteSet(_nodes[path].node, setid);
          msg = msg || 'deleteSet(' + path + "," + setid + ")";
          saveRoot(msg);
        }
      }

      //Meta like descriptor functions
      function setAttributeDescriptor(path, attributename, descriptor) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setAttributeDescriptor(_nodes[path].node, attributename, descriptor);
          saveRoot('setAttributeDescriptor(' + path + ',' + ',' + attributename + ')');
        }
      }

      function delAttributeDescriptor(path, attributename) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delAttributeDescriptor(_nodes[path].node, attributename);
          saveRoot('delAttributeDescriptor(' + path + ',' + ',' + attributename + ')');
        }
      }

      function setPointerDescriptor(path, pointername, descriptor) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setPointerDescriptor(_nodes[path].node, pointername, descriptor);
          saveRoot('setPointerDescriptor(' + path + ',' + ',' + pointername + ')');
        }
      }

      function delPointerDescriptor(path, pointername) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delPointerDescriptor(_nodes[path].node, pointername);
          saveRoot('delPointerDescriptor(' + path + ',' + ',' + pointername + ')');
        }
      }

      function setChildrenMetaDescriptor(path, descriptor) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setNodeDescriptor(_nodes[path].node, descriptor);
          saveRoot('setNodeDescriptor(' + path + ')');
        }
      }

      function delChildrenMetaDescriptor(path) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delNodeDescriptor(_nodes[path].node);
          saveRoot('delNodeDescriptor(' + path + ')');
        }
      }

      function setBase(path, basepath) {
        /*if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
         _core.setRegistry(_nodes[path].node,'base',basepath);
         saveRoot('setBase('+path+','+basepath+')');
         }*/
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object' && _nodes[basepath] && typeof _nodes[basepath].node === 'object') {
          _core.setBase(_nodes[path].node, _nodes[basepath].node);
          saveRoot('setBase(' + path + ',' + basepath + ')');
        }
      }

      function delBase(path) {
        /*if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
         _core.delRegistry(_nodes[path].node,'base');
         saveRoot('delBase('+path+')');
         }*/
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setBase(_nodes[path].node, null);
          saveRoot('delBase(' + path + ')');
        }
      }


      //constraint functions
      function setConstraint(path, name, constraintObj) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.setConstraint(_nodes[path].node, name, constraintObj);
          saveRoot('setConstraint(' + path + ',' + name + ')');
        }
      }

      function delConstraint(path, name) {
        if (_core && _nodes[path] && typeof _nodes[path].node === 'object') {
          _core.delConstraint(_nodes[path].node, name);
          saveRoot('delConstraint(' + path + 'name' + ')');
        }
      }

      //territory functions
      function addUI(ui, fn, guid) {
        ASSERT(fn);
        ASSERT(typeof fn === 'function');
        guid = guid || GUID();
        _users[guid] = {type: 'notused', UI: ui, PATTERNS: {}, PATHS: {}, SENDEVENTS: true, FN: fn};
        return guid;
      }

      function removeUI(guid) {
        delete _users[guid];
      }

      function _updateTerritoryAllDone(guid, patterns, error) {
        if (_users[guid]) {
          _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
          if (!error) {
            userEvents(guid, []);
          }
        }
      }

      function updateTerritory(guid, patterns) {
        if (_users[guid]) {
          if (_project) {
            if (_nodes[ROOT_PATH]) {
              //TODO: this has to be optimized
              var missing = 0;
              var error = null;

              var patternLoaded = function (err) {
                error = error || err;
                if (--missing === 0) {
                  //allDone();
                  _updateTerritoryAllDone(guid, patterns, error);
                }
              };

              //EXTRADTED OUT TO: _updateTerritoryAllDone
              /*var allDone = function(){
               if(_users[guid]){
               _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
               if(!error){
               userEvents(guid,[]);
               }
               }
               };*/
              for (var i in patterns) {
                missing++;
              }
              if (missing > 0) {
                for (i in patterns) {
                  loadPattern(_core, i, patterns[i], _nodes, patternLoaded);
                }
              } else {
                //allDone();
                _updateTerritoryAllDone(guid, patterns, error);
              }
            } else {
              //something funny is going on
              if (_loadNodes[ROOT_PATH]) {
                //probably we are in the loading process, so we should redo this update when the loading finishes
                //setTimeout(updateTerritory,100,guid,patterns);
              } else {
                //root is not in nodes and has not even started to load it yet...
                _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
              }
            }
          } else {
            //we should update the patterns, but that is all
            _users[guid].PATTERNS = JSON.parse(JSON.stringify(patterns));
          }
        }
      }

      //getNode
      function getNode(_id) {

        var setNames = {
          VALIDCHILDREN: 'ValidChildren',
          VALIDSOURCE: 'ValidSource',
          VALIDDESTINATION: 'ValidDestination',
          VALIDINHERITOR: 'ValidInheritor',
          GENERAL: 'General'
        };

        var getParentId = function () {
          return storeNode(_core.getParent(_nodes[_id].node)); //just for sure, as it may missing from the cache
        };

        var getId = function () {
          return _id;
        };

        var getGuid = function () {
          return _core.getGuid(_nodes[_id].node);
        };

        var getChildrenIds = function () {
          return _core.getChildrenPaths(_nodes[_id].node);
        };

        var getBaseId = function () {
          return storeNode(_core.getBase(_nodes[_id].node)); //just for sure, maybe the base is missing from the cache
        };

        var getInheritorIds = function () {
          return [];
        };

        var getAttribute = function (name) {
          return _core.getAttribute(_nodes[_id].node, name);
        };
        var getOwnAttribute = function (name) {
          return _core.getOwnAttribute(_nodes[_id].node, name);
        };

        var getEditableAttribute = function (name) {
          var value = _core.getAttribute(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };
        var getOwnEditableAttribute = function (name) {
          var value = _core.getOwnAttribute(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };

        var getRegistry = function (name) {
          return _core.getRegistry(_nodes[_id].node, name);
        };
        var getOwnRegistry = function (name) {
          return _core.getOwnRegistry(_nodes[_id].node, name);
        };

        var getEditableRegistry = function (name) {
          var value = _core.getRegistry(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };
        var getOwnEditableRegistry = function (name) {
          var value = _core.getOwnRegistry(_nodes[_id].node, name);
          if (typeof value === 'object') {
            return JSON.parse(JSON.stringify(value));
          }
          return value;
        };

        var getPointer = function (name) {
          //return _core.getPointerPath(_nodes[_id].node,name);
          if (name === 'base') {
            //base is a special case as it complicates with inherited children
            return {to: _core.getPath(_core.getBase(_nodes[_id].node)), from: []};
          }
          return {to: _core.getPointerPath(_nodes[_id].node, name), from: []};
        };
        var getOwnPointer = function (name) {
          return {to: _core.getOwnPointerPath(_nodes[_id].node, name), from: []};
        };

        var getPointerNames = function () {
          return _core.getPointerNames(_nodes[_id].node);
        };
        var getOwnPointerNames = function () {
          return _core.getOwnPointerNames(_nodes[_id].node);
        };

        var getAttributeNames = function () {
          return _core.getAttributeNames(_nodes[_id].node);
        };
        var getOwnAttributeNames = function () {
          return _core.getOwnAttributeNames(_nodes[_id].node);
        };


        var getRegistryNames = function () {
          return _core.getRegistryNames(_nodes[_id].node);
        };
        var getOwnRegistryNames = function () {
          return _core.getOwnRegistryNames(_nodes[_id].node);
        };

        //SET
        var getMemberIds = function (setid) {
          return _core.getMemberPaths(_nodes[_id].node, setid);
        };
        var getSetNames = function () {
          return _core.getSetNames(_nodes[_id].node);
        };
        var getMemberAttributeNames = function (setid, memberid) {
          return _core.getMemberAttributeNames(_nodes[_id].node, setid, memberid);
        };
        var getMemberAttribute = function (setid, memberid, name) {
          return _core.getMemberAttribute(_nodes[_id].node, setid, memberid, name);
        };
        var getEditableMemberAttribute = function (setid, memberid, name) {
          var attr = _core.getMemberAttribute(_nodes[_id].node, setid, memberid, name);
          if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
          }
          return null;
        };

        var getMemberRegistryNames = function (setid, memberid) {
          return _core.getMemberRegistryNames(_nodes[_id].node, setid, memberid);
        };
        var getMemberRegistry = function (setid, memberid, name) {
          return _core.getMemberRegistry(_nodes[_id].node, setid, memberid, name);
        };
        var getEditableMemberRegistry = function (setid, memberid, name) {
          var attr = _core.getMemberRegistry(_nodes[_id].node, setid, memberid, name);
          if (attr !== null && attr !== undefined) {
            return JSON.parse(JSON.stringify(attr));
          }
          return null;
        };

        //META
        var getValidChildrenTypes = function () {
          //return getMemberIds('ValidChildren');
          return META.getValidChildrenTypes(_id);
        };
        var getAttributeDescriptor = function (attributename) {
          return _core.getAttributeDescriptor(_nodes[_id].node, attributename);
        };
        var getEditableAttributeDescriptor = function (attributename) {
          var descriptor = _core.getAttributeDescriptor(_nodes[_id].node, attributename);
          if (typeof descriptor === 'object') {
            descriptor = JSON.parse(JSON.stringify(descriptor));
          }
          return descriptor;
        };
        var getPointerDescriptor = function (pointername) {
          return _core.getPointerDescriptor(_nodes[_id].node, pointername);
        };
        var getEditablePointerDescriptor = function (pointername) {
          var descriptor = _core.getPointerDescriptor(_nodes[_id].node, pointername);
          if (typeof descriptor === 'object') {
            descriptor = JSON.parse(JSON.stringify(descriptor));
          }
          return descriptor;
        };
        var getChildrenMetaDescriptor = function () {
          return _core.getNodeDescriptor(_nodes[_id].node);
        };
        var getEditableChildrenMetaDescriptor = function () {
          var descriptor = _core.getNodeDescriptor(_nodes[_id].node);
          if (typeof descriptor === 'object') {
            descriptor = JSON.parse(JSON.stringify(descriptor));
          }
          return descriptor;
        };


        //constraint functions
        var getConstraintNames = function () {
          return _core.getConstraintNames(_nodes[_id].node);
        };
        var getOwnConstraintNames = function () {
          return _core.getOwnConstraintNames(_nodes[_id].node);
        };
        var getConstraint = function (name) {
          return _core.getConstraint(_nodes[_id].node, name);
        };
        //ASSERT(_nodes[_id]);

        var printData = function () {
          //probably we will still use it for test purposes, but now it goes officially into printing the node's json representation
          ToJson(_core, _nodes[_id].node, "", 'guid', function (err, jNode) {
            console.log('node in JSON format[status = ', err, ']:', jNode);
          });
        };

        var toString = function () {
          return _core.getAttribute(_nodes[_id].node, 'name') + ' (' + _id + ')';
        };

        var getCollectionPaths = function (name) {
          return _core.getCollectionPaths(_nodes[_id].node, name);
        };

        if (_nodes[_id]) {
          return {
            getParentId: getParentId,
            getId: getId,
            getGuid: getGuid,
            getChildrenIds: getChildrenIds,
            getBaseId: getBaseId,
            getInheritorIds: getInheritorIds,
            getAttribute: getAttribute,
            getEditableAttribute: getEditableAttribute,
            getRegistry: getRegistry,
            getEditableRegistry: getEditableRegistry,
            getOwnAttribute: getOwnAttribute,
            getOwnEditableAttribute: getOwnEditableAttribute,
            getOwnRegistry: getOwnRegistry,
            getOwnEditableRegistry: getOwnEditableRegistry,
            getPointer: getPointer,
            getPointerNames: getPointerNames,
            getAttributeNames: getAttributeNames,
            getRegistryNames: getRegistryNames,
            getOwnAttributeNames: getOwnAttributeNames,
            getOwnRegistryNames: getOwnRegistryNames,
            getOwnPointer: getOwnPointer,
            getOwnPointerNames: getOwnPointerNames,

            //SetFunctions
            getMemberIds: getMemberIds,
            getSetNames: getSetNames,
            getMemberAttributeNames: getMemberAttributeNames,
            getMemberAttribute: getMemberAttribute,
            getEditableMemberAttribute: getEditableMemberAttribute,
            getMemberRegistryNames: getMemberRegistryNames,
            getMemberRegistry: getMemberRegistry,
            getEditableMemberRegistry: getEditableMemberRegistry,

            //META functions
            getValidChildrenTypes: getValidChildrenTypes,
            getAttributeDescriptor: getAttributeDescriptor,
            getEditableAttributeDescriptor: getEditableAttributeDescriptor,
            getPointerDescriptor: getPointerDescriptor,
            getEditablePointerDescriptor: getEditablePointerDescriptor,
            getChildrenMetaDescriptor: getChildrenMetaDescriptor,
            getEditableChildrenMetaDescriptor: getEditableChildrenMetaDescriptor,

            //constraint functions
            getConstraintNames: getConstraintNames,
            getOwnConstraintNames: getOwnConstraintNames,
            getConstraint: getConstraint,

            printData: printData,
            toString: toString,

            getCollectionPaths: getCollectionPaths

          };
        }

        return null;

      }

      //testing
      function testMethod(testnumber) {
        /*deleteBranchAsync("blabla",function(err){
         getBranchesAsync(function(err,branches){
         console.log('kecso');
         });
         /*setTimeout(function(){
         getBranchesAsync(function(err,branches){
         console.log('kecso');
         });
         },0);
         });*/
        //_database.getNextServerEvent("",function(err,guid,parameters){
        //    console.log(err,guid,parameters);
        //});
        //connectToDatabaseAsync({open:true},function(err){
        //    console.log('kecso connecting to database',err);
        //});
        //_self.addEventListener(_self.events.SERVER_BRANCH_UPDATED,function(client,data){
        //    console.log(data);
        //});
        switch (testnumber) {
          case 1:
            queryAddOn("HistoryAddOn", {}, function (err, result) {
              console.log("addon result", err, result);
            });
            break;
          case 2:
            queryAddOn("ConstraintAddOn", {querytype: 'checkProject'}, function (err, result) {
              console.log("addon result", err, result);
            });
            break;
          case 3:
            console.log(_core.getBaseType(_nodes[WebGMEGlobal.State.getActiveObject()].node));
            break;
        }

      }

      //export and import functions
      function exportItems(paths, callback) {
        var nodes = [];
        for (var i = 0; i < paths.length; i++) {
          if (_nodes[paths[i]]) {
            nodes.push(_nodes[paths[i]].node);
          } else {
            callback('invalid node');
            return;
          }
        }

        //DumpMore(_core,nodes,"",'guid',callback);
        _database.simpleRequest({command: 'dumpMoreNodes', name: _projectName, hash: _rootHash || _core.getHash(_nodes[ROOT_PATH].node), nodes: paths}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            _database.simpleResult(resId, callback);
          }
        });
      }

      function getExportItemsUrlAsync(paths, filename, callback) {
        _database.simpleRequest({command: 'dumpMoreNodes', name: _projectName, hash: _rootHash || _core.getHash(_nodes[ROOT_PATH].node), nodes: paths}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
          }
        });
      }

      function getExternalInterpreterConfigUrlAsync(selectedItemsPaths, filename, callback) {
        var config = {};
        config.host = window.location.protocol + "//" + window.location.host;
        config.project = _projectName;
        config.token = _TOKEN.getToken();
        config.selected = plainUrl({command: 'node', path: selectedItemsPaths[0] || ""});
        config.commit = URL.addSpecialChars(_recentCommits[0] || "");
        config.root = plainUrl({command: 'node'});
        config.branch = _branch
        _database.simpleRequest({command: 'generateJsonURL', object: config}, function (err, resId) {
          if (err) {
            callback(err);
          } else {
            callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
          }
        });
      }

      function getExportLibraryUrlAsync(libraryRootPath, filename, callback) {
        var command = {};
        command.command = 'exportLibrary';
        command.name = _projectName;
        command.hash = _rootHash || _core.getHash(_nodes[ROOT_PATH].node);
        command.path = libraryRootPath;
        if (command.name && command.hash) {
          _database.simpleRequest(command, function (err, resId) {
            if (err) {
              callback(err);
            } else {
              callback(null, window.location.protocol + '//' + window.location.host + '/worker/simpleResult/' + resId + '/' + filename);
            }
          });
        } else {
          callback(new Error('there is no open project!'));
        }
      }

      function updateLibraryAsync(libraryRootPath, newLibrary, callback) {
        Serialization.import(_core, _nodes[libraryRootPath].node, newLibrary, function (err, log) {
          if (err) {
            return callback(err);
          }

          saveRoot("library update done\nlogs:\n" + log, callback);
        });
      }

      function addLibraryAsync(libraryParentPath, newLibrary, callback) {
        startTransaction("creating library as a child of " + libraryParentPath);
        var libraryRoot = createChild({parentId: libraryParentPath, baseId: null}, "library placeholder");
        Serialization.import(_core, _nodes[libraryRoot].node, newLibrary, function (err, log) {
          if (err) {
            return callback(err);
          }

          completeTransaction("library update done\nlogs:\n" + log, callback);
        });
      }

      function dumpNodeAsync(path, callback) {
        if (_nodes[path]) {
          Dump(_core, _nodes[path].node, "", 'guid', callback);
        } else {
          callback('unknown object', null);
        }
      }

      function importNodeAsync(parentPath, jNode, callback) {
        var node = null;
        if (_nodes[parentPath]) {
          node = _nodes[parentPath].node;
        }
        Import(_core, _nodes[parentPath].node, jNode, function (err) {
          if (err) {
            callback(err);
          } else {
            saveRoot('importNode under ' + parentPath, callback);
          }
        });
      }

      function mergeNodeAsync(parentPath, jNode, callback) {
        var node = null;
        if (_nodes[parentPath]) {
          node = _nodes[parentPath].node;
        }
        MergeImport(_core, _nodes[parentPath].node, jNode, function (err) {
          if (err) {
            callback(err);
          } else {
            saveRoot('importNode under ' + parentPath, callback);
          }
        });
      }

      function createProjectFromFileAsync(projectname, jProject, callback) {
        //if called on an existing project, it will ruin it!!! - although the old commits will be untouched
        createProjectAsync(projectname, function (err) {
          selectProjectAsync(projectname, function (err) {
            Serialization.import(_core, _root, jProject, function (err) {
              if (err) {
                return callback(err);
              }

              saveRoot("library have been updated...", callback);
            });
          });
        });
      }

      function plainUrl(parameters) {
        //setting the default values
        parameters.command = parameters.command || 'etf';
        parameters.path = parameters.path || "";
        parameters.project = parameters.project || _projectName;

        if (!parameters.root && !parameters.branch && !parameters.commit) {
          if (_rootHash) {
            parameters.root = _rootHash;
          } else if (_nodes && _nodes[ROOT_PATH]) {
            parameters.root = _core.getHash(_nodes[ROOT_PATH].node);
          } else {
            parameters.branch = _branch || 'master';
          }
        }

        //now we compose the URL
        if (window && window.location) {
          var address = window.location.protocol + '//' + window.location.host + '/rest/' + parameters.command + '?';
          address += "&project=" + URL.addSpecialChars(parameters.project);
          if (parameters.root) {
            address += "&root=" + URL.addSpecialChars(parameters.root);
          } else {
            if (parameters.commit) {
              address += "&commit=" + URL.addSpecialChars(parameters.commit);
            } else {
              address += "&branch=" + URL.addSpecialChars(parameters.branch);
            }
          }

          address += "&path=" + URL.addSpecialChars(parameters.path);

          if (parameters.output) {
            address += "&output=" + URL.addSpecialChars(parameters.output);
          }

          return address;
        }

        return null;

      }

      function getDumpURL(parameters) {
        parameters.output = parameters.output || "dump_url.out";
        return plainUrl(parameters);
      }

      function getProjectObject() {
        return _project;
      }

      function getAvailableInterpreterNames() {
        var names = [];
        var valids = _nodes[ROOT_PATH] ? _core.getRegistry(_nodes[ROOT_PATH].node, 'validPlugins') || "" : "";
        valids = valids.split(" ");
        for (var i = 0; i < valids.length; i++) {
          if (AllPlugins.indexOf(valids[i]) !== -1) {
            names.push(valids[i]);
          }
        }
        return names;
      }

      function runServerPlugin(name, context, callback) {
        _database.simpleRequest({command: 'executePlugin', name: name, context: context}, callback);
      }

      function getAvailableDecoratorNames() {
        return AllDecorators;
      }

      function getFullProjectsInfoAsync(callback) {
        _database.simpleRequest({command: 'getAllProjectsInfo'}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      function createGenericBranchAsync(project, branch, commit, callback) {
        _database.simpleRequest({command: 'setBranch', project: project, branch: branch, old: '', new: commit}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      function deleteGenericBranchAsync(project, branch, commit, callback) {
        _database.simpleRequest({command: 'setBranch', project: project, branch: branch, old: commit, new: ''}, function (err, id) {
          if (err) {
            return callback(err);
          }
          _database.simpleResult(id, callback);
        });
      }

      //initialization
      function initialize() {
        _database = newDatabase();
        _database.openDatabase(function (err) {
          if (!err) {
            _networkWatcher = networkWatcher();
            serverEventer();
            _database.getProjectNames(function (err, names) {
              if (!err && names && names.length > 0) {
                var projectName = null;
                if (_configuration.project && names.indexOf(_configuration.project) !== -1) {
                  projectName = _configuration.project;
                } else {
                  projectName = names[0];
                }
                openProject(projectName, function (err) {
                  if (err) {
                    logger.error('Problem during project opening:' + JSON.stringify(err));
                  }
                });
              } else {
                logger.error('Cannot get project names / There is no project on the server');
              }
            });
          } else {
            logger.error('Cannot open database');
          }
        });
      }

      if (_configuration.autostart) {
        initialize();
      }
      _redoer = new UndoRedo({
          //eventer
          events: _self.events,
          networkStates: _self.networkStates,
          branchStates: _self.branchStates,
          _eventList: _self._eventList,
          _getEvent: _self._getEvent,
          addEventListener: _self.addEventListener,
          removeEventListener: _self.removeEventListener,
          removeAllEventListeners: _self.removeAllEventListeners,
          dispatchEvent: _self.dispatchEvent,
          getProjectObject: getProjectObject});

      return {
        //eventer
        events: _self.events,
        networkStates: _self.networkStates,
        branchStates: _self.branchStates,
        _eventList: _self._eventList,
        _getEvent: _self._getEvent,
        addEventListener: _self.addEventListener,
        removeEventListener: _self.removeEventListener,
        removeAllEventListeners: _self.removeAllEventListeners,
        dispatchEvent: _self.dispatchEvent,
        connect: connect,

        getUserId: getUserId,

        //projects, branch, etc.
        getActiveProjectName: getActiveProject,
        getAvailableProjectsAsync: getAvailableProjectsAsync,
        getViewableProjectsAsync: getViewableProjectsAsync,
        getFullProjectListAsync: getFullProjectListAsync,
        getProjectAuthInfoAsync: getProjectAuthInfoAsync,
        connectToDatabaseAsync: connectToDatabaseAsync,
        selectProjectAsync: selectProjectAsync,
        createProjectAsync: createProjectAsync,
        deleteProjectAsync: deleteProjectAsync,
        getBranchesAsync: getBranchesAsync,
        selectCommitAsync: selectCommitAsync,
        getCommitsAsync: getCommitsAsync,
        getActualCommit: getActualCommit,
        getActualBranch: getActualBranch,
        getActualNetworkStatus: getActualNetworkStatus,
        getActualBranchStatus: getActualBranchStatus,
        createBranchAsync: createBranchAsync,
        deleteBranchAsync: deleteBranchAsync,
        selectBranchAsync: selectBranchAsync,
        commitAsync: commitAsync,
        goOffline: goOffline,
        goOnline: goOnline,
        isProjectReadOnly: function () {
          return _readOnlyProject;
        },
        isCommitReadOnly: function () {
          return _viewer;
        },

        //MGA
        startTransaction: startTransaction,
        completeTransaction: completeTransaction,
        setAttributes: setAttributes,
        delAttributes: delAttributes,
        setRegistry: setRegistry,
        delRegistry: delRegistry,
        copyMoreNodes: copyMoreNodes,
        moveMoreNodes: moveMoreNodes,
        delMoreNodes: delMoreNodes,
        createChild: createChild,
        createChildren: createChildren,
        makePointer: makePointer,
        delPointer: delPointer,
        addMember: addMember,
        removeMember: removeMember,
        setMemberAttribute: setMemberAttribute,
        delMemberAttribute: delMemberAttribute,
        setMemberRegistry: setMemberRegistry,
        delMemberRegistry: delMemberRegistry,
        createSet: createSet,
        deleteSet: deleteSet,

        //desc and META
        setAttributeDescriptor: setAttributeDescriptor,
        delAttributeDescriptor: delAttributeDescriptor,
        setPointerDescriptor: setPointerDescriptor,
        delPointerDescriptor: delPointerDescriptor,
        setChildrenMetaDescriptor: setChildrenMetaDescriptor,
        delChildrenMetaDescriptor: delChildrenMetaDescriptor,
        setBase: setBase,
        delBase: delBase,

        //we simply propagate the functions of META
        getMeta: META.getMeta,
        setMeta: META.setMeta,
        getChildrenMeta: META.getChildrenMeta,
        setChildrenMeta: META.setChildrenMeta,
        getChildrenMetaAttribute: META.getChildrenMetaAttribute,
        setChildrenMetaAttribute: META.setChildrenMetaAttribute,
        getValidChildrenItems: META.getValidChildrenItems,
        updateValidChildrenItem: META.updateValidChildrenItem,
        removeValidChildrenItem: META.removeValidChildrenItem,
        getAttributeSchema: META.getAttributeSchema,
        setAttributeSchema: META.setAttributeSchema,
        removeAttributeSchema: META.removeAttributeSchema,
        getPointerMeta: META.getPointerMeta,
        setPointerMeta: META.setPointerMeta,
        getValidTargetItems: META.getValidTargetItems,
        updateValidTargetItem: META.updateValidTargetItem,
        removeValidTargetItem: META.removeValidTargetItem,
        deleteMetaPointer: META.deleteMetaPointer,
        getOwnValidChildrenTypes: META.getOwnValidChildrenTypes,
        getOwnValidTargetTypes: META.getOwnValidTargetTypes,
        isValidChild: META.isValidChild,
        isValidTarget: META.isValidTarget,
        isValidAttribute: META.isValidAttribute,
        getValidChildrenTypes: META.getValidChildrenTypes,
        getValidTargetTypes: META.getValidTargetTypes,
        hasOwnMetaRules: META.hasOwnMetaRules,
        filterValidTarget: META.filterValidTarget,
        isTypeOf: META.isTypeOf,
        getValidAttributeNames: META.getValidAttributeNames,
        getOwnValidAttributeNames: META.getOwnValidAttributeNames,
        getMetaAspectNames: META.getMetaAspectNames,
        getOwnMetaAspectNames: META.getOwnMetaAspectNames,
        getMetaAspect: META.getMetaAspect,
        setMetaAspect: META.setMetaAspect,
        deleteMetaAspect: META.deleteMetaAspect,
        getAspectTerritoryPattern: META.getAspectTerritoryPattern,

        //end of META functions

        //decorators
        getAvailableDecoratorNames: getAvailableDecoratorNames,
        //interpreters
        getAvailableInterpreterNames: getAvailableInterpreterNames,
        getProjectObject: getProjectObject,
        runServerPlugin: runServerPlugin,

        //JSON functions
        exportItems: exportItems,
        getExportItemsUrlAsync: getExportItemsUrlAsync,
        getExternalInterpreterConfigUrlAsync: getExternalInterpreterConfigUrlAsync,
        dumpNodeAsync: dumpNodeAsync,
        importNodeAsync: importNodeAsync,
        mergeNodeAsync: mergeNodeAsync,
        createProjectFromFileAsync: createProjectFromFileAsync,
        getDumpURL: getDumpURL,
        getExportLibraryUrlAsync: getExportLibraryUrlAsync,
        updateLibraryAsync: updateLibraryAsync,
        addLibraryAsync: addLibraryAsync,
        getFullProjectsInfoAsync: getFullProjectsInfoAsync,
        createGenericBranchAsync: createGenericBranchAsync,
        deleteGenericBranchAsync: deleteGenericBranchAsync,

        //constraint
        setConstraint: setConstraint,
        delConstraint: delConstraint,

        //coreAddOn functions
        validateProjectAsync: validateProjectAsync,
        validateModelAsync: validateModelAsync,
        validateNodeAsync: validateNodeAsync,
        setValidationCallback: setValidationCallback,
        getDetailedHistoryAsync: getDetailedHistoryAsync,
        getRunningAddOnNames: getRunningAddOnNames,

        //territory functions for the UI
        addUI: addUI,
        removeUI: removeUI,
        updateTerritory: updateTerritory,
        getNode: getNode,

        //undo - redo
        undo: _redoer.undo,
        redo: _redoer.redo,

        //testing
        testMethod: testMethod

      };
    }

    return Client;
  });
define('blob/BlobConfig',[], function(){

    var BlobConfig = {
        hashMethod: 'sha1', // TODO: in the future we may switch to sha512
        hashRegex: new RegExp('^[0-9a-f]{40}$')
    };
    return BlobConfig;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/BlobMetadata',['blob/BlobConfig'], function(BlobConfig){

    /**
     * Initializes a new instance of BlobMetadata
     * @param {Object<string, string|number|Object>} metadata A serialized metadata object. Name and content must be defined.
     * @constructor
     */
    var BlobMetadata = function(metadata) {
        var key;
        if (metadata) {
            this.name = metadata.name;
            this.size = metadata.size || 0;
            this.mime = metadata.mime || '';
            this.isPublic = metadata.isPublic || false;
            this.tags = metadata.tags || [];
            this.content = metadata.content;
            this.contentType = metadata.contentType || BlobMetadata.CONTENT_TYPES.OBJECT;
            if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                for (key in this.content) {
                    if (this.content.hasOwnProperty(key)) {
                        if (BlobConfig.hashRegex.test(this.content[key].content) === false) {
                            throw Error("BlobMetadata is malformed: hash is invalid");
                        }
                    }
                }
            }
        } else {
            throw new Error('metadata parameter is not defined');
        }
    };

    /**
     * Type of the metadata
     * @type {{OBJECT: string, COMPLEX: string, SOFT_LINK: string}}
     */
    BlobMetadata.CONTENT_TYPES = {
        OBJECT: 'object',
        COMPLEX: 'complex',
        SOFT_LINK: 'softLink'
    };

    /**
     * Serializes the metadata to a JSON object.
     * @returns {{name: string, size: number, mime: string, tags: Array.<string>, content: (string|Object}, contentType: string}}
     */
    BlobMetadata.prototype.serialize = function () {
        var metadata = {
            name: this.name,
            size: this.size,
            mime: this.mime,
            isPublic: this.isPublic,
            tags: this.tags,
            content: this.content,
            contentType: this.contentType
        };

        metadata.tags.sort();

        if (this.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
            // override on  purpose to normalize content
            metadata.content = {};
            var fnames = Object.keys(this.content);
            fnames.sort();

            for (var j = 0; j < fnames.length; j += 1) {
                metadata.content[fnames[j]] = this.content[fnames[j]];
            }
        }

        return metadata;
    };

    return BlobMetadata
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/Artifact',['blob/BlobMetadata', 'blob/BlobConfig'], function (BlobMetadata, BlobConfig) {

    /**
     * Creates a new instance of artifact, i.e. complex object, in memory. This object can be saved in the storage.
     * @param {string} name Artifact's name without extension
     * @param {blob.BlobClient} blobClient
     * @param {blob.BlobMetadata} descriptor
     * @constructor
     */
    var Artifact = function (name, blobClient, descriptor) {
        this.name = name;
        this.blobClient = blobClient;
        // TODO: use BlobMetadata class here
        this.descriptor = descriptor || {
            name: name + '.zip',
            size: 0,
            mime: 'application/zip',
            content: {},
            contentType: 'complex'
        }; // name and hash pairs
    };

    /**
     * Adds content to the artifact as a file.
     * @param {string} name filename
     * @param {Blob} content File object or Blob
     * @param callback
     */
    Artifact.prototype.addFile = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClient.putFile(filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.addObjectHash(name, hash, function (err, hash) {
                callback(err, hash);
            })
        });
    };

    Artifact.prototype.addFileAsSoftLink = function (name, content, callback) {
        var self = this;
        var filename = name.substring(name.lastIndexOf('/') + 1);

        self.blobClient.putFile(filename, content, function (err, hash) {
            if (err) {
                callback(err);
                return;
            }

            self.addMetadataHash(name, hash, function (err, hash) {
                callback(err, hash);
            })
        });
    };

    /**
     * Adds multiple files.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFiles = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFile(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };


    /**
     * Adds multiple files as soft-links.
     * @param {Object.<string, Blob>} files files to add
     * @param callback
     */
    Artifact.prototype.addFilesAsSoftLinks = function (files, callback) {
        var self = this,
            fileNames = Object.keys(files),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding files as soft-links: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addFileAsSoftLink(fileNames[i], files[fileNames[i]], counterCallback);
        }
    };

    /**
     * Adds a hash to the artifact using the given file path.
     * @param {string} name Path to the file in the artifact. Note: 'a/b/c.txt'
     * @param {string} hash Metadata hash that has to be added.
     * @param callback
     */
    Artifact.prototype.addObjectHash = function (name, hash, callback) {
        var self = this;

        self.blobClient.getMetadata(hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: metadata.content,
                    contentType: BlobMetadata.CONTENT_TYPES.OBJECT
                };
                callback(null, hash);
            }
        });
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addObjectHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addObjectHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    Artifact.prototype.addMetadataHash = function (name, hash, callback) {
        var self = this;

        if (BlobConfig.hashRegex.test(hash) === false) {
            callback("Blob hash is invalid");
            return;
        }
        self.blobClient.getMetadata(hash, function (err, metadata) {
            if (err) {
                callback(err);
                return;
            }

            if (self.descriptor.content.hasOwnProperty(name)) {
                callback('Another content with the same name was already added. ' + JSON.stringify(self.descriptor.content[name]));

            } else {
                self.descriptor.size += metadata.size;

                self.descriptor.content[name] = {
                    content: hash,
                    contentType: BlobMetadata.CONTENT_TYPES.SOFT_LINK
                };
                callback(null, hash);
            }
        });
    };

    /**
     * Adds hashes to the artifact using the given file paths.
     * @param {object.<string, string>} objectHashes - Keys are file paths and values object hashes.
     * @param callback
     */
    Artifact.prototype.addMetadataHashes = function (objectHashes, callback) {
        var self = this,
            fileNames = Object.keys(objectHashes),
            nbrOfFiles = fileNames.length,
            hashes = [],
            error = '',
            i,
            counterCallback = function (err, hash) {
                error = err ? error + err : error;
                nbrOfFiles -= 1;
                hashes.push(hash);
                if (nbrOfFiles === 0) {
                    if (error) {
                        return callback('Failed adding objectHashes: ' + error, hashes);
                    }
                    callback(null, hashes);
                }
            };

        if (nbrOfFiles === 0) {
            callback(null, hashes);
            return;
        }

        for (i = 0; i < fileNames.length; i += 1) {
            self.addMetadataHash(fileNames[i], objectHashes[fileNames[i]], counterCallback);
        }
    };

    /**
     * Saves this artifact and uploads the metadata to the server's storage.
     * @param callback
     */
    Artifact.prototype.save = function (callback) {
        this.blobClient.putMetadata(this.descriptor, callback);
    };

    return Artifact
});
;(function(){

/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-reduce/index.js", function(exports, require, module){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
});
require.register("superagent/lib/client.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  this.text = this.xhr.responseText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var res = new Response(self);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

});




require.alias("component-emitter/index.js", "superagent/deps/emitter/index.js");
require.alias("component-emitter/index.js", "emitter/index.js");

require.alias("component-reduce/index.js", "superagent/deps/reduce/index.js");
require.alias("component-reduce/index.js", "reduce/index.js");

require.alias("superagent/lib/client.js", "superagent/index.js");if (typeof exports == "object") {
  module.exports = require("superagent");
} else if (typeof define == "function" && define.amd) {
  define('superagent',[], function(){ return require("superagent"); });
} else {
  this["superagent"] = require("superagent");
}})();
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

define('blob/BlobClient',['./Artifact', 'blob/BlobMetadata', 'superagent'], function (Artifact, BlobMetadata, superagent) {

    var BlobClient = function (parameters) {
        this.artifacts = [];

        if (parameters) {
            this.server = parameters.server || this.server;
            this.serverPort = parameters.serverPort || this.serverPort;
            this.httpsecure = (parameters.httpsecure !== undefined) ? parameters.httpsecure : this.httpsecure;
        }
        this.blobUrl = '';
        if (this.httpsecure !== undefined && this.server && this.serverPort) {
            this.blobUrl = (this.httpsecure ? 'https://' : 'http://') + this.server + ':' + this.serverPort;
        }

        // TODO: TOKEN???
        this.blobUrl = this.blobUrl + '/rest/blob/'; // TODO: any ways to ask for this or get it from the configuration?
    };

    BlobClient.prototype.getMetadataURL = function (hash) {
        var metadataBase = this.blobUrl + 'metadata';
        if (hash) {
            return metadataBase + '/' + hash;
        } else {
            return metadataBase;
        }
    };

    BlobClient.prototype._getURL = function (base, hash, subpath) {
        var subpathURL = '';
        if (subpath) {
            subpathURL = subpath;
        }
        return this.blobUrl + base + '/' + hash + '/' + encodeURIComponent(subpathURL);
    };

    BlobClient.prototype.getViewURL = function (hash, subpath) {
        return this._getURL('view', hash, subpath);
    };

    BlobClient.prototype.getDownloadURL = function (hash, subpath) {
        return this._getURL('download', hash, subpath);
    };

    BlobClient.prototype.getCreateURL = function (filename, isMetadata) {
        if (isMetadata) {
            return this.blobUrl + 'createMetadata/';
        } else {
            return this.blobUrl + 'createFile/' + encodeURIComponent(filename);
        }
    };


    BlobClient.prototype.putFile = function (name, data, callback) {
        function toArrayBuffer(buffer) {
            var ab = new ArrayBuffer(buffer.length);
            var view = new Uint8Array(ab);
            for (var i = 0; i < buffer.length; ++i) {
                view[i] = buffer[i];
            }
            return ab;
        }
        // on node-webkit, we use XMLHttpRequest, but xhr.send thinks a Buffer is a string and encodes it in utf-8. Send an ArrayBuffer instead
        if (typeof window !== 'undefined' && typeof Buffer !== 'undefined' && data instanceof Buffer) {
            data = toArrayBuffer(data); // FIXME will this have performance problems
        }
        superagent.post(this.getCreateURL(name))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', data.length)
            .send(data)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                var response = res.body;
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putMetadata = function (metadataDescriptor, callback) {
        var self = this;
        var metadata = new BlobMetadata(metadataDescriptor);

        // FIXME: in production mode do not indent the json file.
        var blob;
        var contentLength;
        if (typeof Blob !== 'undefined') {
            blob = new Blob([JSON.stringify(metadata.serialize(), null, 4)], {type: 'text/plain'});
            contentLength = blob.size;
        } else {
            blob = new Buffer(JSON.stringify(metadata.serialize(), null, 4), 'utf8');
            contentLength = blob.length;
        }

        superagent.post(this.getCreateURL(metadataDescriptor.name, true))
            .set('Content-Type', 'application/octet-stream')
            .set('Content-Length', contentLength)
            .send(blob)
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                    return;
                }
                // Uploaded.
                var response = JSON.parse(res.text);
                // Get the first one
                var hash = Object.keys(response)[0];
                callback(null, hash);
            });
    };

    BlobClient.prototype.putFiles = function (o, callback) {
        var self = this;

        var filenames = Object.keys(o);
        var remaining = filenames.length;

        var hashes = {};

        for (var j = 0; j < filenames.length; j += 1) {
            (function(filename, data) {

                self.putFile(filename, data, function (err, hash) {
                    remaining -= 1;

                    hashes[filename] = hash;

                    if (err) {
                        // TODO: log/handle error
                        return;
                    }

                    if (remaining === 0) {
                        callback(null, hashes);
                    }
                });

            })(filenames[j], o[filenames[j]]);
        }
    };

    BlobClient.prototype.getSubObject = function (hash, subpath, callback) {
        return this.getObject(hash, callback, subpath);
    }

    BlobClient.prototype.getObject = function (hash, callback, subpath) {
        superagent.parse['application/zip'] = function (obj, parseCallback) {
            if (parseCallback) {
                // Running on node; this should be unreachable due to req.pipe() below
            } else {
                return obj;
            }
        }
        //superagent.parse['application/json'] = superagent.parse['application/zip'];

        var req = superagent.get(this.getViewURL(hash, subpath));
        if (req.pipe) {
            // running on node
            var Writable = require('stream').Writable;
            require('util').inherits(BuffersWritable, Writable);

            function BuffersWritable(options) {
                Writable.call(this, options);

                var self = this;
                self.buffers = [];
            }
            BuffersWritable.prototype._write = function(chunk, encoding, callback) {
                this.buffers.push(chunk);
                callback();
            };

            var buffers = new BuffersWritable();
            buffers.on('finish', function () {
                callback(null, Buffer.concat(buffers.buffers));
            });
            buffers.on('error', function (err) {
                callback(err);
            });
            req.pipe(buffers);
        } else {
            req.removeAllListeners('end');
            req.on('request', function () {
                if (typeof this.xhr !== 'undefined') {
                    this.xhr.responseType = 'arraybuffer';
                }
            });
            // req.on('error', callback);
            req.on('end', function() {
                if (req.xhr.status > 399) {
                    callback(req.xhr.status);
                } else {
                    var contentType = req.xhr.getResponseHeader('content-type');
                    var response = req.xhr.response; // response is an arraybuffer
                    if (contentType == 'application/json') {
                        function utf8ArrayToString(uintArray) {
                            return decodeURIComponent(escape(String.fromCharCode.apply(null, uintArray)));
                        }
                        response = JSON.parse(utf8ArrayToString(new Uint8Array(response)));
                    }
                    callback(null, response);
                }
            });
            req.end(callback);
        }
    };

    BlobClient.prototype.getMetadata = function (hash, callback) {
        superagent.get(this.getMetadataURL(hash))
            .end(function (err, res) {
                if (err || res.status > 399) {
                    callback(err || res.status);
                } else {
                    callback(null, JSON.parse(res.text));
                }
            });
    };

    BlobClient.prototype.createArtifact = function (name) {
        var artifact = new Artifact(name, this);
        this.artifacts.push(artifact);
        return artifact;
    };

    BlobClient.prototype.getArtifact = function (metadataHash, callback) {
        // TODO: get info check if complex flag is set to true.
        // TODO: get info get name.
        var self = this;
        this.getMetadata(metadataHash, function (err, info) {
            if (err) {
                callback(err);
                return;
            }

            if (info.contentType === BlobMetadata.CONTENT_TYPES.COMPLEX) {
                var artifact = new Artifact(info.name, self, info);
                self.artifacts.push(artifact);
                callback(null, artifact);
            } else {
                callback('not supported contentType ' + JSON.stringify(info, null, 4));
            }

        });
    };

    BlobClient.prototype.saveAllArtifacts = function (callback) {
        var remaining = this.artifacts.length;
        var hashes = [];

        if (remaining === 0) {
            callback(null, hashes);
        }

        for (var i = 0; i < this.artifacts.length; i += 1) {

            this.artifacts[i].save(function(err, hash) {
                remaining -= 1;

                hashes.push(hash);

                if (err) {
                    // TODO: log/handle errors
                    return;
                }
                if (remaining === 0) {
                    callback(null, hashes);
                }
            });
        }
    };

    return BlobClient;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */


define('plugin/PluginConfig',[], function () {

    /**
     * Initializes a new instance of plugin configuration.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginConfig = function (config) {
        if (config) {
            var keys = Object.keys(config);
            for (var i = 0; i < keys.length; i += 1) {
                // TODO: check for type on deserialization
                this[keys[i]] = config[keys[i]];
            }
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginConfig.prototype.serialize = function () {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };


    return PluginConfig;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */


define('plugin/PluginNodeDescription',[], function () {

    /**
     * Initializes a new instance of plugin node description object.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginNodeDescription = function (config) {
        if (config) {
            this.name = config.name;
            this.id = config.id;
        } else {
            this.name = '';
            this.id = '';
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginNodeDescription.prototype.serialize = function() {
        var keys = Object.keys(this);
        var result = {};

        for (var i = 0; i < keys.length; i += 1) {
            // TODO: check for type on serialization
            result[keys[i]] = this[keys[i]];
        }

        return result;
    };

    return PluginNodeDescription;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */


define('plugin/PluginMessage',['plugin/PluginNodeDescription'], function (PluginNodeDescription) {

    /**
     * Initializes a new instance of plugin message.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginMessage = function (config) {
        if (config) {
            this.commitHash = config.commitHash;
            if (config.activeNode instanceof PluginNodeDescription) {
                this.activeNode = config.activeNode;
            } else {
                this.activeNode = new PluginNodeDescription(config.activeNode);
            }

            this.message = config.message;
            if (config.severity) {
                this.severity = config.severity;
            } else {
                this.severity = 'info';
            }
        } else {
            this.commitHash = '';
            this.activeNode = new PluginNodeDescription();
            this.message = '';
            this.severity = 'info';
        }
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{}}
     */
    PluginMessage.prototype.serialize = function () {
        var result = {
            commitHash: this.commitHash,
            activeNode: this.activeNode.serialize(),
            message: this.message,
            severity: this.severity
        };

        return result;
    };

    return PluginMessage;
});
/**
 * Created by zsolt on 3/20/14.
 */


define('plugin/PluginResult',['plugin/PluginMessage'], function (PluginMessage) {

    /**
     * Initializes a new instance of a plugin result object.
     *
     * Note: this object is JSON serializable see serialize method.
     *
     * @param config - deserializes an existing configuration to this object.
     * @constructor
     */
    var PluginResult = function (config) {
        if (config) {
            this.success = config.success;
            this.pluginName = config.pluginName;
            this.startTime = config.startTime;
            this.finishTime = config.finishTime;
            this.messages = [];
            this.artifacts = config.artifacts;
            this.error = config.error;

            for (var i = 0; i < config.messages.length; i += 1) {
                var pluginMessage;
                if (config.messages[i] instanceof PluginMessage) {
                    pluginMessage = config.messages[i];
                } else {
                    pluginMessage = new PluginMessage(config.messages[i]);
                }
                this.messages.push(pluginMessage);
            }
        } else {
            this.success = false;
            this.messages = []; // array of PluginMessages
            this.artifacts = []; // array of hashes
            this.pluginName = 'PluginName N/A';
            this.startTime = null;
            this.finishTime = null;
            this.error = null;
        }
    };

    /**
     * Gets the success flag of this result object
     *
     * @returns {boolean}
     */
    PluginResult.prototype.getSuccess = function () {
        return this.success;
    };

    /**
     * Sets the success flag of this result.
     *
     * @param {boolean} value
     */
    PluginResult.prototype.setSuccess = function (value) {
        this.success = value;
    };

    /**
     * Returns with the plugin messages.
     *
     * @returns {plugin.PluginMessage[]}
     */
    PluginResult.prototype.getMessages = function () {
        return this.messages;
    };

    /**
     * Adds a new plugin message to the messages list.
     *
     * @param {plugin.PluginMessage} pluginMessage
     */
    PluginResult.prototype.addMessage = function (pluginMessage) {
        this.messages.push(pluginMessage);
    };

    PluginResult.prototype.getArtifacts = function () {
        return this.artifacts;
    };

    PluginResult.prototype.addArtifact = function (hash) {
        this.artifacts.push(hash);
    };

    /**
     * Gets the name of the plugin to which the result object belongs to.
     *
     * @returns {string}
     */
    PluginResult.prototype.getPluginName = function () {
        return this.pluginName;
    };

    //------------------------------------------------------------------------------------------------------------------
    //--------------- Methods used by the plugin manager

    /**
     * Sets the name of the plugin to which the result object belongs to.
     *
     * @param pluginName - name of the plugin
     */
    PluginResult.prototype.setPluginName = function (pluginName) {
        this.pluginName = pluginName;
    };

    /**
     * Gets the ISO 8601 representation of the time when the plugin started its execution.
     *
     * @returns {string}
     */
    PluginResult.prototype.getStartTime = function () {
        return this.startTime;
    };

    /**
     * Sets the ISO 8601 representation of the time when the plugin started its execution.
     *
     * @param {string} time
     */
    PluginResult.prototype.setStartTime = function (time) {
        this.startTime = time;
    };

    /**
     * Gets the ISO 8601 representation of the time when the plugin finished its execution.
     *
     * @returns {string}
     */
    PluginResult.prototype.getFinishTime = function () {
        return this.finishTime;
    };

    /**
     * Sets the ISO 8601 representation of the time when the plugin finished its execution.
     *
     * @param {string} time
     */
    PluginResult.prototype.setFinishTime = function (time) {
        this.finishTime = time;
    };

    /**
     * Gets error if any error occured during execution.
     * FIXME: should this be an Error object?
     * @returns {string}
     */
    PluginResult.prototype.getError = function () {
        return this.error;
    };

    /**
     * Sets the error string if any error occured during execution.
     * FIXME: should this be an Error object?
     * @param {string} time
     */
    PluginResult.prototype.setError = function (error) {
        this.error = error;
    };

    /**
     * Serializes this object to a JSON representation.
     *
     * @returns {{success: boolean, messages: plugin.PluginMessage[], pluginName: string, finishTime: stirng}}
     */
    PluginResult.prototype.serialize = function () {
        var result = {
            success: this.success,
            messages: [],
            artifacts: this.artifacts,
            pluginName: this.pluginName,
            startTime: this.startTime,
            finishTime: this.finishTime,
            error: this.error
        };

        for (var i = 0; i < this.messages.length; i += 1) {
            result.messages.push(this.messages[i].serialize());
        }

        return result;
    };

    return PluginResult;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */


define('plugin/PluginBase',['plugin/PluginConfig',
    'plugin/PluginResult',
    'plugin/PluginMessage',
    'plugin/PluginNodeDescription'],
    function (PluginConfig, PluginResult, PluginMessage, PluginNodeDescription) {


        /**
         * Initializes a new instance of a plugin object, which should be a derived class.
         *
         * @constructor
         */
        var PluginBase = function () {
            // set by initialize
            this.logger = null;
            this.blobClient = null;
            this._currentConfig = null;

            // set by configure
            this.core = null;
            this.project = null;
            this.projectName = null;
            this.branchName = null;
            this.branchHash = null;
            this.commitHash = null;
            this.currentHash = null;
            this.rootNode = null;
            this.activeNode = null;
            this.activeSelection = [];
            this.META = null;

            this.result = null;
            this.isConfigured = false;
        };

        //--------------------------------------------------------------------------------------------------------------
        //---------- Methods must be overridden by the derived classes

        /**
         * Main function for the plugin to execute. This will perform the execution.
         * Notes:
         * - do NOT use console.log use this.logger.[error,warning,info,debug] instead
         * - do NOT put any user interaction logic UI, etc. inside this function
         * - callback always have to be called even if error happened
         *
         * @param {function(string, plugin.PluginResult)} callback - the result callback
         */
        PluginBase.prototype.main = function (callback) {
            throw new Error('implement this function in the derived class');
        };

        /**
         * Readable name of this plugin that can contain spaces.
         *
         * @returns {string}
         */
        PluginBase.prototype.getName = function () {
            throw new Error('implement this function in the derived class - getting type automatically is a bad idea,' +
                'when the js scripts are minified names are useless.');
        };

        //--------------------------------------------------------------------------------------------------------------
        //---------- Methods could be overridden by the derived classes

        /**
         * Current version of this plugin using semantic versioning.
         * @returns {string}
         */
        PluginBase.prototype.getVersion = function () {
            return '0.1.0';
        };

        /**
         * A detailed description of this plugin and its purpose. It can be one or more sentences.
         *
         * @returns {string}
         */
        PluginBase.prototype.getDescription = function () {
            return '';
        };

        /**
         * Configuration structure with names, descriptions, minimum, maximum values, default values and
         * type definitions.
         *
         * Example:
         *
         * [{
         *    "name": "logChildrenNames",
         *    "displayName": "Log Children Names",
         *    "description": '',
         *    "value": true, // this is the 'default config'
         *    "valueType": "boolean",
         *    "readOnly": false
         * },{
         *    "name": "logLevel",
         *    "displayName": "Logger level",
         *    "description": '',
         *    "value": "info",
         *    "valueType": "string",
         *    "valueItems": [
         *          "debug",
         *          "info",
         *          "warn",
         *          "error"
         *      ],
         *    "readOnly": false
         * },{
         *    "name": "maxChildrenToLog",
         *    "displayName": "Maximum children to log",
         *    "description": 'Set this parameter to blabla',
         *    "value": 4,
         *    "minValue": 1,
         *    "valueType": "number",
         *    "readOnly": false
         * }]
         *
         * @returns {object[]}
         */
        PluginBase.prototype.getConfigStructure = function () {
            return [];
        };

        //--------------------------------------------------------------------------------------------------------------
        //---------- Methods that can be used by the derived classes

        /**
         * Updates the current success flag with a new value.
         *
         * NewValue = OldValue && Value
         *
         * @param {boolean} value - apply this flag on current success value
         * @param {string|null} message - optional detailed message
         */
        PluginBase.prototype.updateSuccess = function (value, message) {
            var prevSuccess = this.result.getSuccess();
            var newSuccessValue = prevSuccess && value;

            this.result.setSuccess(newSuccessValue);
            var msg = '';
            if (message) {
                msg = ' - ' + message;
            }

            this.logger.debug('Success was updated from ' + prevSuccess + ' to ' + newSuccessValue + msg);
        };

        /**
         * WebGME can export the META types as path and this method updates the generated domain specific types with
         * webgme node objects. These can be used to define the base class of new objects created through the webgme API.
         *
         * @param {object} generatedMETA
         */
        PluginBase.prototype.updateMETA = function (generatedMETA) {
            var name;
            for (name in this.META) {
                if (this.META.hasOwnProperty(name)) {
                    generatedMETA[name] = this.META[name];
                }
            }

            // TODO: check if names are not the same
            // TODO: log if META is out of date
        };

        /**
         * Checks if the given node is of the given meta-type.
         * Usage: <tt>self.isMetaTypeOf(aNode, self.META['FCO']);</tt>
         * @param node - Node to be checked for type.
         * @param metaNode - Node object defining the meta type.
         * @returns {boolean} - True if the given object was of the META type.
         */
        PluginBase.prototype.isMetaTypeOf = function (node, metaNode) {
            var self = this;
            while (node) {
                if (self.core.getGuid(node) === self.core.getGuid(metaNode)) {
                    return true;
                }
                node = self.core.getBase(node);
            }
            return false;
        };

        /**
         * Finds and returns the node object defining the meta type for the given node.
         * @param node - Node to be checked for type.
         * @returns {Object} - Node object defining the meta type of node.
         */
        PluginBase.prototype.getMetaType = function (node) {
            var self = this,
                name;
            while (node) {
                name = self.core.getAttribute(node, 'name');
                if (self.META.hasOwnProperty(name) && self.core.getGuid(node) === self.core.getGuid(self.META[name])) {
                    break;
                }
                node = self.core.getBase(node);
            }
            return node;
        };

        /**
         * Returns true if node is a direct instance of a meta-type node (or a meta-type node itself).
         * @param node - Node to be checked.
         * @returns {boolean}
         */
        PluginBase.prototype.baseIsMeta = function (node) {
            var self = this,
                baseName,
                baseNode = self.core.getBase(node);
            if (!baseNode) {
                // FCO does not have a base node, by definition function returns true.
                return true;
            }
            baseName = self.core.getAttribute(baseNode, 'name');
            return self.META.hasOwnProperty(baseName) && self.core.getGuid(self.META[baseName]) === self.core.getGuid(baseNode);
        };

        /**
         * Gets the current configuration of the plugin that was set by the user and plugin manager.
         *
         * @returns {object}
         */
        PluginBase.prototype.getCurrentConfig = function () {
            return this._currentConfig;
        };

        /**
         * Creates a new message for the user and adds it to the result.
         *
         * @param {object} node - webgme object which is related to the message
         * @param {string} message - feedback to the user
         * @param {string} severity - severity level of the message: 'debug', 'info' (default), 'warning', 'error'.
         */
        PluginBase.prototype.createMessage = function (node, message, severity) {
            var severityLevel = severity || 'info';
            //this occurence of the function will always handle a single node

            var descriptor = new PluginNodeDescription({
                    name: node ? this.core.getAttribute(node, 'name') : "",
                    id: node ? this.core.getPath(node) : ""
                });
            var pluginMessage = new PluginMessage({
                    commitHash: this.currentHash,
                    activeNode: descriptor,
                    message: message,
                    severity: severityLevel
                });

            this.result.addMessage(pluginMessage);
        };

        /**
         * Saves all current changes if there is any to a new commit.
         * If the changes were started from a branch, then tries to fast forward the branch to the new commit.
         * Note: Does NOT handle any merges at this point.
         *
         * @param {string|null} message - commit message
         * @param callback
         */
        PluginBase.prototype.save = function (message, callback) {
            var self = this;

            this.logger.debug('Saving project');

            this.core.persist(this.rootNode,function(err){if (err) {self.logger.error(err);}});
            var newRootHash = self.core.getHash(self.rootNode);

            var commitMessage = '[Plugin] ' + self.getName() + ' (v' + self.getVersion() + ') updated the model.';
            if (message) {
                commitMessage += ' - ' + message;
            }
            self.currentHash = self.project.makeCommit([self.currentHash], newRootHash, commitMessage, function (err) {if (err) {self.logger.error(err);}});

            if (self.branchName) {
                // try to fast forward branch if there was a branch name defined

                // FIXME: what if master branch is already in a different state?

                self.project.getBranchNames(function (err, branchNames) {
                    if (branchNames.hasOwnProperty(self.branchName)) {
                        var branchHash = branchNames[self.branchName];
                        if (branchHash === self.branchHash) {
                            // the branch does not have any new commits
                            // try to fast forward branch to the current commit
                            self.project.setBranchHash(self.branchName, self.branchHash, self.currentHash, function (err) {
                                if (err) {
                                    // fast forward failed
                                    self.logger.error(err);
                                    self.logger.info('"' + self.branchName + '" was NOT updated');
                                    self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                                } else {
                                    // successful fast forward of branch to the new commit
                                    self.logger.info('"' + self.branchName + '" was updated to the new commit.');
                                    // roll starting point on success
                                    self.branchHash = self.currentHash;
                                }
                                callback(err);
                            });
                        } else {
                            // branch has changes a merge is required
                            // TODO: try auto-merge, if fails ...
                            self.logger.warn('Cannot fast forward "' + self.branchName + '" branch. Merge is required but not supported yet.');
                            self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                            callback(null);
                        }
                    } else {
                        // branch was deleted or not found, do nothing
                        self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                        callback(null);
                    }
                });
                // FIXME: is this call async??
                // FIXME: we are not tracking all commits that we make

            } else {
                // making commits, we have not started from a branch
                self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                callback(null);
            }

            // Commit changes.
/*            this.core.persist(this.rootNode, function (err) {
                // TODO: any error here?
                if (err) {
                    self.logger.error(err);
                }

                var newRootHash = self.core.getHash(self.rootNode);

                var commitMessage = '[Plugin] ' + self.getName() + ' (v' + self.getVersion() + ') updated the model.';
                if (message) {
                    commitMessage += ' - ' + message;
                }

                self.currentHash = self.project.makeCommit([self.currentHash], newRootHash, commitMessage, function (err) {
                    // TODO: any error handling here?
                    if (err) {
                        self.logger.error(err);
                    }

                    if (self.branchName) {
                        // try to fast forward branch if there was a branch name defined

                        // FIXME: what if master branch is already in a different state?

                        self.project.getBranchNames(function (err, branchNames) {
                            if (branchNames.hasOwnProperty(self.branchName)) {
                                var branchHash = branchNames[self.branchName];
                                if (branchHash === self.branchHash) {
                                    // the branch does not have any new commits
                                    // try to fast forward branch to the current commit
                                    self.project.setBranchHash(self.branchName, self.branchHash, self.currentHash, function (err) {
                                        if (err) {
                                            // fast forward failed
                                            self.logger.error(err);
                                            self.logger.info('"' + self.branchName + '" was NOT updated');
                                            self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                                        } else {
                                            // successful fast forward of branch to the new commit
                                            self.logger.info('"' + self.branchName + '" was updated to the new commit.');
                                            // roll starting point on success
                                            self.branchHash = self.currentHash;
                                        }
                                        callback(err);
                                    });
                                } else {
                                    // branch has changes a merge is required
                                    // TODO: try auto-merge, if fails ...
                                    self.logger.warn('Cannot fast forward "' + self.branchName + '" branch. Merge is required but not supported yet.');
                                    self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                                    callback(null);
                                }
                            } else {
                                // branch was deleted or not found, do nothing
                                self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                                callback(null);
                            }
                        });
                        // FIXME: is this call async??
                        // FIXME: we are not tracking all commits that we make

                    } else {
                        // making commits, we have not started from a branch
                        self.logger.info('Project was saved to ' + self.currentHash + ' commit.');
                        callback(null);
                    }
                });

            });*/
        };

        //--------------------------------------------------------------------------------------------------------------
        //---------- Methods that are used by the Plugin Manager. Derived classes should not use these methods

        /**
         * Initializes the plugin with objects that can be reused within the same plugin instance.
         *
         * @param {logManager} logger - logging capability to console (or file) based on PluginManager configuration
         * @param {blob.BlobClient} blobClient - virtual file system where files can be generated then saved as a zip file.
         */
        PluginBase.prototype.initialize = function (logger, blobClient) {
            if (logger) {
                this.logger = logger;
            } else {
                this.logger = console;
            }

            this.blobClient = blobClient;

            this._currentConfig = null;
            // initialize default configuration
            this.setCurrentConfig(this.getDefaultConfig());

            this.isConfigured = false;
        };

        /**
         * Configures this instance of the plugin for a specific execution. This function is called before the main by
         * the PluginManager.
         * Initializes the result with a new object.
         *
         * @param {PluginContext} config - specific context: project, branch, core, active object and active selection.
         */
        PluginBase.prototype.configure = function (config) {
            this.core = config.core;
            this.project = config.project;
            this.projectName = config.projectName;
            this.branchName = config.branchName;
            this.branchHash = config.branchName ? config.commitHash : null;
            this.commitHash = config.commitHash;
            this.currentHash = config.commitHash;
            this.rootNode = config.rootNode;
            this.activeNode = config.activeNode;
            this.activeSelection = config.activeSelection;
            this.META = config.META;

            this.result = new PluginResult();


            this.isConfigured = true;
        };

        /**
         * Gets the default configuration based on the configuration structure for this plugin.
         *
         * @returns {plugin.PluginConfig}
         */
        PluginBase.prototype.getDefaultConfig = function () {
            var configStructure = this.getConfigStructure();

            var defaultConfig = new PluginConfig();

            for (var i = 0; i < configStructure.length; i += 1) {
                defaultConfig[configStructure[i].name] = configStructure[i].value;
            }

            return defaultConfig;
        };

        /**
         * Sets the current configuration of the plugin.
         *
         * @param {object} newConfig - this is the actual configuration and NOT the configuration structure.
         */
        PluginBase.prototype.setCurrentConfig = function (newConfig) {
            this._currentConfig = newConfig;
        };

        return PluginBase;
    });
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */


define('plugin/PluginContext',[], function () {

    /**
     * Initializes a new instance of PluginContext. This context is set through PluginBase.configure method for a given
     * plugin instance and execution.
     *
     * @constructor
     */
    var PluginContext = function () {

        // TODO: something like this
//        context.project = project;
//        context.projectName = config.project;
//        context.core = new Core(context.project);
//        context.commitHash = config.commit;
//        context.selected = config.selected;
//        context.storage = null;

    };


    return PluginContext;
});
/*
 * Copyright (C) 2014 Vanderbilt University, All rights reserved.
 *
 * Author: Zsolt Lattmann
 */

// TODO: Use PluginManagerConfiguration
// TODO: Load ActiveSelection objects and pass it correctly
// TODO: Add more statistics to the result object
// TODO: Result object rename name -> pluginName, time -> finishTime)
// TODO: Make this class testable
// TODO: PluginManager should download the plugins


define('plugin/PluginManagerBase',[
        './PluginBase',
        './PluginContext',
        'logManager'],
    function (PluginBase, PluginContext, LogManager) {

        var PluginManagerBase = function (storage, Core, plugins) {
            this.logger = LogManager.create("PluginManager");
            this._Core = Core;       // webgme core class is used to operate on objects
            this._storage = storage; // webgme storage
            this._plugins = plugins; // key value pair of pluginName: pluginType - plugins are already loaded/downloaded
            this._pluginConfigs = {}; // keeps track of the current configuration for each plugins by name

            var pluginNames = Object.keys(this._plugins);
            for (var i = 0; i < pluginNames.length; i += 1) {
                var p = new this._plugins[pluginNames[i]]();
                this._pluginConfigs[pluginNames[i]] = p.getDefaultConfig();
            }
        };

        PluginManagerBase.prototype.initialize = function (managerConfiguration, configCallback, callbackContext) {
            var self = this,
                plugins = this._plugins;

            //#1: PluginManagerBase should load the plugins

            //#2: PluginManagerBase iterates through each plugin and collects the config data
            var pluginConfigs = {};

            for (var p in plugins) {
                if (plugins.hasOwnProperty(p)) {
                    var plugin = new plugins[p]();
                    pluginConfigs[p] = plugin.getConfigStructure();
                }
            }

            if (configCallback) {
                configCallback.call(callbackContext, pluginConfigs, function (updatedPluginConfig) {
                    for (var p in updatedPluginConfig) {
                        if (updatedPluginConfig.hasOwnProperty(p)) {
                            //save it back to the plugin
                            self._pluginConfigs[p] = updatedPluginConfig[p];
                        }
                    }
                });
            }
        };

        /**
         * Gets a new instance of a plugin by name.
         *
         * @param {string} name
         * @returns {plugin.PluginBase}
         */
        PluginManagerBase.prototype.getPluginByName = function (name) {
            return this._plugins[name];
        };

        PluginManagerBase.prototype.loadMetaNodes = function (pluginContext, callback) {
            var self = this;

            this.logger.debug('Loading meta nodes');

            // get meta members
            var metaIDs = pluginContext.core.getMemberPaths(pluginContext.rootNode, 'MetaAspectSet');

            var len = metaIDs.length;

            var nodeObjs = [];


            var allObjectsLoadedHandler = function () {
                var len2 = nodeObjs.length;

                var nameObjMap = {};

                while (len2--) {
                    var nodeObj = nodeObjs[len2];

                    nameObjMap[pluginContext.core.getAttribute(nodeObj, 'name')] = nodeObj;
                }

                pluginContext.META = nameObjMap;

                self.logger.debug('Meta nodes are loaded');

                callback(null, pluginContext);
            };

            var loadedMetaObjectHandler = function (err, nodeObj) {
                nodeObjs.push(nodeObj);

                if (nodeObjs.length === metaIDs.length) {
                    allObjectsLoadedHandler();
                }
            };

            while (len--) {
                pluginContext.core.loadByPath(pluginContext.rootNode, metaIDs[len], loadedMetaObjectHandler);
            }
        };

        /**
         *
         * @param {plugin.PluginManagerConfiguration} managerConfiguration
         * @param {function} callback
         */
        PluginManagerBase.prototype.getPluginContext = function (managerConfiguration, callback) {

            // TODO: check if callback is a function

            var self = this;

            var pluginContext = new PluginContext();

            // based on the string values get the node objects
            // 1) Open project
            // 2) Load branch OR commit hash
            // 3) Load rootNode
            // 4) Load active object
            // 5) Load active selection
            // 6) Update context
            // 7) return

            pluginContext.project = this._storage;
            pluginContext.projectName = managerConfiguration.project;
            pluginContext.core = new self._Core(pluginContext.project);
            pluginContext.commitHash = managerConfiguration.commit;
            pluginContext.activeNode = null;    // active object
            pluginContext.activeSelection = []; // selected objects

            // add activeSelection
            var loadActiveSelectionAndMetaNodes = function () {
                if (managerConfiguration.activeSelection.length === 0) {
                    self.loadMetaNodes(pluginContext, callback);
                } else {
                    var remaining = managerConfiguration.activeSelection.length;

                    for (var i = 0; i < managerConfiguration.activeSelection.length; i += 1) {
                        (function (activeNodePath) {
                            pluginContext.core.loadByPath(pluginContext.rootNode, activeNodePath, function (err, activeNode) {
                                remaining -= 1;

                                if (err) {
                                    self.logger.error('unable to load active selection: ' + activeNodePath);
                                    return;
                                }

                                pluginContext.activeSelection.push(activeNode);

                                if (remaining === 0) {
                                    // all nodes from active selection are loaded
                                    self.loadMetaNodes(pluginContext, callback);
                                }
                            });
                        })(managerConfiguration.activeSelection[i]);
                    }
                }
            };

            // add activeNode
            var loadCommitHashAndRun = function (commitHash) {
                self.logger.info('Loading commit ' + commitHash);
                pluginContext.project.loadObject(commitHash, function (err, commitObj) {
                    if (err) {
                        callback(err, pluginContext);
                        return;
                    }

                    if (typeof commitObj === 'undefined' || commitObj === null) {
                        callback('cannot find commit', pluginContext);
                        return;
                    }

                    pluginContext.core.loadRoot(commitObj.root, function (err, rootNode) {
                        if (err) {
                            callback("unable to load root", pluginContext);
                            return;
                        }

                        pluginContext.rootNode = rootNode;
                        if (typeof managerConfiguration.activeNode === 'string') {
                            pluginContext.core.loadByPath(pluginContext.rootNode, managerConfiguration.activeNode, function (err, activeNode) {
                                if (err) {
                                    callback("unable to load selected object", pluginContext);
                                    return;
                                }

                                pluginContext.activeNode = activeNode;
                                loadActiveSelectionAndMetaNodes();
                            });
                        } else {
                            pluginContext.activeNode = null;
                            loadActiveSelectionAndMetaNodes();
                        }
                    });
                });
            };

            // load commit hash and run based on branch name or commit hash
            if (managerConfiguration.branchName) {
                pluginContext.project.getBranchNames(function (err, branchNames) {
                    self.logger.debug(branchNames);

                    if (branchNames.hasOwnProperty(managerConfiguration.branchName)) {
                        pluginContext.commitHash = branchNames[managerConfiguration.branchName];
                        pluginContext.branchName = managerConfiguration.branchName;
                        loadCommitHashAndRun(pluginContext.commitHash);
                    } else {
                        callback('cannot find branch \'' + managerConfiguration.branchName + '\'', pluginContext);
                    }
                });
            } else {
                loadCommitHashAndRun(pluginContext.commitHash);
            }

        };

        PluginManagerBase.prototype.executePlugin = function (name, managerConfiguration, callback) {
            // TODO: check if name is a string
            // TODO: check if managerConfiguration is an instance of PluginManagerConfiguration
            // TODO: check if callback is a function
            var self = this;

            var PluginClass = this.getPluginByName(name);

            var plugin = new PluginClass();

            var pluginLogger = LogManager.create('Plugin.' + name);

            plugin.initialize(pluginLogger, managerConfiguration.blobClient);

            plugin.setCurrentConfig(this._pluginConfigs[name]);
            for (var key in managerConfiguration.pluginConfig) {
                if (managerConfiguration.pluginConfig.hasOwnProperty(key) && plugin._currentConfig.hasOwnProperty(key)) {
                    plugin._currentConfig[key] = managerConfiguration.pluginConfig[key];
                }
            }
            self.getPluginContext(managerConfiguration, function (err, pluginContext) {
                if (err) {
                    // TODO: this has to return with an empty PluginResult object and NOT with null.
                    callback(err, null);
                    return;

                }

                //set logging level at least to INFO level since the plugins write messages with INFO level onto the console
                var logLevel = LogManager.getLogLevel();
                if (logLevel < LogManager.logLevels.INFO) {
                    // elevate log level if it is less then info
                    LogManager.setLogLevel(LogManager.logLevels.INFO);
                }

                // TODO: Would be nice to log to file and to console at the same time.
                //LogManager.setFileLogPath('PluginManager.log');

                plugin.configure(pluginContext);

                var startTime = (new Date()).toISOString();

                plugin.main(function (err, result) {
                    //set logging level back to previous value
                    LogManager.setLogLevel(logLevel);

                    // set common information (meta info) about the plugin and measured execution times
                    result.setFinishTime((new Date()).toISOString());
                    result.setStartTime(startTime);

                    result.setPluginName(plugin.getName());
                    result.setError(err);

                    callback(err, result);
                });

            });

        };


        return PluginManagerBase;
    });
define('js/Dialogs/PluginConfig/PluginConfigDialog',[], function () {
   return;
});

/*globals define, _, requirejs, WebGMEGlobal*/

define('js/Utils/InterpreterManager',['core/core',
        'plugin/PluginManagerBase',
        'plugin/PluginResult',
        'blob/BlobClient',
        'js/Dialogs/PluginConfig/PluginConfigDialog'
                                    ], function (Core,
                                               PluginManagerBase,
                                               PluginResult,
                                               BlobClient,
                                               PluginConfigDialog) {
    

    var InterpreterManager = function (client) {
        this._client = client;
        //this._manager = new PluginManagerBase();
        this._savedConfigs = {};
    };

    var getPlugin = function(name,callback){
        if (WebGMEGlobal && WebGMEGlobal.plugins && WebGMEGlobal.plugins.hasOwnProperty(name)) {
            callback(null, WebGMEGlobal.plugins[name]);
        } else {
            requirejs(['/plugin/' + name + '/' + name + '/' + name],
                function (InterpreterClass) {
                    callback(null, InterpreterClass);
                },
                function (err) {
                    callback(err, null);
                }
            );
        }
    };

    /**
     *
     * @param {string} name - name of plugin to be executed.
     * @param {object} silentPluginCfg - if falsy dialog window will be shown.
     * @param {object.string} silentPluginCfg.activeNode - Path to activeNode.
     * @param {object.Array.<string>} silentPluginCfg.activeSelection - Paths to nodes in activeSelection.
     * @param {object.boolean} silentPluginCfg.runOnServer - Whether to run the plugin on the server or not.
     * @param {object.object} silentPluginCfg.pluginConfig - Plugin specific options.
     * @param callback
     */
    InterpreterManager.prototype.run = function (name, silentPluginCfg, callback) {
        var self = this;
        getPlugin(name,function(err,plugin){
            if(!err && plugin) {
                var plugins = {},
                    runWithConfiguration;
                plugins[name] = plugin;
                var pluginManager = new PluginManagerBase(self._client.getProjectObject(), Core, plugins);
                pluginManager.initialize(null, function (pluginConfigs, configSaveCallback) {
                    //#1: display config to user
                    var hackedConfig = {
                        'Global Options': [
                            {
                                "name": "runOnServer",
                                "displayName": "Execute on Server",
                                "description": '',
                                "value": false, // this is the 'default config'
                                "valueType": "boolean",
                                "readOnly": false
                            }
                        ]
                    };

                    for (var i in pluginConfigs) {
                        if (pluginConfigs.hasOwnProperty(i)) {
                            hackedConfig[i] = pluginConfigs[i];

                            // retrieve user settings from previous run
                            if (self._savedConfigs.hasOwnProperty(i)) {
                                var iConfig = self._savedConfigs[i];
                                var len = hackedConfig[i].length;

                                while (len--) {
                                    if (iConfig.hasOwnProperty(hackedConfig[i][len].name)) {
                                        hackedConfig[i][len].value = iConfig[hackedConfig[i][len].name];
                                    }
                                }

                            }
                        }
                    }

                    runWithConfiguration = function (updatedConfig) {
                        //when Save&Run is clicked in the dialog (or silentPluginCfg was passed)
                        var globalconfig = updatedConfig['Global Options'],
                            activeNode,
                            activeSelection;
                        delete updatedConfig['Global Options'];

                        activeNode = silentPluginCfg.activeNode;
                        if (!activeNode && WebGMEGlobal && WebGMEGlobal.State) {
                                activeNode = WebGMEGlobal.State.getActiveObject();
                        }
                        activeSelection = silentPluginCfg.activeSelection;
                        if (!activeSelection && WebGMEGlobal && WebGMEGlobal.State) {
                            activeSelection = WebGMEGlobal.State.getActiveSelection();
                        }
                        // save config from user
                        for (var i in updatedConfig) {
                            self._savedConfigs[i] = updatedConfig[i];
                        }

                        //#2: save it back and run the plugin
                        if (configSaveCallback) {
                            configSaveCallback(updatedConfig);

                            // TODO: if global config says try to merge branch then we should pass the name of the branch
                            var config = {
                                "project": self._client.getActiveProjectName(),
                                "token": "",
                                "activeNode": activeNode, // active object in the editor
                                "activeSelection": activeSelection || [],
                                "commit": self._client.getActualCommit(), //"#668b3babcdf2ddcd7ba38b51acb62d63da859d90",
                                "branchName": self._client.getActualBranch() // this has priority over the commit if not null
                            };

                            if(globalconfig.runOnServer === true || silentPluginCfg.runOnServer === true){
                                var context = {
                                    managerConfig: config,
                                    pluginConfigs:updatedConfig
                                };
                                self._client.runServerPlugin(name,context,function(err,result){
                                    if(err){
                                        console.error(err);
                                        callback(new PluginResult()); //TODO return proper error result
                                    } else {
                                        var resultObject = new PluginResult(result);
                                        callback(resultObject);
                                    }
                                });
                            } else {
                                config.blobClient = new BlobClient();

                                pluginManager.executePlugin(name, config, function (err, result) {
                                    if (err) {
                                        console.error(err);
                                    }
                                    callback(result);
                                });
                            }
                        }
                    };

                    if (silentPluginCfg) {
                        var updatedConfig = {};
                        for (var i in hackedConfig) {
                            updatedConfig[i] = {};
                            var len = hackedConfig[i].length;
                            while (len--) {
                                updatedConfig[i][hackedConfig[i][len].name] = hackedConfig[i][len].value;
                            }

                            if (silentPluginCfg && silentPluginCfg.pluginConfig) {
                                for (var j in silentPluginCfg.pluginConfig) {
                                    updatedConfig[i][j] = silentPluginCfg.pluginConfig[j];
                                }
                            }
                        }
                        runWithConfiguration(updatedConfig);
                    } else {
                        var d = new PluginConfigDialog();
                        silentPluginCfg = {};
                        d.show(hackedConfig, runWithConfiguration);
                    }
                });
            } else {
                console.error(err);
                console.error('unable to load plugin');
                callback(null); //TODO proper result
            }
        });
    };

    //TODO somehow it would feel more right if we do run in async mode, but if not then we should provide getState and getResult synchronous functions as well

    return InterpreterManager;
});

define('webgme.classes',
  [
    'client',
    'blob/BlobClient',
    'js/Utils/InterpreterManager'
  ], function (Client, BlobClient, InterpreterManager) {
    WebGMEGlobal.classes.Client = Client;
    WebGMEGlobal.classes.BlobClient = BlobClient;
    WebGMEGlobal.classes.InterpreterManager = InterpreterManager;
  });


require(["webgme.classes"]);
}());