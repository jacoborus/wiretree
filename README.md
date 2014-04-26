![Wiretree](https://raw.githubusercontent.com/jacoborus/wiretree/master/brand/wiretree.png 'Wiretree logo')
======================================================================================================

Elegant dependency injection framework for Node.js.

[wiretree.micronube.com](http://wiretree.micronube.com/)


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

A Wiretree plugin is a function exposed as 'module.exports.wiretree', with its dependencies names declared as arguments. Plugins has to return the rendered module. If your plugin doesn't nedd to return a module just return `true` in order to continue (this is important for async loading).

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
Import an entire folder, sets its plugins and modules into groups and tranform keynames with prefixes and suffixes:

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

API
---


### #get( key )

Get module or group of modules `key`.
This method will render all required wiretree plugins into modules

```js
tree.get( 'myModule' );
// returns the module myModule

// getting myModule throught a group
var group = tree.get( 'myGroup' );
var myModule = group.myModule;
```


**Parameters**:

- **key**:  *String*,  name of plugin to get

**Returns** a *Object*:  rendered plugin




### #add( key, value, group, localName )

Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Example**:

```js
// Add and get a simple module
var addon = 2;

tree.add( addon, 'mod' );
// => []

tree.get( 'mod' );
// => 2

// Add and get a wiretree plugin (a module with dependencies)
var plugin = function (mod) { return mod + 2; };

tree.add( {wiretree: plugin}, 'plugin' );
// => ['mod']

tree.get( 'plugin' );
// => 4
```

Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default

```js
tree.add( 1, 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```



**Parameters**:

- **key**:  *String*,  name for the plugin
- **value**:  *type*,  plugin
- **group**:  *String*,  (optional) name of group to add the plugin
- **localName**:  *String*,  (optional) keyname into the group (`localName` is `key` by default)

**Returns** an *Array*,  list of dependencies names




### #load( key, route, group, localName )

Load a module or wiretree plugin from `route` in disk and add it into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Example**:

**`module.js`**:
```js
module.exports = function () {
    return 2;
};
```

**`plugin.js`**:
```js
module.exports.wiretree = function (mod) {
    return mod + 2;
};
```

**`index.js`**:
```js
tree.load( './module.js', 'mod' );
// => []

tree.get( 'mod' );
// => 2

tree.load( './plugin.js', 'plugin' );
// => ['mod']

tree.get( 'plugin' );
// => 4
```

Passing a `group` will add the module to it. `localName` is the key for the group, equals passed `key` by default

```js
tree.load( './module.js', 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```



**Parameters**

- **key**:  *String*,  name for the plugin
- **route**:  *String*,  path to plugin
- **group**:  *String*,  (optional) name of group to add the plugin
- **localName**:  *String*,  (optional) keyname into the group (`localName` is `key` by default)

**Returns** an *Array*:  list of dependencies names




### #folder(route, options)

Load and add every file in the folder `route`.

Filename without extension is `key` and `localName` for every file, but prefixes and suffixes can be
added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
not affects the `localName` in groups.

Returns list of `key`s in an `array`

```js
tree.folder( './myFolder' );
// => ['myMod', 'myPlugin']

var options = {
    group: 'myGroup',
    prefix: 'pre',
    suffix: 'Ctrl'
}

tree.folder( './myFolder', options);
// => ['preMyModCtrl', 'preMyPluginCtrl']

tree.get( 'myGroup');
// => {myMod: [object Function], myPlugin: [object Function]}
```



**Parameters**

- **route**:  *String*,  path to folder
- **options**:  *Object*

**Returns** an *Array*:  list of keys of modules added


Tests
-----

```js
npm install && npm test
```

<br><br>

---

© 2014 Jacobo Tabernero - [jacoborus](https://github.com/jacoborus)

Released under [MIT License](https://raw.github.com/jacoborus/wiretree/master/LICENSE)