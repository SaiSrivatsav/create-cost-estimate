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
            this.mainData = (this.getOwnerComponent().getModel("Records").getData()).find(item => item.ID === this.parentId);
            
            this.setPageData(oEvent);
        },

        getAgeingText(assignedDate){
            let ageingTime = (new Date() - new Date(assignedDate)) / (1000 * 60 * 60 * 24);
            if (ageingTime >= 1) {
                var ageingText = Math.round(ageingTime) + " days";
            }else{
                ageingTime = (new Date() - new Date(assignedDate)) / (1000 * 60 * 60);
                if (ageingTime >= 1) {
                    ageingText = Math.round(ageingTime) + " hours";
                }else{
                    ageingTime = (new Date() - new Date(assignedDate)) / (1000 * 60);
                    if (ageingTime >= 1) {
                        ageingText = Math.round(ageingTime) + " minutes";
                    }else{
                        ageingTime = (new Date() - new Date(assignedDate)) / (1000);
                        ageingText = Math.ceil(ageingTime) + " seconds";
                    }
                }
            }
            return ageingText;
        },

        setPageData: async function(oEvent){
            this.getView().byId("refin-titleHdrExp").setText(this.mainData.referenceId);
            this.getView().byId("refin-titleHdrSnap").setText(this.mainData.referenceId);

            this.getView().byId("refin-idMatObjHdr").setText(`${this.mainData.material} (${this.mainData.materialName})`);
            this.getView().byId("refin-idPlantObjHdr").setText(`${this.mainData.plant} (${this.mainData.plantName})`);
            
            const month = new Date(this.mainData.createdAt).getMonth() + 1;
            const creationDate = new Date(this.mainData.createdAt).getDate() + "/" + month + "/" + new Date(this.mainData.createdAt).getFullYear();
            this.getView().byId("refin-idCreationDateHdr").setText(creationDate);
            this.getView().byId("refin-idAgeingHdr").setText(this.getAgeingText(this.mainData.createdAt));

            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            const errorData = this.mainData.errorLogs;
            let oErrorModel = new JSONModel(errorData);
            for (let index = 0; index < errorData.length; index++) {
                const element = errorData[index];
                if (element.assignedDepartment) {
                    let assignedDate = new Date(element.assignedOn);
                    let month = assignedDate.getMonth() + 1;
                    element.ageingText = this.getAgeingText(assignedDate);
                    element.assignedOn = assignedDate.getDate() + "/" + month + "/" + assignedDate.getFullYear();
                }else{
                    element.ageingText = "";
                    element.assignedDate = "";
                }
            }
            this.getView().setModel(oErrorModel,"ErrorRecords");
            this.getView().getModel("ErrorRecords").refresh();

            this.setTableProps();
        },

        async onMainRefresh(oEvent){
            BusyIndicator.show();
            await this.getErrorMappings();
            for (let index = 0; index < this.getView().getModel("ErrorRecords").getData().length; index++) {
                var element = this.getView().getModel("ErrorRecords").getData()[index];
                if (!element.assignedDepartment) {
                    element.assignedDepartment = this.errorMappings.find(item => item.errorcode === element.errorId && item.plant === this.mainData.plant)?.department || "";
                    element.message = this.errorMappings.find(item => item.errorcode === element.errorId && item.plant === this.mainData.plant)?.description || "";
                    element.assignedOn = new Date();
                    element.departmentMail = this.masterMappings.find(item => item.department === element.assignedDepartment && item.plant === this.mainData.plant)?.email || "";
                    element.resolutionStatus = "Pending";
                }
            }
            this.getView().getModel("ErrorRecords").refresh();
            await this.updateErrorLogs();
            this.setTableProps();
            BusyIndicator.hide();
        },

        setTableProps(){
            let oModel = this.getView().getModel("ErrorRecords").getData();

        },

        async updateErrorLogs(){
            var updateErrors=[];
            var logsPayload = {
                "referenceId": "",
                "parentId": "",
                "errorId": "",
                "type": "",
                "description": "",
                "message": "",
                "assignedDepartment": "",
                "assignedTime": "",
                "assignedOn": "",
                "departmentMail": "",
                "resolutionStatus": "",
                "recentNotif": ""
            }
            let errorLogsPayload = this.getView().getModel("ErrorRecords").getData();
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                let errorPromises=[];
                for (let index = 0; index < errorLogsPayload.length; index++) {
                    const element = errorLogsPayload[index];
                    logsPayload = {};
                    logsPayload.referenceId = element.referenceId;
                    logsPayload.parentId = element.parentId;
                    logsPayload.errorId = element.errorId;
                    logsPayload.type = element.type;
                    logsPayload.description = element.description;
                    logsPayload.message = element.message;
                    logsPayload.assignedDepartment = element.assignedDepartment;
                    logsPayload.assignedOn = element.assignedOn;
                    logsPayload.departmentMail = element.departmentMail;
                    logsPayload.resolutionStatus = element.resolutionStatus;
                    logsPayload.recentNotif = element.recentNotif;
                    let errProm = new Promise(function(resolve,reject){
                        $.ajax(sUri + "/ErrorLogs/" + element.ID, {
                            type: "PUT",
                            contentType: "application/json",
                            data: JSON.stringify(logsPayload),
                            success: (response) => {
                                resolve(response);
                            },
                            error: (error) => {
                                reject(error);
                            }
                        });  
                    });
                    errorPromises.push(errProm);
                }
            try {
                const response = await Promise.all(errorPromises);
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while updating error logs");
            } 
        },

        async getErrorMappings(){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.errorMappingService.uri);
            try {
                const errorMapResponse = await fetch(sUri + "/ErrorRecordSet");
                const masterMapResponse = await fetch(sUri + "/MasterConfigSet");
                // Error Mappings
                if (!errorMapResponse.ok) {
                    let errorMapErrText = await errorMapResponse.text();
                    BusyIndicator.hide()
                    MessageBox.error(errorMapErrText);
                }else{
                    const errorMapData = await errorMapResponse.json();
                    this.errorMappings = errorMapData.value;
                }

                // Master Data Config - Department Mappings
                if (!masterMapResponse.ok) {
                    let masterMapErrText = await masterMapResponse.text();
                    BusyIndicator.hide();
                    MessageBox.error(masterMapErrText);
                }else{
                    const masterMapData = await masterMapResponse.json();
                    this.masterMappings = masterMapData.value;
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while fetching error mapping configurations.");
            }
        },

        onNavBack(oEvent){
            const oRouter = this.oRouter;
            oRouter.navTo("RouteMain");
        }
    });
});