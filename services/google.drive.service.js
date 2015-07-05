angular.module('myApp.service.google.drive', []).service('googleDriveService', function($q, $rootScope, $timeout, $http) {

  var CLIENT_ID = '493441098996-s614b95pb80clg6i1o4af5gfho7co08n.apps.googleusercontent.com',
      fs = require('fs'),
      SCOPES = 'https://www.googleapis.com/auth/drive',
      ns = {
        files:[],
        folders:[],
        fileDirectoryIds:[]
      };

  /**
   * Check if the current user has authorized the application.
   */
  ns.checkAuth = function() {
    $timeout(function(){
      gapi.auth.authorize(
        {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': true},
        ns.handleAuthResult);
    }, 2000);
  };

  /**
   * Called when authorization server replies.
   *
   * @param {Object} authResult Authorization result.
   */
  ns.handleAuthResult = function(authResult) {
    if (authResult && !authResult.error) {
      // Access token has been successfully retrieved, requests can be sent to the API.
      ns.getFiles().then(function(data){
        ns.aggregateFolders(data);
        ns.assignFileDirectories(data);
        $rootScope.$broadcast('fileListingComplete', ns.files);
      });
    } else {
      // No access token could be retrieved, show the button to start the authorization flow.
      gapi.auth.authorize(
          {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
          ns.handleAuthResult
      );
    }
  };

  ns.getFiles = function() {
    var defer = $q.defer();

    gapi.client.load('drive', 'v2', function() {
      ns.retrieveAllFiles().then(function(data){
        defer.resolve(data);
      });
    });

    return defer.promise;
  };

  ns.assignFileDirectories = function(files) {
    angular.forEach(files.items, function(file){
      file.directory = [];

      if (file.parents && file.parents.length > 0) {
        angular.forEach(file.parents, function(parent){
          file.directory.push(ns.findFileDirectory(parent.id, files));
        });
      }
    });
    ns.files = files;
  };

  ns.findFileDirectory = function(id, files) {
    var out = false;
    angular.forEach(files.items, function(value){
      if (value.id === id) {
        out = value;
      }
    });
    return out;
  };

  ns.aggregateFolders = function(files) {
    ns.folders = [];
    angular.forEach(files.items, function(value){
      if (value.mimeType === "application/vnd.google-apps.folder") {
        ns.folders.push(value);
      }
    });
    return ns.folders;
  };

  ns.folderAlreadyCreated = function(directory) {
    var out = false;
    angular.forEach(ns.folders, function(folder,key){
      if (folder.title === directory) {
        out = folder;
      }
    });
    return out;
  };

  ns.checkIfRemoteFileExists = function(localFileName) {
    out = false;

    angular.forEach(ns.files.items, function(remoteFile){
      if (localFileName === remoteFile.title) {
        out = remoteFile.id;
      }
    });
    return out;
  };

  ns.iterateDirectoriesUpload = function(fileStructure) {
    ns.fileDirectoryIds = [];

    var i = 0;
    function next() {
      if (i < fileStructure.directory.length) {
          ns.uploadFile(false, fileStructure, fileStructure.directory[i++], i).then(next);
      }
    }
    next();
  };

  ns.reloadFilesAndDirectories = function(data) {
    ns.files = data;
    ns.aggregateFolders(data);
    ns.assignFileDirectories(data);
  };
  /**
   * Start the file upload.
   * @param {Object} evt Arguments from the file selector.
   */
  ns.uploadFile = function(evt, file) {
    var folder = false,
        parentFolder = false,
        defer = $q.defer();

    gapi.client.load('drive', 'v2', function() {
      ns.retrieveAllFiles().then(function(data){
        ns.reloadFilesAndDirectories(data);
        ns.insertFile(file, false, ns.folders[0].id);
        defer.resolve();
      });
    });
    return defer.promise;
  };

  ns.createFolder = function(folderName, parentFolderId) {
    var defer = $q.defer();
    var body = {
      'title': folderName,
      'mimeType': "application/vnd.google-apps.folder"
    };
    if (parentFolderId) {
      body.parents = [{"id":parentFolderId}];
    } 
    var request = gapi.client.drive.files.insert({
      'resource': body
    });

    request.execute(function(resp) {
      defer.resolve(resp.id);
    });

    return defer.promise;
  };

  ns.splitDirectoryFromFile = function(filePath) {
    filePath = filePath.split('/');
    fileName = filePath[filePath.length-1];
    filePath.pop();

    fullDirectoryPath = '';
    angular.forEach(filePath, function(dir){
      fullDirectoryPath += dir+'/';
    });

    return fullDirectoryPath;
  };

  /**
   * Insert new file.
   *
   * @param {File} fileData File object to read data from.
   * @param {Function} callback Function to call when the request is complete.
   */
  ns.insertFile = function(fileData, callback, folderId) {
    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const close_delim = "\r\n--" + boundary + "--";

    var request,
        metaadata,
        contentType,
        base64Data,
        multipartRequestBody,
        fileId;

    var postRequest = function() {
      request = gapi.client.request({
        'path': '/upload/drive/v2/files',
        'method': 'POST',
        'params': {'uploadType': 'multipart'},
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
      });
    }

    var putRequest = function() {
      request = gapi.client.request({
        'path': '/upload/drive/v2/files/' + fileId,
        'method': 'PUT',
        'params': {'uploadType': 'multipart', 'alt': 'json'},
        'headers': {
          'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
        },
        'body': multipartRequestBody
      });
    };

    var sendFile = function(data) {
      contentType = fileData.type || 'application/octet-stream';
      metadata = {
        'title': fileData,
        'directory': ns.splitDirectoryFromFile(fileData),
        'mimeType': contentType,
        'parents': [{"id":folderId}]
      };

      base64Data = btoa(unescape(encodeURIComponent(data)));
      multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + contentType + '\r\n' +
          'Content-Transfer-Encoding: base64\r\n' +
          '\r\n' +
          base64Data +
          close_delim;

      fileId = ns.checkIfRemoteFileExists(fileData);

      // If file has not been created yet, POST
      if (!fileId) {
        postRequest();
      }
      // Otherwise, PUT and update file
      else {
        putRequest();
      }

      if (!callback) {
        callback = function(file) {
          console.log(file);
          ns.getFiles().then(function(data){
            ns.aggregateFolders(data);
            ns.assignFileDirectories(data);
            $rootScope.$broadcast('fileListingComplete', ns.files);
          });
        };
      }
      request.execute(callback);
    };

    // var reader = new FileReader();
    fs.readFile(fileData, function(err, data){
      sendFile(data);
    });
  };

  ns.retrieveAllFiles = function() {
    var defer = $q.defer(),
        request = gapi.client.drive.files.list({});

    request.execute(function(resp) {
      if (!resp.error) {
        defer.resolve(resp);
      } else if (resp.error.code == 401) {
        // Access token might have expired.
        ns.checkAuth();
      } else {
        console.log('An error occured: ' + resp.error.message);
      }
    });
    return defer.promise;
  };

  return ns;
});