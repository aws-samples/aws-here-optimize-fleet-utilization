// React dependencies
import React, { useState, useEffect } from "react";
import { useNavigate } from 'react-router-dom';

// mapLibre 
import { createMap, drawPoints } from "maplibre-gl-js-amplify";
import "maplibre-gl/dist/maplibre-gl.css";
import "maplibre-gl-js-amplify/dist/public/amplify-map.css";

import * as api from "../services/api";

// Amplify
import { Amplify } from 'aws-amplify';
import awsExports from '../aws-exports';
Amplify.configure(awsExports);

const queryString = window.location.search;
const queryStringParams = getQueryStringParams(queryString);

const routeId = queryStringParams.id;
const vehicleId = queryStringParams.vehicleId;
var params = {};
let map;

// call Amazon Location Services
async function calculateRoute() {
    const url = `${api.getApiBaseUrl()}calculate-route?id=${routeId}&vehicleId=${vehicleId}`;
    return fetch(url, {
        headers: { 'Content-Type': 'application/json' },
    })
        .then(res => res.json())
        .then(
            (result) => {
                params = result;
            },
            (error) => {
                console.log('*** ERROR!', error);
            }
        )
}

async function initializeMap() {

    // get some of the parameters from Location Services Calculate Route
    const centerStartingCoordinates = params.Legs[0].StartPosition;
    const boundingBox = params.Summary.RouteBBox;

    // create our map visualization
    map = await createMap({
        container: "map", // An HTML Element or HTML element ID to render the map in https://maplibre.org/maplibre-gl-js-docs/api/map/
        center: centerStartingCoordinates,
        zoom: 9,
        mapStyle: "here.explore.truck",
    });

    // set the bounding box so our full routes fit 
    map.fitBounds(
        boundingBox,
    );

    // get the coordinates for where each leg starts and the route coordinates
    let startMarkers = params.Legs.map(leg => leg.StartPosition);
    let legStrings = params.Legs.map(leg => leg.Geometry.LineString);
    let routeCordinates = [];
    legStrings.forEach(element => {
        routeCordinates.push(element);
    });

    let combinedLineString = [].concat.apply([], legStrings);

    const startMarkersCoordinates = [];
    let startCounter = 1;
    startMarkers.forEach(startMarker => {
        startMarkersCoordinates.push({
            coordinates: startMarker,
            title: `Leg ${startCounter}`,
        });
        startCounter++;
    });

    // when the map loads, draw the route
    map.on('load', function () {
        // draw out the route
        map.addSource('route', {
            'type': 'geojson',
            'data': {
                'type': 'Feature',
                'properties': {},
                'geometry': {
                    'type': 'LineString',
                    'coordinates':
                        combinedLineString,
                }
            }
        });

        drawPoints("startMarkers",
            startMarkersCoordinates,// An array of coordinate data, an array of Feature data, or an array of [NamedLocations](https://github.com/aws-amplify/maplibre-gl-js-amplify/blob/main/src/types.ts#L8)
            map,
            {
                showCluster: false,
                unclusteredOptions: {
                    showMarkerPopup: true,
                    defaultColor: '#8B0000',
                },
                clusterOptions: {
                    showCount: true,
                },
            }
        );

        map.addLayer({
            'id': 'route',
            'type': 'line',
            'source': 'route',
            'layout': {
                'line-join': 'round',
                'line-cap': 'round'
            },
            'paint': {
                'line-color': 'blue',
                'line-width': 5
            }
        });
    });
}

async function init() {
    await calculateRoute();
    await initializeMap();
}

init();

function RouteDetail() {
    const [loadingData, setLoadingData] = useState(true);
    const [data, setData] = useState([]);
    const apiUrl = `${api.getApiBaseUrl()}/route?id=${routeId}&vehicleId=${vehicleId}`;

    useEffect(() => {
        async function getData() {
            fetch(apiUrl, {
                method: 'GET',
                headers: { 'Content-Type': 'application/json' },
            })
                .then(res => res.json())
                .then(
                    (result) => {
                        console.log('routes detail from api call', result);
                        setData(result);
                        setLoadingData(false);
                    },
                    (error) => {
                        console.log('*** ERROR!', error);
                    }
                )
        }

        if (loadingData) {
            getData();
        }
    }, []);

    const navigate = useNavigate();

    function handleClick(d) {
        navigate(`/`);
    }

    return (
        <div className="App">
            <h3>Route ID '{routeId}' for '{vehicleId}'</h3>
            <a href="#" onClick={handleClick}>Go back to List of routes</a>
            <div id='map'>
            </div>
        </div>
    );
}

function getQueryStringParams(query) {
    return query
        ? (/^[?#]/.test(query) ? query.slice(1) : query)
            .split('&')
            .reduce((params, param) => {
                let [key, value] = param.split('=');
                params[key] = value ? decodeURIComponent(value.replace(/\+/g, ' ')) : '';
                return params;
            }, {})
        : {};
}

export default RouteDetail;
