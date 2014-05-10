'use strict';

var expect = require('chai').expect,
	util = require('util'),
	Wiretree = require('..');


describe( 'Wiretree constructor', function () {

	it( 'accepts root path or options object as argument', function () {
		var tree = new Wiretree( './hello' );
		expect( tree.settings.rootpath ).to.equal( './hello' );
		var _tree = new Wiretree({ rootpath: './hello' });
		expect( _tree.settings.rootpath ).to.equal( './hello' );
	});

	it( 'set root path as "." by default', function () {
		var tree = new Wiretree();
		expect( tree.settings.rootpath ).to.equal( '.' );
	});

	it( 'set exports keyname as "wiretree" by default', function () {
		var tree = new Wiretree();
		expect( tree.settings.keyname ).to.equal( 'wiretree' );
	});

	it( 'set root path from options argument', function () {
		var tree = new Wiretree({ rootpath: './hello' });
		expect( tree.settings.rootpath ).to.equal( './hello' );
	});

	it( 'set exports keyname from options argument', function () {
		var tree = new Wiretree({ keyname: '_tree' });
		expect( tree.settings.keyname ).to.equal( '_tree' );
	});
});