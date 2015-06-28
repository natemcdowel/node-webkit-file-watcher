/**
 * Called when the client library is loaded to start the auth flow.
 */
// var handleClientLoad = function() {
//   window.setTimeout(ns.checkAuth, 1);
//   window.driveLoaded = true;
//   return true;
// };


angular.module('myApp.service.google.drive', []).service('googleDriveService', function($q, $rootScope, $timeout, $http) {

  var CLIENT_ID = '493441098996-s614b95pb80clg6i1o4af5gfho7co08n.apps.googleusercontent.com',
      SCOPES = 'https://www.googleapis.com/auth/drive',
      ns = {
        files:false
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
        ns.files = data;
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

  /**
   * Start the file upload.
   *
   * @param {Object} evt Arguments from the file selector.
   */
  ns.uploadFile = function(evt) {
    
    gapi.client.load('drive', 'v2', function() {
      var file = evt.target.files[0];
      // var folderId = ns.createFolder('blah');
      ns.insertFile(file, false, '0Byf6Gzpv3FOsejVkTnZsTXFmdlU');
    });
  }

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

    var reader = new FileReader();
    reader.readAsBinaryString(fileData);
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
          console.log(file)
        };
      }
      request.execute(callback);
    }
  };

  ns.createFolder = function(folderName) {
    var body = {
      'title': folderName,
      'mimeType': "application/vnd.google-apps.folder"
    };

    var request = gapi.client.drive.files.insert({
      'resource': body
    });

    request.execute(function(resp) {
      console.log('Folder ID: ' + resp.id);
      return resp.id;
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
        checkAuth();
      } else {
        console.log('An error occured: ' + resp.error.message);
      }
    });

    return defer.promise;
  };

  ns.checkAuth();

  return ns;
});