# Tour Planning Driver Client App

The is the front end application that will render the routes for a driver.  It's written in React.

It was generated with [Create React App](https://github.com/facebook/create-react-app).

## Getting Started

1.  After you have deployed the CDK Infrastructure, get the unique API Gateway Endpoint URL that is generated and update the [api.js](/src/services/api.js) file (/src/services/api.js).

1. Setup Amplify environment

### Amplify Environment

Establish Amplify environment

    amplify init

Push and Publish this environment

    amplify push

    amplify publish

> This will also generate the required aws-exports.js file


## Run the Frontend Project

In the project root directory, run:

### `npm start`

Open [http://localhost:3000](http://localhost:3000) to view it in your browser.

The page will reload when you make changes.\
You may also see any lint errors in the console.

> Getting odd errors, ensure that you have run npm i for these node_modules at some point

## Navigating the app

1. The first page is a list of available routes that Tour Planning has calculated, as well as the vehicle that a driver is assigned to.
1. The detail page will render the map with the calcuate tour.  

> You can zoom in and out of the map by double clicking or using your mouse wheel
