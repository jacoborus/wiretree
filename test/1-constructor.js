'use strict'

const test = require('tape').test,
      Wiretree = require('..')

test('Constructor:: accepts root path as argument', function (t) {
  t.is(new Wiretree('./hello').rootPath, './hello', 'custom rootPath')
  t.end()
})

test('Constructor:: set root path as "." by default', function (t) {
  t.is(new Wiretree().rootPath, '.', 'default rootPath')
  t.end()
})
