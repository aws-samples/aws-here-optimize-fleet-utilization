// CHANGE THIS!  After you deploy the CDK for API Gateway, copy/paste the unique key generated in the API Gateway URL
const apiGatewayUrlUniqueKey = 'whxh2hhpoa';
const regionUrl = 'us-east-1';
const slot = 'prod';

export function getApiBaseUrl() {
    return `https://${apiGatewayUrlUniqueKey}.execute-api.${regionUrl}.amazonaws.com/${slot}/`;
}
