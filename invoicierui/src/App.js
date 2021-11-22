// import "./App.css";
import Home from "./pages/Home";
import {BrowserRouter as Router, Switch, Route} from "react-router-dom";
import $ from "jquery";
//Pages and components
import MainNavigation from "./pages/MainPages/MainNavigation";
import Pricing from "./pages/MainPages/Pricing";
import SignIn from "./pages/MainPages/SignIn";
import SignUp from "./pages/MainPages/SignUp";
import ErrorPage from "./pages/ErrorPage";
import Blog from "./pages/MainPages/Blog";

function App() {
  return (
    <>
      <section id='container'>
        <Router>
          <MainNavigation />
          <Switch>
            <Route path='/' exact component={Home} />
            <Route path='/pricing' component={Pricing} />
            <Route path='/blog' component={Blog} />
            <Route path='/sign-up' component={SignUp} />
            <Route path='/sign-in' component={SignIn} />
            <Route path='*' component={ErrorPage} />
          </Switch>
        </Router>
      </section>
    </>
  );
}

export default App;
