// noinspection JSUnresolvedVariable,DuplicatedCode

console.log('Loading function');
const aws = require('aws-sdk');
const s3 = new aws.S3();
const db = new aws.DynamoDB.DocumentClient();

const headers = {
    "Content-Type": "application/json", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

exports.handler = async function (event) {
    //Expected api invocation -> .../route?id=<invocationID>&vehicleId=<vehicleId>
    const requestedItemId = parseInt(event.multiValueQueryStringParameters.id);
    if (!requestedItemId) {
        return { statusCode: 400, body: `Error: You are missing the path parameter id` };
    }

    const requestedVehicleId = event.multiValueQueryStringParameters.vehicleId;
    if (!requestedVehicleId) {
        return { statusCode: 400, body: `Error: You are missing the path parameter vehicleId` };
    }

    const tableName = process.env.AWS_HERE_FleetPlanningTable
    console.log("DB Table name : " + tableName)
    const params = {
        TableName: tableName,
        Key: { id: JSON.stringify(requestedItemId) }
    };

    let routesDetail = {}

    try {
        console.log("Getting Items from DynamoDB, requestedItemId: " + requestedItemId
            + ", requestedVehicleId: " + requestedVehicleId)
        const response = await db.get(params).promise()

        if (response.Item) {
            const bucket = response.Item['SOLUTION_S3_BUCKET']
            const key = response.Item['SOLUTION_JSON_S3_KEY']
            console.log('Found matching solution: ' + JSON.stringify(response.Item)
                + ' . Reading Routes from ' + key
                + ' object in S3 bucket ' + bucket)
            const s3GetParams = {
                Bucket: bucket,
                Key: key
            };
            const data = await s3.getObject(s3GetParams).promise();
            const solution = JSON.parse(data.Body)
            console.log('Looking for matching vehicle')
            let match = false
            for (let t of solution["tours"]) {
                console.log('Checking ' + t["vehicleId"])
                if (requestedVehicleId == t["vehicleId"]) {
                    console.log("Found matching vehicle, updating route detail")
                    match = true
                    routesDetail["id"] = requestedItemId
                    routesDetail["vehicleId"] = requestedVehicleId
                    routesDetail["stopCount"] = t["stops"].length
                    console.log('Adding DeparturePosition, DestinationPosition and WaypointPositions')
                    let waypointsList = []
                    for (let i = 0; i < t["stops"].length; i++) {
                        // Defined as [longitude, latitude]
                        let position = [t["stops"][i]["location"]["lng"], t["stops"][i]["location"]["lat"]]
                        if (i == 0) {
                            routesDetail["DeparturePosition"] = position
                        } else if (i == t["stops"].length - 1) {
                            routesDetail["DestinationPosition"] = position
                            routesDetail["WaypointPositions"] = waypointsList
                        } else {
                            //Add Waypoint
                            waypointsList.push(position)
                        }
                    }
                    break
                }
            }

            if (!match) {
                const message = "No matching vehicleId " + requestedVehicleId + " found in item " + requestedItemId
                console.log(message)
                return { statusCode: 400, headers: headers, body: message };
            }
        }
        else {
            const message = "No Item found in DynamoDB Table for id " + requestedItemId
            console.log(message)
            return { statusCode: 400, headers: headers, body: message };
        }
    } catch (err) {
        console.log("Error", err);
        return { statusCode: 500, headers: headers, body: JSON.stringify(err) };
    }
    return { statusCode: 200, headers: headers, body: JSON.stringify(routesDetail) };
};
