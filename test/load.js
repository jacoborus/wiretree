'use strict';

var expect = require('chai').expect,
	util = require('util');


describe( 'Wiretree#load', function () {
	var Wiretree = require('..');
	var tree = new Wiretree();


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
			tree.load( './test/assets/module.js', 'f', { group: 3 });
		}).to.throw( 'Bad argument: group' );
	});

	it( 'throws errors on bad argument: localname', function () {
		expect( function () {
			tree.load( './test/assets/module.js', 'f', { group: 'hello', localname: 3 });
		}).to.throw( 'Bad argument: localname' );
	});


	it( 'returns the tree', function () {
		expect( tree.load( './test/assets/module.js', 'f' ).plugins ).to.exist;
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['f'].key ).to.equal( 'f' );
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'e', { group: 'codes' });
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});

	it( 'uses localname', function () {
		var pluginAddGroup = tree.load( './test/assets/local.js', 'k', { group: 'codes', localname: 'localname' });
		expect( tree.plugins['k'].group ).to.equal( 'codes' );
		expect( tree.groups.codes.localname.key ).to.equal( 'k' );
	});

	// plugin with depedencies
	tree.load( './test/assets/plugin.js', 'g' );

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['g'].key ).to.equal( 'g' );
		expect( tree.plugins['g'].res ).to.not.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'h', { group: 'codes' });
		expect( tree.plugins['h'].group ).to.equal( 'codes' );
	});
});

