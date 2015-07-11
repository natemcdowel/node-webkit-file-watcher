angular.module('myApp.service.fileService', []).service('fileService', function($q, googleDriveService, $rootScope) {
  var fs = require('fs'),
      watch = require('watch'),
      ns = {
        userSettings: false,
      };

  ns.readFiles = function(directory) {
    var outFiles = [],
      defer = $q.defer();

    console.log(directory);
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
          outFiles.push(file);  
        }
        catch(e) {
        }
      }
      defer.resolve(outFiles);
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
    return ns.userSettings.watching;
  };

  ns.fileWatcher = function() {
    var filesToWatch = ns.parseWatchedFiles();

    angular.forEach(filesToWatch, function(file){
      fs.watchFile(file, function (curr, prev) {
        console.log(file);
        googleDriveService.uploadFile(false, file);
      });
    });
  };

  var fileListingComplete = $rootScope.$on('fileListingComplete', function(e, payload) {
    console.log(payload);
    ns.fileWatcher();
    $rootScope.$$listeners['fileListingComplete'] = [];
  });

  $rootScope.$on('$destroy', function(){
    fileListingComplete();
  });

  return ns;
});