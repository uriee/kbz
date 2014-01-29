function FetchCtrl($scope, $http, $templateCache) {
  $scope.method = 'GET';
  $scope.url = 'http://192.168.7.215:3000/proposals';
 
  $scope.fetch = function() {
    $scope.code = null;
    $scope.response = null;
 
    $http({method: $scope.method, url: $scope.url}).
      success(function(data, status) {
        $scope.status = status;
        $scope.data = data;

      }).
      error(function(data, status) {
        $scope.data = data;
        $scope.status = status;
    });
  };
 
  $scope.updateModel = function(method, url) {
    $scope.method = method;
    $scope.url = url;
  };
}