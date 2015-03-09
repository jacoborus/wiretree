'use strict';

var expect = require('chai').expect;

var mod = function () {
	return 'I\'m a module';
};

var plugin = {
	wiretree: function (mod) {
		return mod() + ''+ 2;
	}
};


var asyncPlugin = {
	wiretree: function (plugin, wtDone) {
		wtDone( plugin );
	}
};

describe( 'Wiretree#resolve', function () {
	var Wiretree = require('..');

	it( 'throws error on bad argument: key', function () {
		var tree = new Wiretree();
		expect( function () {
			tree.resolve( 5 );
		}).to.throw( 'Bad argument: pluginsList' );
	});


	it( 'throws error on missing dependencies', function (done) {
		var tree = new Wiretree();
		tree
		.add( 'plugin', plugin )
		.then( function () {
			expect( function () {
				tree.resolve();
			}).to.throw( 'Can\'t find tree dependencies: mod' );
			done();
		});
	});


	it( 'send error when passed module not exist', function (done) {
		var tree = new Wiretree();
		tree.resolve( ['notExist'], function (err) {
			expect( err ).to.equal( 'Plugin not found: notExist' );
			done();
		} );
	});


	it( 'resolve all regular tree dependencies before call callback', function (done) {
		var tree = new Wiretree();

		tree
		.add( 'mod', mod )
		.add( 'plugin', plugin )
		.resolve( function () {
			expect( tree.plugins.plugin.res ).to.exist;
			done();
		});
	});


	it( 'resolve all async tree dependencies before call callback', function (done) {
		var tree = new Wiretree();

		tree
		.add( 'mod', mod )
		.add( 'plugin', plugin )
		.add( 'asyncPlugin', asyncPlugin )
		.resolve( function () {
			expect( tree.plugins.plugin.res ).to.exist;
			expect( tree.plugins.asyncPlugin.res ).to.exist;
			done();
		});
	});


	it( 'can resolve groups', function () {
		var tree = new Wiretree();
		var fruits = function (apple, orange) {
			return orange + ' and ' + apple + ' are fruits';
		};
		tree
		.add( 'apple', 'apple', {group: 'salad' })
		.add( 'orange', 'orange', {group: 'salad' })
		.add( 'fruits', { wiretree: fruits }, { group: 'salad' })
		.resolve( function () {
			expect( tree.groups.salad.fruits.res ).equal( 'orange and apple are fruits' );
		});
	});


	it( 'throw error on circular dependencies before "Maximum call stack size exceeded"', function () {
		var tree = new Wiretree();
		var one = function (two) {
			return two + 5;
		};
		var two = function (one) {
			return one + 2;
		};
		tree
		.add( 'one', { wiretree: one })
		.add( 'two', { wiretree: two });
		expect( function () {
			tree.resolve( ['one'] );
		}).to.throw( 'Circular dependencies: one' );
	});


	it( 'dont throw error when more than a plugin in the same branch requires the same module"', function (done) {
		var tree = new Wiretree();
		var hello = function () {
			return 'hello';
		};
		var one = function (hello) {
			return hello();
		};
		var two = function (hello) {
			return hello();
		};
		var t = function (one, two, hello) {
			return hello() + one + two;
		};
		tree
		.add( 'hello', hello )
		.add( 'one', { wiretree: one })
		.add( 'two', { wiretree: two })
		.add( 't', { wiretree: t })
		.then( function () {
			expect( function () {
				tree.resolve();
			}).to.not.throw( Error );
			done();
		});
	});
});

