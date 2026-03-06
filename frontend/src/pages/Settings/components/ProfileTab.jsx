import { Mail, MapPin, Phone, User } from 'lucide-react';
import CustomCalendar from '../../../components/ui/Calendar/CustomCalendar';
import { toLocalYYYYMMDD } from '../../../utils/date';

const ProfileTab = ({
  user,
  profileData,
  setProfileData,
  handleProfileChange,
  handleProfileUpdate,
  handleFormKeyDown
}) => (
  <div>
    <h3 className="settings-section-title">
      <User size={20} />
      Profile Information
    </h3>

    <form onSubmit={handleProfileUpdate} onKeyDown={handleFormKeyDown}>
      <div className="settings-grid-300">
        <div className="form-group">
          <label className="form-label">Full Name</label>
          <input
            type="text"
            name="name"
            className="form-input"
            value={profileData.name}
            onChange={handleProfileChange}
            required
          />
        </div>

        <div className="form-group">
          <label className="form-label">Email Address</label>
          <div className="settings-input-icon-wrap">
            <input
              type="email"
              name="email"
              className="form-input settings-input-icon-pad"
              value={profileData.email}
              onChange={handleProfileChange}
              required
            />
            <Mail size={18} className="settings-input-icon" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div className="settings-input-icon-wrap">
            <input
              type="tel"
              name="phone"
              className="form-input settings-input-icon-pad"
              value={profileData.phone}
              onChange={handleProfileChange}
              placeholder="Enter 10-digit phone number"
            />
            <Phone size={18} className="settings-input-icon" />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Date of Birth</label>
          <div
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                e.stopPropagation();
              }
            }}
          >
            <CustomCalendar
              value={profileData.dateOfBirth ? new Date(profileData.dateOfBirth) : null}
              onChange={(date) => {
                setProfileData({ ...profileData, dateOfBirth: date ? toLocalYYYYMMDD(date) : '' });
              }}
              placeholder="Select date of birth (DD/MM/YYYY)"
              maxDate={new Date()}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Occupation</label>
          <input
            type="text"
            name="occupation"
            className="form-input"
            value={profileData.occupation}
            onChange={handleProfileChange}
            placeholder="Enter your occupation"
          />
        </div>

        <div className="form-group">
          <label className="form-label">Address</label>
          <div className="settings-input-icon-wrap">
            <input
              type="text"
              name="address"
              className="form-input settings-input-icon-pad"
              value={profileData.address}
              onChange={handleProfileChange}
              placeholder="Enter your address"
            />
            <MapPin size={18} className="settings-input-icon" />
          </div>
        </div>
      </div>

      <div className="form-group settings-top-gap">
        <label className="form-label">Account Number</label>
        <input
          type="text"
          className="form-input settings-readonly"
          value={user.accountNumber || 'Not assigned'}
          disabled
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Update Profile
      </button>
    </form>
  </div>
);

export default ProfileTab;
