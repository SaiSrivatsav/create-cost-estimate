namespace costestimate.db;
using { cuid, managed } from '@sap/cds/common';

entity CostEstimateStatus: cuid, managed{
    referenceId: String;
    material: String(40) @mandatory; 
    materialName: String; 
    plant: String(4) @mandatory;
    plantName: String;
    costingFromDate: String;
    costingToDate: String;
    status: String @mandatory;
    systemStatus: String;
    noOfErrors: Integer;
    responseJson: LargeString;
    errorLogs: Association[0..*] to ErrorLogs on errorLogs.parentId = $self.ID;
};

entity ErrorLogs: cuid, managed{
    referenceId: String;
    parentId: UUID @mandatory;
    errorId: String @mandatory;
    type: String @mandatory;
    description: String;
    message: String;
    assignedDepartment: String;
    assignedOn: String;
    assignedTime: String;
    departmentMail: String;
    resolvedBy: String;
    resolvedOn: String;
    resolutionStatus: String;
    recentNotif: String;
    ageingText: String;
};


