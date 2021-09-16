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
      <section>
        <Router>
          <Switch>
            <MainNavigation />
            <Route path='/' exact component={Home} />
            <Route path='/pricing' component={Pricing} />
            <Route path='/signup' component={SignUp} />
            <Route path='/signin' component={SignIn} />
          </Switch>
        </Router>
      </section>
    </>
  );
}

export default App;
