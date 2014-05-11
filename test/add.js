'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');




describe( 'Wiretree#add', function () {
	var tree = new Wiretree();

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


	it( 'return key of module added', function () {
		var pluginPut = tree.add( 1, 'a' );
		expect( pluginPut ).to.be.a( 'object' );
	});

	it( 'adds a module to tree.plugins', function () {
		expect( tree.plugins.a.key ).to.equal( 'a' );
	});

	it( 'adds a module to tree.groups', function () {
		tree.add( 'javascript', 'b', 'codes' );
		expect( tree.groups.codes['b'].key ).to.equal( 'b' );
	});

	it( 'adds a plugin to tree.plugins', function () {
		tree.add({wiretree: function (a) {
			return a;
		}}, 'z');
		expect( tree.plugins.z.key ).to.equal( 'z' );
	});

	it( 'sets the group into the plugin', function () {
		tree.add( pluginDeps, 'e', 'codes' );
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});
});
