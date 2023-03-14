import { BrowserRouter, Routes, Route } from "react-router-dom";
import '@aws-amplify/ui-react/styles.css';
import { withAuthenticator } from '@aws-amplify/ui-react';
import Layout from "./pages/Layout";
import Home from "./pages/Home";
import RouteDetail from "./pages/RouteDetail";
import './App.css';

function App({ signOut, user }) {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Home />} />
          <Route path="route" element={<RouteDetail />} />
          <Route path="*" element={<Home />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
}

export default withAuthenticator(App);
