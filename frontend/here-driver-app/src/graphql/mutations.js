/* eslint-disable */
// this is an auto generated file. This will be overwritten

export const createVehicleRoute = /* GraphQL */ `
  mutation CreateVehicleRoute(
    $input: CreateVehicleRouteInput!
    $condition: ModelVehicleRouteConditionInput
  ) {
    createVehicleRoute(input: $input, condition: $condition) {
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
export const updateVehicleRoute = /* GraphQL */ `
  mutation UpdateVehicleRoute(
    $input: UpdateVehicleRouteInput!
    $condition: ModelVehicleRouteConditionInput
  ) {
    updateVehicleRoute(input: $input, condition: $condition) {
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
export const deleteVehicleRoute = /* GraphQL */ `
  mutation DeleteVehicleRoute(
    $input: DeleteVehicleRouteInput!
    $condition: ModelVehicleRouteConditionInput
  ) {
    deleteVehicleRoute(input: $input, condition: $condition) {
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
