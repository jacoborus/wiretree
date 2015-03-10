
'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');



describe( 'Wiretree#folder', function () {
	var tree = new Wiretree();

	var options = {};
	it( 'throws error on bad argument: folderPath', function () {
		expect( function () {
			tree.folder( 1, options);
		}).to.throw( 'Bad argument: folderPath' );
	});

	it( 'throws error on bad argument: options', function () {
		expect( function () {
			tree.folder( './folder', 2 );
		}).to.throw( 'Bad argument: options' );
	});

	it( 'throws error on bad argument: options.prefix', function () {
		expect( function () {
			tree.folder( './folder', {prefix: 4} );
		}).to.throw( 'Bad argument: options.prefix' );
	});

	it( 'throws error on bad argument: options.suffix', function () {
		expect( function () {
			tree.folder( './folder', {suffix: {}} );
		}).to.throw( 'Bad argument: options.suffix' );
	});

	it( 'throws error on bad argument: group', function () {
		expect( function () {
			tree.folder( './folder', {group:1} );
		}).to.throw( 'Bad argument: options.group' );
	});

	it( 'throws error when module name starts with number', function () {
		expect( function () {
			tree.folder( './test/assets/folderError' );
		}).to.throw( 'Module name can\'t start with number: 1error' );
	});

	tree.folder( './test/assets/folder' );

	it( 'adds the modules to tree.plugins', function (){
		expect( tree.plugins['addon'].key ).to.equal( 'addon' );
	});

	// add folder with options
	var tree2 = new Wiretree();
	tree2.folder( './test/assets/folder', {group: 'testgroup', prefix: 'pre', suffix: 'suf'});

	it( 'sets the group into the modules without prefixes and sufixes', function () {
		expect( tree2.plugins.preAddonSuf.group ).to.equal( 'testgroup' );
	});

	it( 'create group in tree2 if not exist', function () {
		expect( tree2.groups.testgroup ).to.exist;
	});

	it( 'accepts middleware transformations', function () {
		var transform = function (text) {
			return text + 'Test';
		};
		tree2.folder( './test/assets/transform', {group: 'transforms', transform: transform});
		expect( tree2.plugins.trTest.key ).to.equal( 'trTest' );
	});

	it( 'accepts local names in groups', function () {
		expect( tree2.groups.testgroup.plugins.addon.key ).to.equal( 'preAddonSuf' );
	});
});

