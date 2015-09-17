'use strict'

// dependencies

const path = require('path'),
      fs = require('fs'),
      Plugin = require('./Plugin.js')

//   ---   PRIVATE METHODS   ---
/*!
 * Detect if any plugin has an irresolvable dependency
 * @param  {Object} tree target tree
 * @return {Array}      list of missing dependencies
 */
const findMissingDependencies = function (tree) {
  let plugs = tree.plugins,
      dependencies = []

  // get an array with dependency names from all plugins
  for (let i in plugs) {
    plugs[i].dependencies.forEach(function (name) {
      dependencies.push(name)
    })
  }
  // search irresolvable plugins
  let missingDependencies = []
  dependencies.forEach(function (el) {
    if (!tree.plugins[el]) {
      if (!tree.groups[el] && el !== 'wtDone') {
        missingDependencies.push(el)
      }
    }
  })
  if (missingDependencies.length) {
    return missingDependencies
  }
  return false
}

// get a simple copy of an object
const copyObj = function (obj) {
  let res = {}, i
  for (i in obj) {
    res[i] = obj[i]
  }
  return res
}

// Capitalise first letter of a string
const capitaliseFirstLetter = function (string) {
  return string.charAt(0).toUpperCase() + string.slice(1)
}

/*!
 * get options to load files from folder
 * @param  {String} route path to file
 * @param  {String} file  filename with extension
 * @param  {Object} opts  prefix, suffix, and group
 * @return {Array}       Arguments ready to go
 */
const getNames = function (route, file, opts) {
  let filePath = path.join(route, file),
    // name without extension
      fileName = path.basename(file, path.extname(file)),
      name

  opts.localname = fileName
  fileName = opts.transform(fileName)
  name = fileName
  if (opts.prefix) {
    name = opts.prefix + capitaliseFirstLetter(name)
  }
  if (opts.suffix) {
    name = name + capitaliseFirstLetter(opts.suffix)
  }
  return { group: opts.group, localname: opts.localname, filePath: filePath, key: name, processing: opts.processing }
}

// Wiretree

/**
 * Wiretree constructor
 * Creates new tree
 *
 * Example:
 *
 * ```javascript
 * let Wiretree = require('wiretree')
 * let tree = new Wiretree('path/to/rootFolder')
 * ```
 *
 * @param  {String} folderPath path to root folder
 */

const Wiretree = function (rootPath) {
  // public properties
  this.plugins = {}
  this.mainTree = {}
  this.groups = {}
  this.resolved = false
  if (rootPath) {
    if (typeof rootPath !== 'string') {
      throw new Error('Invalid rootPath parameter creating tree')
    }
    this.rootPath = rootPath
  } else {
    // no argument passed
    this.rootPath = '.'
  }
}

/**
 * Executes a function and then return the tree
 *
 * Example:
 *
 * ```js
 * tree
 * .add('mod', 1)
 * .then(function () {
 *   console.log('mod is added!')
 * })
 * .add(.....)
 * ........
 * ```
 *
 * @param  {Function} fn function
 * @return {Object} tree
 */
Wiretree.prototype.then = function (fn) {
  fn()
  return this
}

/**
 * Add a module or wiretree plugin into the tree.
 * Returns tree object
 *
 * All options are optional:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`localname`** *Function*: keyname into its group. Only works when group is passed
 * - **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
 * - **`processing`** *Function*: processing function module
 *
 *
 * **Example**:
 *
 * ```javascript
 * // add a simple module
 * tree.add('one', 1)
 * // now 'one' in tree equals 1
 *
 * // add a Wiretree plugin (a module with dependencies from tree)
 * .add('plugin', {
 *     wiretree: function (one) {
 *         return one() + 2
 *     }
 * })
 * // now 'plugin in tree equals 3'
 * ```
 *
 * **Async plugin example**:
 *
 * Expose plugin through 'wtDone' dependency instead returning it from function
 * ```js
 * tree.add('asyncPlugin', {
 *     wiretree: function (wtDone) {
 *         doSomethingAsync(function (value) {
 *             wtDone(value)
 *         })
 *     }
 * })
 * ```
 *
 * **Group example**:
 *
 * Passing a `group` will add the module to it. `localName` is how plugin will be exposed as into the group. `localName` is passed `key` by default
 *
 * ```javascript
 * tree.add('homeCtrl', 1, {
 *     group: 'control',
 *     localname: 'home'
 * })
 * // plugin is exposed as 'homeCtrl' in main tree, and as 'home' in 'control' group
 * // so you can inject it into other modules through main tree:
 * let otherPlugin = function (homeCtrl) {
 *     // do something with homeCtrl
 * }
 * // or through its group:
 * let anotherPlugin = function (control) {
 *     let homeCtrl = control.home
 *     // do something with homeCtrl
 * }
 * ```
 *
 * @param  {String} key   name for the plugin
 * @param  {Number|String|Boolean|Object|Function} value plugin
 * @param  {Object} options (optional) see options
 * @return {Object}       tree
 */
Wiretree.prototype.add = function (key, value, options) {
  let opts = options || {}
  opts.key = key
  opts.raw = value
  new Plugin(opts, this)
  return this
}

/**
 * Add a plugin to tree from a file
 *
 * *Options:*
 *
 * - **`key`** *String*: use this value instead filename as plugin keyname in main tree.
 * - **`group`** *String*: group to add the plugin
 * - **`localname`** *String*: use this value as keyname into its group. (Only works when group is passed)
 * - **`hidden`** *Boolean*: expose only in group, not in tree root. (Only works when group is passed)
 * - **`processing`** *Function*: processing function module
 *
 * Add the plugin as 'user' into the tree:
 * ```js
 * tree.load('./user.js')
 * ```
 *
 * Add the plugin as 'userCtrl' into the tree and as 'user' into 'controllers' group:
 * ```js
 * tree.load('./user.js', {
 *   key: 'userCtrl'
 *   group: 'controllers',
 *   localname: 'user'
 * })
 * ```
 *
 * @param  {String} filePath path to js file
 * @param  {Object} options  exposing options. See **options** below
 * @return {Object}          tree
 */
Wiretree.prototype.load = function (filePath, options) {
  // check arguments
  let opts = options || {}
  if (!filePath || typeof filePath !== 'string') {
    throw new Error('Bad filePath: ' + filePath)
  }
  opts.filePath = path.resolve(this.rootPath, filePath)
  // check if file exists
  if (!fs.existsSync(filePath)) {
    throw new Error('File not exists: ' + filePath)
  }
  new Plugin(opts, this)
  // return dependencies
  return this
}

/**
 * Load every javascript file in `folderPath`.
 *
 * *Options*:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`transform`** *Function*: get keyname passed as argument and return new keyname
 * - **`prefix`** *String*: add prefix to keyname
 * - **`suffix`** *String*: add suffix to keyname
 * - **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
 * - **`processing`** *Function*: processing function module
 *
 * Example: load all javascript files in 'controllers' folder into 'controllers' group and expose them in main tree with 'Ctrl' suffix
 *
 * ```js
 * tree.load('./controllers', {
 *     group: 'controllers',
 *     suffix: 'Ctrl'
 * })
 * ```
 *
 * @param  {String} folderPath   path to folder
 * @param {Object} options All options are optional. See options below
 * @return {Object} tree
 */
Wiretree.prototype.folder = function (folderPath, options) {
  let self = this,
      opts = options || {}
  // check arguments
  if (typeof folderPath !== 'string') {
    throw new Error('Bad argument: folderPath')
  }
  if (options && typeof options !== 'object') {
    throw new Error('Bad argument: options')
  }
  if (opts.prefix && typeof opts.prefix !== 'string') {
    throw new Error('Bad argument: options.prefix')
  }
  if (opts.suffix && typeof opts.suffix !== 'string') {
    throw new Error('Bad argument: options.suffix')
  }
  if (opts.group && typeof opts.group !== 'string') {
    throw new Error('Bad argument: options.group')
  }
  // set options to process names
  folderPath = path.resolve(folderPath)
  opts.group = opts.group || false
  opts.prefix = opts.prefix || ''
  opts.suffix = opts.suffix || ''
  opts.transform = opts.transform || function (text) {
    return text
  }
  // check if folderPath is a folder
  if (!fs.existsSync(folderPath) || !fs.lstatSync(folderPath).isDirectory()) {
    return this
  }
  // get files
  let files = fs.readdirSync(folderPath)
  files.forEach(function (file) {
    // ignore folders
    if (fs.lstatSync(path.resolve(folderPath, file)).isDirectory()) {
      return
    }
    // ignore hidden files
    if (file[0] === '.') {
      return
    }
    // process names
    let fileArgs = getNames(folderPath, file, copyObj(opts))
    // load file/plugin
    return self.load.call(self, fileArgs.filePath, fileArgs)
  })
  return this
}

/*!
 * Get an list with all plugin and group names in tree
 * @param  {Object} plugins tree.plugins
 * @return {Array}         list of all plugins in tree
 */
const getPluginsList = function (plugins, groups) {
  let result = [],
      i
  for (i in plugins) {
    result.push(i)
  }
  for (i in groups) {
    result.push(i)
  }
  return result
}

const resolver = function (list, tree, callback) {
  if (!list.length) {
    return callback()
  }
  let el = list.shift()
  if (tree.plugins[el]) {
    if (tree.plugins[el].hasResolvedDependencies()) {
      return tree.plugins[el].resolve(function () {
        resolver(list, tree, callback)
      })
    }
  } else if (tree.groups[el]) {
    if (tree.groups[el].hasResolvedDependencies()) {
      return tree.groups[el].resolve(function () {
        resolver(list, tree, callback)
      })
    }
  }
  list.push(el)
  resolver(list, tree, callback)
}

/**
 * Resolve all plugins and launch callback
 *
 * Example:
 * ```js
 * tree
 * .folder('./my_folder')
 * .resolve(function () {
 *   console.log('App is running!')
 * })
 * ```
 *
 * @param  {Function} callback to do after resolve tree
 */
Wiretree.prototype.resolve = function (callback) {
  let plugins = this.plugins,
      groups = this.groups,
      self = this
  // prevent error when callback is not defined
  callback = callback || function () {}
  // add set resolved before callback
  let cb = function () {
    self.resolved = true
    callback()
  }

  // get all plugin names
  let list = getPluginsList(plugins, groups)
  // Detect if any plugin has a irresolvable dependency
  let missingDependencies = findMissingDependencies(this)
  if (missingDependencies) {
    throw new Error('Can\'t find tree dependencies: ' + missingDependencies.join(', '))
  }
  // Set dependants for circular dependencies detection
  list.forEach(function (name) {
    if (plugins[name]) {
      plugins[name].setDependants()
    } else if (groups[name]) {
      groups[name].setDependants()
    }
  })
  resolver(list, this, cb)
}

/**
 * Get a resolved plugin
 *
 * Example:
 *
 * ```js
 * let thisPlugin = tree.get('myPluginName')
 * ```
 * @param  {String} plugin name of the plugin
 * @return {*}        resolved plugin
 */
Wiretree.prototype.get = function (plugin) {
  if (this.resolved !== true) {
    throw new Error('tree not resolved. Resolve tree before get any plugin')
  }
  if (!this.plugins[plugin]) {
    throw new Error('plugin `' + plugin + '` not exists')
  }
  return this.plugins[plugin].res
}

// expose wiretree
module.exports = Wiretree
