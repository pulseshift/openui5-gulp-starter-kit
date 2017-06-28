/* @flow */

sap.ui.define(['sap/ui/model/json/JSONModel', 'sap/ui/Device'], function(
  JSONModel,
  Device
) {
  return {
    createDeviceModel() {
      var oModel = new JSONModel(Device)
      oModel.setDefaultBindingMode('OneWay')
      return oModel
    },

    createTodoModel() {
      var oModel = new JSONModel({
        items: [
          {
            name: 'Toast',
            isCompleted: false
          },
          {
            name: 'Banana',
            isCompleted: false
          },
          {
            name: 'Pineapple',
            isCompleted: false
          }
        ]
      })
      oModel.setDefaultBindingMode('OneWay')
      return oModel
    }
  }
})
