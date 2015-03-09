'use strict';
// private methods

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

module.exports = {
	getParamNames: getParamNames,
	capitaliseFirstLetter: capitaliseFirstLetter,
	startsWithNumber: startsWithNumber
};
