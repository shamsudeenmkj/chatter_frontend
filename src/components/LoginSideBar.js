import { useState } from "react";
import { Offcanvas, Button } from "react-bootstrap";
import 'bootstrap/dist/css/bootstrap.min.css';
import SignInForm from "./SignInForm";
import SignUpForm from './SignUpForm';
import { Link } from "react-router-dom";


function LoginSideBar(name) {
  const [show, setShow] = useState(false);
  // New
  const [currentForm,setCurrentForm] = useState("signin");

  return (
    <div>
      <Button variant="primary" className='signInBtn' onClick={() => setShow(true)}>
       Sign In
      </Button>

      <Offcanvas className='canvaWidth' show={show} onHide={() => setShow(false)} placement="end">
        <Offcanvas.Header closeButton>
          {/* <Offcanvas.Title>Menu</Offcanvas.Title> */}
        </Offcanvas.Header>

        <Offcanvas.Body>
            {currentForm === "signin" ? (
            <SignInForm onSwitch={setCurrentForm} />
          ) : (
            <SignUpForm onSwitch={setCurrentForm} />
          )}
        </Offcanvas.Body>
      </Offcanvas>
    </div>
  );
}

export default LoginSideBar;
