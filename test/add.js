'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');
var tree = new Wiretree();




describe( 'Wiretree#add', function () {

	var plugin = function (){
		return 'I\'m a module';
	};

	var pluginDeps = {
		wiretree: function (one, two) {
			return one + two;
		}
	};

	it( 'throws error when key starts with number', function () {
		expect( function () {
			tree.add( plugin, '1error' );
		}).to.throw( 'Module name can\'t start with number: 1error' );
	});

	it( 'throws errors on bad argument: key', function () {
		expect( function () {
			tree.add( plugin, {} );
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throws errors on bad argument: group', function () {
		expect( function () {
			tree.add( plugin, 'd', 3 );
		}).to.throw( 'Bad argument: group' );
	});

	it( 'throws errors on bad argument: localName', function () {
		expect( function () {
			tree.add( plugin, 'd', 'collection', 3 );
		}).to.throw( 'Bad argument: localName' );
	});


	it( 'returns dependencies of module added []', function () {
		var pluginPut = tree.add( 1, 'a' );
		expect( util.isArray( pluginPut )).to.equal( true );
		expect( pluginPut.length ).to.equal( 0 );
	});

	it( 'adds a module to tree.plugins', function () {
		expect( tree.plugins.a.key ).to.equal( 'a' );
		expect( tree.plugins.a.raw ).to.equal( 1 );
		expect( tree.plugins.a.res ).to.equal( 1 );
	});

	it( 'adds a module to tree.groups', function () {
		tree.add( 'javascript', 'b', 'codes' );
		expect( tree.groups.codes['b'].res ).to.equal( 'javascript' );
	});

	// wiretree plugin
	it( 'returns the plugin dependencies names in an array', function () {
		expect( tree.add( pluginDeps, 'd' )[0]).to.equal( 'one' );
	});

	it( 'adds a plugin to tree.plugins', function () {
		expect( tree.plugins.d.key ).to.equal( 'd' );
		expect( tree.plugins.d.raw ).to.equal( pluginDeps.wiretree );
		expect( tree.plugins.d.res ).to.not.exist;
	});

	it( 'sets the group into the plugin', function () {
		tree.add( pluginDeps, 'e', 'codes' );
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});
});
