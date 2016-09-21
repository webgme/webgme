/*globals define*/
/*jshint node: true, browser: true, bitwise: false*/

/**
 * @author kecso / https://github.com/kecso
 *
 * collection of functions that uses random Numbers in WebGME
 */

define(['chance'], function (ChanceJs) {
    'use strict';

    function _generateRelidRegexp() {
        var regexp = '',
            i;

        //adding excludes
        if (excludeList.length > 0) {
            for (i = 0; i < excludeList.length; i += 1) {
                regexp += '(?!(^' + excludeList[i] + '$))';
            }
        }
        //adding the pool
        regexp += '^(-)?[' + relidPool + ']+$';

        return new RegExp(regexp);
    }

    function getRandomCharacter(pool) {
        return pool.charAt(randFunction(pool.length));
    }

    function generateGuid() {
        var S4 = function () {
            return getRandomCharacter(guidPool) +
                getRandomCharacter(guidPool) +
                getRandomCharacter(guidPool) +
                getRandomCharacter(guidPool);
        };

        return (S4() + S4() + '-' + S4() + '-' + S4() + '-' + S4() + '-' + S4() + S4() + S4());
    }

    function generateRelid(object, minimalLength) {
        var relid,
            i,
            length = minimalLength || 1,
            tries = 0;

        do {
            if (tries >= maxTry) {
                tries = 0;
                length += 1;
            }
            relid = '';
            for (i = 0; i < length; i += 1) {
                relid += getRandomCharacter(relidPool);
            }
            tries += 1;
        } while (object.hasOwnProperty(relid) === true || isValidRelid(relid) === false);

        return relid;
    }

    function isValidRelid(relid) {

        if (typeof relid !== 'string') {
            return false;
        }
        return relidRegexp.test(relid);
    }

    function relidToInteger(relid) {
        var num = 'NaN',
            negative = false,
            i;

        if (isValidRelid(relid)) {
            num = 0;
            for (i = 0; i < relid.length; i += 1) {
                if (relid.charAt(i) === '-') {
                    negative = true;
                } else {
                    num = num * relidPool.length;
                    num += relidPool.indexOf(relid.charAt(i));
                }
            }
        }

        return num;
    }

    var guidPool = '0123456789abcdef',
        relidPool = '0123456789qwertyuiopasdfghjklzxcvbnmQWERTYUIOPASDFGHJKLZXCVBNM',
        excludeList = ['atr', 'reg', 'ovr'],
        maxTry = 2,
        chance = new ChanceJs(),
        randFunction = function (max) {
            //return Math.floor(Math.random() * max);
            return chance.natural({max: max - 1});
        },
        relidRegexp = _generateRelidRegexp(),
        random = {
            generateGuid: generateGuid,
            generateRelid: generateRelid,
            isValidRelid: isValidRelid,
            relidToInteger: relidToInteger
        };

    return random;
});
