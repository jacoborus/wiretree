'use strict'

const test = require('tape').test

test('then:: call passed function', function (t) {
  let Wiretree = require('..'),
      tree = new Wiretree()

  tree.then(function () {
    t.pass('callback invoked')
    t.end()
  })
})

