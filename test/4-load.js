'use strict';

var test = require('tape').test,
    Wiretree = require('..');

var tree = new Wiretree();

test('load::throw error on bad argument: key', function (t) {
  t.throws(function () {
    tree.load('./test/assets/module.js', { key: 1 });
  }, /Bad argument: key/);
  t.end()
});

test('load::throw error on bad argument: filePath', function (t) {
  t.throws(function () {
    tree.load(2);
  }, /Bad filePath: 2/);
  t.end()
});

test('load::throw error on bad argument: group', function (t) {
  t.throws(function () {
    tree.load('./test/assets/module.js', { group: 3, key: 'f'});
  }, /Bad argument: group/);
  t.end()
});

test('load::throw error on bad argument: localname', function (t) {
  t.throws(function () {
    tree.load('./test/assets/module.js', { group: 'hello', localname: 3, key: 'f' });
  }, /Bad argument: localname/);
  t.end()
});


test('load::returns the tree', function (t) {
  t.ok(tree.load('./test/assets/module.js', {key:'f'}).plugins);
  t.end()
});

test('load::loads a module to tree.plugins', function (t) {
  t.is(tree.plugins['f'].key, 'f');
  t.end()
});

test('load::sets the group into the module', function (t) {
  var pluginAddGroup = tree.load('./test/assets/plugin.js', { key: 'e', group: 'codes' });
  t.is(tree.plugins['e'].group, 'codes');
  t.end()
});

test('load::uses localname', function (t) {
  var pluginAddGroup = tree.load('./test/assets/local.js', { key: 'k', group: 'codes', localname: 'localname' });
  t.is(tree.plugins['k'].group, 'codes');
  t.is(tree.groups.codes.plugins.localname.key, 'k');
  t.end()
});

// plugin with depedencies
tree.load('./test/assets/plugin.js', {key: 'g'});

test('load::loads a module to tree.plugins', function (t) {
  t.is(tree.plugins['g'].key, 'g');
  t.notOk(tree.plugins['g'].res);
  t.end()
});

test('load::sets the group into the module', function (t) {
  var pluginAddGroup = tree.load('./test/assets/plugin.js', { key: 'h', group: 'codes' });
  t.is(tree.plugins['h'].group, 'codes');
  t.end()
});
