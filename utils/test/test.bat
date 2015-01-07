node node_modules/mocha/bin/mocha -R min
node node_modules/mocha/bin/mocha -R html-cov > coverage.html
node utils/test/clean-coverage.js
