'use strict';

angular.module('myApp.view2', [])

.controller('userOptionsController', ['fileService', function(fileService) {
	var self = this;
	self.userSettings = fileService.readJsonFile('json/user.settings.json');
}]);