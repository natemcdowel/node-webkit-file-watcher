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
    var authButton = document.getElementById('authorizeButton');
    var filePicker = document.getElementById('filePicker');
    authButton.style.display = 'none';
    filePicker.style.display = 'none';
    if (authResult && !authResult.error) {
      // Access token has been successfully retrieved, requests can be sent to the API.
      filePicker.style.display = 'block';
      filePicker.onchange = ns.uploadFile;
      ns.getFiles().then(function(data){
        ns.aggregateFolders(data);
        ns.assignFileDirectories(data);
        console.log(ns.files);
        console.log(ns.folders);
        $rootScope.$broadcast('fileListingComplete', ns.files);
      });
    } else {
      // No access token could be retrieved, show the button to start the authorization flow.
      authButton.style.display = 'block';
      authButton.onclick = function() {
          gapi.auth.authorize(
              {'client_id': CLIENT_ID, 'scope': SCOPES, 'immediate': false},
              ns.handleAuthResult);
      };
    }
  }

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
  ns.uploadFile = function(evt, fileStructure, directory, key) {
    var folder = false,
        parentFolder = false,
        defer = $q.defer();

    gapi.client.load('drive', 'v2', function() {
      ns.retrieveAllFiles().then(function(data){
        ns.reloadFilesAndDirectories(data);
        folder = ns.folderAlreadyCreated(directory);

        // Create folder in google drive, if it doesn't exist
        if (!folder && key === 0) {
          ns.createFolder(directory).then(function(newFolderId){
            ns.fileDirectoryIds.push(newFolderId);
            // Only upload if last direcory has been created
            if (key === fileStructure.directory.length) {
              ns.insertFile(fileStructure, false, newFolderId);
            }
            defer.resolve();
          });
        }
        // If folder has not been created, and not the first directory
        else if (!folder && key > 0) {
          var parentFolder = ns.fileDirectoryIds[key-2];
          ns.createFolder(directory, parentFolder).then(function(newFolderId){
            ns.fileDirectoryIds.push(newFolderId);
            // Only upload if last direcory has been created
            if (key === fileStructure.directory.length) {
              ns.insertFile(fileStructure, false, newFolderId);
            }
            defer.resolve();
          });
        }
        // If folder has already been created, upload file
        else {
          ns.insertFile(fileStructure, false, folder.id);
          defer.resolve();
        }
      });
    });
    return defer.promise;
  };

  // ns.getParentDirectoryId = function(fileStructure, partialDirectory) {
  //   if ()
  // };

  ns.createFolder = function(folderName, parentFolderId) {
    var defer = $q.defer();
    var body = {
      'title': folderName,
      'mimeType': "application/vnd.google-apps.folder"
    };
    if (parentFolderId) {
      body.parents = [{"id":parentFolderId}];
    } 
    console.log(folderName + '-- ');
    console.log(body);
    var request = gapi.client.drive.files.insert({
      'resource': body
    });

    request.execute(function(resp) {
      defer.resolve(resp.id);
    });

    return defer.promise;
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


    var sendFile = function(data) {
      var contentType = fileData.type || 'application/octet-stream';
      var metadata = {
        'title': fileData.fileName,
        'mimeType': contentType,
        'parents': [{"id":folderId}]
      };

      var base64Data = btoa(data);
      var multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + contentType + '\r\n' +
          'Content-Transfer-Encoding: base64\r\n' +
          '\r\n' +
          base64Data +
          close_delim;

      var request = gapi.client.request({
          'path': '/upload/drive/v2/files',
          'method': 'POST',
          'params': {'uploadType': 'multipart'},
          'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody});
      if (!callback) {
        callback = function(file) {
        };
      }
      request.execute(callback);
    };

    var reader = new FileReader();
    fs.readFile('C:/node-webkit/nwjs-v0.12.2-win-x64/asdf.txt', function(err, data){
      sendFile(data);
    });

    reader.onload = function(e) {
      var contentType = fileData.type || 'application/octet-stream';
      var metadata = {
        'title': fileData.name,
        'mimeType': contentType,
        'parents': [{"id":folderId}]
      };

      var base64Data = btoa(reader.result);
      var multipartRequestBody =
          delimiter +
          'Content-Type: application/json\r\n\r\n' +
          JSON.stringify(metadata) +
          delimiter +
          'Content-Type: ' + contentType + '\r\n' +
          'Content-Transfer-Encoding: base64\r\n' +
          '\r\n' +
          base64Data +
          close_delim;

      var request = gapi.client.request({
          'path': '/upload/drive/v2/files',
          'method': 'POST',
          'params': {'uploadType': 'multipart'},
          'headers': {
            'Content-Type': 'multipart/mixed; boundary="' + boundary + '"'
          },
          'body': multipartRequestBody});
      if (!callback) {
        callback = function(file) {
        };
      }
      request.execute(callback);
    }
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

  ns.checkAuth();

  return ns;
});