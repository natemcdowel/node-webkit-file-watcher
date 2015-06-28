angular.module('myApp.service.fileService', []).service('fileService', function($q, googleDriveService) {
  var fs = require('fs'),
      watch = require('watch'),
      ns = {};

  ns.readFiles = function(directory) {
    var files = [],
      defer = $q.defer();

    fs.readdir(directory, function (err, files) {
      if (err)
        throw err;
      for (var index in files) {
        var file = {
          name:false,
          directory:false
        }
        try {
          file.name = files[index];
          if (fs.statSync(directory + files[index]).isDirectory()) {
            file.directory = true;
          }
          files.push(file);
        }
        catch(e) {
        }
      }
      defer.resolve(files);
    });
    return defer.promise;
  };

  ns.saveJsonFile = function(filename, content) {
    return fs.writeFileSync(filename, JSON.stringify(content));
  };

  ns.readJsonFile = function(filename) {
    return JSON.parse(fs.readFileSync(filename, 'utf8'));
  };

  ns.fileWatcher = function() {
    watch.createMonitor('C:/node-webkit', function (monitor) {
      console.log(monitor)
      monitor.files['C:/.zshrc'] // Stat object for my zshrc.
      monitor.on("created", function (f, stat) {
        // Handle new files
        console.log(f);
        // ftpService.upload('C:/node-webkit/**');
      })
      monitor.on("changed", function (f, curr, prev) {
        // Handle file changes
        console.log(f);
        // ftpService.upload('C:/node-webkit/**');
      })
      monitor.on("removed", function (f, stat) {
        // Handle removed files
        console.log(f);
        // ftpService.upload('C:/node-webkit/**');
      })
      // monitor.stop(); // Stop watching
    });
  };
  ns.fileWatcher();

  return ns;
});