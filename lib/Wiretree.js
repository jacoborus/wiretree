'use strict';

// dependencies

var path = require('path'),
	fs = require('fs'),
	tools = require('./tools'),
	// private methods
	getGroup, getNames, resolver, _get;


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
	} else {
		// create group if not exist
		if (!this.groups[key]) {
			this.groups[key] = {};
		}
		if (plugname && plugin) {
			this.groups[key][plugin.localname] = plugin;
		}
		return key;
	}
};


/*!
 * Return group with its rendered plugins
 * @param  {String} key   name of plugin to @preserve
 * @return {Object}       rendered plugin
 * @api private
 */
getGroup = function (key) {
	var group = {},
		plugNames = tools.namesGroup( this.plugins, key ),
		self = this;
	// list all dependencies in the group
	plugNames.forEach( function (plug) {
		group[ self.plugins[ plug ].localname ] =  _get.call( self, plug, [], true );
	});
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

	opts.localname = fileName;
	fileName = opts.transform( fileName );
	name = fileName;
	if (opts.prefix) {
		name = opts.prefix + tools.capitaliseFirstLetter( name );
	}
	if (opts.suffix) {
		name = name + tools.capitaliseFirstLetter( opts.suffix );
	}
	return [filePath, name, { group: opts.group, localname: opts.localname }];
};



resolver = function (plugin, sliceList) {
	var deps = [],
		data, self = this;

	data = plugin.route ? require( plugin.route ) : plugin.raw;

	if (!tools.isObject( data ) || !data[this.settings.keyname]) {
		plugin.res = data;
		plugin.dependencies = [];
	} else {
		plugin.raw = data[this.settings.keyname];
		plugin.dependencies = tools.getParamNames( plugin.raw );

		plugin.dependencies.forEach( function (key) {
			deps.push( _get.call( self, key, sliceList ));
		});

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
	this.mainTree = {};
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

_get = function (key, listKeys, noMain) {
	// check arguments
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	// search for circular dependencies
	// check if string is in array
	var circularError = listKeys[ listKeys.indexOf( key ) ] || false;
	if (circularError) {
		throw new Error( 'Circular dependencies: ' + circularError );
	}
	// get plugin
	var plugin = null;
	if (noMain) {
		plugin = this.plugins[ key ];
	} else {
		plugin = this.mainTree[ key ];
	}

	// check if plugin exists
	if (!plugin) {
		// check if is a group
		if (this.groups[key]) {
			return getGroup.call( this, key );
		} else {
			throw new Error( 'Module not exist: ' + key );
		}
	}
	var sliceList;
	// if already served or ready to serve
	if (typeof plugin.res === 'undefined') {
		// add this dependency to listKeys
		sliceList = listKeys.slice(0);
		sliceList.push( key );
		return resolver.call( this, plugin, sliceList );
	}
	return plugin.res;
};

/**
 * Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
 * Returns a list of module dependencies in an `array`.
 *
 * All options are optional:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`localname`** *Function*: keyname into its group. Only works when group is passed
 * - **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
 *
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
 * Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default
 *
 * ```javascript
 * tree.add( 1, 'homeCtrl', {
 *     group: 'control',
 *     localname: 'home'
 * });
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
 * @param {String} localname keyname into the group (is key by default)
 * @return {Object}       tree
 */

Wiretree.prototype.add = function (value, key, options) {
	// check arguments
	if (typeof key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	if (tools.startsWithNumber( key )) {
		throw new Error( 'Module name can\'t start with number: ' + key );
	}
	var opts = options || {};
	if (opts.group && typeof opts.group !== 'string') {
		throw new Error( 'Bad argument: group' );
	}
	if (opts.localname && typeof opts.localname !== 'string') {
		throw new Error( 'Bad argument: localname' );
	}
	var plugin = {};
	if (!opts.hide) {
		// add plugin to wiretree
		this.mainTree[key] = plugin;
	}
	this.plugins[key] = plugin;
	plugin.key = key;
	plugin.raw = value;
	plugin.localname = opts.localname || key;
	plugin.group = addToGroup.call( this, opts.group, key, plugin );
	return this;
};



/**
 * Load a module or wiretree plugin from `route` in disk and add it into the tree.
 *
 * Wiretree.load just checks that the files exist and add it to the tree. Modules and wiretree plugins files won't be loaded and resolved until you get them.
 *
 *
 * All options are optional:
 *
 * - **`group`** *String*: group to add the plugin
 * - **`localname`** *Function*: keyname into its group. Only works when group is passed
 * - **`hide`** *Boolean*: expose only in group, not in tree root. Only works when group is passed
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
 * Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default
 *
 * ```javascript
 * tree.load( './module.js', 'homeCtrl', {
 *     group: 'control',
 *     localname: 'home'
 * });
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
 * @param {String} localname keyname into the group (is key by default)
 * @return {Object}       tree
 */

Wiretree.prototype.load = function (route, key, options) {
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
	var opts = options || {};
	if (opts.group && typeof opts.group !== 'string') {
		throw new Error( 'Bad argument: group' );
	}
	if (opts.localname && typeof opts.localname !== 'string') {
		throw new Error( 'Bad argument: localname' );
	}
	route = path.resolve( this.settings.rootpath, route );
	// check if file exists
	if (!fs.existsSync( route )) {
		throw new Error( 'File not exists: ' + route );
	}
	var plugin = {};
	if (!opts.hide) {
		// add plugin to wiretree
		this.mainTree[key] = plugin;
	}
	this.plugins[key] = plugin;
	plugin.key = key;
	plugin.route = route;
	plugin.localname = opts.localname || key;
	plugin.group = addToGroup.call( this, opts.group, key, plugin );
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
		return this;
	}

	// get files
	var files = fs.readdirSync( route );
	files.forEach( function (file) {
		// ignore folders
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
		return self.load.apply( self, fileArgs );
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



// expose wiretree
module.exports = Wiretree;
