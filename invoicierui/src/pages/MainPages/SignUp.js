const SignUp = () => {
  return (
    <>
      <div className='auth-container'>
        <div className='form-content'>
          <h2>Join Us</h2>
          <form action='post' className='form'>
            <div className='form-group'>
              <label for='' className='form-text'>
                Email
              </label>
              <input type='text' className='form-input' />
            </div>
            <div className='form-group'>
              <label for='' className='form-text'>
                Username
              </label>
              <input type='text' className='form-input' />
            </div>
            <div className='form-group'>
              <label for='' className='form-text'>
                Password
              </label>
              <input type='password' className='form-input' />
            </div>
            <div className='form-group'>
              <label for='' className='form-text'>
                Confirm Password
              </label>
              <input type='password' className='form-input' />
            </div>
            <div className='form-check'>
              <input type='checkbox' />
              <label for='' className='form-text'>
                Agree with{" "}
                <span>
                  <a href='#'>Terms</a>
                </span>{" "}
                and{" "}
                <span>
                  <a href='#'>Conditions</a>
                </span>
              </label>
            </div>
            <br />
            <div className='signupbtn'>
              <a href='#' className='btnsignup'>
                Get Started for free
              </a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignUp;
