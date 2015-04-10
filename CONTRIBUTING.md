# Contributing

1. Check for [existing issues](https://github.com/webgme/webgme/issues) and confirm that it has not been already fixed in the [master branch](https://github.com/webgme/webgme/commits/master)
2. Fork the repo and clone it locally
3. Create a new branch for your contribution
4. Add tests
  - Running with mocha under node [tests](test/) run with `npm test`
  - `npm run test_cover` will generate a coverage report under the `coverage` directory
  - Running with karma using [browser tests](test-karma/) run with `npm run test_browser`
5. Push to your fork and submit a pull request


# Development

* `npm run` will print all available commands
* `npm start` starts the webgme web server
* `node node_modules\nodemon\bin\nodemon.js src\bin\start_server.js` restarts server on file changes
* `node node_modules/plato/bin/plato -r -d report -l .jshintrc -t "WebGME" -x "src/client/(lib|bower_components)/.*" src` static code analysis

For any commands the `DEBUG` environment variable can be set. Examples are given for `npm test` command.

Platform specifics:
- `*nix` `$ DEBUG=* npm test`
- `Windows` `set DEBUG=* & npm test`

Examples are given for Windows:
- `set DEBUG=gme:* & npm test`
- `set DEBUG=gme:*,-gme:*worker* & npm test`
- `set DEBUG=gme:*storage*,superagent* & npm test`
- `set DEBUG=gme:*storage*,socket-io* & npm test`
- `set DEBUG=gme:standalone*,express* & npm test`
- `set DEBUG=gme:*plugin* & npm test`

To test and develop the API use the following commands

* `node node_modules\aglio\bin\aglio.js --input src\server\api\Readme.md --server` live preview of the online documentation of the api blueprint
* `node node_modules\api-mock\bin\api-mock src\server\api\Readme.md` serves the api according the blueprint

Note: when you have finished verify that the api documentation is available if you run the webgme server at `http://localhost:8888/developer/api`

### Development guidelines

* Configure your editor to use [`.jshintrc`](.jshintrc) and [`.jscsrc`](.jscsrc)
* Don't update the version in `package.json`, the webgme package maintainers will do it

```JavaScript
/*jshint node: true*/
```

```JavaScript
/*jshint browser: true*/
```

```JavaScript
/*jshint node: true, mocha: true*/
```

Always declare your globals at the top of the source.
```JavaScript
/*globals define, requirejs*/
```


Use [JSDoc](http://en.wikipedia.org/wiki/JSDoc) syntax to annotate source code with documentation, eg. specify authors as:
```JavaScript
/**
 * @author <your_github_username> / https://github.com/<your_github_username>
 */
```

### Branch naming conventions

FILL IN...

# Tools

* [online](http://www.regexr.com) regexp tester
* [online](https://stackedit.io/editor) markdown editor

# Creating a release

This section is for maintainers of webgme.

FILL IN...
