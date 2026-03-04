import { useState } from "react";

import GuestIcon from '../assets/guestLoginIcon.svg';
import { Link } from "react-router-dom";
function SignInForm({ onSwitch ,autoSignIn}) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [errors, setErrors] = useState({});

  const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000';

  // Handle form submit
  const handleSubmit = async (e) => {
  e.preventDefault();

  if (Object.keys(errors).length === 0) {

    const response = await fetch(`${SIGNALING_SERVER}/signin`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ email, password })
    });

    const data = await response.json();

    if (data.success) {
      localStorage.setItem("token", data.token);
      localStorage.setItem("user", JSON.stringify(data.user));
      // alert("Login successful!");
      console.log(autoSignIn)
      autoSignIn();
    } else {
      alert(data.message);
    }
  }
};

  return (
    <>
    
    <form className="signin-form" onSubmit={handleSubmit}>
      <div className="LoginTitle">Sign In</div>
      <div className="labInputCnt">
        <label>Email</label>
        <input
          className="form-control"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter E-Mail"
        />
        {errors.email && <p className="error-text">{errors.email}</p>}
      </div>

      <div className="labInputCnt">
        <label>Password</label>

        <div className="password-wrapper">
          <input
            className="form-control"
            type={showPassword ? "text" : "password"}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Enter your password"
          />

          <span
            className="eye-icon"
            onClick={() => setShowPassword(!showPassword)}
          >
            {showPassword ? "🧐" : "🫣"}
          </span>
        </div>

        {errors.password && <p className="error-text">{errors.password}</p>}
      </div>
      <div className="PwdAndNewRegister">
        <a href="" className="forgetPwd">I forgot my password</a>
        <p className="newRegister m-0">Don’t you have an account? 
          <button type="button" onClick={() => onSwitch("signup")}>
             Sign up
          </button>
        </p>
      </div>

      <button type="submit" className="signInBtn">
        Sign In
      </button>
      
    </form>

<button className="guestLogin">
        <div>
          <img src={GuestIcon} alt="Guest Login Icon" />
        </div>
        <Link to='/guest-login'>Login As Guest</Link> </button>
    </>
  
  );
}

export default SignInForm;
