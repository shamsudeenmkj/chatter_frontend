import { useState } from "react";

function SignUpForm({ onSwitch }) {   
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});
  const SIGNALING_SERVER = "https://chatter-backend-4i7g.onrender.com";
// const SIGNALING_SERVER = 'http://localhost:8000';

  // Handle form submit
 const handleSubmit = async (e) => {
  e.preventDefault();

  // validation here...

  if (Object.keys(errors).length === 0) {
    const response = await fetch(`${SIGNALING_SERVER}/signup`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({ name, email, password })
    });

    const data = await response.json();

    if (data.success) {
      alert("Account created successfully!");
      onSwitch("signin");
    } else {
      alert(data.message);
    }
  }
};

  return (
    <form className="signin-form signup-form" onSubmit={handleSubmit}>
      <div class="LoginTitle">Sign Up</div>
      <div className="labInputCnt">
        <label>Name</label>
        <input
          className="form-control"
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Enter your full name"
        />
        {errors.name && <p className="error-text">{errors.name}</p>}
      </div>

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
        <input
          className="form-control"
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Enter a password"
        />
        {errors.password && <p className="error-text">{errors.password}</p>}
      </div>

      <div className="labInputCnt">
        <label>Confirm Password</label>
        <input
          className="form-control"
          type="password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          placeholder="Confirm your password"
        />
        {errors.confirmPassword && (
          <p className="error-text">{errors.confirmPassword}</p>
        )}
      </div>
      <div className="backToSignInCnt">
        <div className="terms-checkbox">
        <input
          type="checkbox"
          checked={agreeTerms}
          onChange={() => setAgreeTerms(!agreeTerms)}
        />
        <label>
          By signing up, I agree to the <a href="/terms">Terms and Conditions.</a>
        </label>
        {errors.agreeTerms && (
          <p className="error-text">{errors.agreeTerms}</p>
        )}
      </div>

      <div className="PwdAndNewRegister">
        <p className="newRegister m-0">
          Already have an account?{" "}
          <button
            type="button"
            onClick={() => onSwitch("signin")}  // ✅ (3) Switch when clicked
            className="switchBtn"
          >
            Sign in
          </button>
        </p>
      </div>
      </div>     

      <button type="submit" className="signUpBtn">
        Sign Up
      </button>
    </form>
  );
}

export default SignUpForm;
