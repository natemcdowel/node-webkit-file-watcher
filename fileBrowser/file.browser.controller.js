'use strict';

angular.module('myApp.view1', [])

.controller('fileBrowserController', ['$scope', 'fileService', 'googleDriveService', function($scope, fileService, googleDriveService) {
  var self = this;
  self.rootDrive = 'C:/';
  self.directories = [];
  self.fullPath = false;

  // Start in base directory
  fileService.readFiles(self.rootDrive).then(function(files){
    self.files = files;
  });

  self.getFullPath = function() {
    self.fullPath = self.rootDrive;

    angular.forEach(self.directories, function(value) {
      self.fullPath += value+'/';
    });
    
    return self.fullPath;
  };

  self.goToDirectory = function(directory) {
    self.directories.push(directory);

    fileService.readFiles(self.getFullPath()).then(function(files){
      self.files = files;
    });
  };

  self.backDirectory = function() {
    self.directories.pop();
    fileService.readFiles(self.getFullPath()).then(function(files){
      self.files = files;
    });
  };

  self.watchFile = function(fileName) {
    self.userSettings = fileService.readJsonFile('json/user.settings.json');
    self.userSettings.watching.push(self.getFullPath() + fileName);
    fileService.saveJsonFile('json/user.settings.json', self.userSettings);
  };

  self.checkIfWatched = function(fullPath, localFileName) {
    var out = false;
    angular.forEach(self.files, function(driveFile){
      console.log(fullPath+localFileName);
      console.log(driveFile);
      if (fullPath+localFileName === driveFile.title) {
        out = true;
      }
    });
    return out;
  };

  $scope.$on('fileListingComplete',function(e, payload){
    self.remoteFiles = payload.items;
  });
}]);