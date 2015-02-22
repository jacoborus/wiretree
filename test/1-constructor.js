'use strict';

var expect = require('chai').expect,
	util = require('util'),
	Wiretree = require('..');


describe( 'Wiretree constructor', function () {

	it( 'accepts root path as argument', function () {
		var tree = new Wiretree( './hello' );
		expect( tree.rootPath ).to.equal( './hello' );
	});

	it( 'set root path as "." by default', function () {
		var tree = new Wiretree();
		expect( tree.rootPath ).to.equal( '.' );
	});
});