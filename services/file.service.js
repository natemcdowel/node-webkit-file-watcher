angular.module('myApp.service.fileService', []).service('fileService', function($q, googleDriveService) {
  var fs = require('fs'),
      watch = require('watch'),
      ns = {
        userSettings: false,
      };

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

  ns.parseFileStructure = function(file) {
    var out = {
      "fullPath": file,
      "fileName": false,
      "directory": []
    },
    fileStructure = file.split("\\");

    angular.forEach(fileStructure,function(piece, key){
      // File name
      if (key === fileStructure.length-1) {
        out.fileName = piece;
      }
      else {
        out.directory.push(piece);
      }
    });

    return out;
  };

  ns.parseWatchedFiles = function() {
    ns.userSettings = ns.readJsonFile('json/user.settings.json');

    // var out = {
    //       directories: {}
    //     },
    //     found = [];

    // out.directories.files = [];

    // angular.forEach(ns.userSettings.watching, function(filePath){
    //   filePath = filePath.split('/');
    //   fileName = filePath[filePath.length-1];
    //   filePath.pop();

    //   fullDirectoryPath = '';
    //   angular.forEach(filePath, function(dir){
    //     fullDirectoryPath += dir+'/';
    //   });

    //   if (!out.directories[fullDirectoryPath]) {
    //     found.push(fullDirectoryPath);
    //     out.directories[fullDirectoryPath] = [];
    //     out.directories[fullDirectoryPath].push(fileName);
    //   }
    //   else {
    //     out.directories[fullDirectoryPath].push(fileName);
    //   }
    // });
    return ns.userSettings.watching;
  };

  ns.fileWatcher = function() {

    var filesToWatch = ns.parseWatchedFiles();

    angular.forEach(filesToWatch, function(file){
      fs.watchFile(file, function (curr, prev) {
        console.log(file);
      });
    });
    // angular.forEach(filesToWatch, function(file){
    //   console.log(directory);
    //   console.log(files);
    //   if (files.length > 0) {
    //     watch.createMonitor(directory, function (monitor) {
    //       monitor.files[files] // Stat object for my zshrc.
    //       monitor.on("created", function (f, stat) {
    //         googleDriveService.iterateDirectoriesUpload(ns.parseFileStructure(f));
    //       })
    //       monitor.on("changed", function (f, curr, prev) {
    //         // Handle file changes
    //         // console.log(f);
    //         // console.log(ns.parseFileStructure(f));
    //         // googleDriveService.uploadFile(false, ns.parseFileStructure(f));
    //         googleDriveService.iterateDirectoriesUpload(ns.parseFileStructure(f));
    //       })
    //       monitor.on("removed", function (f, stat) {
    //         googleDriveService.iterateDirectoriesUpload(ns.parseFileStructure(f));
    //       })
    //       // monitor.stop(); // Stop watching
    //     });
    //   }
    // });
  };
  ns.fileWatcher();

  return ns;
});