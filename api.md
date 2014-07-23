Wiretree API
============


- [Wiretree](#Wiretree)
- [get](#get)
- [add](#add)
- [load](#load)
- [folder](#folder)

<a name="Wiretree"></a>
Wiretree( options )
------------------------------------------------------------

Wiretree constructor
Creates new tree with options object.

**Parameters:**

- **options** *String|Object*: path to folder or options object


Options:
- rootpath: path to resolve dependencies
- keyname: name to resolve modules

Example:

Passing root path as options
```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree( 'path/to/rootFolder');
```

Passing options as argument

```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree({
rootpath:'path/to/rootFolder',
keyname: '_tree'
});
```

<a name="get"></a>
get( key )
------------------------------------------------------------

Get module or group of modules `key`.
This method will render all required wiretree plugins into modules

**Parameters:**

- **key** *String*: name of plugin to get
- **Return** *Object*: rendered plugin


```javascript
tree.get( 'myModule' );
// returns the module myModule

// getting myModule throught a group
var group = tree.get( 'myGroup' );
var myModule = group.myModule;
```

<a name="add"></a>
add( key, value, group, localName )
------------------------------------------------------------

Add a module or wiretree plugin into the tree. Wiretree plugins won't be resolved until you get them.
Returns a list of module dependencies in an `array`.

**Parameters:**

- **key** *String*: name for the plugin
- **value** *type*: plugin
- **group** *String*: (optional) name of group to add the plugin
- **localName** *String*: keyname into the group (is key by default)
- **Return** *Array*: list of dependencies names


**Example**:

```javascript
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

```javascript
tree.add( 1, 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```

<a name="load"></a>
load( route, key, group, localName )
------------------------------------------------------------

Load a module or wiretree plugin from `route` in disk and add it into the tree.

**Parameters:**

- **route** *String*: path to plugin
- **key** *String*: name for the plugin
- **group** *String*: (optional) name of group to add the plugin
- **localName** *String*: keyname into the group (is key by default)
- **Return** *Array*: list of dependencies names


Wiretree.load just checks that the files exist and add it to the tree. Modules and wiretree plugins files won't be loaded and resolved until you get them.


**Example**:

**`module`**.js:
```javascript
module.exports = function () {
return 2;
};
```
**`plugin`**.js:
```javascript
exports.wiretree = function (mod) {
return mod + 2;
};
```

**`index.js`**:
```javascript
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

```javascript
tree.load( './module.js', 'homeCtrl', 'control', 'home');
tree.get( 'homeCtrl' );
// => 1

var control = tree.get( 'control' );
return control.home;
// => 1
```

<a name="folder"></a>
folder( route, options )
------------------------------------------------------------

Load and add every file in the folder `route`.

**Parameters:**

- **route** *String*: path to folder
- **options** *Object*: 
- **Return** *Array*: list of keys of modules added


Filename without extension is `key` and `localName` for every file, but prefixes and suffixes can be
added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
not affects the `localName` in groups.

Returns list of `key`s in an `array`

```javascript
tree.folder( './myFolder' );
// => ['myMod', 'myPlugin']

var options = {
group: 'myGroup',
prefix: 'pre',
suffix: 'Ctrl',
transform: function (key) {
return key + 'Test';
}
}

tree.folder( './myFolder', options);
// => ['preMyModTestCtrl', 'preMyPluginTestCtrl']

tree.get( 'myGroup');
// => {myModTest: [object Function], myPluginTest: [object Function]}
```


