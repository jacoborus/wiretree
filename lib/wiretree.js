'use strict';

// dependencies

var path = require('path'),
	fs = require('fs'),
	tools = require('./tools');


// private methods

/*
 * Create an object and add a plugin if given
 * @param  {String} key      groups name
 * @param  {String} plugname name of plugin to add to group
 * @param  {[type]} plugin   plugin to add
 * @return {Array}          list of keynames of group
 * @private
 */

var addToGroup = function (key, plugname, plugin) {
	if (!key) {
		return false;
	} else {
		if (!this.groups[key]) {
			this.groups[key] = {};
		}
		if (plugname && plugin) {
			this.groups[key][plugname] = plugin;
		}
		return key;
	}
};

/*
 * Return a rendered plugin
 * @param  {String} key   name of plugin to @preserve
 * @return {Object}       rendered plugin
 */

var getGroup = function (key) {
	var group = {},
		plugNames = tools.namesGroup( this.plugins, key ),
		i;
	// list all dependencies in the group
	for (i in plugNames){
		group[plugNames[i]] =  this.get( plugNames[i] );
	}
	return group;
};

/*
 * get names to load files
 * @param  {String} route path to file
 * @param  {String} file  filename with extension
 * @param  {Object} opts  prefix, suffix, and group
 * @return {Array}       Arguments ready to go
 */
var getNames = function (route, file, opts) {
	var filePath = path.join( route, file );
	// name without extension
	var fileName = path.basename( file, path.extname( file ));
	var name = fileName;
	opts.localName = fileName;
	if (opts.prefix) {
		name = opts.prefix + tools.capitaliseFirstLetter( name );
	}
	if (opts.suffix) {
		name = name + tools.capitaliseFirstLetter( opts.suffix );
	}
	return [filePath, name, opts.group, opts.localName];
};



// Wiretree

/**
 * Wiretree constructor
 * Creates new tree using `root` as path to resolve dependencies
 *
 * Example:
 *
 * ```js
 * var Wiretree = require('wiretree');
 * var tree = new Wiretree( 'path/to/rootFolder');
 * ```
 *
 * @param  {String} root path to folder
 */

var wiretree = function (root) {
	// public properties
	this.plugins = {};
	this.groups = {};
	this.root = root || '.';
};



/**
 * Get module or group of modules `key`.
 * This method will render all required wiretree plugins into modules
 *
 * ```js
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

wiretree.prototype.get = function (key) {
	return _get.call( this, key, [] );
};

var _get = function (key, listKeys) {
	// check arguments
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	// search for circular dependencies
	if (tools.circularDeps( key, listKeys )) {
		throw new Error( 'Circular dependencies' );
	}
	// get plugin
	var plugin = this.plugins[ key ],
		deps = [], i;
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
	if (typeof plugin.res !== 'undefined' && plugin.res !== null) {
		return plugin.res;
	// if plugin has to be rendered
	} else {
		// add this dependency to listKeys
		listKeys.push( key );
		// get dependencies
		for (i = 0; i < plugin.dependencies.length; i++) {
			deps[i] = _get.call( this, plugin.dependencies[ i ], listKeys );
		}
		plugin.res = plugin.raw.apply( {}, deps );
	}
	if (plugin.group) {
		addToGroup.call( this, plugin.group, plugin.localName, plugin );
	}
	return plugin.res;
}


/**
 * Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
 * Returns a list of module dependencies in an `array`.
 *
 * **Example**:
 *
 * ```js
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
 * ```js
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
 * @return {Array}       list of dependencies names
 */

wiretree.prototype.add = function (value, key, group, localName) {
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
	plugin.localName = localName || false;
	// resolve if it is not a plugin with dependencies
	// check if value is an object and if it has wiretree property
	if (tools.isObject( value ) && value.wiretree) {
		plugin.raw = value.wiretree;
		plugin.dependencies = tools.getParamNames( plugin.raw );
		plugin.group = group || false;
	} else {
		plugin.raw = value;
		plugin.res = value;
		plugin.dependencies = [];
		plugin.group = addToGroup.call( this, group, key, plugin );
	}
	// return dependencies
	return plugin.dependencies;
};



/**
 * Load a module or wiretree plugin from `route` in disk and add it into the tree. Wiretree plugins won't be resolved until you get them.
 * Returns a list of module dependencies in an `array`.
 *
 * **Example**:
 *
 * **`module`**.js:
 * ```js
 * module.exports = function () {
 *     return 2;
 * };
 * ```

 * **`plugin`**.js:
 * ```js
 * module.exports.wiretree = function (mod) {
 *     return mod + 2;
 * };
 * ```
 *
 * **`index.js`**:
 * ```js
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
 * ```js
 * tree.load( './module.js', 'homeCtrl', 'control', 'home');
 * tree.get( 'homeCtrl' );
 * // => 1
 *
 * var control = tree.get( 'control' );
 * return control.home;
 * // => 1
 * ```
 *
 * @param  {String} key   name for the plugin
 * @param  {String} route path to plugin
 * @param  {String} group (optional) name of group to add the plugin
 * @param {String} localName keyname into the group (is key by default)
 * @return {Array}       list of dependencies names
 */

wiretree.prototype.load = function (route, key, group, localName) {
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
	// add plugin to wiretree
	this.plugins[key] = {};
	var plugin = this.plugins[key];
	plugin.key = key;
	var data = require( path.resolve( this.root, route ));
	plugin.localName = localName || false;
	// resolve if it is not a function
	if (tools.isObject( data ) && data.wiretree) {
		plugin.raw = data.wiretree;
		plugin.dependencies = tools.getParamNames( plugin.raw );
		plugin.group = group || false;
	} else {
		plugin.res = data;
		plugin.dependencies = [];
		plugin.group = addToGroup.call( this, group, key, plugin );
	}
	// return dependencies
	return plugin;
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
 * ```js
 * tree.folder( './myFolder' );
 * // => ['myMod', 'myPlugin']
 *
 * var options = {
 *     group: 'myGroup',
 *     prefix: 'pre',
 *     suffix: 'Ctrl'
 * }
 *
 * tree.folder( './myFolder', options);
 * // => ['preMyModCtrl', 'preMyPluginCtrl']
 *
 * tree.get( 'myGroup');
 * // => {myMod: [object Function], myPlugin: [object Function]}
 * ```
 *
 * @param  {String} route   path to folder
 * @param  {Object} options
 * @return {Array} list of keys of modules added
 */

wiretree.prototype.folder = function (route, options) {
	var self = this,
		keys = [];
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

	// check if route is a folder
	if ( !fs.existsSync( route ) || !fs.lstatSync( route ).isDirectory()) {
		throw new Error('Can\'t resolve folder: ' + route);
	}

	// get files
	var files = fs.readdirSync( route );
	files.forEach( function (file) {
		// don't read folders
		if(fs.lstatSync( path.resolve(route, file)).isDirectory()) {
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
		keys.push( plugin.key );
	});
	return keys;
};



/**
 * Render all not rendered modules
 * @return {Number} direct resolved dependencies
 */
wiretree.prototype.wireUp = function (num) {
	var i, n = num || 1;
	var deps = tools.toResolve( this.plugins );
	var cual;
	if (deps.length > 0) {
		cual = deps.shift();
		i = this.get( cual );
		this.wireUp( n+1 );
	} else {
		return n;
	}
};



// expose wiretree
module.exports = wiretree;
