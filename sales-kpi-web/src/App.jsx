import React, { useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import EnquiryForm from './components/EnquiryForm';
import EnquiryListScreen from './screens/EnquiryListScreen';
import EnquiryUpdateForm from './components/EnquiryUpdateForm';
import DailyUpdateForm from './screens/DailyUpdateForm';
import ProjectDetails from './screens/ProjectDetails';
import ProjectDetailsScreen from './screens/ProjectDetailsScreen';
import ProductionHomeScreen from './screens/ProductionHomeScreen';
import ProductionDetailsScreen from './screens/ProductionDetailsScreen';
import MonthlyPlanningForm from './screens/MonthlyPlanningForm';
import ManageWagonTypesScreen from './screens/ManageWagonTypesScreen';
import DailyProductionForm from './screens/DailyProductionForm';
//import PlanningDashboard from './screens/PlanningDashboard';
//import PlanningForm from './components/PlanningForm';
//import ProjectGantt from './components/ProjectGantt';
import BogieInspectionForm from './screens/quality/BogieInspectionForm';
import QualityDashboard from './screens/quality/QualityDashboard';
import BogieInspectionReport from './screens/quality/BogieInspectionReport';
import SalesKPIScreen from './screens/SalesKPIScreen';
import DashboardHome from './screens/DashboardHome'; // adjust path as needed
import SalesProdEntryForm from "./screens/sales/SalesProdEntryForm";
import SalesProdDashboard from "./screens/sales/SalesProdDashboard";
import TradeExportDashboard from "./screens/sales/TradeExportDashboard";
import BogiePostWheelInspectionForm from './screens/quality/BogiePostWheelInspectionForm';
import EquipmentMaintenanceScreen from './screens/maintenance/EquipmentMaintenanceScreen';
import EquipmentMasterForm from './screens/maintenance/EquipmentMasterForm';
import MaintenanceDashboard from "./screens/maintenance/MaintenanceDashboard.jsx";
import EquipmentMasterList from "./screens/maintenance/EquipmentMasterList";
import TexmacoAccessPortal from './screens/login';
import ManagementDashboard from './screens/management/ManagementDashboard';
import LocationDashboard from './screens/management/LocationDashboard';
import ScaleGrowthDashboard from './screens/management/ScaleGrowthDashboard';
import AfricaRailOpportunityDashboard from "./screens/management/AfricaRailOpportunityDashboard";
import 'bootstrap/dist/css/bootstrap.min.css';
import './App.css';

// ✅ Protected Route for role-based access
import { Navigate } from "react-router-dom";

function ProtectedRoute({ children, allowedRoles }) {
  const token = localStorage.getItem("token");
  const role = localStorage.getItem("role");

  // ✅ Step 1: If user is not logged in at all, redirect immediately
  if (!token) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Step 2: If logged in but wrong role, deny access
  if (!allowedRoles.includes(role)) {
    return <Navigate to="/login" replace />;
  }

  // ✅ Step 3: Otherwise, show the requested page
  return children;
}


const LayoutWrapper = ({ children }) => {
  const location = useLocation();
  const standalonePaths = ['/daily-update', '/daily-production'];
  const isStandalone = standalonePaths.includes(location.pathname);

  const [salesOpen, setSalesOpen] = useState(false);
  const [productionOpen, setProductionOpen] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false); // ✅ for hamburger menu
  const [qualityOpen, setQualityOpen] = useState(false);
  const [maintenanceOpen, setMaintenanceOpen] = useState(false);
  const [sidebarHidden, setSidebarHidden] = useState(false); // allow hiding the sidebar entirely


  if (isStandalone) {
    return <>{children}</>;
  }

  // ✅ Close sidebar after clicking a link (mobile only)
  const handleLinkClick = () => {
    if (window.innerWidth <= 992) {
      setSidebarOpen(false);
    }
  };

  return (
    <>
      {/* Navbar */}
      <nav className="navbar custom-navbar fixed-top">
        <div className="container-fluid d-flex justify-content-between align-items-center">
          

          <span className="navbar-brand d-flex align-items-center w-100 m-0  justify-content-between">
            <img src="/Texmaco logo.png" alt="Logo" style={{ height: '40px', marginRight: '10px' }} />
            <span className="brand-title">TexView</span>
            {/* Hamburger Button */}
          <button
            className="hamburger-btn d-lg-none border rounded p-1 bg-white text-dark"
            onClick={() => setSidebarOpen(!sidebarOpen)}
          >
            ☰
          </button>
          <button
            className="btn btn-sm btn-warning ms-2"
            onClick={() => {
              setSidebarHidden((prev) => !prev);
              setSidebarOpen(false);
            }}
            title="Toggle sidebar visibility"
          >
            {sidebarHidden ? 'Show Menu' : 'Hide Menu'}
          </button>
          <button
  className="btn btn-sm btn-light ms-2"
  onClick={() => {
    localStorage.removeItem("token");
    localStorage.removeItem("role");
    window.location.href = "/login";
  }}
>
  Logout
</button>
          </span>

          
        </div>
      </nav>


      {/* Sidebar */}
{!sidebarHidden && (
<div className={`sidebar bg-dark text-white ${sidebarOpen ? 'open' : ''}`}>
  <ul className="nav flex-column mt-3">
    <li>
      <Link to="/" className="nav-link text-white" onClick={handleLinkClick}>
        📋 Home
      </Link>
    </li>

    <li>
      <Link to="/management" className="nav-link text-white" onClick={handleLinkClick}>
        Management Dashboard
      </Link>
    </li>

    <li>
      <Link to="/management/africa-rail-opportunity" className="nav-link text-white" onClick={handleLinkClick}>
        Africa Rail Opportunity DPR
      </Link>
    </li>

    <li>
      <Link to="/management/scale-growth" className="nav-link text-white" onClick={handleLinkClick}>
        Scale and Growth Dashboard
      </Link>
    </li>

    {/*<li>
      <Link to="/planning" className="nav-link text-white" onClick={handleLinkClick}>
        📝 Project Planning
      </Link>
    </li>*/}

    {/* Sales Menu */}
    <li className="nav-item">
      <span
        onClick={() => setSalesOpen(!salesOpen)}
        className="nav-link text-white fw-bold"
        style={{ cursor: 'pointer' }}
      >
        📊 Sales {salesOpen ? '▲' : '▼'}
      </span>
      {salesOpen && (
        <ul className="nav flex-column ms-3">
          <li>
            <Link to="/enquiry-form" className="nav-link text-white" onClick={handleLinkClick}>
              ➕ New Enquiry
            </Link>
          </li>
          <li>
            <Link to="/daily-update" className="nav-link text-white" onClick={handleLinkClick}>
              🛠️ Daily Update
            </Link>
          </li>
           {/* 🔹 New Fortnightly Module Links */}
      <li>
        <Link
          to="/sales/production-entry"
          className="nav-link text-white"
          onClick={handleLinkClick}
        >
          🗂️ Production Data Entry
        </Link>
      </li>
      <li>
        <Link
          to="/sales/production-dashboard"
          className="nav-link text-white"
          onClick={handleLinkClick}
        >
          📈 Production Dashboard
        </Link>
      </li>
      <li>
        <Link
          to="/sales/trade-export-dashboard"
          className="nav-link text-white"
          onClick={handleLinkClick}
        >
          Trade Export Dashboard
        </Link>
      </li>
        </ul>
      )}
    </li>

    {/* Production Menu */}
    <li className="nav-item mt-3">
      <span
        onClick={() => setProductionOpen(!productionOpen)}
        className="nav-link text-white fw-bold"
        style={{ cursor: 'pointer' }}
      >
        🏗️ Production {productionOpen ? '▲' : '▼'}
      </span>
      {productionOpen && (
        <ul className="nav flex-column ms-3">
          <li>
            <Link to="/production" className="nav-link text-white" onClick={handleLinkClick}>
              📊 Dashboard
            </Link>
          </li>
          <li>
            <Link to="/monthly-planning" className="nav-link text-white" onClick={handleLinkClick}>
              📅 Monthly Planning
            </Link>
          </li>
          <li>
            <Link to="/daily-production" className="nav-link text-white" onClick={handleLinkClick}>
              🛠️ Daily Production Update
            </Link>
          </li>
          <li>
            <Link to="/manage-wagon-types" className="nav-link text-white" onClick={handleLinkClick}>
              ⚙️ Manage Wagon Types
            </Link>
          </li>
          {/*<li>
            <Link to="/planning" className="nav-link text-white" onClick={handleLinkClick}>
              📝 Setup Planning
            </Link>
          </li>
          <li>
            <Link to="/gantt" className="nav-link text-white" onClick={handleLinkClick}>
              📊 Gantt View
            </Link>
          </li>*/}
        </ul>
      )}
    </li>

    {/* ✅ Quality Menu (Independent) */}
    <li className="nav-item mt-3">
      <span
        onClick={() => setQualityOpen(!qualityOpen)}
        className="nav-link text-white fw-bold"
        style={{ cursor: 'pointer' }}
      >
        🧾 Quality {qualityOpen ? '▲' : '▼'}
      </span>
      {qualityOpen && (
        <ul className="nav flex-column ms-3">
          <li>
  <Link
    to="/bogie-inspection-report"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    🧾 Bogie Inspection Report
  </Link>
</li>
<li>
  <Link
    to="/bogie-inspection-form"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    🧰 Bogie Inspection Form
  </Link>
</li>
<li>
  <Link
    to="/bogie-after-wheel-inspection"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    ⚙️ After-Wheeling Inspection
  </Link>
</li>

<li>
  <Link
    to="/quality-dashboard"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    📊 Quality Dashboard
  </Link>
</li>

        </ul>
      )}
    </li>

    {/* ✅ Maintenance Menu (Independent) */}
<li className="nav-item mt-3">
  <span
    onClick={() => setMaintenanceOpen?.(!maintenanceOpen)}
    className="nav-link text-white fw-bold"
    style={{ cursor: 'pointer' }}
  >
    🧰 Maintenance {maintenanceOpen ? '▲' : '▼'}
  </span>

  {maintenanceOpen && (
    <ul className="nav flex-column ms-3">
      <li>
        <Link
          to="/maintenance/equipment"
          className="nav-link text-white"
          onClick={handleLinkClick}
        >
          🛠️ Equipment Maintenance Log
        </Link>
      </li>
      <li>
  <Link
    to="/maintenance/equipment-master"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    📦 Equipment Master
  </Link>
</li>
<li>
  <Link
    to="/maintenance/dashboard"
    className="nav-link text-white"
    onClick={handleLinkClick}
  >
    📊 Maintenance Dashboard
  </Link>
</li>

    </ul>
  )}
</li>


  </ul>
</div>
)}
    

      {/* Main content */}
      <div className={`main-content ${sidebarHidden ? 'sidebar-hidden' : ''}`}>{children}</div>
    </>
  );
};

function App() {
  return (
    <Router>
      <LayoutWrapper>
        <Routes>
          {/* 🔓 Public Route */}
          <Route path="/login" element={<TexmacoAccessPortal />} />

          {/* 🔒 Sales Module */}
          <Route
            path="/"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <EnquiryListScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/trade-export-dashboard"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <TradeExportDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enquiry-form"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <EnquiryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/enquiry/:id"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <EnquiryUpdateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-update"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <DailyUpdateForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/production-entry"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <SalesProdEntryForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/sales/production-dashboard"
            element={
              <ProtectedRoute allowedRoles={["sales"]}>
                <SalesProdDashboard />
              </ProtectedRoute>
            }
          />

          {/* 🔒 Production Module */}
          <Route
            path="/production"
            element={
              <ProtectedRoute allowedRoles={["production"]}>
                <ProductionHomeScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/production/:projectId"
            element={
              <ProtectedRoute allowedRoles={["production"]}>
                <ProductionDetailsScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/monthly-planning"
            element={
              <ProtectedRoute allowedRoles={["production"]}>
                <MonthlyPlanningForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/manage-wagon-types"
            element={
              <ProtectedRoute allowedRoles={["production"]}>
                <ManageWagonTypesScreen />
              </ProtectedRoute>
            }
          />
          <Route
            path="/daily-production"
            element={
              <ProtectedRoute allowedRoles={["production"]}>
                <DailyProductionForm />
              </ProtectedRoute>
            }
          />

          {/* 🔒 Quality Module */}
          <Route
            path="/quality-dashboard"
            element={
              <ProtectedRoute allowedRoles={["quality"]}>
                <QualityDashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bogie-inspection-form"
            element={
              <ProtectedRoute allowedRoles={["quality"]}>
                <BogieInspectionForm />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bogie-inspection-report"
            element={
              <ProtectedRoute allowedRoles={["quality"]}>
                <BogieInspectionReport />
              </ProtectedRoute>
            }
          />
          <Route
            path="/bogie-after-wheel-inspection"
            element={
              <ProtectedRoute allowedRoles={["quality"]}>
                <BogiePostWheelInspectionForm />
              </ProtectedRoute>
            }
          />

          {/* Management Module */}
          <Route path="/management" element={<ManagementDashboard />} />
          <Route path="/management/africa-rail-opportunity" element={<AfricaRailOpportunityDashboard />} />
          <Route path="/management/scale-growth" element={<ScaleGrowthDashboard />} />
          <Route path="/management/:siteId" element={<LocationDashboard />} />

          {/* 🔒 Maintenance Module */}
<Route
  path="/maintenance/equipment"
  element={
    <ProtectedRoute allowedRoles={["maintenance", "production"]}>
      <EquipmentMaintenanceScreen />
    </ProtectedRoute>
  }
/>
<Route
  path="/maintenance/equipment-master"
  element={
    <ProtectedRoute allowedRoles={["maintenance", "production"]}>
      <EquipmentMasterForm />
    </ProtectedRoute>
  }
/>
<Route
  path="/maintenance/dashboard"
  element={
    <ProtectedRoute allowedRoles={["maintenance","production"]}>
      <MaintenanceDashboard />
    </ProtectedRoute>
  }
/>
<Route
  path="/maintenance/equipment-master-list"
  element={
    <ProtectedRoute allowedRoles={["maintenance", "production"]}>
      <EquipmentMasterList />
    </ProtectedRoute>
  }
/>


          {/* 🚫 Redirect any unknown URL */}
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </LayoutWrapper>
    </Router>
  );
}


export default App;
