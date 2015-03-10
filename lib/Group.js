'use strict';

//   ---   PRIVATE METHODS   ---
var counter = require('./counter.js');

/*!
 * Get the plugin names of a group
 * @param  {Object} tree wiretree.plugins
 * @param  {String} key name of the group
 * @return {Array}      names of modules
 */
var getGroupKeys = function (plugins) {
	var i, names = [];
	for (i in plugins) {
		names.push( i );
	}
	return names;
};


//   ---   GROUP CONSTRUCTOR   ---
var Group = function (groupName) {
	this.key = groupName;
	this.resolved = false;
	this.plugins = {};
	this.result = {};
};

Group.prototype.resolve = function (parentDeps, callback) {
	var plugNames = getGroupKeys( this.plugins ),
		self = this;
	// pass if group is already resolved
	if (this.resolved) { return callback();}

	var count = counter( plugNames.length, function () {
		var i;
		for (i in self.plugins) {
			self.result[i] = self.plugins[i].res;
		}
		callback();
	});
	// detect circular dependencies
	var circularError = parentDeps[ parentDeps.indexOf( this.key ) ] || false;
	if (circularError) {
		throw new Error( 'Circular dependencies: ' + circularError + ' from ' + this.key );
	}

	// resolve all dependencies in the group
	plugNames.forEach( function (pluginName) {
		// get a copy of parent dependencies list and add this pluginName
		self.plugins[pluginName].resolve( parentDeps.slice(0), count );
	});
};

module.exports = Group;
