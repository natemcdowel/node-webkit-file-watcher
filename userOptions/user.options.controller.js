'use strict';

angular.module('myApp.view2', [])

.controller('userOptionsController', ['fileService', 'googleDriveService', '$rootScope', function(fileService, googleDriveService, $rootScope) {
	var self = this;
	self.userImage = 'https://developers.google.com/experts/img/user/user-default.png';//googleDriveService.user.user.picture.url;
	self.userDisplayName = '';//googleDriveService.user.user.picture.displayName;
	self.userEmail = '';
	self.userSettings = fileService.readJsonFile('json/user.settings.json');

	self.assignUserData = function(userData) {
		self.userImage = userData.user.picture.url;
		self.userDisplayName = userData.user.picture.displayName;
		self.userEmail = userData.user.emailAddress;
	};

	$rootScope.$on('userDetailsComplete',function(e, payload){
		self.assignUserData(payload);
	});
}])

.directive('userHeader', function() {
	return {
		templateUrl: 'userOptions/user.options.tpl.html',
		controller: 'userOptionsController',
		controllerAs: 'vm'
	};
});