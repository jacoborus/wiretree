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
var getProcessed = function (processed) {
	return 'number ' + processed();
}
var getProcessedSettings = function (processed, settings) {
	return settings.two + ' > ' + processed();
}
var getOne = function () {
	return 1;
}


describe( 'Wiretree#resolve', function () {
	var Wiretree = require('..');

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
		var salad = function (fruits) {
			return fruits.orange + ' and ' + fruits.apple + ' are fruits';
		};
		tree
		.add( 'apple', 'apple', {group: 'fruits' })
		.add( 'orange', 'orange', {group: 'fruits' })
		.add( 'salad', { wiretree: salad })
		.resolve( function () {
			expect( tree.plugins.salad.res ).equal( 'orange and apple are fruits' );
		});
	});

	it( 'resolve files', function (done) {
		var tree = new Wiretree();
		tree
		.load( './test/assets/module.js' )
		.resolve( function () {
			expect( tree.plugins.module.res ).to.exist;
			done();
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


	it( 'resolve dependencies with suffixes', function () {
		// add folder with options
		var tree = new Wiretree();
		tree
		.folder( './test/assets/folder', {group: 'testgroup', prefix: 'pre', suffix: 'suf'})
		.resolve( function () {
			expect( tree.plugins.preAddonSuf.res ).to.equal( 'Sum is Addon2 says hello!!!!' );
		});
	});

	// processing

	it( 'process modules', function (done) {
		var processedModule = function () {
			return 1;
		}

		var tree = new Wiretree();
		tree
		.add( 'processedModule', processedModule, { processing: getProcessed })
		.resolve( function () {
			expect( tree.plugins.processedModule.res ).to.equal( 'number 1' );
			done();
		});
	});

	it( 'process sync plugins', function (done) {
		var processedSync = function (getOne) {
			return getOne;
		}

		var tree = new Wiretree();
		tree
		.add( 'getOne', getOne )
		.add( 'processedSync', {wiretree: processedSync}, { processing: getProcessed })
		.resolve( function () {
			expect( tree.plugins.processedSync.res ).to.equal( 'number 1' );
			done();
		});
	});

	it( 'process async plugins', function (done) {
		var processedAsync = function (wtDone) {
			wtDone( function () { return 1; });
		};

		var tree = new Wiretree();
		tree
		.add( 'processedAsync', {wiretree: processedAsync}, { processing: getProcessed })
		.resolve( function () {
			expect( tree.plugins.processedAsync.res ).to.equal( 'number 1' );
			done();
		});
	});

	it( 'process with settings', function (done) {
		var processedSettings = function (getOne) {
			return getOne;
		}

		var tree = new Wiretree();
		tree
		.add( 'getOne', getOne )
		.add(
			'processedSettings',
			{
				wiretree: processedSettings,
				settings: {
					two: 'two'
				}
			}, { processing: getProcessedSettings }
		)
		.resolve( function () {
			expect( tree.plugins.processedSettings.res ).to.equal( 'two > 1' );
			done();
		});
	});

	it( 'call async plugin constructor once', function (done) {
		var control = 0;
		var plugin = function (wtDone) {
			setTimeout( function () {
				++control;
				wtDone(5);
			}, 30);
		};

		new Wiretree()
		.add('plug', { wiretree: plugin })
		.add('other', { wiretree: function (plug) {
			return plug;
		}})
		.resolve( function () {
			expect( control ).to.equal( 1 );
			done();
		});
	});
});

