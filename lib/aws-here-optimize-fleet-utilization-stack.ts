import { RemovalPolicy, Duration, Stack, StackProps } from 'aws-cdk-lib';
import * as lambda from 'aws-cdk-lib/aws-lambda';
import * as s3 from 'aws-cdk-lib/aws-s3';
import * as s3deploy from 'aws-cdk-lib/aws-s3-deployment';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { S3EventSource } from 'aws-cdk-lib/aws-lambda-event-sources';
import { IResource, LambdaIntegration, MockIntegration, PassthroughBehavior, RestApi } from 'aws-cdk-lib/aws-apigateway';
import { Construct } from 'constructs';
import { aws_location as location } from 'aws-cdk-lib';
import * as iam from 'aws-cdk-lib/aws-iam';

export class AwsHereOptimizeFleetUtilizationStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    // S3 bucket containing routing problems in json format
    const tourPlanningProblemBucket = new s3.Bucket(this, 'AWS-HERE-FleetPlanning-Problem', {
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      versioned : true
    });
    
    // S3 bucket containing routing solutions, corresponding to above routing problems, in json format
    const tourPlanningSolutionBucket = new s3.Bucket(this, 'AWS-HERE-FleetPlanning-Solution', {
      autoDeleteObjects: true,
      encryption: s3.BucketEncryption.S3_MANAGED,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: RemovalPolicy.DESTROY,
      cors: [
        {
          allowedMethods: [
            s3.HttpMethods.GET,
            s3.HttpMethods.POST,
            s3.HttpMethods.PUT,
          ],
          allowedOrigins: ['*'],
          allowedHeaders: ['*'],
        },
      ],
      versioned : true
    });
    
    const DDB_TABLE_NAME = 'AWS-HERE-FleetPlanning';
    const table = new dynamodb.Table(this, `${DDB_TABLE_NAME}-table`, {
      billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
      encryption: dynamodb.TableEncryption.AWS_MANAGED,
      partitionKey: {name: 'id', type: dynamodb.AttributeType.STRING},
      stream: dynamodb.StreamViewType.NEW_IMAGE,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    // Invoke HERE Tour Planning API to get routes based on input JSON
    const lambdaSolveProblemFunction = new lambda.Function(this, 'SolveRoutingProblem', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lib/lambda/solve-problem'),
      handler: 'index.handler',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        'TourPlanningProblemBucket' : tourPlanningProblemBucket.bucketName,
        'TourPlanningSolutionBucket' : tourPlanningSolutionBucket.bucketName,
        'AWS_HERE_FleetPlanningTable' : table.tableName,
        'HERE_API_KEY':  process.env.HERE_API_KEY || ''
      }      
    });
    
    // Lambda resolver for API Gateway queries
    const lambdaGetRouteDetailFunction = new lambda.Function(this, 'GetRouteDetailHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lib/lambda/get-route-detail'),
      handler: 'index.handler',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        'TourPlanningProblemBucket' : tourPlanningProblemBucket.bucketName,
        'TourPlanningSolutionBucket' : tourPlanningSolutionBucket.bucketName,
        'AWS_HERE_FleetPlanningTable' : table.tableName
      }      
    });
    
    // Lambda resolver for API Gateway queries
    const lambdaGetRoutesFunction = new lambda.Function(this, 'GetRoutesHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lib/lambda/get-routes'),
      handler: 'index.handler',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        'TourPlanningProblemBucket' : tourPlanningProblemBucket.bucketName,
        'TourPlanningSolutionBucket' : tourPlanningSolutionBucket.bucketName,
        'AWS_HERE_FleetPlanningTable' : table.tableName
      }      
    });
    
    // Grant permissions to the lambda functions to access the db and S3
    table.grantReadData(lambdaGetRouteDetailFunction);
    table.grantReadData(lambdaGetRoutesFunction);
    table.grantReadWriteData(lambdaSolveProblemFunction);
    tourPlanningProblemBucket.grantReadWrite(lambdaGetRoutesFunction);
    tourPlanningProblemBucket.grantReadWrite(lambdaGetRouteDetailFunction);
    tourPlanningProblemBucket.grantReadWrite(lambdaSolveProblemFunction);
    tourPlanningSolutionBucket.grantReadWrite(lambdaGetRoutesFunction);
    tourPlanningSolutionBucket.grantReadWrite(lambdaGetRouteDetailFunction);
    tourPlanningSolutionBucket.grantReadWrite(lambdaSolveProblemFunction);
    
    //Create a trigger for Lambda function to be invoked for an upload of Problem json file to S3 bucket
    lambdaSolveProblemFunction.addEventSource(new S3EventSource(tourPlanningProblemBucket, {
      events: [ s3.EventType.OBJECT_CREATED, s3.EventType.OBJECT_REMOVED ],
      filters: [ { suffix: '.json' } ], // optional
    }));

    //Populate S3 buckets with request and response
    new s3deploy.BucketDeployment(this, 'DeployTourPlanningProblemFiles', {
      sources: [s3deploy.Source.asset('data/Problem')],
      destinationBucket: tourPlanningProblemBucket,
    });
    new s3deploy.BucketDeployment(this, 'DeployTourPlanningSolutionFiles', {
      sources: [s3deploy.Source.asset('data/Solution')],
      destinationBucket: tourPlanningSolutionBucket,
    });

    // Integrate the Lambda functions with the API Gateway resource
    const lambdaGetRoutesIntegration = new LambdaIntegration(lambdaGetRoutesFunction);
    const lambdaGetRouteDetailIntegration = new LambdaIntegration(lambdaGetRouteDetailFunction);

    // Create an API Gateway resource for getting the Routes information
    const api = new RestApi(this, 'routesApi', {
      restApiName: 'Routes Service'
    });

    const solutions = api.root.addResource('solutions');
    solutions.addMethod('GET', lambdaGetRoutesIntegration);
    addCorsOptions(solutions);

    const singleRoute = api.root.addResource('route');
    singleRoute.addMethod('GET', lambdaGetRouteDetailIntegration);
    addCorsOptions(singleRoute);

    const theRouteCalculator = new location.CfnRouteCalculator(this, 'FleetRouteCalculator', {
      calculatorName: 'FleetPlanning-Solution-route-calculator',
      dataSource: 'Here'
    });

    const lambdaCalculateRouteFunction = new lambda.Function(this, 'CalculateRouteHandler', {
      runtime: lambda.Runtime.NODEJS_16_X,
      code: lambda.Code.fromAsset('lib/lambda/calculate-route'),
      handler: 'index.handler',
      architecture: lambda.Architecture.ARM_64,
      environment: {
        'TourPlanningProblemBucket' : tourPlanningProblemBucket.bucketName,
        'TourPlanningSolutionBucket' : tourPlanningSolutionBucket.bucketName,
        'AWS_HERE_FleetPlanningTable' : table.tableName,
        'ROUTE_CALCULATOR_NAME' : theRouteCalculator.calculatorName
      }
    });

    const routeCalculatorPolicy = new iam.PolicyStatement({
      actions: ['geo:*'],
      resources: ['*'],
    });

    table.grantReadWriteData(lambdaCalculateRouteFunction);
    tourPlanningSolutionBucket.grantReadWrite(lambdaCalculateRouteFunction);
    lambdaCalculateRouteFunction.role?.attachInlinePolicy(
        new iam.Policy(this, 'calculate-route-policy', {
          statements: [routeCalculatorPolicy],
        }),
    );

    const lambdaCalculateRouteIntegration = new LambdaIntegration(lambdaCalculateRouteFunction);
    const routeCalculator = api.root.addResource('calculate-route');
    routeCalculator.addMethod('GET', lambdaCalculateRouteIntegration);
    addCorsOptions(routeCalculator);
  }
}

export function addCorsOptions(apiResource: IResource) {
  apiResource.addMethod('OPTIONS', new MockIntegration({
    integrationResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': "'Content-Type,X-Amz-Date,Authorization,X-Api-Key,X-Amz-Security-Token,X-Amz-User-Agent'",
        'method.response.header.Access-Control-Allow-Origin': "'*'",
        'method.response.header.Access-Control-Allow-Credentials': "'false'",
        'method.response.header.Access-Control-Allow-Methods': "'OPTIONS,GET,PUT,POST,DELETE'",
      },
    }],
    passthroughBehavior: PassthroughBehavior.NEVER,
    requestTemplates: {
      "application/json": "{\"statusCode\": 200}"
    },
  }), {
    methodResponses: [{
      statusCode: '200',
      responseParameters: {
        'method.response.header.Access-Control-Allow-Headers': true,
        'method.response.header.Access-Control-Allow-Methods': true,
        'method.response.header.Access-Control-Allow-Credentials': true,
        'method.response.header.Access-Control-Allow-Origin': true,
      },
    }]
  })
}
