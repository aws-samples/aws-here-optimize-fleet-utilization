/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const getVehicleRoute = /* GraphQL */ `
  query GetVehicleRoute($id: ID!) {
    getVehicleRoute(id: $id) {
      routeId
      vehicleId
      date
      startDateTime
      endDateTime
      hereTpId
      stopCount
      id
      createdAt
      updatedAt
    }
  }
`;
export const listVehicleRoutes = /* GraphQL */ `
  query ListVehicleRoutes(
    $filter: ModelVehicleRouteFilterInput
    $limit: Int
    $nextToken: String
  ) {
    listVehicleRoutes(filter: $filter, limit: $limit, nextToken: $nextToken) {
      items {
        routeId
        vehicleId
        date
        startDateTime
        endDateTime
        hereTpId
        stopCount
        id
        createdAt
        updatedAt
      }
      nextToken
    }
  }
`;
