'use strict'

const path = require('path'),
      util = require('util'),
      Group = require('./Group.js')

// ramdom hash generator
const uniid = function () {
  let s4 = function () {
    return Math.floor((1 + Math.random()) * 0x10000)
    .toString(16)
    .substring(1)
  }
  return s4() + s4() + '-' + s4()
}

// detect if string starts with a number
const startsWithNumber = function (text) {
  return text[0] === '0' || Number(text[0])
}

// detect if is a wiretree plugin or a module
const isPlugin = function (raw) {
  if (typeof raw !== 'object' || raw === null || util.isArray(raw)) {
    return false
  }
  if (raw.wiretree) {
    return true
  }
  return false
}

// get argument function names
const getParamNames = function (func) {
  let fnStr = func.toString().replace(/((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '')
  return fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(/([^\s,]+)/g) || []
}

// Return processed plugin if need processing
const getProcessed = function (processing, value, settings) {
  if (!processing) {return value}
  return processing(value, settings)
}

/*!
 * Plugin constructor
 * @param {Object} opts plugin data
 * @param {Object} tree parent tree
 */
const Plugin = function (opts, tree) {
  let fileName
  this.tree = tree
  this.resolved = false
  this.dependants = []
  // filePath
  this.filePath = opts.filePath || false
  if (opts.filePath && typeof opts.filePath !== 'string') {
    throw new Error('Bad argument: filePath')
  }
  // name without extension
  if (this.filePath) {
    fileName = path.basename(this.filePath, path.extname(this.filePath))
  // raw
    this.raw = require(this.filePath)
  } else {
    this.raw = opts.raw
  }
  // key
  this.key = opts.key || fileName
  if (typeof this.key !== 'string') {
    throw new Error('Bad argument: key')
  }
  if (startsWithNumber(this.key)) {
    throw new Error('Module name can\'t start with number: ' + this.key)
  }
  // localname
  this.localname = opts.localname || opts.key
  // check if localname is a string and don't start with number'
  if (opts.localname && (typeof opts.localname !== 'string' || startsWithNumber(opts.localname))) {
    throw new Error('Bad argument: localname')
  }
  // processing
  if (opts.processing) {
    this.processing = opts.processing
  }

  this.isPlugin = isPlugin(this.raw)
  if (this.isPlugin) {
    this.dependencies = getParamNames(this.raw.wiretree)
    this.isAsync = this.dependencies.indexOf('wtDone') >= 0 ? true : false
  } else {
    this.res = getProcessed(this.processing, this.raw)
    this.resolved = true
    this.dependencies = []
    this.isAsync = false
  }
  // check if group is a string and don't start with number'
  if (opts.group && (typeof opts.group !== 'string' || startsWithNumber(opts.group))) {
    throw new Error('Bad argument: group')
  }

  // set group
  if (opts.group) {
    if (opts.hidden) {
      this.hidden = true
      this.key = this.key + uniid()
    }
    this.group = opts.group
    // create group if not exist
    tree.groups[this.group] = tree.groups[this.group] || new Group(this.group, this.tree)
    // add plugin to group
    tree.groups[this.group].plugins[this.localname] = this
  }

  tree.plugins[this.key] = this
}

/*!
 * Resolve plugin and its dependencies
 * @param  {Array}   parentDeps list with previous resolved dependencies
 * @param  {Function} callback   to do after resolve plugin
 */
Plugin.prototype.resolve = function (callback) {
  // pass if plugin is  already resolved
  if (this.resolved) { return callback()}
  let self = this

  // resolve plugin without tree dependencies
  if (this.dependencies.length === 0) {
    this.res = getProcessed(this.processing, this.raw.wiretree(), this.raw.settings)
    this.resolved = true
    return callback()
  }

  // async plugin declaration
  let wtDone = function (mod) {
    self.res = getProcessed(self.processing, mod, self.raw.settings)
    self.resolved = true
    callback()
  }

  let deps = []

  this.dependencies.forEach(function (key) {
    if (key === 'wtDone') {
      return deps.push(wtDone)
    }
    if (self.tree.plugins[key]) {
      deps.push(self.tree.plugins[key].res)
    } else {
      deps.push(self.tree.groups[key].result)
    }
  })

  if (!self.isAsync) {
    self.res = getProcessed(self.processing, self.raw.wiretree.apply({}, deps), self.raw.settings)
    self.resolved = true
    return callback()
  }

  this.raw.wiretree.apply({}, deps)
}

Plugin.prototype.hasResolvedDependencies = function () {
  if (!this.dependencies.length) {
    return true
  }
  for (let i in this.dependencies) {
    let dep = this.dependencies[i]
    if (dep !== 'wtDone') {
      if (this.tree.plugins[ dep ]) {
        if (!this.tree.plugins[ dep ].resolved) {
          return false
        }
      } else if (this.tree.groups[ dep ]) {
        if (!this.tree.groups[ dep ].resolved) {
          return false
        }
      }
    }
  }
  return true
}

Plugin.prototype.setDependants = function (key) {
  let plugins = this.tree.plugins,
      groups = this.tree.groups

  let circularError = this.dependants[ this.dependants.indexOf(this.key) ] || false
  if (circularError) {
    throw new Error('Circular dependencies: ' + circularError + ' from ' + this.key)
  }
  if (key) {
    this.dependants.push(key)
  } else {
    key = this.key
  }

  this.dependencies.forEach(function (name) {
    if (name === 'wtDone') {
      return
    }
    if (plugins[name]) {
      return plugins[name].setDependants(key)
    }
    if (groups[name]) {
      return groups[name].setDependants(key)
    }
    throw new Error('missing dependencies: ' + key)
  })
}

module.exports = Plugin
