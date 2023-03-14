console.log('Loading function');
const AWS = require('aws-sdk');
const s3 = new AWS.S3();
const ddb = new AWS.DynamoDB({ apiVersion: '2012-08-10' });

const headers = {
  "Content-Type": "application/json", "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));
  let solutions = []

  const tableName = process.env.AWS_HERE_FleetPlanningTable;
  const params = {
    TableName: tableName
  };

  try {
    console.log("Getting Invocation entries from DynamoDB")
    let result = await ddb.scan(params).promise();
    if (result.Items.length > 0) {
      for (let item of result.Items) {
        console.log("Reading object from S3 bucket: " + item.SOLUTION_S3_BUCKET.S + ", key: " + item.SOLUTION_JSON_S3_KEY.S)
        const s3GetParams = {
          Bucket: item.SOLUTION_S3_BUCKET.S,
          Key: item.SOLUTION_JSON_S3_KEY.S
        };

        const data = await s3.getObject(s3GetParams).promise();
        const solution = JSON.parse(data.Body)
        let route = {};
        route.id = item.id.S
        route.date = item.date.S
        let toursList = [];
        for (let t of solution["tours"]) {
          toursList.push(t["vehicleId"])
        }
        route.vehicles = toursList
        solutions.push(route)
      }
    }
  } catch (err) {
    console.log("Error", err);
    return { statusCode: 500, headers: headers, body: JSON.stringify(err) };
  }
  return { statusCode: 200, headers: headers, body: JSON.stringify(solutions) };
};
