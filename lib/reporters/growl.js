/*!
 * Nodeunit
 * Copyright (c) 2010 Caolan McMahon
 * MIT Licensed
 */

/**
 * Module dependencies
 */

var nodeunit = require('../nodeunit'),
    utils = require('../utils'),
    track = require('../track'),
    fs = require('fs'),
    sys = require('sys'),
    path = require('path'),
    exec = require('child_process').exec,
    AssertionError = require('assert').AssertionError;

/**
 * Reporter info string
 */

exports.info = "Growl notifier";

/**
 * Run all tests within each module, reporting the results to the command-line.
 *
 * @param {Array} files
 * @api public
 */

exports.run = function (files, options, callback) {

    if (!options) {
        // load default options
        var content = fs.readFileSync(
            __dirname + '/../../bin/nodeunit.json', 'utf8'
        );
        options = JSON.parse(content);
    }

    var red = function (str) {
        return options.error_prefix + str + options.error_suffix;
    };
    var green = function (str) {
        return options.ok_prefix + str + options.ok_suffix;
    };
    var magenta = function (str) {
        return options.assertion_prefix + str + options.assertion_suffix;
    };
    var bold = function (str) {
        return options.bold_prefix + str + options.bold_suffix;
    };

    var growlNotify = function (icon, msg) {
        iconPath = path.resolve(__dirname, 'growl-icons/' + icon + '.png')
        exec("growlnotify --image " + iconPath + " -n nodeunit-growl -m '" + msg + "'");
    };

    var start = new Date().getTime();
    var tracker = track.createTracker(function (tracker) {
        if (tracker.unfinished()) {
            sys.puts('');
            sys.puts(red(bold(
                'FAILURES: Unfinished tests (or their setups/teardowns): '
            )));
            var names = tracker.names();
            for (var i = 0; i < names.length; i += 1) {
                sys.puts('- ' + names[i]);
            }
            sys.puts('');
            sys.puts('To fix this, make sure all tests call test.done()');
            var msg = 'FAILURES: Unfinished tests: ' + names.join(", ");
            growlNotify('failed', msg);
            process.reallyExit(tracker.unfinished());
        }
    });

    var opts = {
        testspec: options.testspec,
        testFullSpec: options.testFullSpec,
        moduleStart: function (name) {
            sys.print(bold(name) + ': ');
        },
        moduleDone: function (name, assertions) {
            sys.puts('');
            if (assertions.failures()) {
                assertions.forEach(function (a) {
                    if (a.failed()) {
                        a = utils.betterErrors(a);
                        if (a.error instanceof AssertionError && a.message) {
                            sys.puts(
                                'Assertion in test ' + bold(a.testname) + ': ' +
                                magenta(a.message)
                            );
                        }
                        sys.puts(a.error.stack + '\n');
                    }
                });
            }

        },
        testStart: function(name) {
            tracker.put(name);
        },
        testDone: function (name, assertions) {
            tracker.remove(name);
            if (!assertions.failures()) {
                sys.print('.');
            }
            else {
                sys.print(red('F'));
                assertions.forEach(function (assertion) {
                    assertion.testname = name;
                });
            }
        },
        done: function (assertions) {
            var end = new Date().getTime();
            var duration = end - start;
            if (assertions.failures()) {
                sys.puts(
                    '\n' + bold(red('FAILURES: ')) + assertions.failures() +
                    '/' + assertions.length + ' assertions failed (' +
                    assertions.duration + 'ms)'
                );
                var msg = 'FAILURES: ' + assertions.failures() + '/' + assertions.length + ' assertions failed (' + assertions.duration + 'ms)';
                growlNotify('failed', msg);
            }
            else {
                sys.puts(
                    '\n' + bold(green('OK: ')) + assertions.length +
                    ' assertions (' + assertions.duration + 'ms)'
                );
                var msg = 'Success: ' + assertions.length + ' assertions passed (' + assertions.duration + 'ms)';
                growlNotify('success', msg);
            }
            if (callback) callback(assertions.failures() ? new Error('We have got test failures.') : undefined);
        }
    };

    if (files && files.length) {
        var paths = files.map(function (p) {
            return path.resolve(p);
        });
        nodeunit.runFiles(paths, opts);
    } else {
        nodeunit.runModules(files,opts);
    }

};
