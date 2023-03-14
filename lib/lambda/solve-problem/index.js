// noinspection DuplicatedCode

console.log('Loading function');
const aws = require('aws-sdk');
const https = require("https");

const s3 = new aws.S3();
const ddb = new aws.DynamoDB({ apiVersion: '2012-08-10' });

const preSolvedData = {
  'VRPProblemLondon.json' : 'VRPSolutionLondon.json',
  'VRPProblemPortland.json' : 'VRPSolutionPortland.json'
}

const headers = {
  "Content-Type": "application/json", "Access-Control-Allow-Headers": "Content-Type",
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "OPTIONS,POST,GET"
};

const defaultOptions = {
  host: 'tourplanning.hereapi.com',
  port: 443,
  headers: headers,
}

const doPostRequest = (path, payload) => new Promise((resolve, reject) => {
  const options = { ...defaultOptions, path, method: 'POST' };
  const req = https.request(options, res => {
    let buffer = "";
    res.on('data', chunk => buffer += chunk)
    res.on('end', () => resolve(JSON.parse(buffer)))
  });
  req.on('error', e => reject(e.message));
  req.write(JSON.stringify(payload));
  req.end();
})

function putObjectToS3(bucket, key, data){
  var s3 = new aws.S3();
  var params = {
    Bucket : bucket,
    Key : key,
    Body : data
  }
  s3.putObject(params, function(err, data) {
    if (err) console.log(err, err.stack); // an error occurred
    else     console.log(data);           // successful response
  });
}

exports.handler = async function (event) {
  console.log("request:", JSON.stringify(event, undefined, 2));


  //Environmental variables
  const solutionS3Bucket = process.env.TourPlanningSolutionBucket;
  const tableName = process.env.AWS_HERE_FleetPlanningTable;
  const hereAPI_Key = process.env.HERE_API_KEY;

  console.log('S3 (Solution Bucket) : ' + solutionS3Bucket)
  console.log('DynamoDB (Table Name) : ' + tableName)

  let invocationID = Math.floor(Math.random() * 100000) + 1

  //Iterate through the S3 event records
  for (const record of event.Records) {
    console.log('Event > : %s', record)
    console.log('S3 bucket> : %s', record.s3.bucket.name)
    console.log('S3 object> : %s', record.s3.object.key)

    const today = new Date();
    const dd = String(today.getDate()).padStart(2, '0');
    const mm = String(today.getMonth() + 1).padStart(2, '0'); //January is 0!
    const yyyy = today.getFullYear();
    const today_string = mm + '-' + dd + '-' + yyyy;

    if(hereAPI_Key){
      // Invoke HERE Tour Planning api to solve the Problem
      console.log('Reading Problem JSON file from S3')
      let getParams = {
        Bucket: record.s3.bucket.name,
        Key: record.s3.object.key
      };
      const data = await s3.getObject(getParams).promise();
      const problem = JSON.parse(data.Body)

      console.log('Invoking HERE TP api')
      const token = await doPostRequest('/v3/problems?apikey=' + hereAPI_Key, problem);
      console.log('Response from HERE TP: ' + JSON.stringify(token))

      console.log('Putting Solution in S3')
      let solutionKey = record.s3.object.key + '.Solution.json'
      putObjectToS3(solutionS3Bucket, solutionKey, JSON.stringify(token))

      console.log('Adding DynamoDB entry for solved problem')
      const params = {
        TableName: tableName,
        Item: {
          id: {S: JSON.stringify(invocationID)},
          date: {S: today_string},
          PROBLEM_S3_BUCKET: {S: record.s3.bucket.name},
          PROBLEM_JSON_S3_KEY: {S: record.s3.object.key},
          SOLUTION_S3_BUCKET: {S: solutionS3Bucket},
          SOLUTION_JSON_S3_KEY: {S: solutionKey},
        }
      };
      const dynamodbEntry = await ddb.putItem(params).promise()
      console.log("DynamoDB Item entered successfully:", dynamodbEntry)
    } else {
      //Check if Problem has a pre-solved solution, meant for demonstration purposes only,  and if yes then record its entry in DynamoDB
      for (const [key, value] of Object.entries(preSolvedData)) {
        if(record.s3.object.key === key){
          console.log('Found a pre-solved Solution for Problem, matching key = ' + ', and value = ' + value)
          const params = {
            TableName: tableName,
            Item: {
              id: {S: JSON.stringify(invocationID)},
              date: {S: today_string},
              PROBLEM_S3_BUCKET: {S: record.s3.bucket.name},
              PROBLEM_JSON_S3_KEY: {S: key},
              SOLUTION_S3_BUCKET: {S: solutionS3Bucket},
              SOLUTION_JSON_S3_KEY: {S: value},
            }
          };
          const data = await ddb.putItem(params).promise()
          console.log("DynamoDB Item entered successfully:", data)
          break
        }
      }
    }
  }

  // Log and return appropriate status
  return {
    statusCode: 200,
    headers: headers,
    body: 'Processed event'
  };
};
