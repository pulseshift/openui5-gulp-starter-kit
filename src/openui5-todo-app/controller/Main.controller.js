sap.ui.define([
  'sap/ui/core/mvc/Controller'
], function(Controller) {

  // TEST ACTION
  const ADD_TODO = 'ADD_TODO';
  const addTodo = (text) => ({
    type: ADD_TODO,
    text
  });

  return Controller.extend('ps.controller.Main', {

    onDispatchAction() {
      this.dispatch(addTodo('Learn about actions'));
    },


    // TODO: provide these methods via BaseController
    dispatch(oAction) {
      this.getOwnerComponent().getStore().dispatch(oAction);
    }

  });
});
