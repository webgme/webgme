# Contributing

1. Check for [existing issues](https://github.com/webgme/webgme/issues) and confirm that it has not been already fixed in the [master branch](https://github.com/webgme/webgme/commits/master)
2. Fork the repo and clone it locally
3. Create a new branch for your contribution
4. Add tests
  - Running with mocha under node [tests](test/) run with `npm test`
  - `npm run test_cover` will generate a coverage report under the `coverage` directory
  - Running with karma using [browser tests](test-karma/) run with `npm run test_browser`
5. Push to your fork and submit a pull request


## Development guidelines

* Configure your editor to use [`.jshintrc`](.jsthintrc) and [`.jscsrc`](.jscsrc)
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

# Creating a release

This section is for maintainers of webgme.

FILL IN...
