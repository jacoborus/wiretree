'use strict';

var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
// get argument function names
var getParamNames = function (func) {
	var fnStr = func.toString().replace( STRIP_COMMENTS, '' );
	return fnStr.slice( fnStr.indexOf( '(' ) + 1, fnStr.indexOf( ')' )).match(/([^\s,]+)/g) || [];
};

var capitaliseFirstLetter = function (string) {
	return string.charAt(0).toUpperCase() + string.slice(1);
};

var startsWithNumber = function (text) {
	return text[0] === '0' || Number( text[0] );
};


/*!
 * Detect if any plugin has an irresolvable dependency
 * @param  {Object} tree target tree
 * @return {Array}      list of missing dependencies
 */
var findMissingDependencies = function (tree) {
	var plugs = tree.plugins,
		obj = {},
		dependencies = [],
		i;

	// get an array with dependency names from all plugins
	for (i in plugs) {
		plugs[i].dependencies.forEach( function (name) {
			obj[name] = true;
		});
	}
	for (i in obj) {
		dependencies.push( i );
	}

	// search irresolvable plugins
	var missingDependencies = [];
	dependencies.forEach( function (el) {
		if (!tree.plugins[el]) {
			if (!tree.groups[el]) {
				missingDependencies.push( el );
			}
		}
	});
	if (missingDependencies.length && (missingDependencies.length > 1 || missingDependencies[0] !== 'wtDone')) {
		var index = missingDependencies.indexOf('wtDone');
		if (index > -1) {
		    missingDependencies.splice(index, 1);
		}
		return missingDependencies;
	}
	return false;
};

/*!
 * Create a counter and return count function
 * @param  {Number}   limit    allowed iterations
 * @param  {Function} callback will be launched when returned function invoked *limit* times
 * @return {Function}            counter
 */
var newCounter = function (limit, callback) {
	var count = 0;
	return function (err) {
		if (err) {return callback( err );}
		if (++count === limit) {
			callback();
		}
	};
};


module.exports = {
	getParamNames: getParamNames,
	capitaliseFirstLetter: capitaliseFirstLetter,
	startsWithNumber: startsWithNumber,
	findMissingDependencies: findMissingDependencies,
	newCounter: newCounter
};
