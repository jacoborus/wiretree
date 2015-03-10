'use strict';


/*!
 * Create a counter and return next function
 * @param  {Number}   limit    allowed iterations
 * @param  {Function} callback will be launched when returned function invoked *limit* times
 * @return {Function}            next function
 */
module.exports = function (limit, callback) {
	var count = 0;
	return function (err) {
		if (err) {return callback( err );}
		if (++count === limit) {
			callback();
		}
	};
};
