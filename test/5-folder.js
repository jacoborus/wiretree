
'use strict'

const test = require('tape').test

const Wiretree = require('..')

const tree = new Wiretree()

const options = {}
test('folder:: throws error on bad argument: folderPath', function (t) {
  t.throws(function () {
    tree.folder(1, options)
  }, /Bad argument: folderPath/)
  t.end()
})

test('folder:: throws error on bad argument: options', function (t) {
  t.throws(function () {
    tree.folder('./folder', 2)
  }, /Bad argument: options/)
  t.end()
})

test('folder:: throws error on bad argument: options.prefix', function (t) {
  t.throws(function () {
    tree.folder('./folder', {prefix: 4})
  }, /Bad argument: options.prefix/)
  t.end()
})

test('folder:: throws error on bad argument: options.suffix', function (t) {
  t.throws(function () {
    tree.folder('./folder', {suffix: {}})
  }, /Bad argument: options.suffix/)
  t.end()
})

test('folder:: throws error on bad argument: group', function (t) {
  t.throws(function () {
    tree.folder('./folder', {group: 1})
  }, /Bad argument: options.group/)
  t.end()
})

test('folder:: throws error when module name starts with number', function (t) {
  t.throws(function () {
    tree.folder('./test/assets/folderError')
  }, /Module name can\'t start with number: 1error/)
  t.end()
})

tree.folder('./test/assets/folder')

test('folder:: adds the modules to tree.plugins', function (t) {
  t.is(tree.plugins['addon'].key, 'addon')
  t.end()
})

// add folder with options
const tree2 = new Wiretree()
tree2.folder('./test/assets/folder', {group: 'testgroup', prefix: 'pre', suffix: 'suf'})

test('folder:: sets the group into the modules without prefixes and sufixes', function (t) {
  t.is(tree2.plugins.preAddonSuf.group, 'testgroup')
  t.end()
})

test('folder:: create group in tree2 if not exist', function (t) {
  t.ok(tree2.groups.testgroup)
  t.end()
})

test('folder:: accepts middleware transformations', function (t) {
  let transform = function (text) {
    return text + 'Test'
  }
  tree2.folder('./test/assets/transform', {group: 'transforms', transform: transform})
  t.is(tree2.plugins.trTest.key, 'trTest')
  t.end()
})

test('folder:: accepts local names in groups', function (t) {
  t.is(tree2.groups.testgroup.plugins.addon.key, 'preAddonSuf')
  t.end()
})
