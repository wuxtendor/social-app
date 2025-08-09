import React from 'react';
import './Profile.css';

// 1. We now accept "props" as an argument to our function.
// It's an object that holds all the data passed from the parent.
// We can use destructuring { userData } to immediately get the data we need.
function Profile({ userData }) {
  // 2. All the hardcoded data is GONE.

  // 3. We now use the 'userData' object from props to display the data.
  return (
    <div className="profile-container">
      <div className="profile-header">
        <img src={userData.avatar} alt="Аватар" className="profile-avatar" />
        <div className="profile-info">
          <h2 className="profile-name">{userData.name}</h2>
          <p className="profile-age">{userData.age} лет</p>
        </div>
      </div>
      <p className="profile-description">{userData.description}</p>
    </div>
  );
}

export default Profile;