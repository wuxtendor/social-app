import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '/src/styles/Form.css';

function RegisterPage() {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    age: '',
    password: '',
    confirmPassword: '',
  });

  // State for password policy errors (length, case, number)
  const [policyError, setPolicyError] = useState('');
  // State for password confirmation errors (matching)
  const [matchError, setMatchError] = useState('');
  const [emailError, setEmailError] = useState('');
  
  const navigate = useNavigate();

  // This useEffect hook validates the password policy
  useEffect(() => {
    const { password } = formData;
    if (!password) {
      setPolicyError('');
      return;
    }
    const errors = [];
    if (password.length < 8) {
      errors.push('at least 8 characters');
    }
    if (!/[A-Z]/.test(password)) {
      errors.push('an uppercase letter');
    }
    if (!/[0-9]/.test(password)) {
      errors.push('a number');
    }

    if (errors.length > 0) {
      setPolicyError(`Password must contain ${errors.join(', ')}.`);
    } else {
      setPolicyError(''); // Clear error if all policies are met
    }
  }, [formData.password]);


  // This useEffect hook validates if passwords match
  useEffect(() => {
    if (formData.confirmPassword && formData.password !== formData.confirmPassword) {
      setMatchError('Passwords do not match');
    } else {
      setMatchError(''); // Clear the error if they match
    }
  }, [formData.password, formData.confirmPassword]);


  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleEmailBlur = async () => {
    if (!formData.email) {
      setEmailError('');
      return;
    }
    try {
      const response = await fetch('http://localhost:5000/api/check-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: formData.email }),
      });
      const data = await response.json();
      if (data.exists) {
        setEmailError('This email is already registered.');
      } else {
        setEmailError('');
      }
    } catch (error) {
      console.error("Email check failed:", error);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    // Final check before submitting
    if (policyError || matchError || emailError) {
      alert('Please fix the errors before submitting.');
      return;
    }

    const { confirmPassword, ...dataToSend } = formData;

    try {
      const response = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            ...dataToSend,
            age: parseInt(dataToSend.age, 10)
        }),
      });

      const data = await response.json();

      if (response.ok) {
        alert('Registration successful!');
        navigate('/login');
      } else {
        alert(data.error ||'Registration failed.');
      }
    } catch (error) {
      console.error('Registration error:', error);
      alert('An error occurred during registration.');
    }
  };

  return (
    <div className="form-container">
      <h2>Register a New Account</h2>
      <form onSubmit={handleSubmit}>
        <input type="text" name="name" placeholder="Name" value={formData.name} onChange={handleChange} required />
         {/* 3. Added the onBlur event handler to the email input */}
        <input 
          type="email" 
          name="email" 
          placeholder="Email Address" 
          value={formData.email} 
          onChange={handleChange} 
          onBlur={handleEmailBlur} 
          required 
        />
        {/* 4. Display the email error message */}
        {emailError && <p className="error-message">{emailError}</p>}
        <input type="number" name="age" placeholder="Age" value={formData.age} onChange={handleChange} required />
        <input type="password" name="password" placeholder="Password" value={formData.password} onChange={handleChange} required />
        
        {/* Display policy error message */}
        {policyError && <p className="error-message">{policyError}</p>}
        
        <input type="password" name="confirmPassword" placeholder="Confirm Password" value={formData.confirmPassword} onChange={handleChange} required />
        
        {/* Display matching error message */}
        {matchError && <p className="error-message">{matchError}</p>}
        
        {/* The button is disabled if there are any errors */}
        <button type="submit" disabled={policyError || matchError || emailError}>Register</button>
      </form>
    </div>
  );
}

export default RegisterPage;