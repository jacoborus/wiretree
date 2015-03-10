Wiretree API
============


- [Wiretree](#Wiretree)
- [then](#then)
- [add](#add)
- [load](#load)
- [folder](#folder)
- [resolve](#resolve)

<a name="Wiretree"></a>
Wiretree( folderPath )
------------------------------------------------------------

Wiretree constructor
Creates new tree
**Parameters:**
- **folderPath** *String*: path to root folder

Example:

```javascript
var Wiretree = require('wiretree');
var tree = new Wiretree( 'path/to/rootFolder');
```

<a name="then"></a>
then( fn )
------------------------------------------------------------

Executes a function and then return the tree
**Parameters:**
- **fn** *Function*: function
- **Return** *Object*: tree

Example:

```js
tree
.add('mod', 1)
.then( function () {
console.log( 'mod is added!');
})
.add(.....)
```

<a name="add"></a>
add( key, value, options )
------------------------------------------------------------

Add a module or wiretree plugin into the tree.
Returns tree object
**Parameters:**
- **key** *String*: name for the plugin
- **value** *Number|String|Boolean|Object|Function*: plugin
- **options** *Object*: (optional) see options
- **Return** *Object*: tree

All options are optional:

- **`group`** *String*: group to add the plugin
- **`localname`** *Function*: keyname into its group. Only works when group is passed
- **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed


**Example**:

```javascript
// Add a simple module
var one = function () {
return 1
};
tree.add( 'one', one );


// Add a wiretree plugin (a module with dependencies from tree)
var plugin = function (one) { return one() + 2; };

tree.add( 'plugin', {wiretree: plugin} );
```


Passing a `group` will add the module to it. `localname` is the key for the group, equals passed `key` by default

```javascript
tree.add( 'homeCtrl', 1, {
group: 'control',
localname: 'home'
});
```

<a name="load"></a>
load( filePath, options )
------------------------------------------------------------

Add a plugin to tree from a file
**Parameters:**
- **filePath** *String*: path to js file
- **options** *Object*: plugin options
- **Return** *Object*: tree



<a name="folder"></a>
folder( folderPath, options )
------------------------------------------------------------

Load and add every file in the `folderPath`.
**Parameters:**
- **folderPath** *String*: path to folder
- **options** *Object*: see options
- **Return** *Object*: tree

Filename without extension is `key` and `localname` for every file, but prefixes and suffixes can be
added to the `key` through `options.prefix` and `options.suffix` with camelCase style. These transformations
not affects the `localname` in groups.

All options are optional:

- **`group`** *String*: group to add the plugin
- **`transform`** *Function*: convert keyname passed as argument. Must return new keyname
- **`prefix`** *String*: add prefix to keyname
- **`suffix`** *String*: add suffix to keyname
- **`hidden`** *Boolean*: expose only in group, not in tree root. Only works when group is passed

<a name="resolve"></a>
resolve( callback )
------------------------------------------------------------

Resolve all plugins and launch callback
**Parameters:**
- **callback** *Function*: to do after resolve tree




