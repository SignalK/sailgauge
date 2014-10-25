function dispatchInTree(singleSignalK, eventHandlerTree) {
  var branchName = Object.keys(singleSignalK)[0];
  if (typeof eventHandlerTree[branchName] === 'function') {
    eventHandlerTree[branchName](singleSignalK[branchName])
  } else if (typeof eventHandlerTree[branchName] === 'undefined') {
  } else {
    dispatchInTree(singleSignalK[branchName], eventHandlerTree[branchName]);
  }
}
function dispatch(data) {
  dispatchInTree(data, eventHandlers);
}

module.exports.dispatchInTree = dispatchInTree;

/* Walks directly down the hierarchy of a single SignalK message and if 
  property name X is found in the array calls method handleX in the 
  objectWithDispatchMethods*/
function byNameDispatcher(keysArray, objectWithDispatchMethods) {
  return function handleOrRecurse(singleSignalK) {
    if (typeof singleSignalK === 'object' && singleSignalKx !== null) {
    var branchName = Object.keys(singleSignalK)[0];
    if (keysArray.indexOf(branchName) != -1) {
      var dispatcherFunction = objectWithDispatchMethods['handle_' + branchName];
      if (typeof dispatcherFunction === 'function') {
        dispatcherFunction.bind(objectWithDispatchMethods);
        dispatcherFunction.call(objectWithDispatchMethods, singleSignalK[branchName].value);
      } else {
        console.error("No method named handle_" + branchName + " found");
        console.error(JSON.stringify(objectWithDispatchMethods));
      }
    } else {
      handleOrRecurse(singleSignalK[branchName]);
    }
  }
  }
}

module.exports.byNameDispatcher = byNameDispatcher;

/*
var keys = ['a','b'];
var objectWithDispatchMethods = {handle_a :function(x){console.log(x + this.y)}, y: 100};
byNameDispatcher(keys, objectWithDispatchMethods)({q:{a:{value: 77}}});
byNameDispatcher(keys, objectWithDispatchMethods)({q:{b:{value: 77}}});
byNameDispatcher(keys, objectWithDispatchMethods)({q:{c:{value: 77}}});
*/
