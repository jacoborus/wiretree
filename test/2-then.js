'use strict';

var test = require('tape').test

test('then:: call passed function', function (t) {
  var Wiretree = require('..');
  new Wiretree().then( function () {
    t.pass('callback invoked')
    t.end()
  });
});

