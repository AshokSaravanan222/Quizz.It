import React, { useState, useEffect } from "react";

export default function UseAuthValidation(password) {
  const [hasMinChars, setHasMinChars] = useState(false);
  const [hasLowercase, setHasLowerCase] = useState(false);
  const [hasUpperCase, setHasUpperCase] = useState(false);
  const [hasSpecial, setHasSpecial] = useState(false);
  const [hasNumber, setHasNumber] = useState(false);

  const [isPasswordValid, setIsPasswordValid] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const togglePwDisplay = () => {
    setShowPassword((prev) => !prev);
  };

  useEffect(() => {
    setHasNumber(/\d/.test(password));
    setHasMinChars(password.length >= 8);
    setHasLowerCase(/[a-z]/.test(password));
    setHasUpperCase(/[A-Z]/.test(password));
    setHasSpecial(/[!@#$%^&*()\-+={}[\]:;"'<>,.?\/|\\]/.test(password));
    setIsPasswordValid(
      hasMinChars && hasLowercase && hasUpperCase && hasSpecial && hasNumber
    );
  }, [
    password,
    hasMinChars,
    hasLowercase,
    hasUpperCase,
    hasSpecial,
    hasNumber,
  ]);

  const pwDisplayStyles = {
    display: "grid",
    gridTemplateRows: "repeat(3, 1fr)",
    gridTemplateColumns: "repeat(2, 1fr)",
    margin: "0 auto",
    marginTop: "10px",
    columnGap: "15px",
  };

  const renderDisplay = () => {
    return (
      <div className="pw-reqs" style={pwDisplayStyles}>
        <li style={{ color: `${hasMinChars ? "#009E60" : "#000"}` }}>
          8 characters
        </li>
        <li style={{ color: `${hasLowercase ? "#009E60" : "#000"}` }}>
          One lowercase letter
        </li>
        <li style={{ color: `${hasUpperCase ? "#009E60" : "#000"}` }}>
          One uppercase letter
        </li>
        <li style={{ color: `${hasNumber ? "#009E60" : "#000"}` }}>
          One number
        </li>
        <li style={{ color: `${hasSpecial ? "#009E60" : "#000"}` }}>
          One special character
        </li>
      </div>
    );
  };

  return { isPasswordValid, showPassword, renderDisplay, togglePwDisplay };
}