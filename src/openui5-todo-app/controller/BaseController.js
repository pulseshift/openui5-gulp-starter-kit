/* @flow */

sap.ui.define(
  [
    'sap/ui/core/mvc/Controller',
    'sap/ui/core/routing/History',
    'sap/ui/model/json/JSONModel',
    'app/todo/model/formatter'
  ],
  function(Controller, History, JSONModel, formatter) {
    return Controller.extend('app.todo.controller.BaseController', {
      /* ----------------------------------------------------------- *
       * attributes
       * ----------------------------------------------------------- */

      /**
       * Map with functions to all formatters.
       * @public
       * @type {map}
       */
      formatter: formatter,

      /* ----------------------------------------------------------- *
       * methods
       * ----------------------------------------------------------- */

      /**
       * Go one step back in broser history.
       * @public
       */
      onNavBack() {
        const oHistory = History.getInstance()
        const sPreviousHash = oHistory.getPreviousHash()

        if (sPreviousHash) {
          window.history.go(-1) // go back in history
        } else {
          this.getRouter().navTo('root', {}, true /*no history*/)
        }
      },

      /**
       * Get router of UI Component.
       * @public
       * @returns {sap.m.routing.Router} App Router.
       */
      getRouter() {
        return sap.ui.core.UIComponent.getRouterFor(this)
      },

      /**
       * Get translated Text for sTxt
       * @param {string} [sTxt] i18n text Id.
       * @param {array} [aArgs] Arguments for i18n string.
       * @return {string} i18n translated text
       */
      getText(sTxt, aArgs) {
        return this.getOwnerComponent().getText(sTxt, aArgs)
      },

      /**
       * Method for getting the app component view model.
       * @public
       * @returns {sap.ui.model.Model} The model instance.
       */
      getViewModel() {
        const oViewModel = this.getOwnerComponent().getModel('view')

        // initialize view model if not happened, yet
        if (oViewModel === undefined) {
          const oOneWayJSONModel = new JSONModel(
            {},
            { defaultBindingMode: 'OneWay' }
          )
          this.getOwnerComponent().setModel(oOneWayJSONModel, 'view')
        }

        return oViewModel
          ? oViewModel
          : this.getOwnerComponent().getModel('view')
      },

      /**
       * Sets the initial state a view in an app-wide JSON model.
       * @public
       * @param {sap.ui.model.Model} [oViewModelData] The data object to be stored.
       */
      initViewState(oViewModelData) {
        // create model path for view (e.g. 'app.todo.controller.Main' becomes '/Main' )
        const sModelPath = this.getMetadata()
          .getName()
          .split('.controller')
          .reverse()[0]
          .replace('.index', '')
          .replace(/\./g, '/')
        const [, ...aModelPathParts] = sModelPath.split('/')
        const iPathParts = aModelPathParts.length
        const oViewModel = this.getViewModel()

        // ensure that path to view level was created and set data
        aModelPathParts.reduce((sTotalPath, sNextPathPart, iIndex) => {
          const sNewTotalPath = `${sTotalPath}/${sNextPathPart}`
          if (oViewModel.getProperty(sNewTotalPath) === undefined) {
            // hand over view model data if last part is being processed, else init with empty object
            oViewModel.setProperty(
              sNewTotalPath,
              iIndex === iPathParts - 1 ? oViewModelData : {}
            )
          }
          return sNewTotalPath
        }, '')
      }
    })
  }
)
