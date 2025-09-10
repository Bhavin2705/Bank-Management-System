import { useState, useEffect } from 'react';
import { MapPin, Phone, Clock, Navigation, Search, Filter } from 'lucide-react';

const BranchLocator = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [userLocation, setUserLocation] = useState(null);

  // Mock branch data - in a real app, this would come from an API
  const branches = [
    {
      id: 1,
      name: 'Downtown Main Branch',
      type: 'branch',
      address: '123 Main Street, Downtown, NY 10001',
      phone: '(555) 123-4567',
      hours: 'Mon-Fri: 9AM-6PM, Sat: 9AM-2PM, Sun: Closed',
      services: ['Full Banking', 'Loans', 'Investment Services', 'Safe Deposit Boxes'],
      coordinates: { lat: 40.7589, lng: -73.9851 },
      distance: 0.5
    },
    {
      id: 2,
      name: 'Midtown ATM',
      type: 'atm',
      address: '456 Broadway Ave, Midtown, NY 10036',
      phone: null,
      hours: '24/7',
      services: ['Cash Withdrawal', 'Deposit', 'Balance Inquiry'],
      coordinates: { lat: 40.7614, lng: -73.9776 },
      distance: 1.2
    },
    {
      id: 3,
      name: 'Brooklyn Branch',
      type: 'branch',
      address: '789 Atlantic Ave, Brooklyn, NY 11201',
      phone: '(555) 987-6543',
      hours: 'Mon-Fri: 8AM-5PM, Sat: 9AM-1PM, Sun: Closed',
      services: ['Full Banking', 'Business Banking', 'Notary Services'],
      coordinates: { lat: 40.6928, lng: -73.9903 },
      distance: 3.8
    },
    {
      id: 4,
      name: 'Queens ATM',
      type: 'atm',
      address: '321 Queens Blvd, Queens, NY 11373',
      phone: null,
      hours: '24/7',
      services: ['Cash Withdrawal', 'Deposit', 'Balance Inquiry', 'Check Deposit'],
      coordinates: { lat: 40.7282, lng: -73.7949 },
      distance: 8.5
    },
    {
      id: 5,
      name: 'Financial District Branch',
      type: 'branch',
      address: '555 Wall Street, Financial District, NY 10005',
      phone: '(555) 555-0123',
      hours: 'Mon-Fri: 8AM-8PM, Sat: 9AM-3PM, Sun: Closed',
      services: ['Full Banking', 'Wealth Management', 'International Banking', 'Currency Exchange'],
      coordinates: { lat: 40.7074, lng: -74.0113 },
      distance: 2.1
    },
    {
      id: 6,
      name: 'Upper East Side ATM',
      type: 'atm',
      address: '999 Madison Ave, Upper East Side, NY 10021',
      phone: null,
      hours: '24/7',
      services: ['Cash Withdrawal', 'Deposit', 'Balance Inquiry', 'Mobile Check Deposit'],
      coordinates: { lat: 40.7711, lng: -73.9646 },
      distance: 4.2
    }
  ];

  useEffect(() => {
    // Get user's location (in a real app, you'd request permission)
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setUserLocation({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
        },
        (error) => {
          console.log('Error getting location:', error);
          // Default to NYC coordinates
          setUserLocation({ lat: 40.7589, lng: -73.9851 });
        }
      );
    }
  }, []);

  const filteredBranches = branches.filter(branch => {
    const matchesSearch = branch.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         branch.address.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesType = selectedType === 'all' || branch.type === selectedType;
    return matchesSearch && matchesType;
  });

  const getDirections = (branch) => {
    if (userLocation) {
      const url = `https://www.google.com/maps/dir/${userLocation.lat},${userLocation.lng}/${branch.coordinates.lat},${branch.coordinates.lng}`;
      window.open(url, '_blank');
    } else {
      // Fallback to just showing the location
      const url = `https://www.google.com/maps/search/?api=1&query=${branch.coordinates.lat},${branch.coordinates.lng}`;
      window.open(url, '_blank');
    }
  };

  const formatDistance = (distance) => {
    return distance < 1 ? `${(distance * 1000).toFixed(0)}m` : `${distance.toFixed(1)}km`;
  };

  return (
    <div className="container">
      <div style={{ marginBottom: '2rem' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: '700', marginBottom: '0.5rem' }}>
          Branch & ATM Locator
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Find BankPro branches and ATMs near you
        </p>
      </div>

      {/* Search and Filters */}
      <div className="card" style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
            <Search size={18} />
            <input
              type="text"
              placeholder="Search by location or branch name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="form-input"
              style={{ margin: 0 }}
            />
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Filter size={18} />
            <select
              value={selectedType}
              onChange={(e) => setSelectedType(e.target.value)}
              className="form-input"
              style={{ width: 'auto', minWidth: '120px' }}
            >
              <option value="all">All Locations</option>
              <option value="branch">Branches Only</option>
              <option value="atm">ATMs Only</option>
            </select>
          </div>
        </div>
      </div>

      <div className="dashboard-grid" style={{ gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        {/* Branches List */}
        <div className="card" style={{ maxHeight: '600px', overflowY: 'auto' }}>
          <h3 style={{ marginBottom: '1.5rem' }}>
            {selectedType === 'all' ? 'All Locations' : selectedType === 'branch' ? 'Branches' : 'ATMs'}
            ({filteredBranches.length})
          </h3>

          {filteredBranches.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              No locations found matching your search
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  style={{
                    padding: '1rem',
                    border: selectedBranch?.id === branch.id ? '2px solid #667eea' : '1px solid var(--border)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedBranch?.id === branch.id ? 'var(--bg-hover)' : 'var(--bg-primary)',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '0.5rem' }}>
                    <div>
                      <h4 style={{ margin: 0, fontSize: '1.1rem', fontWeight: '600' }}>
                        {branch.name}
                      </h4>
                      <div style={{
                        display: 'inline-block',
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: branch.type === 'branch' ? '#28a745' : '#667eea',
                        color: 'white',
                        fontSize: '0.75rem',
                        fontWeight: '500',
                        marginTop: '0.25rem'
                      }}>
                        {branch.type.toUpperCase()}
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                        {formatDistance(branch.distance)}
                      </div>
                    </div>
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>
                    <MapPin size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {branch.address}
                  </div>

                  <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
                    <Clock size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                    {branch.hours}
                  </div>

                  {branch.phone && (
                    <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                      <Phone size={14} style={{ marginRight: '0.25rem', verticalAlign: 'middle' }} />
                      {branch.phone}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Branch Details */}
        <div className="card">
          {selectedBranch ? (
            <div>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                <h3 style={{ margin: 0 }}>{selectedBranch.name}</h3>
                <div style={{
                  padding: '0.25rem 0.5rem',
                  borderRadius: '4px',
                  background: selectedBranch.type === 'branch' ? '#28a745' : '#667eea',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {selectedBranch.type.toUpperCase()}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MapPin size={16} style={{ color: '#667eea', marginTop: '0.25rem' }} />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Address</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.address}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Clock size={16} style={{ color: '#667eea', marginTop: '0.25rem' }} />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Hours</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.hours}</div>
                  </div>
                </div>

                {selectedBranch.phone && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Phone size={16} style={{ color: '#667eea', marginTop: '0.25rem' }} />
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Phone</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.phone}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Navigation size={16} style={{ color: '#667eea', marginTop: '0.25rem' }} />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Distance</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{formatDistance(selectedBranch.distance)} away</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <h4 style={{ marginBottom: '0.75rem' }}>Available Services</h4>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
                  {selectedBranch.services.map((service, index) => (
                    <span
                      key={index}
                      style={{
                        padding: '0.25rem 0.5rem',
                        borderRadius: '4px',
                        background: 'var(--bg-tertiary)',
                        fontSize: '0.8rem',
                        color: 'var(--text-secondary)'
                      }}
                    >
                      {service}
                    </span>
                  ))}
                </div>
              </div>

              <button
                onClick={() => getDirections(selectedBranch)}
                className="btn btn-primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
              >
                <Navigation size={16} />
                Get Directions
              </button>
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              height: '400px',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
              <MapPin size={48} style={{ marginBottom: '1rem', opacity: 0.5 }} />
              <h3>Select a Location</h3>
              <p>Click on a branch or ATM from the list to view details and get directions</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BranchLocator;
