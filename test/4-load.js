'use strict';

var expect = require('chai').expect,
	Wiretree = require('..');


describe( 'Wiretree#load', function () {
	var tree = new Wiretree();

	it( 'throw error on bad argument: key', function () {
		expect( function () {
			tree.load( './test/assets/module.js', { key: 1 });
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throw error on bad argument: filePath', function () {
		expect( function () {
			tree.load( 2 );
		}).to.throw( 'Bad filePath: 2' );
	});

	it( 'throw error on bad argument: group', function () {
		expect( function () {
			tree.load( './test/assets/module.js', { group: 3, key: 'f'});
		}).to.throw( 'Bad argument: group' );
	});

	it( 'throw error on bad argument: localname', function () {
		expect( function () {
			tree.load( './test/assets/module.js', { group: 'hello', localname: 3, key: 'f' });
		}).to.throw( 'Bad argument: localname' );
	});


	it( 'returns the tree', function () {
		expect( tree.load( './test/assets/module.js', {key:'f'} ).plugins ).to.exist;
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['f'].key ).to.equal( 'f' );
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', { key: 'e', group: 'codes' });
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});

	it( 'uses localname', function () {
		var pluginAddGroup = tree.load( './test/assets/local.js', { key: 'k', group: 'codes', localname: 'localname' });
		expect( tree.plugins['k'].group ).to.equal( 'codes' );
		expect( tree.groups.codes.plugins.localname.key ).to.equal( 'k' );
	});

	// plugin with depedencies
	tree.load( './test/assets/plugin.js', {key: 'g'});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['g'].key ).to.equal( 'g' );
		expect( tree.plugins['g'].res ).to.not.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', { key: 'h', group: 'codes' });
		expect( tree.plugins['h'].group ).to.equal( 'codes' );
	});
});

