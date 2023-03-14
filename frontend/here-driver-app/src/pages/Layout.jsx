import React from "react";
import { Outlet } from "react-router-dom";

const Layout = () => {
    return (
        <>
            <div id="tablet-container">
            <Outlet />
            </div>
        </>
    );
};

export default Layout;
