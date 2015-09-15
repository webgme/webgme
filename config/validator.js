/*jshint node:true*/
/**
 * @author lattmann / https://github.com/lattmann
 * @author pmeijer / https://github.com/pmeijer
 */

var configFileName;

function throwTypeMiss(name, value, typeStr) {
    'use strict';
    var msg;
    if (configFileName) {
        msg = 'In ' + configFileName;
    } else {
        msg = 'In configuration';
    }
    msg += ': ' + name + ' must be a(n) ' + typeStr + '. Got: "' + value + '".';
    throw new Error(msg);
}

function assertTypeOf(name, value, type, orFalsy) {
    'use strict';
    if (orFalsy && !value) {
        return;
    }
    if (typeof value !== type) {
        throwTypeMiss(name, value, type);
    }
}

function assertObject(name, value, orFalsy) {
    'use strict';
    assertTypeOf(name, value, 'object', orFalsy);
}

function assertString(name, value, orFalsy) {
    'use strict';
    assertTypeOf(name, value, 'string', orFalsy);
}

function assertNumber(name, value, orFalsy) {
    'use strict';
    assertTypeOf(name, value, 'number', orFalsy);
}

function assertBoolean(name, value, orFalsy) {
    'use strict';
    assertTypeOf(name, value, 'boolean', orFalsy);
}

function assertArray(name, value) {
    'use strict';
    if (value instanceof Array === false) {
        throwTypeMiss(name, value, 'array');
    }
}

function assertEnum(name, value) {
    'use strict';
    var validValues = Array.prototype.slice.call(arguments).splice(2),
        msg;

    if (validValues.indexOf(value) === -1) {
        if (configFileName) {
            msg = 'In ' + configFileName;
        } else {
            msg = 'In configuration';
        }
        msg += ': ' + name + ' must be one of: ' + validValues.toString() + '. Got: "' + value + '".';
        throw new Error(msg);
    }
}

// We will fail as early as possible
function validateConfig(configOrFileName) {
    'use strict';
    var config,
        errMsg,
        key,
        expectedKeys = [];

    if (typeof configOrFileName === 'string') {
        configFileName = configOrFileName;
        config = require(configFileName);
    } else {
        config = configOrFileName;
    }

    assertObject('config', config);

    // addOn
    expectedKeys.push('addOn');
    assertObject('config.addOn', config.addOn);
    assertBoolean('config.addOn.enable', config.addOn.enable);
    assertArray('config.addOn.basePaths', config.addOn.basePaths);

    // authentication
    expectedKeys.push('authentication');
    assertObject('config.authentication', config.authentication);
    assertBoolean('config.authentication.enable', config.authentication.enable);
    assertBoolean('config.authentication.allowGuests', config.authentication.allowGuests);
    assertString('config.authentication.guestAccount', config.authentication.guestAccount);
    assertString('config.authentication.logOutUrl', config.authentication.logOutUrl);
    assertNumber('config.authentication.salts', config.authentication.salts);

    // bin scripts
    expectedKeys.push('bin');
    assertObject('config.bin', config.bin);
    assertObject('config.bin.log', config.bin.log);

    // blob
    expectedKeys.push('blob');
    assertObject('config.blob', config.blob);
    assertString('config.blob.type', config.blob.type);
    assertString('config.blob.fsDir', config.blob.fsDir);
    //assertObject('config.blob.s3', config.blob.s3);

    // client
    expectedKeys.push('client');
    assertObject('config.client', config.client);
    assertString('config.client.appDir', config.client.appDir);
    assertObject('config.client.log', config.client.log);
    assertString('config.client.log.level', config.client.log.level);
    assertObject('config.client.defaultProject', config.client.defaultProject);
    assertString('config.client.defaultProject.name', config.client.defaultProject.name, true);
    assertString('config.client.defaultProject.branch', config.client.defaultProject.name, true);
    assertString('config.client.defaultProject.node', config.client.defaultProject.name, true);
    assertEnum('config.client.defaultConnectionRouter', config.client.defaultConnectionRouter,
        'basic', 'basic2', 'basic3');

    // core
    expectedKeys.push('core');
    assertBoolean('config.core.enableCustomConstraints', config.core.enableCustomConstraints);

    // debug
    expectedKeys.push('debug');
    assertBoolean('config.debug', config.debug);

    // executor
    expectedKeys.push('executor');
    assertObject('config.executor', config.executor);
    assertBoolean('config.executor.enable', config.executor.enable);
    assertString('config.executor.nonce', config.executor.nonce, true);
    assertString('config.executor.outputDir', config.executor.outputDir);
    assertString('config.executor.labelJobs', config.executor.labelJobs);
    assertNumber('config.executor.workerRefreshInterval', config.executor.workerRefreshInterval);

    // mongo configuration
    expectedKeys.push('mongo');
    assertObject('config.mongo', config.mongo);
    assertString('config.mongo.uri', config.mongo.uri);
    assertObject('config.mongo.options', config.mongo.options);

    // plugin
    expectedKeys.push('plugin');
    assertObject('config.plugin', config.plugin);
    assertBoolean('config.plugin.allowServerExecution', config.plugin.allowServerExecution);
    assertArray('config.plugin.basePaths', config.plugin.basePaths);
    assertBoolean('config.plugin.displayAll', config.plugin.displayAll);

    // requirejsPaths
    expectedKeys.push('requirejsPaths');
    assertObject('config.requirejsPaths', config.requirejsPaths);

    // rest
    expectedKeys.push('rest');
    assertObject('config.rest', config.rest);
    assertBoolean('config.rest.secure', config.rest.secure);
    assertObject('config.rest.components', config.rest.components);

    //seedProjects
    expectedKeys.push('seedProjects');
    assertBoolean('config.seedProjects.enable', config.seedProjects.enable);
    assertString('config.seedProjects.defaultProject', config.seedProjects.defaultProject);
    assertArray('config.seedProjects.basePaths', config.seedProjects.basePaths);

    // server configuration
    expectedKeys.push('server');
    assertObject('config.server', config.server);
    assertNumber('config.server.port', config.server.port);
    assertNumber('config.server.maxWorkers', config.server.maxWorkers);
    // server session store
    assertObject('config.server.sessionStore', config.server.sessionStore);
    assertString('config.server.sessionStore.type', config.server.sessionStore.type);
    assertObject('config.server.sessionStore.options', config.server.sessionStore.options);

    assertString('config.server.sessionCookieId', config.server.sessionCookieId);
    assertString('config.server.sessionCookieSecret', config.server.sessionCookieSecret);
    // server log
    assertObject('config.server.log', config.server.log);
    assertArray('config.server.log.transports', config.server.log.transports);
    // server https
    assertObject('config.server.https', config.server.https);
    assertBoolean('config.server.https.enable', config.server.https.enable);
    assertString('config.server.https.certificateFile', config.server.https.certificateFile);
    assertString('config.server.https.keyFile', config.server.https.keyFile);

    // socketIO
    expectedKeys.push('socketIO');
    assertObject('config.socketIO', config.socketIO);

    // storage
    expectedKeys.push('storage');
    assertObject('config.storage', config.storage);
    assertBoolean('config.storage.autoPersist', config.storage.autoPersist);
    assertBoolean('config.storage.broadcastProjectEvents', config.storage.broadcastProjectEvents);
    assertBoolean('config.storage.emitCommittedCoreObjects', config.storage.emitCommittedCoreObjects);
    assertNumber('config.storage.cache', config.storage.cache);
    assertNumber('config.storage.loadBucketSize', config.storage.loadBucketSize);
    assertNumber('config.storage.loadBucketTimer', config.storage.loadBucketTimer);
    assertEnum('config.storage.keyType', config.storage.keyType, 'rand160Bits', 'ZSSHA', 'plainSHA1');

    //visualization
    expectedKeys.push('visualization');
    assertObject('config.visualization', config.visualization);
    assertArray('config.visualization.decoratorPaths', config.visualization.decoratorPaths);
    assertArray('config.visualization.visualizerDescriptors', config.visualization.visualizerDescriptors);

    if (Object.keys(config).length !== expectedKeys.length) {
        errMsg = 'Configuration had unexpected key(s):';
        for (key in config) {
            if (expectedKeys.indexOf(key) < 0) {
                errMsg += ' "' + key + '"';
            }
        }
        throw new Error(errMsg);
    }
    //TODO Check ranges and enumerations.
}

module.exports = validateConfig;