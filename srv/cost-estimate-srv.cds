namespace costestimate.srv;
using { costestimate.db as dbmodel } from '../db/cost-estimate-model';

@path: '/cost-estimate-tracker'
service CostTrackService{
    entity CostEstimateLog as projection on dbmodel.CostEstimateStatus;
    entity ErrorLogs as projection on dbmodel.ErrorLogs;
}
