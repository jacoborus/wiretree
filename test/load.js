'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');
var tree = new Wiretree();




describe( 'Wiretree#load', function () {

	it( 'throws errors on bad argument: key', function () {
		expect( function () {
			tree.load( './test/assets/module.js', {} );
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throws errors on bad argument: route', function () {
		expect( function () {
			tree.load( 2, 'f' );
		}).to.throw( 'Bad argument: route' );
	});

	it( 'throws errors on bad argument: group', function () {
		expect( function () {
			tree.load( './test/assets/module.js', 'f', 3 );
		}).to.throw( 'Bad argument: group' );
	});

	it( 'throws errors on bad argument: localName', function () {
		expect( function () {
			tree.load( './test/assets/module.js', 'f', 'hello', 3 );
		}).to.throw( 'Bad argument: localName' );
	});


	it( 'returns the module schema generated', function () {
		expect( tree.load( './test/assets/module.js', 'f' )['key']).to.equal( 'f' );
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['f'].key ).to.equal( 'f' );
		expect( tree.plugins['f'].res ).to.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'e', 'codes' );
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});


	// plugion with depedencies
	it( 'returns the module schema generated', function () {
		expect( tree.load( './test/assets/plugin.js', 'g' )['key']).to.equal( 'g' );
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['g'].key ).to.equal( 'g' );
		expect( tree.plugins['g'].res ).to.not.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'h', 'codes' );
		expect( tree.plugins['h'].group ).to.equal( 'codes' );
	});

});

