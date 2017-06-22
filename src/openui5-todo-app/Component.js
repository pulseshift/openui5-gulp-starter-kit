sap.ui.define([
  'sap/ui/core/UIComponent',
  'sap/ui/core/routing/HashChanger',
  'sap/ui/model/json/JSONModel',
  'ps/model/models'
], function(UIComponent, HashChanger, JSONModel, models, rootReducer) {

  return UIComponent.extend('ps.Component', {

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
      UIComponent.prototype.init.apply(this, arguments);

      // create the views based on the url/hash
      this.getRouter().initialize();

      // set the device model
      this.setModel(models.createDeviceModel(), 'device');

    }

  });
});
