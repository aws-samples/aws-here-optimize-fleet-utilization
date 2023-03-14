const aws = require('aws-sdk');
const {
    LocationClient,
    CalculateRouteCommand,
} = require("@aws-sdk/client-location");
const s3 = new aws.S3();
const db = new aws.DynamoDB.DocumentClient();

const headers = {
    "Content-Type": "application/json", "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

exports.handler = async function (event) {
    //Expected api invocation -> .../calculateroute?id=<invocationID>&vehicleId=<vehicleId>
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

    let routeRequest = {}
    let departureMarker = {}
    let destinationMarker = {}
    let waypointsList = []
    let waypointsListALS = []

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
                    routeRequest["id"] = requestedItemId
                    routeRequest["vehicleId"] = requestedVehicleId
                    routeRequest["stopCount"] = t["stops"].length
                    console.log('Adding DeparturePosition, DestinationPosition and WaypointPositions')

                    for (let i = 0; i < t["stops"].length; i++) {
                        // Defined as [longitude, latitude]
                        let position = [t["stops"][i]["location"]["lng"], t["stops"][i]["location"]["lat"]]
                        if (i == 0) {
                            routeRequest["DeparturePosition"] = position
                            departureMarker.lng = position[0]
                            departureMarker.lat = position[1]
                        } else if (i == t["stops"].length - 1) {
                            routeRequest["DestinationPosition"] = position
                            routeRequest["WaypointPositions"] = waypointsList
                            destinationMarker.lng = position[0]
                            destinationMarker.lat = position[1]
                        } else {
                            //Add Waypoint
                            waypointsList.push(position)
                            // Amazon Location Services currently supports max 23 WaypointPositions
                            if (waypointsListALS.length < 22) {
                                waypointsListALS.push(position)
                            }
                        }
                    }
                    break
                }
            }

            if (!match) {
                const message = "No matching vehicleId " + requestedVehicleId + " found in item " + requestedItemId
                console.log(message)
                return {
                    statusCode: 400, headers: headers, body: message
                };
            }

            //Invoke ALS calculate route
            console.log("Inputs to RouteCalculator DeparturePosition= " + JSON.stringify(departureMarker)
                + ", DestinationPosition= " + JSON.stringify(destinationMarker))
            const locationClient = new LocationClient();
            const commandInput = {
                CalculatorName: process.env.ROUTE_CALCULATOR_NAME,
                TravelMode: "Car",
                IncludeLegGeometry: true,
                DeparturePosition: [departureMarker.lng, departureMarker.lat],
                DestinationPosition: [destinationMarker.lng, destinationMarker.lat],
                WaypointPositions: waypointsListALS
            };
            console.log("Input to ALS CalculateRouteCommand: " + JSON.stringify(commandInput))
            const result = await locationClient.send(
                new CalculateRouteCommand(commandInput)
            );
            console.log(result);
            return {
                statusCode: 200, headers, body: JSON.stringify(result)
            };
        }
        else {
            const message = "No Item found in DynamoDB Table for id " + requestedItemId
            console.log(message)
            return {
                statusCode: 400, headers, body: message
            };
        }
    } catch (err) {
        console.log("Error", err);
        return {
            statusCode: 500, headers, body: JSON.stringify(err)
        };
    }
    return {
        statusCode: 200, headers, body: JSON.stringify(routeRequest)
    };
};
