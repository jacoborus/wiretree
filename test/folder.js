
'use strict';

var expect = require('chai').expect,
	util = require('util');

var Wiretree = require('..');



describe( 'Wiretree#folder', function () {
	var tree = new Wiretree();

	var options = {};

	it( 'throws error on bad argument: route', function () {
		expect( function () {
			tree.folder( 1, options);
		}).to.throw( 'Bad argument: route' );
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

	it( 'returns the module names in an array ignoring hidden files', function () {
		expect( tree.folder( './test/assets/folder' )[0]).to.equal( 'addon' );
	});

	it( 'throws error when module name starts with number', function () {
		expect( function () {
			tree.folder( './test/assets/folderError' );
		}).to.throw( 'Module name can\'t start with number: 1error' );
	});

	it( 'ignore folders under loaded folder', function () {
		expect( tree.folder( './test/assets/nestedFolders' ).length).to.equal( 0 );
	});

	it( 'adds the modules to tree.plugins', function (){
		expect( tree.plugins['addon'].key ).to.equal( 'addon' );
	});

	// add folder with options
	tree.folder( './test/assets/folder', {group: 'testgroup', prefix: 'pre', suffix: 'suf'});

	it( 'sets the group into the modules with prefixes and sufixes', function () {
		expect( tree.plugins.preAddonSuf.group ).to.equal( 'testgroup' );
	});

	it( 'create group in tree if not exist', function () {
		expect( tree.groups.testgroup ).to.exist;
	});

	it( 'accepts middleware transformations', function () {
		var transform = function (text) {
			return text + '2';
		};
		tree.folder( './test/assets/folder', {group: 'transforms', transform: transform});
		expect( tree.plugins.addon2.key ).to.equal( 'addon2' );
	});

	it( 'accepts local names in groups', function () {
		expect( tree.plugins.preAddonSuf.localName ).to.equal( 'addon' );
	});
});

