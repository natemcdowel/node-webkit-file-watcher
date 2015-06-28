angular.module('myApp.service.ftpService', []).service('ftpService', function($q, $rootScope) {
  var ftpClient = require('ftp-client'),
      fs = require('fs'),
      ns = {};

  ns.bootstrapFtpConfig = function() {
    return JSON.parse(fs.readFileSync('json/user.settings.json', 'utf8')).ftp;
  };

  ns.upload = function(file) {
    ns.client.connect(function () {
      ns.client.upload([file], '/public_html/cloud', {
        baseDir: 'cloud',
        overwrite: 'older'
      }, function (result) {
        console.log(result);
      });
    });
  };

  ns.download = function() {
    ns.client.connect(function () {
      ns.client.download('/public_html/test2', 'test2/', {
        overwrite: 'all'
      }, function (result) {
        console.log(result);
      });
    });
  };

  console.log(ns.bootstrapFtpConfig());
  ns.client = new ftpClient(ns.bootstrapFtpConfig(), {logging:'basic'});

  return ns;
});