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


describe( 'Wiretree#load', function () {

	it( 'throws errors on bad argument: key', function () {
		expect( function () {
			tree.load( './test/assets/module.js', {} );
		}).to.throw( 'Bad argument: key' );
	});

	it( 'throws errors on bad argument: route', function () {
		expect( function () {
			tree.load( 2, 'f' );
		}).to.throw( 'Bad argument: route' );
	});

	it( 'throws errors on bad argument: group', function () {
		expect( function () {
			tree.load( './test/assets/module.js', 'f', 3 );
		}).to.throw( 'Bad argument: group' );
	});

	it( 'throws errors on bad argument: localName', function () {
		expect( function () {
			tree.load( './test/assets/module.js', 'f', 'hello', 3 );
		}).to.throw( 'Bad argument: localName' );
	});


	it( 'returns the module schema generated', function () {
		expect( tree.load( './test/assets/module.js', 'f' )['key']).to.equal( 'f' );
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['f'].key ).to.equal( 'f' );
		expect( tree.plugins['f'].res ).to.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'e', 'codes' );
		expect( tree.plugins['e'].group ).to.equal( 'codes' );
	});


	// plugion with depedencies
	it( 'returns the module schema generated', function () {
		expect( tree.load( './test/assets/plugin.js', 'g' )['key']).to.equal( 'g' );
	});

	it( 'loads a module to tree.plugins', function () {
		expect( tree.plugins['g'].key ).to.equal( 'g' );
		expect( tree.plugins['g'].res ).to.not.exist;
	});

	it( 'sets the group into the module', function () {
		var pluginAddGroup = tree.load( './test/assets/plugin.js', 'h', 'codes' );
		expect( tree.plugins['h'].group ).to.equal( 'codes' );
	});

});


describe( 'Wiretree#folder', function () {

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


describe( 'Wiretree#get', function () {

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

	it( 'direct return dependency if is not a funcion', function () {
		var a = tree.get( 'a' );
		expect( a ).to.equal( 1 );
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