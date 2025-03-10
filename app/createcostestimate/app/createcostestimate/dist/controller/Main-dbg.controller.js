sap.ui.define([
    "sap/ui/core/mvc/Controller",
    "sap/ui/core/UIComponent",
    "sap/ui/model/json/JSONModel",
    "sap/ui/core/Fragment",
    "sap/ui/model/Filter",
    "sap/ui/model/FilterOperator",
    "sap/m/MessageBox",
    "sap/ui/core/BusyIndicator",
    'sap/ui/table/Column',
    'sap/m/Label',
    'sap/m/Text',
    "sap/m/MessageToast",
    "re/fin/createcostestimate/model/formatter"], 
    (Controller, UIComponent, JSONModel, Fragment, Filter, FilterOperator, MessageBox, BusyIndicator, Label, Text, MessageToast, formatter) => {
    "use strict";

    return Controller.extend("re.fin.createcostestimate.controller.Main", {
        formatter: formatter,
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
        },

        onRouteMatched(oEvent){
            var oCreationData = {
                "material": "MT-00001",
                "materialName": "Material name text",
                "plant": "3241",
                "plantName": "Plant name text",
                "costingFromDate": new Date(),
                "costingToDate": new Date()
            };
            var oCreationModel = new JSONModel(oCreationData);
            this.getView().setModel(oCreationModel,"CreateModel");

            let oProgressModel = new JSONModel();
            this.getView().setModel(oProgressModel,"ProgressModel");

            this.getView().byId("refin-idRefresh").firePress();
        },

        async onRefresh(oEvent){
            BusyIndicator.show();
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            try {
                const response = await fetch(sUri + "/CostEstimateLog");
                if (!response.ok) {
                    let errorText = await response.text();
                }else{
                    const oCloudResp = await response.json();
                    this.cloudRecords = oCloudResp.value;
                    this.getView().getModel("Records").setData(this.cloudRecords);
                    this.getView().getModel("Records").refresh();
                }
                let oTable = this.getView().byId("refin-idMainTable").getItems();
                for (let index = 0; index < oTable.length; index++) {
                    const element = oTable[index];
                    switch (element.getCells()[5].getText()) {
                        case "SUCCESS":
                            element.getCells()[5].setIcon("sap-icon://verified");
                            element.getCells()[5].setState("Success");
                            element.setType("Inactive");
                            break;
                        case "COMPLETED":
                            element.getCells()[5].setIcon("sap-icon://complete");
                            element.getCells()[5].setState("Information");
                            element.setType("Inactive");
                            break;
                        case "ERROR":
                            element.getCells()[5].setIcon("sap-icon://status-error");
                            element.getCells()[5].setState("Error"); 
                            element.getCells()[5].setType("Navigation");
                            break;
                        case "SUBMITTED":
                            element.getCells()[5].setIcon("sap-icon://in-progress");
                            element.getCells()[5].setState("Warning");
                            element.setType("Inactive");
                            break;
                        case "CANCELLED":
                            element.getCells()[5].setIcon("sap-icon://cancel");
                            element.getCells()[5].setState("Indication02");
                            element.setType("Inactive");
                            break;
                        default:
                            break;
                    }                   
                }
                BusyIndicator.hide();
            } catch (error) {
                BusyIndicator.hide();
            }                    
        },

        onItemNavigate(oEvent){

        },

        onCreateCostEstimate(oEvent){
            var oView = this.getView();
            if (this.oCreateDialog) {
                this.oCreateDialog = undefined;
            }
            if (!this.oCreateDialog) {
                this.oCreateDialog = Fragment.load({
                    id: oView.getId(),
                    controller: this,
                    name: "re.fin.createcostestimate.view.fragments.CreateDialog"
                }).then(oDialog => {
                    oView.addDependent(oDialog);
                    return oDialog;
                });
            }
            this.oCreateDialog.then(function (oDialog) {
                oDialog.open();
            });   
        },

        async onSubmit(oEvent){
            let preCheckPass = this.submitPreChecks();
            if (preCheckPass) {
                let oProgressData = [                    
                    {
                        "executionId": "CREATE-COST-EST",
                        "executionCompleted": false,
                        "active": false,
                        "operation": "Creating Cost Estimate",
                        "operationStatus": "Processing"                       
                    },
                    {
                        "executionId": "CLOUD-INSERT-NEW",
                        "executionCompleted": false,
                        "active": false,
                        "operation": "Updating data to cloud",
                        "operationStatus": "Pending"                       
                    }
                ];
                this.getView().getModel("ProgressModel").setData(oProgressData);
                this.getView().getDependents()[0].destroy();
                this.showProgressDialog();                                
                try {
                    const createResp = await this.createCostEstimate();  

                    oProgressData[0].executionCompleted = true;
                    oProgressData[0].operationStatus = "DONE";
                    oProgressData[0].active = false;
                    
                    oProgressData[1].operationStatus = "Processing";
                    oProgressData[1].active = true;

                    this.getView().getModel("ProgressModel").setData(oProgressData);
                    this.getView().getModel("ProgressModel").refresh();

                    this.setProgressTabProps();
                    
                    const cloudOp = "CREATE"                    
                    const cloudResp = await this.activateCloudOperation(cloudOp);
                    if (cloudResp) {
                        oProgressData[1].executionCompleted = true;
                        oProgressData[1].operationStatus = "DONE";
                        oProgressData[1].active = false;
                        this.getView().getModel("ProgressModel").setData(oProgressData);
                        this.getView().getModel("ProgressModel").refresh();
                    }
                    this.setProgressTabProps();
                    this.getView().byId("refin-idCloseProgress").setVisible(true);
                    this.getView().byId("refin-idRefresh").firePress();
                } catch (error) {
                    
                }
            }                                     
        },

        setProgressTabProps(){
            let oProgressModel = this.getView().getModel("ProgressModel").getData();
            const oProgressTab = this.getView().byId("refin-idProgressTable").getItems();
            for (let index = 0; index < oProgressTab.length; index++) {
                let element = oProgressTab[index];
                if (oProgressModel[index].executionCompleted) {
                    element.getCells()[1].removeStyleClass("mySpinningIcon");
                    element.getCells()[1].setIcon("");
                    element.getCells()[1].setState("Success");
                }else{
                    if (oProgressModel[index].active) {
                        element.getCells()[1].setIcon("sap-icon://synchronize");
                        element.getCells()[1].addStyleClass("mySpinningIcon");
                        element.getCells()[1].setState("Warning");
                    }else{                        
                        element.getCells()[1].setIcon("");
                        element.getCells()[1].setState("None");   
                    }
                }
                
            }
        },

        activateCloudOperation(cloudOp){
            let oPayload = {
                "referenceId": "4238718",
                "material": this.getView().getModel("CreateModel").getData().material,
                "materialName": "Material name text",
                "plant": this.getView().getModel("CreateModel").getData().plant,
                "plantName": "Plant name text",
                "costingFromDate": this.getView().getModel("CreateModel").costingFromDate,
                "costingToDate": this.getView().getModel("CreateModel").costingToDate,
                "status": "ERROR",
                "systemStatus": "SUCCESS",
                "noOfErrors": 2,
                "errorLogs":[
                    {
                        "referenceId": "0001",
                        "errorId": "E101",
                        "description": "Error test",
                        "message": "Error Message Test",
                        "assignedDepartment": "MDM",
                        "assignedOn": new Date(),
                        "departmentMail": "mdm@re.com",
                        "resolutionStatus": "Pending"
                    }
                ]
            };
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            return new Promise(function(resolve,reject){
                $.ajax(sUri + "/CostEstimateLog", {
                    type: "POST",
                    contentType: "application/json",
                    data: JSON.stringify(oPayload),
                    success: (response) => {
                        resolve(response);
                    },
                    error: (error) => {
                        reject(error);
                    }
                })  
            })
        },

        async createCostEstimate(executionId){
            return new Promise(resolve => setTimeout(resolve, 3000));
        },

        submitPreChecks(){
            let mandatoryCheckFail = this.checkMandatoryFields();
            let validateInputCheckFail = this.validateInputCheck();
            if (!mandatoryCheckFail && !validateInputCheckFail) {
                return true;
            }else{
                return false;
            }
        },

        onProgressDialogClose(oEvent){
            oEvent.getSource().getParent().getParent().destroy();

        },

        showProgressDialog(){
            var oView = this.getView();
            if (this.oProgressDialog) {
                this.oProgressDialog = undefined;
            }
            if (!this.oProgressDialog) {
                this.oProgressDialog = Fragment.load({
                    id: oView.getId(),
                    controller: this,
                    name: "re.fin.createcostestimate.view.fragments.ProgressDialog"
                }).then(oProgressDialog => {
                    oView.addDependent(oProgressDialog);
                    return oProgressDialog;
                });
            }
            this.oProgressDialog.then(function (oProgressDialog) {
                const tabItems = oProgressDialog.getAggregation("content")[0].getItems();
                oProgressDialog.getAggregation("content")[0].removeSelections(true);
                for (let index = 0; index < tabItems.length; index++) {
                    let element = tabItems[index];
                    if (index === 0) {
                        element.getCells()[1].addStyleClass("mySpinningIcon");
                        element.getCells()[1].setIcon("sap-icon://synchronize");
                        element.getCells()[1].setState("Warning");
                    }else{
                        element.getCells()[1].setIcon("");
                        element.getCells()[1].setState("None");
                    }
                }
                oProgressDialog.open();
            });
        },

        validateInputCheck(){
            let validateInputCheckFail = false;
            return validateInputCheckFail;
        },

        checkMandatoryFields(){
            let mandatoryCheckFail = false;
            if(!this.getView().byId("refin-idCreateMaterial").getValue()){
                this.getView().byId("refin-idCreateMaterial").setValueState("Error");
                this.getView().byId("refin-idCreateMaterial").setValueStateText("Material is required");
                mandatoryCheckFail = true;
            }else{
                this.getView().byId("refin-idCreateMaterial").setValueState("None");
                this.getView().byId("refin-idCreateMaterial").setValueStateText("");
                mandatoryCheckFail = false;
            }

            if (!this.getView().byId("refin-idCreatePlant").getValue()) {
                this.getView().byId("refin-idCreatePlant").setValueState("Error");
                this.getView().byId("refin-idCreatePlant").setValueStateText("Plant is required");
                mandatoryCheckFail = true;
            }else{
                this.getView().byId("refin-idCreatePlant").setValueState("None");
                this.getView().byId("refin-idCreatePlant").setValueStateText("");
                mandatoryCheckFail = false;
            }
            return mandatoryCheckFail;
        },

        onCancelDialog(oEvent){
            oEvent.getSource().getParent().getParent().destroy();
        }
    });
});