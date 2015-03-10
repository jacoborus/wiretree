'use strict';

// dependencies

var tools = require('./tools'),
	path = require('path'),
	fs = require('fs'),
	Plugin = require('./Plugin.js');


var copyObj = function (obj) {
	var res = {}, i;
	for (i in obj) {
		res[i] = obj[i];
	}
	return res;
};

/*!
 * get options to load files from folder
 * @param  {String} route path to file
 * @param  {String} file  filename with extension
 * @param  {Object} opts  prefix, suffix, and group
 * @return {Array}       Arguments ready to go
 * @api private
 */
var getNames = function (route, file, opts) {
	var filePath = path.join( route, file ),
		// name without extension
		fileName = path.basename( file, path.extname( file )),
		name;

	opts.localname = fileName;
	fileName = opts.transform( fileName );
	name = fileName;
	if (opts.prefix) {
		name = opts.prefix + tools.capitaliseFirstLetter( name );
	}
	if (opts.suffix) {
		name = name + tools.capitaliseFirstLetter( opts.suffix );
	}
	return { group: opts.group, localname: opts.localname, filePath: filePath, key: name };
};



// Wiretree

/**
 * Wiretree constructor
 * Creates new tree
 *
 * Example:
 *
 * ```javascript
 * var Wiretree = require('wiretree');
 * var tree = new Wiretree( 'path/to/rootFolder');
 * ```
 *
 * @param  {String} folderPath path to root folder
 */

var Wiretree = function (rootPath) {
	// public properties
	this.plugins = {};
	this.mainTree = {};
	this.groups = {};
	if (rootPath) {
		if (typeof rootPath !== 'string') {
			throw new Error( 'Invalid rootPath parameter creating tree' );
		}
		this.rootPath = rootPath;
	} else {
		// no argument passed
		this.rootPath = '.';
	}
};



/**
 * Executes a function and then return the tree
 * @param  {Function} fn function
 * @return {Object} tree
 */
Wiretree.prototype.then = function (fn) {
	fn();
	return this;
};



/**
 * Add a module or wiretree plugin into the tree.
 * Returns tree object
 *
 * All options are optional:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`localname`** *Function*: keyname into its group. Only works when group is passed
 * - **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
 *
 *
 * **Example**:
 *
 * ```javascript
 * // Add a simple module
 * var one = function () {
 *     return 1
 * };
 * tree.add( 'one', one );
 *
 *
 * // Add a wiretree plugin (a module with dependencies from tree)
 * var plugin = function (one) { return one() + 2; };
 *
 * tree.add( 'plugin', {wiretree: plugin} );
 * ```
 *
 *
 * Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default
 *
 * ```javascript
 * tree.add( 'homeCtrl', 1, {
 *     group: 'control',
 *     localname: 'home'
 * });
 * ```
 *
 * @param  {String} key   name for the plugin
 * @param  {type} value plugin
 * @param  {String} group (optional) name of group to add the plugin
 * @param {String} localname keyname into the group (is key by default)
 * @return {Object}       tree
 */
Wiretree.prototype.add = function (key, value, options) {
	var opts = options || {};
	opts.key = key;
	opts.raw = value;
	new Plugin( opts, this );
	return this;
};



/**
 * Add a plugin to tree from a file
 * @param  {String} filePath path to js file
 * @param  {Object} options  plugin options
 * @return {Object}          tree
 */
Wiretree.prototype.load = function (filePath, options) {
	// check arguments
	var opts = options || {};
	if (!filePath || typeof filePath !== 'string') {
		throw new Error( 'Bad filePath: ' + filePath );
	}
	opts.filePath = path.resolve( this.rootPath, filePath );
	// check if file exists
	if (!fs.existsSync( filePath )) {
		throw new Error( 'File not exists: ' + filePath );
	}
	new Plugin( opts, this );
	// return dependencies
	return this;
};



/**
 * Load and add every file in the folder `route`.
 *
 * Filename without extension is `key` and `localname` for every file, but prefixes and suffixes can be
 * added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
 * not affects the `localname` in groups.
 *
 * All options are optional:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`transform`** *Function*: convert keyname passed as argument. Must return new keyname
 * - **`prefix`** *String*: add prefix to keyname
 * - **`suffix`** *String*: add suffix to keyname
 * - **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
 *
 * ```javascript
 * tree.folder( './myFolder' );
 * // => ['myMod', 'myPlugin']
 *
 * var options = {
 *     hide: false,
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
Wiretree.prototype.folder = function (folderPath, options) {
	var self = this;
	// check arguments
	if (typeof folderPath !== 'string') {
		throw new Error( 'Bad argument: folderPath' );
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
	folderPath = path.resolve( folderPath );
	opts.group = opts.group || false;
	opts.prefix = opts.prefix || '';
	opts.suffix = opts.suffix || '';
	opts.transform = opts.transform || function (text) {
		return text;
	};

	// check if folderPath is a folder
	if (!fs.existsSync( folderPath ) || !fs.lstatSync( folderPath ).isDirectory()) {
		return this;
	}

	// get files
	var files = fs.readdirSync( folderPath );
	files.forEach( function (file) {
		// ignore folders
		if (fs.lstatSync( path.resolve(folderPath, file)).isDirectory()) {
			return;
		}
		// ignore hidden files
		if (file[0] === '.') {
			return;
		}
		// process names
		var fileArgs = getNames( folderPath, file, copyObj( opts ));
		// load file/plugin
		return self.load.call( self, fileArgs.filePath, fileArgs );
	});
	return this;
};

// return an array with plugin names
var getPluginsList = function (plugins) {
	var result = [],
		i;
	for (i in plugins) {
		result.push( i );
	}
	return result;
};

/**
 * Resolve all plugins and launch callback
 * @param  {Function} callback to do after resolve tree
 */
Wiretree.prototype.resolve = function (callback) {
	var plugins = this.plugins,
		// get all plugin names
		list = getPluginsList( plugins );
	// prevent error when callback is not defined
	callback = callback || function () {};
	// Detect if any plugin has a irresolvable dependency
	var missingDependencies = tools.findMissingDependencies( this );
	if (missingDependencies) {
		throw new Error( 'Can\'t find tree dependencies: ' + missingDependencies.join( ', '));
	}

	var count = tools.newCounter( list.length, callback );
	list.forEach( function (pluginName) {
		plugins[pluginName].resolve( [], count );
	});
};


// expose wiretree
module.exports = Wiretree;
