'use strict';
// private methods

var isObject = function (fn) {
	return fn && {}.toString.call( fn ) === '[object Object]';
};

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
var getParamNames = function (func) {
	var fnStr = func.toString().replace( STRIP_COMMENTS, '' ),
		result = fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' )).match(/([^\s,]+)/g);

	return result || [];
};

var capitaliseFirstLetter = function (string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

/*!
 * @param  {Object} tree wiretree.modules
 * @return {Array}      names of not resolved modules
 */
var toResolve = function (tree) {
	var i, modules = [];
	for (i in tree) {
		if (!tree[i].res) {
			modules.push( i );
		}
	}
	return modules;
};

/*!
 * Get the plugin names of a group
 * @param  {Object} tree wiretree.plugins
 * @param  {String} key name of the group
 * @return {Array}      names of modules
 */
var namesGroup = function (tree, key) {
	var i, modules = [];
	for (i in tree) {
		if (tree[i].group === key) {
			modules.push( i );
		}
	}
	return modules;
};

var startsWithNumber = function (text) {
	if (Number( text[0] )) {
		return true;
	}
	return false;
};

module.exports = {
	isObject: isObject,
	getParamNames: getParamNames,
	capitaliseFirstLetter: capitaliseFirstLetter,
	toResolve: toResolve,
	startsWithNumber: startsWithNumber,
	namesGroup: namesGroup
};
