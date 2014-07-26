'use strict';

// dependencies

var path = require('path'),
	fs = require('fs'),
	tools = require('./tools'),
	// private methods
	addToGroup, getGroup, getNames, resolver, _get;

/*!
 * Create an object and add a plugin if given
 * @param  {String} key      groups name
 * @param  {String} plugname name of plugin to add to group
 * @param  {[type]} plugin   plugin to add
 * @return {Array}          list of keynames of group
 * @api private
 */

addToGroup = function (key, plugname, plugin) {
	if (!key) {
		return false;
	} else {
		// create group if not exist
		if (!this.groups[key]) {
			this.groups[key] = {};
		}
		if (plugname && plugin) {
			this.groups[key][plugin.localName] = plugin;
		}
		return key;
	}
};

/*!
 * Return a rendered plugin
 * @param  {String} key   name of plugin to @preserve
 * @return {Object}       rendered plugin
 * @api private
 */

getGroup = function (key) {
	var group = {},
		plugNames = tools.namesGroup( this.plugins, key ),
		i;
	// list all dependencies in the group
	for (i in plugNames) {
		group[this.plugins[ plugNames[i]].localName ] =  this.get(plugNames[i] );
	}
	return group;
};

/*!
 * get names to load files
 * @param  {String} route path to file
 * @param  {String} file  filename with extension
 * @param  {Object} opts  prefix, suffix, and group
 * @return {Array}       Arguments ready to go
 * @api private
 */
getNames = function (route, file, opts) {
	var filePath = path.join( route, file ),
		// name without extension
		fileName = path.basename( file, path.extname( file )),
		name;

	opts.localName = fileName;
	fileName = opts.transform( fileName );
	name = fileName;
	if (opts.prefix) {
		name = opts.prefix + tools.capitaliseFirstLetter( name );
	}
	if (opts.suffix) {
		name = name + tools.capitaliseFirstLetter( opts.suffix );
	}
	return [filePath, name, opts.group, opts.localName];
};


_get = function (key, listKeys) {
	var circularError, sliceList, res;
	// check arguments
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	// search for circular dependencies
	circularError = tools.circularDeps( key, listKeys );
	if (circularError) {
		throw new Error( 'Circular dependencies: ' + circularError );
	}
	// get plugin
	var plugin = this.plugins[ key ];

	// check if plugin exists
	if (!plugin) {
		// check if is a group
		if (this.groups[key]) {
			return getGroup.call( this, key );
		} else {
			throw new Error( 'Module not exist: ' + key );
		}
	}
	// if already served or ready to serve
	if (typeof plugin.res === 'undefined') {
		// add this dependency to listKeys
		sliceList = listKeys.slice(0);
		sliceList.push( key );
		res = resolver.call( this, plugin, sliceList );
	} else {
		res = plugin.res;
	}
	return res;
};


resolver = function (plugin, sliceList) {
	var deps = [],
		data, i;

	data = plugin.route ? require( plugin.route ) : plugin.raw;

	if (!tools.isObject( data ) || !data[this.settings.keyname]) {
		plugin.res = data;
		plugin.dependencies = [];
	} else {
		plugin.raw = data[this.settings.keyname];
		plugin.dependencies = tools.getParamNames( plugin.raw );

		for (i = 0; i < plugin.dependencies.length; i++) {
			deps[i] = _get.call( this, plugin.dependencies[ i ], sliceList );
		}
		plugin.res = plugin.raw.apply( {}, deps );
	}

	return plugin.res;
};



// Wiretree

/**
 * Wiretree constructor
 * Creates new tree with options object.
 *
 * Options:
 * - rootpath: path to resolve dependencies
 * - keyname: name to resolve modules
 *
 * Example:
 *
 * Passing root path as options
 * ```javascript
 * var Wiretree = require('wiretree');
 * var tree = new Wiretree( 'path/to/rootFolder');
 * ```
 *
 * Passing options as argument
 *
 * ```javascript
 * var Wiretree = require('wiretree');
 * var tree = new Wiretree({
 *    rootpath:'path/to/rootFolder',
 *    keyname: '_tree'
 * });
 * ```
 *
 * @param  {String|Object} options path to folder or options object
 */

var Wiretree = function (opts) {
	// public properties
	this.plugins = {};
	this.groups = {};
	if (opts) {
		if (typeof opts === 'string') {
			// argument is root path
			this.settings = {};
			this.settings.rootpath = opts;
			this.settings.keyname = 'wiretree';
		} else if (typeof opts === 'object') {
			// argument is options
			opts.rootpath = opts.rootpath || '.';
			opts.keyname = opts.keyname || 'wiretree';
			this.settings = opts;
		} else {
			throw new Error( 'Invalid options parameter creating tree' );
		}
	} else {
		// no argument passed
		this.settings = {};
		this.settings.rootpath = '.';
		this.settings.keyname = 'wiretree';
	}
};


/**
 * Get module or group of modules `key`.
 * This method will render all required wiretree plugins into modules
 *
 * ```javascript
 * tree.get( 'myModule' );
 * // returns the module myModule
 *
 * // getting myModule throught a group
 * var group = tree.get( 'myGroup' );
 * var myModule = group.myModule;
 * ```
 *
 * @param  {String} key   name of plugin to get
 * @return {Object}       rendered plugin
 */

Wiretree.prototype.get = function (key) {
	return _get.call( this, key, [] );
};


/**
 * Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
 * Returns a list of module dependencies in an `array`.
 *
 * **Example**:
 *
 * ```javascript
 * // Add and get a simple module
 * var addon = 2;
 *
 * tree.add( addon, 'mod' );
 * // => []
 *
 * tree.get( 'mod' );
 * // => 2
 *
 * // Add and get a wiretree plugin (a module with dependencies)
 * var plugin = function (mod) { return mod + 2; };
 *
 * tree.add( {wiretree: plugin}, 'plugin' );
 * // => ['mod']
 *
 * tree.get( 'plugin' );
 * // => 4
 * ```
 *
 * Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default
 *
 * ```javascript
 * tree.add( 1, 'homeCtrl', 'control', 'home');
 * tree.get( 'homeCtrl' );
 * // => 1
 *
 * var control = tree.get( 'control' );
 * return control.home;
 * // => 1
 * ```
 *
 * @param  {String} key   name for the plugin
 * @param  {type} value plugin
 * @param  {String} group (optional) name of group to add the plugin
 * @param {String} localName keyname into the group (is key by default)
 * @return {Object}       tree
 */

Wiretree.prototype.add = function (value, key, group, localName) {
	// check arguments
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	if (tools.startsWithNumber( key )) {
		throw new Error( 'Module name can\'t start with number: ' + key );
	}
	if (group && typeof group !== 'string') {
		throw new Error( 'Bad argument: group' );
	}
	if (localName && typeof localName !== 'string') {
		throw new Error( 'Bad argument: localName' );
	}
	// add plugin to wiretree
	var plugin = this.plugins[key] = {};
	plugin.key = key;
	plugin.raw = value;
	plugin.localName = localName || key;
	plugin.group = addToGroup.call( this, group, key, plugin );
	return this;
};



/**
 * Load a module or wiretree plugin from `route` in disk and add it into the tree.
 *
 * Wiretree.load just checks that the files exist and add it to the tree. Modules and wiretree plugins files won't be loaded and resolved until you get them.
 *
 *
 * **Example**:
 *
 * **`module`**.js:
 * ```javascript
 * module.exports = function () {
 *     return 2;
 * };
 * ```

 * **`plugin`**.js:
 * ```javascript
 * exports.wiretree = function (mod) {
 *     return mod + 2;
 * };
 * ```
 *
 * **`index.js`**:
 * ```javascript
 * tree.load( './module.js', 'mod' );
 * // => []
 *
 * tree.get( 'mod' );
 * // => 2
 *
 * tree.load( './plugin.js', 'plugin' );
 * // => ['mod']
 *
 * tree.get( 'plugin' );
 * // => 4
 * ```
 *
 * Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default
 *
 * ```javascript
 * tree.load( './module.js', 'homeCtrl', 'control', 'home');
 * tree.get( 'homeCtrl' );
 * // => 1
 *
 * var control = tree.get( 'control' );
 * return control.home;
 * // => 1
 * ```
 *
 * @param  {String} route path to plugin
 * @param  {String} key   name for the plugin
 * @param  {String} group (optional) name of group to add the plugin
 * @param {String} localName keyname into the group (is key by default)
 * @return {Object}       tree
 */

Wiretree.prototype.load = function (route, key, group, localName) {
	// check arguments
	if (tools.startsWithNumber( key )) {
		throw new Error( 'Module name can\'t start with number: ' + key );
	}
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	if (typeof route !== 'string') {
		throw new Error( 'Bad argument: route' );
	}
	if (group && typeof group !== 'string') {
		throw new Error( 'Bad argument: group' );
	}
	if (localName && typeof localName !== 'string') {
		throw new Error( 'Bad argument: localName' );
	}
	route = path.resolve( this.settings.rootpath, route );
	// check if file exists
	if (!fs.existsSync( route )) {
		throw new Error( 'File not exists: ' + route );
	}
	// add plugin to wiretree
	this.plugins[key] = {};
	var plugin = this.plugins[key];
	plugin.key = key;
	plugin.route = route;
	plugin.localName = localName || key;
	plugin.group = addToGroup.call( this, group, key, plugin );
	// return dependencies
	return this;
};



/**
 * Load and add every file in the folder `route`.
 *
 * Filename without extension is `key` and `localName` for every file, but prefixes and suffixes can be
 * added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
 * not affects the `localName` in groups.
 *
 * Returns list of `key`s in an `array`
 *
 * ```javascript
 * tree.folder( './myFolder' );
 * // => ['myMod', 'myPlugin']
 *
 * var options = {
 *     group: 'myGroup',
 *     prefix: 'pre',
 *     suffix: 'Ctrl',
 *     transform: function (key) {
 *         return key + 'Test';
 *     }
 * }
 *
 * tree.folder( './myFolder', options);
 * // => ['preMyModTestCtrl', 'preMyPluginTestCtrl']
 *
 * tree.get( 'myGroup');
 * // => {myModTest: [object Function], myPluginTest: [object Function]}
 * ```
 *
 * @param  {String} route   path to folder
 * @param  {Object} options
 * @return {Object} tree
 */

Wiretree.prototype.folder = function (route, options) {
	var self = this;
	// check arguments
	if (typeof route !== 'string') {
		throw new Error( 'Bad argument: route' );
	}
	if (options && typeof options !== 'object') {
		throw new Error( 'Bad argument: options' );
	}
	var opts = options || {};
	if (opts.prefix && typeof opts.prefix !== 'string') {
		throw new Error( 'Bad argument: options.prefix' );
	}
	if (opts.suffix && typeof opts.suffix !== 'string') {
		throw new Error( 'Bad argument: options.suffix' );
	}
	if (opts.group && typeof opts.group !== 'string') {
		throw new Error( 'Bad argument: options.group' );
	}
	// set options to process names
	route = path.resolve( route );
	opts.group = opts.group || false;
	opts.prefix = opts.prefix || '';
	opts.suffix = opts.suffix || '';
	opts.transform = opts.transform || function (text) {
		return text;
	};

	// create group if not exist
	addToGroup.call( this, opts.group );

	// check if route is a folder
	if (!fs.existsSync( route ) || !fs.lstatSync( route ).isDirectory()) {
		throw new Error('Can\'t resolve folder: ' + route);
	}

	// get files
	var files = fs.readdirSync( route );
	files.forEach( function (file) {
		// don't read folders
		if (fs.lstatSync( path.resolve(route, file)).isDirectory()) {
			return;
		}
		// ignore hidden files
		if (file[0] === '.') {
			return;
		}
		// process names
		var fileArgs = getNames(route, file, opts);
		// check if plugin name starts with number
		if (tools.startsWithNumber( fileArgs[0] )) {
			throw new Error( 'Module name can\'t start with number: ' + fileArgs[0] );
		}
		// load file/plugin
		var plugin = self.load.apply( self, fileArgs );
	});
	return this;
};



/**
 * Executes a function
 * @param  {Function} fn function
 */
Wiretree.prototype.exec = function (fn) {
	fn();
};



/*!
 * Render all not rendered modules
 * @return {Number} direct resolved dependencies
 */
Wiretree.prototype.wireUp = function (num) {
	var i, n = num || 1,
	deps = tools.toResolve( this.plugins ),
	cual;
	if (deps.length > 0) {
		cual = deps.shift();
		i = this.get( cual );
		this.wireUp( n + 1 );
	} else {
		return n;
	}
};



// expose wiretree
module.exports = Wiretree;
