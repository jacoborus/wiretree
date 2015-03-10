'use strict';

var counter = require('./counter.js'),
	path = require('path'),
	util = require('util'),
	Group = require('./Group.js');


//   ---   PRIVATE METHODS   ---

// ramdom hash generator
var uniid = function () {
	var s4 = function () {
		return Math.floor((1 + Math.random()) * 0x10000)
		.toString(16)
		.substring(1);
	};
	return s4() + s4() + '-' + s4();
};

// detect if string starts with a number
var startsWithNumber = function (text) {
	return text[0] === '0' || Number( text[0] );
};

// detect if is a wiretree plugin or a module
var isPlugin = function (raw) {
	if (typeof raw !== 'object' || raw === null || util.isArray( raw )) {
		return false;
	}
	if (raw.wiretree) {
		return true;
	}
	return false;
};

// get argument function names
var getParamNames = function (func) {
	var fnStr = func.toString().replace( /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg, '' );
	return fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' )).match(/([^\s,]+)/g) || [];
};



//   ---   PLUGIN CONSTRUCTOR   ---


/*!
 * Plugin constructor
 * @param {Object} opts plugin data
 * @param {Object} tree parent tree
 */
var Plugin = function (opts, tree) {
	var fileName;
	this.tree = tree;
	this.resolved = false;
	// filePath
	this.filePath = opts.filePath || false;
	if (opts.filePath && typeof opts.filePath !== 'string') {
		throw new Error( 'Bad argument: filePath' );
	}
	// name without extension
	if (this.filePath) {
		fileName = path.basename( this.filePath, path.extname( this.filePath ));
	// raw
		this.raw = require( this.filePath );
	} else {
		this.raw = opts.raw;
	}
	// key
	this.key = opts.key || fileName;
	if (typeof this.key !== 'string') {
		throw new Error( 'Bad argument: key' );
	}
	if (startsWithNumber( this.key )) {
		throw new Error( 'Module name can\'t start with number: ' + this.key );
	}
	// localname
	this.localname = opts.localname || opts.key;
	// check if localname is a string and don't start with number'
	if (opts.localname && (typeof opts.localname !== 'string' || startsWithNumber( opts.localname ))) {
		throw new Error( 'Bad argument: localname' );
	}

	this.isPlugin = isPlugin( this.raw );
	if (this.isPlugin) {
		this.dependencies = getParamNames( this.raw.wiretree );
		this.isAsync = this.dependencies.indexOf( 'wtDone' ) >= 0 ? true : false;
	} else {
		this.res = this.raw;
		this.resolved = true;
		this.dependencies = [];
		this.isAsync = false;
	}
	// check if group is a string and don't start with number'
	if (opts.group && (typeof opts.group !== 'string' || startsWithNumber( opts.group ))) {
		throw new Error( 'Bad argument: group' );
	}

	// set group
	if (opts.group) {
		if (opts.hidden) {
			this.hidden = true;
			this.key = this.key + uniid();
		}
		this.group = opts.group;
		// create group if not exist
		tree.groups[this.group] = tree.groups[this.group] || new Group( this.group );
		// add plugin to group
		tree.groups[this.group].plugins[this.localname] = this;
	}

	tree.plugins[this.key] = this;
};

/*!
 * Resolve plugin and its dependencies
 * @param  {Array}   parentDeps list with previous resolved dependencies
 * @param  {Function} callback   to do after resolve plugin
 */
Plugin.prototype.resolve = function (parentDeps, callback) {
	var self = this;
	// detect circular dependencies
	var circularError = parentDeps[ parentDeps.indexOf( this.key ) ] || false;
	if (circularError) {
		throw new Error( 'Circular dependencies: ' + circularError + ' from ' + this.key );
	}
	// pass if plugin is  already resolved
	if (this.resolved) { return callback();}
	// resolve plugin without tree dependencies
	if (this.dependencies.length === 0) {
		this.res = this.raw.wiretree();
		this.resolved = true;
		return callback();
	}
	// async plugin declaration
	var wtDone = function (mod) {
		self.res = mod;
		self.resolved = true;
		callback();
	};

	var count = counter( self.dependencies.length, function () {
		var deps = [];
		self.dependencies.forEach( function (key) {
			if (key === 'wtDone') {
				return deps.push( wtDone );
			}
			if (self.tree.plugins[key]) {
				deps.push( self.tree.plugins[key].res );
			} else {
				deps.push( self.tree.groups[key].result );
			}
		});
		if (!self.isAsync) {
			self.res = self.raw.wiretree.apply( {}, deps );
			self.resolved = true;
			return callback();
		}
		self.raw.wiretree.apply( {}, deps );
	});

	// get a copy of parent dependencies list and add this pluginName
	var sliceList = parentDeps.slice(0);
	sliceList.push( this.key );

	// resolve dependencies
	this.dependencies.forEach( function (key) {
		if (key === 'wtDone') {
			return count();
		}
		if (self.tree.groups[key]) {
			return self.tree.groups[key].resolve( sliceList, count );
		}
		self.tree.plugins[key].resolve( sliceList, count );
	});
};

module.exports = Plugin;
