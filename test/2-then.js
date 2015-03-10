'use strict';

var expect = require('chai').expect,
	util = require('util');


describe( 'Wiretree#then', function () {
	var Wiretree = require('..');
	var tree = new Wiretree();

	it( 'call the function', function (done) {
		var i = 0;
		tree.then( function () {
			i++;
			done();
		});
		expect( i ).to.equal( 1 );
	});
});

