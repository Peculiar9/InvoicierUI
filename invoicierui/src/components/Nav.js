import {Link} from "react-router-dom";
const Nav = () => {
  return (
    <>
      <nav>
        <Link to='/' classNameName='logo'>
          <h2>Invoicier</h2>
        </Link>
        <ul className='navigation'>
          <li>
            <Link to='/pricing'>Pricing</Link>
          </li>
          <li>
            <Link to='/sign-in'>Sign In</Link>
          </li>
          <li>
            <Link to='/sign-up' className='signup'>
              Sign Up
            </Link>
          </li>
        </ul>
      </nav>
    </>
  );
};

export default Nav;
