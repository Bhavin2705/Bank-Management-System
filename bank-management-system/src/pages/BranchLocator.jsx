import { AlertCircle, Clock, Filter, Loader, Locate, MapPin, Navigation, Phone, Search } from 'lucide-react';
import { useEffect, useState } from 'react';
import locationService from '../utils/locationService';

const BranchLocator = ({ user }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState('all');
  const [selectedBranch, setSelectedBranch] = useState(null);
  const [userLocation, setUserLocation] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [locationInput, setLocationInput] = useState('');
  const [searchRadius, setSearchRadius] = useState(25); // kilometers

  // Load initial location and fetch branches
  useEffect(() => {
    initializeLocation();
  }, []); // Only run once on mount

  // Fetch branches when user or searchRadius changes (but only if we have a location)
  useEffect(() => {
    if (userLocation && user) {
      fetchNearbyBranches(userLocation.lat, userLocation.lng);
    }
  }, [user?.bankDetails?.bankName, searchRadius]); // Re-fetch when bank or radius changes

  const initializeLocation = async () => {
    setLoading(true);
    setError(null);

    try {
      const location = await locationService.getCurrentLocation();
      console.log('🎯 Got current location:', location);
      setUserLocation(location);

      // Immediately fetch branches for current location
      if (user) {
        await fetchNearbyBranches(location.lat, location.lng);
      }
    } catch (error) {
      console.warn('Could not get current location:', error.message);
      setError('Unable to access your location. Please enter a location manually to search for branches.');
    } finally {
      setLoading(false);
    }
  };

  const fetchNearbyBranches = async (lat, lng) => {
    setLoading(true);
    try {
      // Get user's bank name from user object
      const userBankName = user?.bankDetails?.bankName || user?.bank || 'BankPro';

      const branchData = await locationService.fetchBranchesAndATMs(lat, lng, searchRadius, userBankName);
      setBranches(branchData);

      if (branchData.length === 0) {
        setError(`No ${userBankName} branches found in this area. Try searching a different location or increasing the search radius. Data is sourced from OpenStreetMap - some locations may not be listed yet.`);
      } else {
        setError(null);
        console.log(`✅ Found ${branchData.length} ${userBankName} locations`);
      }
    } catch (error) {
      setError('Unable to fetch branch data. Please check your internet connection and try again.');
      console.error('Error fetching branches:', error);
      setBranches([]);
    } finally {
      setLoading(false);
    }
  };

  const handleLocationSearch = async () => {
    if (!locationInput.trim()) {
      setError('Please enter a location to search');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const geocodedLocation = await locationService.geocodeAddress(locationInput);
      setUserLocation(geocodedLocation);
      await fetchNearbyBranches(geocodedLocation.lat, geocodedLocation.lng);
    } catch (error) {
      setError(`Could not find location "${locationInput}". Please try a different address or city name.`);
    } finally {
      setLoading(false);
    }
  };

  const handleCurrentLocation = async () => {
    await initializeLocation();
  };

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
          {user?.bankDetails?.bankName || user?.bank || 'BankPro'} Branch & ATM Locator
        </h1>
        <p style={{ color: 'var(--text-secondary)' }}>
          Find real {user?.bankDetails?.bankName || user?.bank || 'BankPro'} branches and ATMs near you using OpenStreetMap data
        </p>
      </div>

      {/* Location Search */}
      <div className="card" style={{ marginBottom: '1rem' }}>
        <h3 style={{ marginBottom: '1rem' }}>Search Location</h3>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, minWidth: '250px' }}>
            <MapPin size={18} />
            <input
              type="text"
              placeholder="Enter city, address, or ZIP code..."
              value={locationInput}
              onChange={(e) => setLocationInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleLocationSearch()}
              className="form-input"
              style={{ margin: 0 }}
              disabled={loading}
            />
          </div>

          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={handleLocationSearch}
              disabled={loading || !locationInput.trim()}
              className="btn btn-primary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} /> : <Search size={16} />}
              Search
            </button>

            <button
              onClick={handleCurrentLocation}
              disabled={loading}
              className="btn btn-secondary"
              style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              <Locate size={16} />
              Use Current Location
            </button>
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginTop: '1rem' }}>
          <label style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            Search Radius:
          </label>
          <select
            value={searchRadius}
            onChange={(e) => setSearchRadius(Number(e.target.value))}
            className="form-input"
            style={{ width: 'auto', minWidth: '100px' }}
            disabled={loading}
          >
            <option value={5}>5 km</option>
            <option value={10}>10 km</option>
            <option value={25}>25 km</option>
            <option value={50}>50 km</option>
            <option value={100}>100 km</option>
          </select>
        </div>
      </div>

      {/* Error Display */}
      {error && (
        <div className="card" style={{
          marginBottom: '1rem',
          background: 'var(--bg-secondary)',
          border: '1px solid #dc3545',
          borderRadius: '8px'
        }}>
          <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.75rem', color: '#dc3545' }}>
            <AlertCircle size={20} style={{ marginTop: '0.125rem', flexShrink: 0 }} />
            <div>
              <div style={{ fontWeight: '600', marginBottom: '0.25rem' }}>Location Error</div>
              <div style={{ fontSize: '0.9rem' }}>{error}</div>
            </div>
          </div>
        </div>
      )}

      {/* Current Location Display */}
      {userLocation && (
        <div className="card" style={{ marginBottom: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
            <MapPin size={16} />
            <span>
              Searching near: {userLocation.displayName || `${userLocation.lat.toFixed(4)}, ${userLocation.lng.toFixed(4)}`}
              {searchRadius && ` (within ${searchRadius}km)`}
            </span>
          </div>
          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '0.5rem' }}>
            📍 Location data sourced from OpenStreetMap
          </div>
        </div>
      )}

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
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
            <h3 style={{ margin: 0 }}>
              {selectedType === 'all' ? 'All Locations' : selectedType === 'branch' ? 'Branches' : 'ATMs'}
              {!loading && `(${filteredBranches.length})`}
            </h3>
            {loading && (
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)' }}>
                <Loader size={16} style={{ animation: 'spin 1s linear infinite' }} />
                <span style={{ fontSize: '0.9rem' }}>Loading...</span>
              </div>
            )}
          </div>

          {loading ? (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '3rem',
              color: 'var(--text-secondary)',
              textAlign: 'center'
            }}>
              <Loader size={32} style={{ marginBottom: '1rem', animation: 'spin 1s linear infinite' }} />
              <div>Finding nearby branches and ATMs...</div>
              <div style={{ fontSize: '0.8rem', marginTop: '0.5rem' }}>
                This may take a few moments while we search your area
              </div>
            </div>
          ) : filteredBranches.length === 0 ? (
            <div style={{
              textAlign: 'center',
              padding: '2rem',
              color: 'var(--text-secondary)',
              fontStyle: 'italic'
            }}>
              {branches.length === 0 ? (
                <div>
                  <MapPin size={32} style={{ marginBottom: '1rem', opacity: 0.5 }} />
                  <div>No {user?.bankDetails?.bankName || 'bank'} branches found in this area</div>
                  <div style={{ fontSize: '0.9rem', marginTop: '0.5rem' }}>
                    Try searching a different location or increasing the search radius.<br />
                    Data is sourced from OpenStreetMap - some locations may not be listed yet.
                  </div>
                </div>
              ) : (
                <div>No locations found matching your search criteria</div>
              )}
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {filteredBranches.map((branch) => (
                <div
                  key={branch.id}
                  onClick={() => setSelectedBranch(branch)}
                  style={{
                    padding: '1rem',
                    border: selectedBranch?.id === branch.id ? '2px solid var(--text-accent)' : '1px solid var(--border-color)',
                    borderRadius: '8px',
                    cursor: 'pointer',
                    background: selectedBranch?.id === branch.id ? 'var(--bg-hover)' : 'var(--bg-secondary)',
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
                        background: branch.type === 'branch' ? 'var(--text-accent)' : 'var(--text-accent)',
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
                  background: selectedBranch.type === 'branch' ? 'var(--text-accent)' : 'var(--text-accent)',
                  color: 'white',
                  fontSize: '0.75rem',
                  fontWeight: '500'
                }}>
                  {selectedBranch.type.toUpperCase()}
                </div>
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <MapPin size={16} style={{ color: 'var(--text-accent)', marginTop: '0.25rem' }} />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Address</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.address}</div>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                  <Clock size={16} style={{ color: 'var(--text-accent)', marginTop: '0.25rem' }} />
                  <div>
                    <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Hours</div>
                    <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.hours}</div>
                  </div>
                </div>

                {selectedBranch.phone && (
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem', marginBottom: '0.5rem' }}>
                    <Phone size={16} style={{ color: 'var(--text-accent)', marginTop: '0.25rem' }} />
                    <div>
                      <div style={{ fontWeight: '500', marginBottom: '0.25rem' }}>Phone</div>
                      <div style={{ color: 'var(--text-secondary)' }}>{selectedBranch.phone}</div>
                    </div>
                  </div>
                )}

                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '0.5rem' }}>
                  <Navigation size={16} style={{ color: 'var(--text-accent)', marginTop: '0.25rem' }} />
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
                        color: 'var(--text-primary)'
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
