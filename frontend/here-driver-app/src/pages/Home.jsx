import React, { useState, useEffect } from "react";
import * as api from "../services/api";

function Home() {

    const [loadingData, setLoadingData] = useState(true);
    const [data, setData] = useState([]);
    const apiUrl = `${api.getApiBaseUrl()}solutions`;

    const requestOptions = {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' },
    };

    useEffect(() => {
        async function getData() {
            fetch(apiUrl, requestOptions)
                .then(res => res.json())
                .then(
                    (result) => {
                        console.log('routes found from api call', result);
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

    function handleRowClick(id, vehicleId) {
        console.log('navigate to ', id, vehicleId);
        window.location.href = `http://localhost:3000/route?id=${id}&vehicleId=${vehicleId}`;
    }

    return (
        <div className='container'>
            <div className='center'>
                <h1>HERE AWS Tour Planning</h1>
                {loadingData ? (
                    <p>Loading Please wait...</p>
                ) : (
                    <div className="container">
                        <table className="table table-striped table-bordered center" id="routesTable">
                            <thead>
                                <tr>
                                    <th>Route</th>
                                    <th>Date</th>
                                    <th>Tours</th>
                                    <th>Vehicles</th>
                                </tr>
                            </thead>
                            <tbody>
                                {data && data.map(route =>
                                    <tr key={route.id} >
                                        <td>{route.id}</td>
                                        <td>{route.date}</td>
                                        <td>{route.vehicles.length}</td>
                                        <td>
                                            <ul>
                                                {route.vehicles.map(vehicle => (<li onClick={(e) => { handleRowClick(route.id, vehicle) }} key={vehicle}>{vehicle}</li>))}
                                            </ul>
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>
        </div>
    );
}

export default Home;
