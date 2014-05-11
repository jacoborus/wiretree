![Wiretree](https://raw.githubusercontent.com/jacoborus/wiretree/master/brand/wiretree.png 'Wiretree logo')
===========================================================================================================

Elegant dependency injection framework for Node.js.

[wiretree.micronube.com](http://wiretree.micronube.com/)


Features
--------

- Clean plugin syntax (just add dependencies as arguments)
- Group modules
- Add functions as modules or wiretree plugins (modules with dependencies)
- Add modules and plugins from files
- Add entire folders as group, as individual files or both
- Add prefixes and suffixes to module keys for easy handling

Installation
------------

```
npm install wiretree
```


Example:
--------

A typical module:

**`module.js`:**
```js
module.exports = function () {
    return 'This is a module';
}
```

A Wiretree plugin is a function exposed as 'module.exports.wiretree', with its dependencies names declared as arguments. Plugins returns the rendered module. If your plugin doesn't need to return a module simply return `true` in order to continue (this is important for async loading).

**`plugin.js`:**
```js
exports.wiretree = function (sum) {
    return 'result is ' + sum;
}
```

**`index.js`:**
```js
var Wiretree = require( 'wiretree' );

// create a tree passing root path as parameter
var tree = new Wiretree( __dirname );


// add module `data` (without dependencies) and then get it
tree.add( {a:1, b:2}, 'data' );
tree.get( 'data' );
// => {a:1, b:2}



// Add a wiretree plugin `sum` (module with dependencies)
var sum = function (data) {
    return data.a + data.b;
};
tree.add( {wiretree: sum}, 'sum' );

// A Wiretree plugin will be rendered with its dependencies into a typical module
// the first time you get it, not when you add it.
tree.get( 'sum' );
// => 3



// load and add a module from file
tree.load( './module.js', 'mod' );

var mod = tree.get( 'mod' );
mod();
// => 'This is a module'


// load and add a wiretree plugin
tree.load( './plugin.js', 'result' );

// get a resolved a module (this resolves its dependencies too)
tree.get( 'result' );
// => 'result is 3'
```

**A complex example**:
Import an entire folder, sets its plugins and modules into groups and rename the keys with the provided prefix and suffix:

```js
var options = {
    group: 'myGroup',
    prefix: 'pre',
    suffix: 'Ctrl'
}

// folder method return the keynames of its plugins/modules
tree.folder( './myFolder', options);
// => ['preMyModCtrl', 'preMyPluginCtrl']

tree.get( 'myGroup');
// => {myMod: [object Function], myPlugin: [object Function]}
```

Docs & API
----------

See [https://github.com/jacoborus/wiretree/blob/master/docsapi.md](https://github.com/jacoborus/wiretree/blob/master/docsapi.md)

Tests
-----

```js
npm install && npm test
```

<br><br>

---

© 2014 Jacobo Tabernero - [jacoborus](https://github.com/jacoborus)

Released under [MIT License](https://raw.github.com/jacoborus/wiretree/master/LICENSE)
