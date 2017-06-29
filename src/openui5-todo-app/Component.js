sap.ui.define(
  [
    'sap/ui/core/UIComponent',
    'app/todo/model/models',
    'sap/m/MessageBox',
    'sap/ui/Device'
  ],
  function(UIComponent, models, rootReducer, MessageBox, Device) {
    return UIComponent.extend('app.todo.Component', {
      metadata: {
        manifest: 'json'
      },

      /* ----------------------------------------------------------- *
       * lifecycle methods
       * ----------------------------------------------------------- */

      /**
       * The component is initialized by UI5 automatically during the startup of the app and calls the init method once.
       * @public
       * @override
       */
      init() {
        // call the base component's init function
        UIComponent.prototype.init.apply(this, arguments)

        // set the device model
        this.setModel(models.createDeviceModel(), 'device')

        // set the todo model
        this.setModel(models.createTodoModel(), 'todo')

        // create the views based on the url/hash
        this.getRouter().initialize()
      },

      /**
       * The window before unload hook. Override this method in your Component class implementation,
       * to handle cleanup before the real unload or to prompt a question to the user,
       * if the component should be exited.
       * @param {string} sMessage - The error message.
       * @param {string} sFile - File where the error occurred
       * @param {string} iLine - Line number of the error
       * @public
       */
      onWindowError(sMessage = '', sFile = '', iLine = 0) {
        // only raise window errors in debug mode
        if (jQuery.sap.getUriParameters().get('sap-ui-debug') !== 'true') return

        // display error popup
        this.showErrorPopup(sMessage, `${sFile}: ${iLine}`)
      },

      /* ----------------------------------------------------------- *
       * publilc methods
       * ----------------------------------------------------------- */

      /**
       * Raise an error popup.
       * @param {string} sMessage - The error message.
       * @param {any} vDetails - Details text / JSON.
       * @public
       */
      showErrorPopup(sMessage = '', vDetails) {
        // only raise one error dialog at all
        if (this._isMessageOpen) return

        // message detail text
        this._bMessageOpen = true

        MessageBox.error(sMessage, {
          details: vDetails,
          styleClass: this.getContentDensityClass(),
          actions: [MessageBox.Action.CLOSE],
          width: '400px',
          onClose: () => {
            this._bMessageOpen = false
          }
        })
      },

      /**
       * This method can be called to determine whether the sapUiSizeCompact
       * or sapUiSizeCozy design mode class should be set,
       * which influences the size appearance of some controls.
       * @return {string} css class, either 'sapUiSizeCompact' or 'sapUiSizeCozy'
       * @public
       */
      getContentDensityClass() {
        /*
         * Determine whether the sapUiSizeCompact or sapUiSizeCozy design mode class should be set for this app
         * - sapUiSizeCozy: needed to improve touch behaviour;
         * - sapUiSizeCompact: apply compact mode if touch is not supported;
         * IDEA: this could me made configurable for the user on 'combi' devices with touch AND mouse.
         */
        return Device.support.touch ? 'sapUiSizeCozy' : 'sapUiSizeCompact'
      }
    })
  }
)
