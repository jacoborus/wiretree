'use strict'

const Wiretree = require('..'),
      test = require('tape').test

const plugin = function () {
  return 'I\'m a module'
}

const pluginDeps = {
  wiretree: function (a, b) {
    return a + b
  }
}

const asyncPlugin = {
  wiretree: function (a, wtDone) {
    wtDone(function () {
      return a + 2
    })
  }
}

const tree = new Wiretree()

test('add::throws error when key starts with number', function (t) {
  t.throws(function () {
    tree.add('1error', plugin)
  }, /Module name can't start with number: 1error/)
  t.end()
})

test('add::throws errors on bad argument: key', function (t) {
  t.throws(function () {
    tree.add(plugin, {})
  }, /Bad argument: key/)
  t.end()
})

test('add::throws errors on bad argument: group', function (t) {
  t.throws(function () {
    tree.add('d', plugin, { group: 3 })
  }, /Bad argument: group/)

  t.throws(function () {
    tree.add('groupNumber', 1, {group: '3cuatro'})
  }, /Bad argument: group/)
  t.end()
})

test('add::throws errors on bad argument: localname', function (t) {
  t.throws(function () {
    tree.add('d', plugin, { group: 'collection', localname: 3 })
  }, /Bad argument: localname/)
  t.throws(function () {
    tree.add('d', plugin, { group: 'collection', localname: '3cuatro' })
  }, /Bad argument: localname/)
  t.end()
})

test('add::return the tree', function (t) {
  let pluginPut = tree.add('a', 1)
  t.is(typeof pluginPut, 'object')
  t.end()
})

test('add::adds a module to tree.plugins', function (t) {
  t.is(tree.plugins.a.key, 'a')
  t.end()
})

test('add::set localname for module added', function (t) {
  t.is(tree.plugins.a.localname, 'a')
  t.end()
})

test('add::sets filePath to false', function (t) {
  t.is(tree.plugins.a.filePath, false)
  t.end()
})

test('add::adds a module to group', function (t) {
  tree.add('b', 'javascript', { group: 'codes' })
  t.is(tree.groups.codes.plugins['b'].key, 'b')
  t.is(tree.plugins['b'].group, 'codes')
  t.end()
})

test('add::sets isPlugin into plugin props', function (t) {
  tree
  .add('isPlugin', pluginDeps)
  .then(function () {
    t.is(tree.plugins.a.isPlugin, false)
    t.is(tree.plugins.isPlugin.isPlugin, true)
    t.end()
  })
})

test('add::detect if a wiretree plugin is async', function (t) {
  tree
  .add('asyncPlugin', asyncPlugin)
  .then(function () {
    t.is(tree.plugins.asyncPlugin.isAsync, true)
    t.is(tree.plugins.a.isAsync, false)
    t.end()
  })
})

test('add::sets plugin dependencies', function (t) {
  tree
  .add('withDeps', pluginDeps)
  .then(function () {
    t.is(tree.plugins.withDeps.dependencies[0], 'a')
    t.is(tree.plugins.a.dependencies[0], undefined)
    t.end()
  })
})

test('add::autoresolve simple modules (with no dependencies from tree)', function (t) {
  t.is(tree.plugins.a.res, 1)
  t.end()
})

test('add::exclude plugin from mainTree when option hide', function (t) {
  tree
  .add('hidden', plugin, { group: 'codes', hidden: true })
  .then(function () {
    t.is(typeof tree.groups.codes.plugins.hidden, 'object')
    t.is(tree.mainTree.hidden, undefined)
    t.end()
  })
})
