'use strict';

//   ---   GROUP CONSTRUCTOR   ---
var Group = function (groupName, tree) {
	this.key = groupName;
	this.resolved = false;
	this.dependants = [];
	this.plugins = {};
	this.result = {};
	this.tree = tree;
};

Group.prototype.resolve = function (callback) {
	var i;
	for (i in this.plugins) {
		this.result[i] = this.plugins[i].res;
	}
	this.resolved = true;
	callback();
};



Group.prototype.hasResolvedDependencies = function () {
	if (this.resolved) {
		return true;
	}
	var i, dep;
	for (i in this.plugins) {
		dep = this.plugins[i];
		if (dep) {
			if (!dep.resolved) {
				return false;
			}
		}
	}
	return true;
};


Group.prototype.setDependants = function (key) {
	if (key) {
		this.dependants.push( key );
	} else {
		key = this.key;
	}
	var i;
	for (i in this.plugins) {
		if (this.plugins[ i ]) {
			return this.plugins[ i ].setDependants( key );
		}
		throw new Error( 'missing dependencies: ' + key );
	}
};


module.exports = Group;
