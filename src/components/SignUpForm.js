import { useState } from "react";

function SignUpForm({ onSwitch }) {   
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [name, setName] = useState("");
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [errors, setErrors] = useState({});

  // Handle form submit
  const handleSubmit = (e) => {
    e.preventDefault();
    let formErrors = {};

    if (!name.trim()) formErrors.name = "Name is required.";

    if (!email.trim()) formErrors.email = "Email is required.";
    else if (!/\S+@\S+\.\S+/.test(email))
      formErrors.email = "Enter a valid email address.";

    if (!password.trim()) formErrors.password = "Password is required.";
    else if (password.length < 6)
      formErrors.password = "Password must be at least 6 characters.";

    if (password !== confirmPassword)
      formErrors.confirmPassword = "Passwords do not match.";

    if (!agreeTerms) formErrors.agreeTerms = "You must agree to the terms.";

    setErrors(formErrors);

    if (Object.keys(formErrors).length === 0) {
      console.log("Form submitted:", { name, email, password });
      alert("Account created successfully!");

      onSwitch("signin");   // ✅ (2) Switch back to SignInForm after success
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
