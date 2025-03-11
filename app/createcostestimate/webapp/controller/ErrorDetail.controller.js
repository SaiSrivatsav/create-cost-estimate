sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/BusyIndicator",
    "sap/ui/model/json/JSONModel",
    "sap/m/MessageBox"
], (Controller, BusyIndicator, JSONModel, MessageBox) => {
    "use strict";

    return Controller.extend("re.fin.createcostestimate.controller.RouteErrorDetail", {
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteErrorDetail").attachPatternMatched(this.onRouteMatched, this);
        },
        
        onRouteMatched: function(oEvent){
            this.parentId = oEvent.getParameter("arguments").parentId; 
            this.setPageData(oEvent);
        },

        setPageData: async function(oEvent){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            const response = await fetch(sUri + `/ErrorLogs?$filter=parentId eq '${this.parentId}'`);
            if (response.ok) {
                const oErrorData = await response.json();
                const errorData = oErrorData.value;
                let oErrorModel = new JSONModel(errorData);
                this.getView().setModel(oErrorModel,"ErrorRecords");
                this.getView().getModel("ErrorRecords").refresh();
            }
        },

        onNavBack(oEvent){
            const oRouter = this.oRouter;
            oRouter.navTo("RouteMain");
        }
    });
});