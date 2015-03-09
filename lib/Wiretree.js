'use strict';

// dependencies

var tools = require('./tools'),
	util = require('util'),
	path = require('path'),
	fs = require('fs');


var getPluginsList = function (tree) {
	var result = [],
		i;
	for (i in tree.plugins) {
		result.push( i );
	}
	return result;
};

var getDependencyNames = function (obj) {
	var list = [],
		i;
	for (i in obj) {
		list.push( i );
	}
	return list;
};


/*!
 * get names to load files
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

// private methods

/*!
 * Create an object and add a plugin if given
 * @param  {String} key      groups name
 * @param  {String} plugname name of plugin to add to group
 * @param  {[type]} plugin   plugin to add
 * @return {Array}          list of keynames of group
 * @api private
 */
var addToGroup = function (key, plugname, plugin) {
	if (!key) {
		return false;
	}
	// create group if not exist
	if (!this.groups[key]) {
		this.groups[key] = {};
	}
	if (plugname && plugin) {
		this.groups[key][plugin.localname] = plugin;
	}
	return key;
};


var isPlugin = function (raw) {
	if (!raw || (typeof raw !== 'object' || raw === null || util.isArray( raw ))) {
		return false;
	}
	if (raw.wiretree) {
		return true;
	}
	return false;
};

var isAsync = function (dependencies) {
	return dependencies.indexOf( 'wtDone' ) ? true : false;
};


var newCounter = function (limit, callback) {
	var count = 0;
	return function (err) {
		if (err) {return callback( err );}
		if (++count === limit) {
			callback();
		}
	};
};


var findBrokenDependencies = function (list, dependencies) {
	var missing = [];
	list.forEach( function (el) {
		if (!dependencies[el]) {
			missing.push( el );
		}
	});
	return missing;
};



var resolver = function (pluginName, parentDeps, callback) {
	var plugin = this.plugins[pluginName],
		self = this;
	// if plugin not exists
	if (!plugin) {return callback( 'Plugin not found: ' + pluginName );}
	// detect circular dependencies
	var circularError = parentDeps[ parentDeps.indexOf( pluginName ) ] || false;
	if (circularError) {
		throw new Error( 'Circular dependencies: ' + circularError );
	}
	// pass if plugin is resolved
	if (plugin.res) { return callback();}
	// resolve plugin with tree dependencies
	if (plugin.dependencies.length === 0) {
		return callback();
	}

	// search irresolvable plugins
	var brokenDependencies = findBrokenDependencies( plugin.dependencies, this.plugins );
	if (brokenDependencies.length) {
		// omit wtDone argument
		if (brokenDependencies.length > 1 || brokenDependencies[0] !== 'wtDone') {
			throw new Error( 'Can\'t find tree dependencies: ' + brokenDependencies.join( ', '));
		}
	}

	var wtDone = function (mod) {
		plugin.res = mod;
		callback();
	};

	var count = newCounter( plugin.dependencies.length, function () {
		var deps = [];
		plugin.dependencies.forEach( function (key) {
			if (key === 'wtDone') {
				return deps.push( wtDone );
			}
			deps.push( self.plugins[key].res );
		});
		if (!plugin.async) {
			plugin.res = plugin.raw.wiretree.apply( {}, deps );
			callback();
		}
	});
	// get a copy of parent dependencies list and add this pluginName
	var sliceList = parentDeps.slice(0);
	sliceList.push( pluginName );
	// resolve dependencies
	plugin.dependencies.forEach( function (key) {
		resolver.call( self, key, sliceList, count );
	});
};


/*!
 * Plugin constructor
 * @param {Object} opts plugin data
 * @param {Object} tree parent tree
 */
var Plugin = function (opts, tree) {
	this.filePath = opts.filePath || false;

	// key
	this.key = opts.key;
	if (typeof this.key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	if (tools.startsWithNumber( this.key )) {
		throw new Error( 'Module name can\'t start with number: ' + this.key );
	}
	// localname
	this.localname = opts.localname || opts.key;
	// check if localname is a string and don't start with number'
	if (opts.localname && (typeof opts.localname !== 'string' || tools.startsWithNumber( opts.localname ))) {
		throw new Error( 'Bad argument: localname' );
	}
	// raw
	this.raw = opts.raw;
	// filepath
	if (opts.filePath && typeof opts.filePath !== 'string') {
		throw new Error( 'Bad argument: filePath' );
	}

	this.isPlugin = isPlugin( this.raw );
	if (this.isPlugin) {
		this.dependencies = tools.getParamNames( this.raw.wiretree );
		this.isAsync = isAsync( this.dependencies );
	} else {
		this.res = this.raw;
		this.dependencies = [];
		this.isAsync = false;
	}
	// check if group is a string and don't start with number'
	if (opts.group && (typeof opts.group !== 'string' || tools.startsWithNumber( opts.group ))) {
		throw new Error( 'Bad argument: group' );
	}
	this.group = addToGroup.call( tree, opts.group, this.key, this );
	if (!opts.hidden) {
		// add plugin to mainTree is not a hidden plugin
		tree.mainTree[this.key] = this;
	}
	tree.plugins[this.key] = this;
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
 * Executes a function
 * @param  {Function} fn function
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
 * Executes a function
 * @param  {Function} fn function
 */
Wiretree.prototype.resolve = function (pluginsList, callback) {
	var self = this,
		list;
	if (typeof pluginsList === 'function') {
		callback = pluginsList;
		list = getPluginsList( this );
	} else if (pluginsList && !util.isArray( pluginsList )) {
		throw new Error('Bad argument: pluginsList');
	} else {
		callback = callback || function () {};
		list = pluginsList || getDependencyNames( this.plugins );
	}

	var count = newCounter( list.length, callback );
	list.forEach( function (pluginName) {
		resolver.call( self, pluginName, [], count );
	});
};


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

	// create group if not exist
	addToGroup.call( this, opts.group );

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
		var fileArgs = getNames(folderPath, file, opts);
		// check if plugin name starts with number
		if (tools.startsWithNumber( fileArgs.key )) {
			throw new Error( 'Module name can\'t start with number: ' + fileArgs.key );
		}
		// load file/plugin
		return self.load.call( self, fileArgs.filePath, fileArgs );
	});
	return this;
};

// expose wiretree
module.exports = Wiretree;
