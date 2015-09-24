# Configuration

The easiest way to set your custom configuration is to create a new configuration file, e.g. `config.mine.js` in this
directory. From it load the default configuration `var config = require('config.default.js');`, overwrite the options,
`config.authentication.enable = true;` and export the new config `module.exports = config;`.

## Which config file is being used?
When starting the webgme app it requires the './config' directory from the current working directory, which will
load the `index.js`. It in turn loads the `config.%NODE_ENV%.js`. If the environment variable `NODE_ENV` is not set
it falls back to loading `config.default.js`.

## Configuration groups

#### addOn
`config.addOn.enable = false` - If true enables add-ons.

`config.monitorTimeout = 5000` - In milliseconds, the waiting time before add-ons (or the monitoring of such)
 is stopped after the last client leaves a branch.

`config.addOn.basePaths = [path.join(__dirname, '../src/addon/core')]` - Array of paths to custom add-ons.
 If you have an add-on at `C:/SomeAddOns/MyAddOn/MyAddOn.js` the path to append would be `C:/SomeAddOns` or
 a relative path (from the current working directory) to that directory. N.B. this will also include any other
 add-on in that directory, e.g. `C:/SomeAddOns/MyOtherAddOn/MyOtherAddOn.js`.
#### authentication
`config.authentication.enable = false`