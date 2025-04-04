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
    (Controller, UIComponent, JSONModel, Fragment, Filter, FilterOperator, MessageBox, BusyIndicator, Column, Label, Text, MessageToast, formatter) => {
    "use strict";

    return Controller.extend("re.fin.createcostestimate.controller.Main", {
        formatter: formatter,
        onInit() {
            this.oRouter = this.getOwnerComponent().getRouter();
            this.oRouter.getRoute("RouteMain").attachPatternMatched(this.onRouteMatched, this);
            
        },

        async onRouteMatched(oEvent){
            await this.setDefaultData();
            const month = new Date().getMonth() + 1;
            const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            var oCreationData = {
                "costingFromDate": new Date().getDate() + "/" + month + "/" + new Date().getFullYear(),
                "costingToDate": lastDay.getDate() + "/" + month + "/" + lastDay.getFullYear()
            };
            var oCreationModel = new JSONModel(oCreationData);
            this.getView().setModel(oCreationModel,"CreateModel");

            let oProgressModel = new JSONModel();
            this.getView().setModel(oProgressModel,"ProgressModel");

            this.getView().byId("refin-idRefresh").firePress();
        },

        async setDefaultData(){
            BusyIndicator.show();
            await this.getMaterialData();
            await this.getPlantData();
            await this.getErrorMappings();
            BusyIndicator.hide();
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

        async getPlantData(){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.ZBTP_API_COST_ESTIMATE_SRV.uri);
            try {
                const response = await fetch(sUri + "/zplant_vh_set?$format=json");
                if (!response.ok) {
                    let errorText = await response.text();
                    BusyIndicator.hide();
                    MessageBox.error(errorText);
                }else{
                    const responseData = await response.json();
                    if (responseData) {
                        const plantData = responseData.d.results;
                        let oPlantModel = new JSONModel(plantData);
                        this.getView().setModel(oPlantModel,"PlantHelp");
                    }
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while fetching plant data from S/4");
            }
        },

        async getMaterialData(){
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.ZBTP_API_COST_ESTIMATE_SRV.uri);
            try {
                const response = await fetch(sUri + "/zmaterial_vh_type?$format=json");
                if (!response.ok) {
                    let errorText = await response.text();
                    BusyIndicator.hide();
                    MessageBox.error(errorText);
                }else{
                    const responseData = await response.json();
                    if (responseData) {
                        const materialData = responseData.d.results;
                        let oMaterialModel = new JSONModel(materialData);
                        this.getView().setModel(oMaterialModel,"MaterialHelp");
                    }
                }
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error while fetching material data from S/4");
            }
        },

        onMaterialReq(oEvent){
            this.materialInput = oEvent.getSource();
            var oView = this.getView();
                if (!this.oMaterialPopup) {
                    this.oMaterialPopup = Fragment.load({
                        controller: this,
                        name: "re.fin.createcostestimate.view.fragments.MaterialHelp"
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    })
                }
                this.oMaterialPopup.then(function (oDialog) {
                    oDialog.open();
                });
        },

        onPlantReq(oEvent){
            this.plantInput = oEvent.getSource();
            var oView = this.getView();
                if (!this.oPlantPopup) {
                    this.oPlantPopup = Fragment.load({
                        controller: this,
                        name: "re.fin.createcostestimate.view.fragments.PlantHelp"
                    }).then(function (oDialog) {
                        oView.addDependent(oDialog);
                        return oDialog;
                    })
                }
                this.oPlantPopup.then(function (oDialog) {
                    oDialog.open();
                });
        },

        onMaterialSelect(oEvent){
            let oSelectedItem = oEvent.getParameter("selectedItem").getBindingContext("MaterialHelp").getObject().matnr;
            oEvent.getSource().getBinding("items").filter([]);
            if (!oSelectedItem) {
                return;
            }
            this.materialInput.setValue(oSelectedItem);
            if (this.getView().getModel("CreateModel").getData().material === oSelectedItem) {
                let materialDescription = this.getView().getModel("MaterialHelp").getData().find(item => item.matnr === oSelectedItem).maktx;
                this.getView().byId("refin-idCreateMatDescr").setText(materialDescription);
            }
        },

        onPlantSelect(oEvent){
            let oSelectedItem = oEvent.getParameter("selectedItem").getBindingContext("PlantHelp").getObject().Werks;
            oEvent.getSource().getBinding("items").filter([]);
            if (!oSelectedItem) {
                return;
            }
            this.plantInput.setValue(oSelectedItem);
            if (this.getView().getModel("CreateModel").getData().plant === oSelectedItem) {
                let plantDescription = this.getView().getModel("PlantHelp").getData().find(item => item.Werks === oSelectedItem).Name;
                this.getView().byId("refin-idCreatePlantDescr").setText(plantDescription);
            }
        },

        onSearchMaterial: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var aFilters = [];
            if(sValue){
                aFilters = [
                    new Filter([
                        new Filter("matnr", FilterOperator.Contains, sValue),
                        new Filter("maktx", FilterOperator.Contains, sValue)
                    ], false)
                ];
              }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onSearchPlant: function (oEvent) {
            var sValue = oEvent.getParameter("value");
            var aFilters = [];
            if(sValue){
                aFilters = [
                    new Filter([
                        new Filter("Werks", FilterOperator.Contains, sValue),
                        new Filter("Name", FilterOperator.Contains, sValue)
                    ], false)
                ];
              }
            oEvent.getSource().getBinding("items").filter(aFilters);
        },

        onFilterSearch(oEvent){
            const filterData = this.getView().getModel("Filter").getData();
            const materialInput = filterData.material;
            const plantInput = filterData.plant;
            const fromDate = filterData.startDate;
            const toDate = filterData.endDate;
            const status = filterData.status;
            var oTable = this.getView().byId("refin-idMainTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];
            // var oCombinedFilter = new Filter({
            //     filters: [oMaterialFilter, oPlantFilter, oStatusFilter]
            // });
            // if (materialInput) {
            //     const oMaterialFilter = new Filter("material", FilterOperator.Contains, materialInput);
            // }
            // if (plantInput) {
            //     const oPlantFilter = new Filter("plant", FilterOperator.Contains, plantInput);
            // }
            // if (condition) {
            //     const oStatusFilter = new Filter("status", FilterOperator.Contains, status);
            // }
            // if (materialInput || plantInput || status) {
                
                
                
                
            //     aFilters.push(oCombinedFilter);
            // }
            // oBinding.filter(aFilters);
            // this.setTableProperties();
        },

        onLiveSearch(oEvent){
            var sQuery = oEvent.getParameter("newValue");
            var oTable = this.getView().byId("refin-idMainTable");
            var oBinding = oTable.getBinding("items");
            var aFilters = [];
            if (sQuery) {
                const oRefIdFilter = new Filter("referenceId", FilterOperator.Contains, sQuery);
                const oMaterialFilter = new Filter("material", FilterOperator.Contains, sQuery);
                const oPlantFilter = new Filter("plant", FilterOperator.Contains, sQuery);
                const oStatusFilter = new Filter("status", FilterOperator.Contains, sQuery);
                const oMatNameFilter = new Filter("materialName", FilterOperator.Contains, sQuery);
                const oPlantNameFilter = new Filter("plantName", FilterOperator.Contains, sQuery);
                const oCombinedFilter = new Filter({
                    filters: [oRefIdFilter, oMaterialFilter, oPlantFilter, oStatusFilter, oMatNameFilter, oPlantNameFilter]
                });
                aFilters.push(oCombinedFilter);
            }
            oBinding.filter(aFilters);
            this.setTableProperties();
        },

        async onRefresh(oEvent){
            BusyIndicator.show();
            const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
            try {
                const response = await fetch(sUri + "/CostEstimateLog?$expand=errorLogs"); 
                if (!response.ok) {
                    let errorText = await response.text();
                    BusyIndicator.hide();
                    MessageBox.error(errorText);
                }else{
                    const oCloudResp = await response.json();
                    this.cloudRecords = oCloudResp.value;
                    this.getView().byId("refin-idMainTabTitle").setText(`Cost Estimate Records ( ${this.cloudRecords.length} )`);
                    this.getView().getModel("Records").setData(this.cloudRecords);
                    this.getView().getModel("Records").refresh();
                }
                this.setTableProperties();
                BusyIndicator.hide();
            } catch (error) {
                BusyIndicator.hide();
                MessageBox.error("Error fetching cost estimate records");
            }                    
        },

        setTableProperties(){
            let oTable = this.getView().byId("refin-idMainTable").getItems();
                for (let index = 0; index < oTable.length; index++) {
                    const element = oTable[index];
                    switch (element.getCells()[6].getText()) {
                        case "Success":
                            element.getCells()[6].setIcon("sap-icon://verified");
                            element.getCells()[6].setState("Success");
                            element.getCells()[7].setVisible(true);                            
                            break;
                        case "Completed":
                            element.getCells()[6].setIcon("sap-icon://complete");
                            element.getCells()[6].setState("Information");
                            element.getCells()[7].setVisible(false);                            
                            break;
                        case "Error":
                            element.getCells()[6].setIcon("sap-icon://status-error");
                            element.getCells()[6].setState("Error");
                            element.getCells()[7].setVisible(false);
                            break;
                        case "Submitted":
                            element.getCells()[6].setIcon("sap-icon://in-progress");
                            element.getCells()[6].setState("Warning");
                            element.getCells()[7].setVisible(false);                            
                            break;
                        case "Cancelled":
                            element.getCells()[6].setIcon("sap-icon://cancel");
                            element.getCells()[6].setState("Indication02");
                            element.getCells()[7].setVisible(false);                            
                            break;
                        default:
                            break;
                    }                   
                }
        },

        onItemNavigate(oEvent){
            const selectedIndex = oEvent.getSource().getBindingContext("Records").sPath.split("/")[1];
            const parentId = this.getOwnerComponent().getModel("Records").getData()[selectedIndex].ID;
            const oRouter = this.oRouter;
            oRouter.navTo("RouteErrorDetail",{
                parentId: parentId
            });
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
                    if (cloudResp.ID) {
                        const parentId = cloudResp.ID;
                        const errorLogUpdProm = await this.activateErrorLogOperation(cloudOp, parentId);
                        const errorResponse = await Promise.all(errorLogUpdProm);
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
                    oProgressData[1].executionCompleted = true;
                    oProgressData[1].operationStatus = "FAILED";
                    oProgressData[1].active = false;
                    this.getView().getModel("ProgressModel").setData(oProgressData);
                    this.getView().getModel("ProgressModel").refresh();
                    this.setProgressTabProps();
                }
            }                                     
        },

        activateErrorLogOperation(cloudOp, parentId){
                var errorLogsPayload = [];
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
                        "recentNotif": "",
                        "ageingText": ""
                }
                const plantErrors = this.errorMappings.filter(item => item.plant === this.getView().getModel("CreateModel").getData().plant);
                for (let index = 0; index < plantErrors.length; index++) {
                    const element = plantErrors[index];
                        logsPayload = {};
                        logsPayload.referenceId = jQuery.now().toString();
                        logsPayload.parentId = parentId;
                        logsPayload.errorId = element.errorcode;
                        logsPayload.type = 'E';
                        logsPayload.description = plantErrors.find(item => item.errorcode === element.errorcode && item.plant === this.getView().getModel("CreateModel").getData().plant)?.description || "";
                        logsPayload.message = logsPayload.description;
                        logsPayload.assignedDepartment = plantErrors.find(item => item.errorcode === element.errorcode && item.plant === this.getView().getModel("CreateModel").getData().plant)?.department || "";
                        if (logsPayload.assignedDepartment) {
                            let month = new Date().getMonth() + 1;
                            // logsPayload.assignedOn = new Date().getDate() + "/" + month + "/" + new Date().getFullYear();
                            logsPayload.assignedOn = new Date();
                            logsPayload.departmentMail = this.masterMappings.find(item => item.department === logsPayload.assignedDepartment && item.plant === this.getView().getModel("CreateModel").getData().plant)?.email || "";
                            logsPayload.resolutionStatus = "Pending";
                            // logsPayload.recentNotif = new Date().getDate() + "/" + month + "/" + new Date().getFullYear();
                        }else{
                            logsPayload.resolutionStatus = "Not Assigned";
                        }
                        errorLogsPayload.push(logsPayload);
                    
                };
                const sUri = this.getOwnerComponent().getManifestObject().resolveUri(this.getOwnerComponent().getManifestEntry("sap.app").dataSources.mainService.uri);
                let errorPromises=[];
                for (let index = 0; index < errorLogsPayload.length; index++) {
                    const element = errorLogsPayload[index];
                    let errProm = new Promise(function(resolve,reject){
                        $.ajax(sUri + "/ErrorLogs", {
                            type: "POST",
                            contentType: "application/json",
                            data: JSON.stringify(errorLogsPayload[index]),
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
                return errorPromises;
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

        setProgressTabProps(){
            let oProgressModel = this.getView().getModel("ProgressModel").getData();
            const oProgressTab = this.getView().byId("refin-idProgressTable").getItems();
            for (let index = 0; index < oProgressTab.length; index++) {
                let element = oProgressTab[index];
                if (oProgressModel[index].executionCompleted) {
                    element.getCells()[1].removeStyleClass("mySpinningIcon");
                    element.getCells()[1].setIcon("");
                    if (oProgressModel[index].operationStatus === 'DONE') {
                        element.getCells()[1].setState("Success");
                    }else if(oProgressModel[index].operationStatus === 'FAILED'){
                        element.getCells()[1].setState("Error");
                    }
                    
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
            const month = new Date().getMonth() + 1;
            const lastDay = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0);
            let oPayload = {
                "referenceId": jQuery.now().toString(),
                "material": this.getView().getModel("CreateModel").getData().material,
                "materialName": this.getView().getModel("CreateModel").getData().materialName,
                "plant": this.getView().getModel("CreateModel").getData().plant,
                "plantName": this.getView().getModel("CreateModel").getData().plantName,
                "costingFromDate": new Date().getDate() + "/" + month + "/" + new Date().getFullYear(),
                "costingToDate": lastDay.getDate() + "/" + month + "/" + lastDay.getFullYear(),
                "status": "Error",
                "systemStatus": "SUCCESS",
                "noOfErrors": 4
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
                });  
            });
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
            let material = this.getView().getModel("CreateModel").getData().material;
            let plant = this.getView().getModel("CreateModel").getData().plant;
            const materialExists = this.getView().getModel("MaterialHelp").getData().some(item => item.matnr === material);
            const plantExists = this.getView().getModel("PlantHelp").getData().some(item => item.Werks === plant);
            if (materialExists && plantExists){
                validateInputCheckFail = false;
            }else{
                validateInputCheckFail = true;
                if (!materialExists) {
                    this.getView().byId("refin-idCreateMaterial").setValueState("Error");
                    this.getView().byId("refin-idCreateMaterial").setValueStateText("Material doesn't exist");
                }else{
                    this.getView().byId("refin-idCreateMaterial").setValueState("None");
                    this.getView().byId("refin-idCreateMaterial").setValueStateText("");
                }

                if (!plantExists) {
                    this.getView().byId("refin-idCreatePlant").setValueState("Error");
                    this.getView().byId("refin-idCreatePlant").setValueStateText("Plant doesn't exists");
                }else{
                    this.getView().byId("refin-idCreatePlant").setValueState("None");
                    this.getView().byId("refin-idCreatePlant").setValueStateText("");
                }
            }
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