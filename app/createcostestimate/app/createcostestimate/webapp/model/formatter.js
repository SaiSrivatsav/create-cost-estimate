sap.ui.define([
], function () {
    "use strict";

    return {
        formatIcon: function(status){
            if (status === "SUCCESS") {
                return "sap-icon://verified"
            }else if(status === "COMPLETED"){
                return "sap-icon://complete"
            }else if(status === "ERROR"){
                return "sap-icon://status-error"
            }else if(status === "SUBMITTED"){
                return "sap-icon://in-progress"
            }else if(status === "CANCELLED"){
                return "sap-icon://cancel"
            }
        },

        formatState: function(status){
            if (status === "SUCCESS") {
                return "Indication03"
            }else if(status === "COMPLETED"){
                return "Success"
            }else if(status === "ERROR"){
                return "Error"
            }else if(status === "SUBMITTED"){
                return "Warning"
            }else if(status === "CANCELLED"){
                return "Indication02"
            } 
        },

        formatMarkRelease: function(status){
            if (status === "SUCCESS") {
                return true;
            }else{
                return false;
            }
        }

    };
});