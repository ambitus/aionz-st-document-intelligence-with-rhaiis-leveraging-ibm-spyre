import Dashboard from "./components/Dashboard";
import '@carbon/styles/css/styles.css';
import { Theme } from '@carbon/react';
import './App.css';
function App() {
  return (
    <Theme theme="g100"> 
      <Dashboard />
    </Theme>
  );
}

export default App;