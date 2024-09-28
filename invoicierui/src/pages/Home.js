//  Imported Documen ts
import {Link} from "react-router-dom";
import logo from "../images/logo.png";
import headervector from "../images/HeaderVector.png";
import bgimg from "../images/bgimg.png";
import peculiar from "../images/Peculiar.png";
import quote from "../images/quote.png";
import footer from "../images/Footer.png";
import ellipse from "../images/Ellipse 82.png";
import abtimg1 from "../images/abt-img1.png";
import abtimg2 from "../images/abt-img2.png";
import abtimg3 from "../images/abt-img3.png";
import ctaimg1 from "../images/cta-img1.png";
import ctaimg2 from "../images/cta-img2.png";
import polygon1 from "../images/Polygon 1.png";
import polygon2 from "../images/Polygon 2.png";
import register from "../images/Register-img.png";
import subscribe from "../images/subscribe-img.png";
import ReviewCard from "../components/ReviewCard";

// Props

const userReview1 = {
  quote: quote,
  img: peculiar,
  name: "John Doe",
  occupation: "CEO Batallion",
  review:
    "I have been using invoicier for some while and it has been worthwhile",
};
const userReview2 = {
  quote: quote,
  img: peculiar,
  name: "John Doe",
  occupation: "CEO Batallion",
  review:
    "I have been using invoicier for some while and it has been worthwhile",
};
const Hero = {
  quote: quote,
  img: peculiar,
  name: "John Doe",
  occupation: "CEO Batallion",
  review:
    "I have been using invoicier for some while and it has been worthwhile",
};

const Home = () => {
  return (
    <>
      {/* Hero Container */}
      <div className='hero-container'>
        <div className='hero-content'>
          <div className='header-text'>
            <h1 className='header-text-large'>
              Run your{" "}
              <span>
                business <div></div>
              </span>
              easily, get paid faster
            </h1>
            <p className='header-text-small'>
              Manage your businesses from any device, online, send invoices and
              collect payments easily.
            </p>
            <a href='signup.html' className='cta-btn'>
              Get Started for free <i className='bx bx-right-arrow-alt'></i>
            </a>
          </div>
          <div className='header-img'>
            <img src={headervector} alt='' />
          </div>
        </div>
      </div>
      {/* About Container */}
      <div className='about-container'>
        <div className='about-content'>
          <div className='about-card'>
            <img src={abtimg1} alt='' className='abt-img' />
            <div className='abt-text'>
              <h3 className='abt-header-text'>Easy to use</h3>
              <p className='abt-info-text'>
                Manage your businesses from any device, online, send invoices
                and collect payments easily.
              </p>
            </div>
          </div>
          <div className='about-card'>
            <img src={abtimg2} alt='' className='abt-img' />
            <div className='abt-text'>
              <h3 className='abt-header-text'>Access anywhere</h3>
              <p className='abt-info-text'>
                Manage your businesses from any device, online, send invoices
                and collect payments easily.
              </p>
            </div>
          </div>
          <div className='about-card'>
            <img src={abtimg3} alt='' className='abt-img' />
            <div className='abt-text'>
              <h3 className='abt-header-text'>Customize easily</h3>
              <p className='abt-info-text'>
                Manage your businesses from any device, online, send invoices
                and collect payments easily.
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className='cta-first-container'>
        <div className='cta-first-content'>
          <div className='cta-first-text'>
            <h1 className='cta-first-header'>
              Get Paid Easily, Connect with your customers
            </h1>
            <div className='cta-first-other'>
              <div className='cta-text1'>
                <h3>
                  <i className='bx bx-mobile-alt'></i>
                  Easily Set it up in 5 minutes
                </h3>
                <div className='cta-text-small'>
                  Manage your businesses from any device, online, send invoices
                  and collect payments easily.
                </div>
              </div>
              <div className='cta-text2'>
                <h3>
                  <i className='bx bxs-dashboard'></i>
                  Easily Set it up in 5 minutes
                </h3>
                <div className='cta-text-small'>
                  Manage your businesses from any device, online, send invoices
                  and collect payments easily.
                </div>
              </div>
            </div>
          </div>
          <div className='cta-first-img'>
            <img src={ctaimg1} alt='' />
          </div>
        </div>
      </div>
      <div className='cta-second-container'>
        <div className='cta-second-content'>
          <div className='cta-second-img'>
            <img src={ctaimg2} alt='' />
          </div>
          <div className='cta-second-text'>
            <h1 className='cta-second-header'>More than just an invoice</h1>
            <div className='cta-second-other'>
              <div className='cta-text1'>
                <h3>
                  <i className='bx bx-mobile-alt'></i>
                  Easily Set it up in 5 minutes
                </h3>
                <div className='cta-text-small'>
                  Manage your businesses from any device, online, send invoices
                  and collect payments easily.
                </div>
              </div>
              <div className='cta-text2'>
                <h3>
                  <i className='bx bxs-dashboard'></i>
                  Freindly User Interface
                </h3>
                <div className='cta-text-small'>
                  Manage your businesses from any device, online, send invoices
                  and collect payments easily.
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className='pricing-container' id='pricing'>
        <div className='pricing-content'>
          <div className='pricing-header'>
            <h1>Start your journey</h1>
          </div>
          <div className='pricing-card'>
            <h4>FREE</h4>
            <p>Get started for free</p>
            <h3>$0.00</h3>
            <ul>
              <li>Free Online System</li>
              <li>SSL Security</li>
              <li>Dashboard Management</li>
              <li>Things other than the top</li>
            </ul>
            <a href='#' className='pricing-btn'>
              Get started for free
            </a>
          </div>
        </div>
      </div>
      {/* <!-- Register Container --> */}
      <div className='register-container'>
        <div className='register-content'>
          <div className='register-text'>
            <h1 className='register-header-text'>
              Complete Business Management Suite
            </h1>
            <p className='register-text-small'>
              Manage your businesses from any device, online, send invoices and
              collect payments easily.
            </p>
            <a href='#' className='cta-btn-register'>
              Get Started for free <i className='bx bx-right-arrow-alt'></i>
            </a>
          </div>
          <div className='register-img'>
            <img src={register} alt='' />
          </div>
        </div>
      </div>
      {/* Subscribe Container */}
      <div className='subscribe-container'>
        <img src={subscribe} alt='' className='subscribe-image' />
        <div className='subscribe-content'>
          <div className='subscribe-text'>
            <h1 className='subscribe-header-text'>
              Stay in the loop, Subscribe to our Newsletter
            </h1>
            <p className='subscribe-sub-text'>
              No unnecessary BS, just the good stuff only. For your business
            </p>
          </div>
          <form className='subscribe-form'>
            <input type='search' placeholder='Email: johndoe@gmail.com' />{" "}
            <a type='submit'>
              Sign Up <i className='bx bx-right-arrow-alt'></i>
            </a>
          </form>
        </div>
      </div>
      {/* <!-- User Review Container --> */}
      <div className='user-review-container'>
        <img src={ellipse} className='elipse' alt='' />
        <img src={polygon1} className='polygon1' alt='' />
        <img src={polygon2} className='polygon2' alt='' />
        <div className='user-review-content'>
          <div className='usr-rev-text'>
            <h1>When 2 million users say it, it can only be true</h1>
          </div>
          <div className='user-review'>
            <ReviewCard
              quote={userReview1.quote}
              img={userReview1.img}
              occupation={userReview1.occupation}
              name={userReview1.name}
              review={userReview1.review}
            />
            <ReviewCard
              quote={userReview2.quote}
              img={userReview2.img}
              occupation={userReview2.occupation}
              name={userReview2.name}
              review={userReview2.review}
            />
          </div>
        </div>
      </div>
      {/* <!-- Footer Container --> */}
      <div className='footer-container'>
        <div className='footer-content'>
          <div className='left-side'>
            <img src={logo} alt='' className='footer-logo' />
            <ul className='social-icons'>
              <li className='social-icon'>
                <a href='#' className='link'>
                  <i className='bx bx-border-circle bxl-twitter'></i>
                </a>
              </li>
              <li className='social-icon'>
                <a href='#' className='link'>
                  <i className='bx bx-border-circle bxl-linkedin'></i>
                </a>
              </li>
              <li className='social-icon'>
                <a href='#' className='link'>
                  <i className='bx bx-border-circle bxl-instagram'></i>
                </a>
              </li>
            </ul>
          </div>
          <div className='right-side'>
            <ul className='activity-links'>
              <li className='activity-link'>
                <a href='#'>Home</a>
              </li>
              <li className='activity-link'>
                <a href='#pricing'>Pricing</a>
              </li>
              <li className='activity-link'>
                <a href='#'>Blog</a>
              </li>
              <li className='activity-link'>
                <a href='login'>Sign In</a>
              </li>
            </ul>
          </div>
        </div>
        <img src={footer} alt='' className='footer-img' />
      </div>
    </>
  );
};

export default Home;
