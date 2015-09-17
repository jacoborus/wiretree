'use strict'

const Wiretree = require('../../lib/wiretree.js')

const wiretree = new Wiretree(__dirname)

wiretree.add({a: 1, b: 2}, 'data')

wiretree.add(function (data) {
  return data.a + data.b
}, 'sum')

wiretree.load('./plugin.js', 'result')
// plugin.js:
//
// module.exports = function (sum) {
//    return 'result is ' + sum
// }

wiretree.folder('./folder', {
  group: 'stuff',
  prefix: 'pre',
  suffix: 'suf'
})
console.log(wiretree.get('preAddonSuf'))
