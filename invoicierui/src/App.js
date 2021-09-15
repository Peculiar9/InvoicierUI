// import "./App.css";
import Home from "./pages/Home";
import {BrowserRouter as Router, Switch, Route} from "react-router-dom";

//Pages and components
import MainNavigation from "./pages/MainPages/MainNavigation";
import Pricing from "./pages/MainPages/Pricing";
import SignIn from "./pages/MainPages/SignIn";
import SignUp from "./pages/MainPages/SignUp";

function App() {
  return (
    <>
      <Router>
        <MainNavigation />
        <Switch exact>
          <Route path='/pricing' component={Pricing} />
          <Route path='/signin' component={SignIn} />
          <Route path='/signup' component={SignUp} />
          <Route path='/' exact component={Home} />
        </Switch>
      </Router>
    </>
  );
}

export default App;
