namespace costestimate.db;
using { cuid, managed } from '@sap/cds/common';

entity CostEstimateStatus: cuid, managed{
    referenceId: String;
    material: String(40);
    plant: String(4);
    status: String;
    systemStatus: String;
    noOfErrors: Integer;
    responseJson: LargeString;
    errorLogs: Association[0..*] to ErrorLogs;
};

entity ErrorLogs: cuid, managed{
    referenceId: String;
    parentId: UUID;
    errorId: String;
    description: String;
    message: String;
    assignedDepartment: String;
    assignedOn: DateTime;
    departmentMail: String;
    resolvedBy: String;
    resolvedOn: DateTime;
    resolutionStatus: String;
};


