'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');
var tree = new Wiretree();

describe( 'Wiretree constructor', function () {

	it( 'return an object with 3 objects and 5 methods', function () {
		expect( tree ).to.be.a('object');
		expect( tree.plugins ).to.be.a('object');
		expect( tree.groups ).to.be.a('object');
		expect( tree.root ).to.be.a('string');
		expect( tree.add ).to.be.a('function');
		expect( tree.load ).to.be.a('function');
	});

	it( 'Wiretree.options.root is "." by default', function () {
		expect( tree.root ).to.equal('.');
	});
});
