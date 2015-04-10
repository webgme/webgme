/**
 * Created by tamas on 12/31/14.
 */
var FS = require('fs');
var input = FS.readFileSync('coverage.html','utf8'),
  output = input.substring(input.indexOf('<!DOCTYPE html>'));

FS.writeFileSync('coverage.html',output);
