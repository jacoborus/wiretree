
var dox = require('dox'),
	fs = require('fs'),
	Handlebars = require('handlebars');

Handlebars.registerHelper('tagList', function (arr) {
	var i, list = [];
	for (i in arr) {
		if (arr[i].type === 'param') {
			list.push( arr[i].name );
		}
	}
 	return list.join(', ');
});

Handlebars.registerHelper('typeList', function (arr) {
	var i, list = [];
	for (i in arr) {
		list.push( arr[i] );
	}
 	return list.join('|');
});

Handlebars.registerHelper('paramName', function (tag) {
	if (tag.type == 'return') {
		return 'Return';
	} else {
		return tag.name
	}
});


var file = fs.readFileSync('./lib/wiretree.js', 'utf8');
var data = dox.parseComments(file, { raw: true });

var templateFile = fs.readFileSync('./assets/template.mustache', 'utf8');
var template = Handlebars.compile(templateFile);
var result = template({data: data});

fs.writeFileSync('./api.md', result );
