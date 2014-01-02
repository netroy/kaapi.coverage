'use strict';

var istanbul = require('istanbul');

var vm = require('vm');
var fs = require('fs');
var path = require('path');

var exists = fs.existsSync || path.existsSync;

function instrumenter (requirejs) {
  var rjsLoader = requirejs.load;
  var makeNodeWrapper = requirejs.makeNodeWrapper;

  return function (context, moduleName, url) {

    // skip plugins
    if(!exists(url)) {
      return rjsLoader.call(requirejs, context, moduleName, url);
    }

    // Load file from FS,
    var contents = fs.readFileSync(url, 'utf8');

    // Instrument the code
    var instrumenter = new istanbul.Instrumenter();
    contents = instrumenter.instrumentSync(contents, url);

    // Wrap it for node.js
    contents = makeNodeWrapper(contents);

    // execute it in the context of requirejs
    try {
      vm.runInThisContext(contents, fs.realpathSync(url));
    } catch (e) {
      throw new Error('Failed: "' + moduleName + '" with error: ' + e);
    }

    // mark module as loaded
    context.completeLoad(moduleName);
  };
}

// Instrument files for coverage
function patch (requirejs) {
  requirejs.load = instrumenter(requirejs);
}

function generate (coverageDir) {
  if (global.__coverage__) {
    // Process the coverage
    var collector = new istanbul.Collector();
    collector.add(global.__coverage__);

    // Generate the report
    ['text-summary', 'html'].forEach(function (type) {
      var report = istanbul.Report.create(type, {
        'dir': coverageDir
      });
      report.writeReport(collector, true);
    });
  }
}

module.exports = {
  'patch': patch,
  'generate': generate
};