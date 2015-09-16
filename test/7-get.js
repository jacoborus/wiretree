'use strict';

var test = require('tape').test

var Wiretree = require('..');

test('get:: throw error when not resolved tree', function (t) {
  var tree = new Wiretree();
  tree
  .add('uno', 1)
  .then(function () {
    t.throws(function () {
      tree.get('uno');
    }, /tree not resolved. Resolve tree before get any plugin/);
    t.end();
  });
});

test('get:: throw error when not plugin not exists', function (t) {
  var tree = new Wiretree();
  tree
  .add('uno', 1)
  .resolve(function () {
    t.throws(function () {
      tree.get('dos');
    }, /plugin `dos` not exists/);
    t.end();
  });
});

test('get:: gets plugins when tree is resolved', function (t) {
  var tree = new Wiretree();
  tree
  .add('uno', 1)
  .resolve(function () {
    t.is(tree.get('uno'), 1);
    t.end();
  });
});
