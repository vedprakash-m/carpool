"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SimpleDashboard;
const react_1 = require("react");
function SimpleDashboard() {
    const [mounted, setMounted] = (0, react_1.useState)(false);
    const [authData, setAuthData] = (0, react_1.useState)(null);
    const [apiTestResult, setApiTestResult] = (0, react_1.useState)("Testing...");
    (0, react_1.useEffect)(() => {
        setMounted(true);
        // Check localStorage for auth data
        try {
            const authStr = localStorage.getItem("auth-storage");
            if (authStr) {
                const authData = JSON.parse(authStr);
                setAuthData(authData);
            }
        }
        catch (e) {
            console.error("Error reading auth data:", e);
        }
        // Test API directly
        fetch("https://vcarpool-api-prod.azurewebsites.net/api/trips/stats", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
            },
        })
            .then(async (res) => {
            const text = await res.text();
            setApiTestResult(`Status: ${res.status}, Response: ${text}`);
        })
            .catch((err) => {
            setApiTestResult(`Error: ${err.message}`);
        });
    }, []);
    if (!mounted) {
        return <div>Loading...</div>;
    }
    return (<div style={{ padding: "20px", fontFamily: "Arial, sans-serif" }}>
      <h1 style={{ color: "blue" }}>🔍 Simple Dashboard Debug</h1>

      <div style={{ marginBottom: "20px" }}>
        <h2>Authentication Status:</h2>
        <pre style={{ background: "#f0f0f0", padding: "10px", overflow: "auto" }}>
          {authData ? JSON.stringify(authData, null, 2) : "No auth data found"}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>API Test Results:</h2>
        <pre style={{ background: "#f0f0f0", padding: "10px", overflow: "auto" }}>
          {apiTestResult}
        </pre>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Environment Info:</h2>
        <ul>
          <li>
            <strong>URL:</strong> {window.location.href}
          </li>
          <li>
            <strong>Origin:</strong> {window.location.origin}
          </li>
          <li>
            <strong>Pathname:</strong> {window.location.pathname}
          </li>
        </ul>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <h2>Test Links:</h2>
        <ul>
          <li>
            <a href="/login">Login Page</a>
          </li>
          <li>
            <a href="/dashboard">Original Dashboard</a>
          </li>
          <li>
            <a href="/test">React Test Page</a>
          </li>
        </ul>
      </div>

      <div style={{ background: "#e8f5e8", padding: "10px" }}>
        <h3>✅ This simple dashboard is working!</h3>
        <p>
          If you can see this, React routing and basic components are
          functional.
        </p>
        <p>
          The issue is likely in the complex dashboard component or
          authentication logic.
        </p>
      </div>
    </div>);
}
