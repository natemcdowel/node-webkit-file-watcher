'use strict';

angular.module('myApp.view1', [])

.controller('fileBrowserController', ['$scope', 'fileService', 'googleDriveService', function($scope, fileService, googleDriveService) {
  var self = this;
  self.rootDrive = 'C:/';
  self.directories = [];
  self.fullPath = false;
  self.remoteFiles = [];
  self.initialLoading = true;
  self.remoteFilesNames = [];

  // Call google drive service, to check authorization
  googleDriveService.checkAuth();

  self.getFullPath = function() {
    self.fullPath = self.rootDrive;
    angular.forEach(self.directories, function(value) {
      self.fullPath += value+'/';
    });
    return self.fullPath;
  };

  self.goToDirectory = function(directory) {
    self.directories.push(directory);
    self.readFilesInDirectory();
  };

  self.readFilesInDirectory = function() {
    fileService.readFiles(self.getFullPath()).then(function(files){
      self.files = files;
      self.checkIfWatched();
    });
  };

  self.backDirectory = function() {
    self.directories.pop();
    self.readFilesInDirectory();
  };

  self.watchFile = function(fileName) {
    self.loading = true;
    self.userSettings = fileService.readJsonFile('json/user.settings.json');
    self.userSettings.watching.push(self.getFullPath() + fileName);
    fileService.saveJsonFile('json/user.settings.json', self.userSettings);
    googleDriveService.uploadFile(false, self.getFullPath() + fileName);
  };

  self.createArrayOfRemoteFiles = function() {
    self.remoteFilesNames = [];
    angular.forEach(self.remoteFiles, function(file){
      if (file.title) {
        self.remoteFilesNames.push(file.title);
      }
    });
  };

  self.checkIfWatched = function() {
    angular.forEach(self.files, function(localFile, localFileKey){
      if ($.inArray(self.getFullPath()+localFile.name, self.remoteFilesNames) > -1) {
        localFile.watched = true;
      }
    });
  };

  self.selectDirectory = function(key) {
    var numberToSplice = 0;

    // If key is passed, directory is one other than root
    if (key || key === 0) {
      angular.forEach(self.directories, function(directory, index){
        if (index > key) {
          numberToSplice++;
        }
      });
      self.directories.splice(key+1, numberToSplice);
    }
    // Clear directories if root drive
    else {
      self.directories = [];
    }
    self.readFilesInDirectory();
  };

  // Start in base directory
  self.readFilesInDirectory();

  $scope.$on('fileListingComplete',function(e, payload){
    self.remoteFiles = payload.items;
    self.createArrayOfRemoteFiles();
    self.readFilesInDirectory();
    self.loading = false;
    self.initialLoading = false;
  });
}]);