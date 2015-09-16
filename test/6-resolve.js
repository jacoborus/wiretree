'use strict';

var test = require('tape').test;

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
		wtDone(plugin);
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


var Wiretree = require('..');

test('resolve:: throws error on missing dependencies', function (t) {
  var tree = new Wiretree();
  tree
  .add('plugin', plugin)
  .then(function () {
    t.throws(function () {
      tree.resolve();
    }, /Can't find tree dependencies: mod/);
    t.end();
  });
});


test('resolve:: resolve all regular tree dependencies before call callback', function (t) {
  var tree = new Wiretree();

  tree
  .add('mod', mod)
  .add('plugin', plugin)
  .resolve(function () {
    t.ok(tree.plugins.plugin.res);
    t.end();
  });
});


test('resolve:: resolve all async tree dependencies before call callback', function (t) {
  var tree = new Wiretree();

  tree
  .add('mod', mod)
  .add('plugin', plugin)
  .add('asyncPlugin', asyncPlugin)
  .resolve(function () {
    t.ok(tree.plugins.plugin.res);
    t.ok(tree.plugins.asyncPlugin.res);
    t.end();
  });
});


test('resolve:: can resolve groups', function (t) {
  var tree = new Wiretree();
  var salad = function (fruits) {
    return fruits.orange + ' and ' + fruits.apple + ' are fruits';
  };
  tree
  .add('apple', 'apple', {group: 'fruits' })
  .add('orange', 'orange', {group: 'fruits' })
  .add('salad', { wiretree: salad })
  .resolve(function () {
    t.is(tree.plugins.salad.res, 'orange and apple are fruits');
    t.end();
  });
});


test('resolve:: resolve files', function (t) {
  var tree = new Wiretree();
  tree
  .load('./test/assets/module.js')
  .resolve(function () {
    t.ok(tree.plugins.module.res);
    t.end();
  });
});

test('resolve:: throw error on circular dependencies instead "Maximum call stack size exceeded"', function (t) {
  var tree = new Wiretree();
  var one = function (two) {
    return two + 5;
  };
  var two = function (one) {
    return one + 2;
  };
  tree
  .add('one', { wiretree: one })
  .add('two', { wiretree: two });
  t.throws(function () {
    tree.resolve(['one']);
  }, /Circular dependencies: one/);
  t.end()
});


test('resolve:: dont throw error when more than a plugin in the same branch requires the same module"', function (t) {
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
  var three = function (one, two, hello) {
    return hello() + one + two;
  };
  tree
  .add('hello', hello)
  .add('one', { wiretree: one })
  .add('two', { wiretree: two })
  .add('three', { wiretree: three })
  .then(function () {
    t.doesNotThrow(function () {
      tree.resolve();
    });
    t.end();
  });
});


test('resolve:: resolve dependencies with suffixes', function (t) {
  // add folder with options
  var tree = new Wiretree();
  tree
  .folder('./test/assets/folder', {group: 'testgroup', prefix: 'pre', suffix: 'suf'})
  .resolve(function () {
    t.is(tree.plugins.preAddonSuf.res, 'Sum is Addon2 says hello!!!!');
    t.end();
  });
});

// processing

test('resolve:: process modules', function (t) {
  var processedModule = function () {
    return 1;
  }

  var tree = new Wiretree();
  tree
  .add('processedModule', processedModule, { processing: getProcessed })
  .resolve(function () {
    t.is(tree.plugins.processedModule.res, 'number 1');
    t.end();
  });
});

test('resolve:: process sync plugins', function (t) {
  var processedSync = function (getOne) {
    return getOne;
  }

  var tree = new Wiretree();
  tree
  .add('getOne', getOne)
  .add('processedSync', {wiretree: processedSync}, { processing: getProcessed })
  .resolve(function () {
    t.is(tree.plugins.processedSync.res, 'number 1');
    t.end();
  });
});

test('resolve:: process async plugins', function (t) {
  var processedAsync = function (wtDone) {
    wtDone(function () { return 1; });
  };

  var tree = new Wiretree();
  tree
  .add('processedAsync', {wiretree: processedAsync}, { processing: getProcessed })
  .resolve(function () {
    t.is(tree.plugins.processedAsync.res, 'number 1');
    t.end();
  });
});

test('resolve:: process with settings', function (t) {
  var processedSettings = function (getOne) {
    return getOne;
  }

  var tree = new Wiretree();
  tree
  .add('getOne', getOne)
  .add(
    'processedSettings',
    {
      wiretree: processedSettings,
      settings: {
        two: 'two'
      }
    }, { processing: getProcessedSettings }
 )
  .resolve(function () {
    t.is(tree.plugins.processedSettings.res, 'two > 1');
    t.end();
  });
});


test('resolve:: call async plugin constructor once', function (t) {
  var control = 0;
  var plugin = function (wtDone) {
    setTimeout(function () {
      ++control;
      wtDone(5);
    }, 30);
  };

  new Wiretree()
  .add('plug', { wiretree: plugin })
  .add('other', { wiretree: function (plug) {
    return plug;
  }})
  .resolve(function () {
    t.is(control, 1);
    t.end();
  });
});
