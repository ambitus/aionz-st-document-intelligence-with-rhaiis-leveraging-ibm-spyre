import React from 'react';
import OverviewSection from "./components/OverviewSection";
// import OverviewSection from "./components/OverviewSection_black";

import { Theme } from '@carbon/react';
import './App.css';
function App() {
  return (
    <Theme theme="g100"> {/* Optional: Use dark theme */}
      <OverviewSection />
      {/* <OverviewSection_black /> */}

    </Theme>
  );
}

export default App;