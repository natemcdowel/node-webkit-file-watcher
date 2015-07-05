'use strict';

// Declare app level module which depends on views, and components
angular.module('myApp', [
  'ngRoute',
  'myApp.view1',
  'myApp.view2',
  'myApp.version',
  // 'myApp.service.ftpService',
  'myApp.service.fileService',
  'myApp.service.google.drive'
]).
config(['$routeProvider', function($routeProvider, $locationProvider) {
  $routeProvider.otherwise({redirectTo: '/fileBrowser'});
  $routeProvider.when('/fileBrowser', {
    templateUrl: 'fileBrowser/file.browser.tpl.html',
    controller: 'fileBrowserController'
  });
  $routeProvider.when('/userOptions', {
    templateUrl: 'userOptions/user.options.tpl.html',
    controller: 'userOptionsController'
  });
  $routeProvider.when('/fileWatched', {
    templateUrl: 'fileBrowser/file.watched.tpl.html',
    controller: 'fileBrowserController'
  });
}]);