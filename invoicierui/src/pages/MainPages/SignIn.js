const SignIn = () => {
  return (
    <>
      <div className='auth-container'>
        <div className='form-content'>
          <h2>
            Hey👋🏾!!!, <br />
            <span>Welcome Back</span>
          </h2>
          <form action='post' className='form'>
            <div className='form-group'>
              <label for='' className='form-text'>
                Email
              </label>
              <input type='text' className='form-input' />
            </div>
            <div className='form-group'>
              <label for='' className='form-text'>
                Password
              </label>
              <input type='password' className='form-input' />
            </div>
            <br />
            <div className='signupbtn'>
              <a href='#' className='btnsignup'>
                Sign In
              </a>
            </div>
          </form>
        </div>
      </div>
    </>
  );
};

export default SignIn;
