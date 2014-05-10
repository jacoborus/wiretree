
'use strict';

var expect = require('chai').expect,
	util = require('util');

describe( 'Wiretree#get', function () {

	var Wiretree = require('..');
	var tree = new Wiretree();

	it( 'throws error on bad argument: key', function () {
		expect( function () {
			tree.get( {} );
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throws error when module not exist', function () {
		expect( function () {
			tree.get( 'notExist' );
		}).to.throw( 'Module not exist: notExist' );
	});


	it( 'can resolve groups', function () {
		tree.add( 'apple', 'apple', 'fruits' );
		var salad = function (apple) {
			return 'orange and ' + apple + ' are fruits';
		};
		tree.add( {wiretree: salad}, 'salad', 'fruits');
		var fruits = tree.get('fruits');
		expect( fruits.salad ).equal( 'orange and apple are fruits' );
	});

	it( 'throw error on circular dependencies after "Maximum call stack size exceeded"', function () {
		var one = function (two) {
			return two + 5;
		};
		var two = function (one) {
			return one + 2;
		};
		tree.add( {wiretree: one}, 'one' );
		tree.add( {wiretree: two}, 'two' );
		expect( function () {
			tree.get( 'one' );
		}).to.throw( 'Circular dependencies: one' );
	});

	it( 'dont throw error when more than a plugin in the same branch requires the same module"', function () {
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
		tree.add( hello, 'hello' );
		tree.add( {wiretree: one}, 'one' );
		tree.add( {wiretree: two}, 'two' );
		tree.add( {wiretree: t}, 't' );
		var t2 = tree.get( 't' );
		expect( t2 ).to.equal( 'hellohellohello' );
	});
});