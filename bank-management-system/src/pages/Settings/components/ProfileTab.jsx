import { Mail, MapPin, Phone, User } from 'lucide-react';
import CustomCalendar from '../../../components/UI/CustomCalendar';
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
    <h3 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <User size={20} />
      Profile Information
    </h3>

    <form onSubmit={handleProfileUpdate} onKeyDown={handleFormKeyDown}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
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
          <div style={{ position: 'relative' }}>
            <input
              type="email"
              name="email"
              className="form-input"
              value={profileData.email}
              onChange={handleProfileChange}
              required
              style={{ paddingRight: '40px' }}
            />
            <Mail
              size={18}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">Phone Number</label>
          <div style={{ position: 'relative' }}>
            <input
              type="tel"
              name="phone"
              className="form-input"
              value={profileData.phone}
              onChange={handleProfileChange}
              placeholder="Enter 10-digit phone number"
              style={{ paddingRight: '40px' }}
            />
            <Phone
              size={18}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
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
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              name="address"
              className="form-input"
              value={profileData.address}
              onChange={handleProfileChange}
              placeholder="Enter your address"
              style={{ paddingRight: '40px' }}
            />
            <MapPin
              size={18}
              style={{
                position: 'absolute',
                right: '10px',
                top: '50%',
                transform: 'translateY(-50%)',
                color: 'var(--text-secondary)'
              }}
            />
          </div>
        </div>
      </div>

      <div className="form-group" style={{ marginTop: '1rem' }}>
        <label className="form-label">Account Number</label>
        <input
          type="text"
          className="form-input"
          value={user.accountNumber || 'Not assigned'}
          disabled
          style={{ background: 'var(--bg-tertiary)' }}
        />
      </div>

      <button type="submit" className="btn btn-primary">
        Update Profile
      </button>
    </form>
  </div>
);

export default ProfileTab;
