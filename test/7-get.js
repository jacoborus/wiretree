'use strict';

var expect = require('chai').expect,
	util = require('util');


describe( 'Wiretree#get', function () {
	var Wiretree = require('..');

	it( 'throw error when not resolved tree', function (done) {
		var tree = new Wiretree();
		tree
		.add( 'uno', 1 )
		.then( function () {
			expect( function () {
				tree.get( 'uno' );
			}).to.throw( 'tree not resolved. Resolve tree before get any plugin');
			done();
		});
	});
	it( 'throw error when not plugin not exists', function (done) {
		var tree = new Wiretree();
		tree
		.add( 'uno', 1 )
		.resolve( function () {
			expect( function () {
				tree.get( 'dos' );
			}).to.throw( 'plugin `dos` not exists');
			done();
		});
	});
	it( 'gets plugins when tree is resolved', function (done) {
		var tree = new Wiretree();
		tree
		.add( 'uno', 1 )
		.resolve( function () {
			expect( tree.get( 'uno' )).to.equal( 1 );
			done();
		});
	});
});

