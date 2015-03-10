'use strict';

var expect = require('chai').expect;

var Wiretree = require('..');

var plugin = function () {
	return 'I\'m a module';
};

var pluginDeps = {
	wiretree: function (a, b) {
		return a + b;
	}
};

var asyncPlugin = {
	wiretree: function (a, wtDone) {
		wtDone( function () {
			return a + 2;
		});
	}
};


describe( 'Wiretree#add', function () {

	var tree = new Wiretree();


	it( 'throws error when key starts with number', function () {
		expect( function () {
			tree.add( '1error', plugin );
		}).to.throw( 'Module name can\'t start with number: 1error' );
	});

	it( 'throws errors on bad argument: key', function () {
		expect( function () {
			tree.add( plugin, {} );
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throws errors on bad argument: group', function () {
		expect( function () {
			tree.add( 'd', plugin, { group: 3 });
		}).to.throw( 'Bad argument: group' );

		expect( function () {
			tree.add('groupNumber', 1, {group: '3cuatro'});
		}).to.throw('Bad argument: group');
	});

	it( 'throws errors on bad argument: localname', function () {
		expect( function () {
			tree.add( 'd', plugin, { group: 'collection', localname: 3 });
		}).to.throw( 'Bad argument: localname' );
		expect( function () {
			tree.add( 'd', plugin, { group: 'collection', localname: '3cuatro' });
		}).to.throw( 'Bad argument: localname' );
	});


	it( 'return the tree', function () {
		var pluginPut = tree.add( 'a', 1 );
		expect( pluginPut ).to.be.a( 'object' );
	});

	it( 'adds a module to tree.plugins', function () {
		expect( tree.plugins.a.key ).to.equal( 'a' );
	});

	it( 'set localname for module added', function () {
		expect( tree.plugins.a.localname ).to.equal( 'a' );
	});

	it( 'sets filePath to false', function () {
		expect( tree.plugins.a.filePath ).to.equal( false );
	});

	it( 'adds a module to group', function () {
		tree.add( 'b', 'javascript', { group: 'codes' });
		expect( tree.groups.codes.plugins['b'].key ).to.equal( 'b' );
		expect( tree.plugins['b'].group ).to.equal( 'codes' );
	});

	it( 'sets isPlugin into plugin props', function (done) {
		tree
		.add( 'isPlugin', pluginDeps)
		.then( function () {
			expect( tree.plugins.a.isPlugin ).to.equal( false );
			expect( tree.plugins.isPlugin.isPlugin ).to.equal( true );
			done();
		});
	});

	it( 'detect if a wiretree plugin is async', function (done) {
		tree
		.add( 'asyncPlugin', asyncPlugin)
		.then( function () {
			expect( tree.plugins.asyncPlugin.isAsync ).to.equal( true );
			expect( tree.plugins.a.isAsync ).to.equal( false );
			done();
		});
	});

	it( 'sets plugin dependencies', function (done) {
		tree
		.add( 'withDeps', pluginDeps )
		.then( function () {
			expect( tree.plugins.withDeps.dependencies[0] ).to.equal( 'a' );
			expect( tree.plugins.a.dependencies[0] ).to.not.exist;
			done();
		});
	});

	it( 'autoresolve simple modules (with no dependencies from tree)', function () {
		expect( tree.plugins.a.res ).to.equal( 1 );
	});

	it( 'exclude plugin from mainTree when option hide', function () {
		tree
		.add( 'hidden', plugin, { group: 'codes', hidden: true })
		.then( function() {
			expect( tree.groups.codes.plugins.hidden ).to.be.a( 'object' );
			expect( tree.mainTree.hidden ).to.not.exist;
		});
	});
});
