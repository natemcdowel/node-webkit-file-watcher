(function startServer(){
		var express = require('express')
		  , http = require('http');

		var app = express();
		var server = http.createServer(app);
		console.log(__dirname);
		app.use(express.static(__dirname + '/'));
		server.listen(3000, '0.0.0.0');
})();