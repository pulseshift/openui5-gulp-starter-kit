sap.ui.define(['sap/ui/core/UIComponent', 'app/todo/model/models'], function(
  UIComponent,
  models,
  rootReducer
) {
  return UIComponent.extend('app.todo.Component', {
    metadata: {
      manifest: 'json'
    },

    /**
     * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
     * @public
     * @override
     */
    init() {
      // call the base component's init function
      UIComponent.prototype.init.apply(this, arguments)

      // create the views based on the url/hash
      this.getRouter().initialize()

      // set the device model
      this.setModel(models.createDeviceModel(), 'device')

      // set the todo model
      this.setModel(models.createTodoModel(), 'todo')
    }
  })
})
