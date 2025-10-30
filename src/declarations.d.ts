declare module "*.jsx" {
  import React from "react";
  const Component: React.ComponentType<any>;
  export default Component;
}

declare module "*.js" {
  const anyModule: any;
  export default anyModule;
}

// declare module "./pages/login";
// declare module "./pages/Dashboard";
// declare module "./pages/Employees";
// declare module "./routes/ProtectedRoute";
