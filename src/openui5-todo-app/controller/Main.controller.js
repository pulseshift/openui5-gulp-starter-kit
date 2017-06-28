sap.ui.define(['app/todo/controller/BaseController'], function(BaseController) {
  return BaseController.extend('app.todo.controller.Main', {
    /* ----------------------------------------------------------- *
     * lifecycle methods
     * ----------------------------------------------------------- */

    /**
     * Called when the controller is instantiated.
     * @public
     */
    onInit() {
      // init view state (accassible via {view>/Main/...})
      this.initViewState({
        selectedFilter: 'all',
        newTodoItemName: ''
      })

      // // listen to onRouteMatched
      // this.getRouter()
      //   .getRoute('dashboard')
      //   .attachMatched(this.onRouteMatched, this)
      //
      // // listen to page show and hide events
      // this.getView().addEventDelegate({
      //   onAfterHide: () => this.onDashboardLeave()
      // })
    },

    /* ----------------------------------------------------------- *
     * event handlers
     * ----------------------------------------------------------- */

    onAddNewItem(oEvent) {
      const sNewTodoItemName = oEvent.getParameter('value')
      const oViewModel = this.getViewModel()
      const oTodoModel = this.getView().getModel('todo')
      const aTodoItems = oTodoModel.getProperty('/items')

      const aNewTodoItems = aTodoItems.concat({
        name: sNewTodoItemName,
        isCompleted: false
      })

      // add new item to todo model
      oTodoModel.setProperty('/items', aNewTodoItems)

      // refresh new todo input
      oViewModel.setProperty('/Main/newTodoItemName', '')
    },

    onDeleteTodo(oEvent) {
      const oListItem = oEvent.getParameter('listItem')
      const iIndex = oListItem.getBindingContext('todo')
      debugger
      const oViewModel = this.getViewModel()
      const oTodoModel = this.getView().getModel('todo')
      const aTodoItems = oTodoModel.getProperty('/items')

      const aNewTodoItems = aTodoItems.concat({
        name: sNewTodoItemName,
        isCompleted: false
      })

      // add new item to todo model
      oTodoModel.setProperty('/items', aNewTodoItems)
    }
  })
})
