// Real Location and Branch/ATM Service using OpenStreetMap
// This service fetches actual bank branch locations from OpenStreetMap's Overpass API
const OVERPASS_API_URL = 'https://overpass-api.de/api/interpreter';
const NOMINATIM_API_URL = 'https://nominatim.openstreetmap.org';

// Test if Overpass API is available
async function testOverpassAPI() {
  try {
    const testQuery = '[out:json][timeout:10]; node(50.745,7.17,50.75,7.18)["amenity"="bank"]; out;';
    const response = await fetch(OVERPASS_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: `data=${encodeURIComponent(testQuery)}`
    });
    if (!response.ok) throw new Error(`Overpass API test failed: ${response.status}`);
    return true;
  } catch (error) {
    console.error('Overpass API test failed:', error);
    return false;
  }
}

class LocationService {
  constructor() {
    this.userLocation = null;
    this.geocodingCache = new Map();
  }

  // Get user's current location using browser geolocation API
  async getCurrentLocation() {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        return reject(new Error('Geolocation is not supported by this browser'));
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          this.userLocation = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
            accuracy: position.coords.accuracy
          };
          resolve(this.userLocation);
        },
        (error) => {
          let errorMessage = 'Unable to retrieve location';
          switch (error.code) {
            case error.PERMISSION_DENIED:
              errorMessage = 'Location access denied by user';
              break;
            case error.POSITION_UNAVAILABLE:
              errorMessage = 'Location information unavailable';
              break;
            case error.TIMEOUT:
              errorMessage = 'Location request timed out';
              break;
          }
          reject(new Error(errorMessage));
        },
        {
          enableHighAccuracy: true,
          timeout: 10000,
          maximumAge: 300000 // 5 minutes cache
        }
      );
    });
  }

  // Geocode an address to get coordinates using Nominatim
  async geocodeAddress(address) {
    if (this.geocodingCache.has(address)) {
      return this.geocodingCache.get(address);
    }

    try {
      const response = await fetch(
        `${NOMINATIM_API_URL}/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        {
          headers: { 'User-Agent': 'BankManagementSystem/1.0' }
        }
      );

      if (!response.ok) {
        throw new Error(`Geocoding failed: ${response.status}`);
      }

      const results = await response.json();
      if (!results || results.length === 0) {
        throw new Error('Address not found');
      }

      const result = {
        lat: parseFloat(results[0].lat),
        lng: parseFloat(results[0].lon),
        displayName: results[0].display_name
      };

      this.geocodingCache.set(address, result);
      return result;
    } catch (error) {
      console.error('Geocoding error:', error);
      throw new Error(`Unable to geocode address: ${error.message}`);
    }
  }

  // Calculate distance between two points using Haversine formula
  calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in kilometers
    const dLat = this.toRadians(lat2 - lat1);
    const dLng = this.toRadians(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
      Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in kilometers
  }

  toRadians(degrees) {
    return degrees * (Math.PI / 180);
  }

  // Calculate bounding box for a given location and radius
  calculateBoundingBox(lat, lng, radius) {
    const earthRadius = 6371; // Earth's radius in km
    const latChange = (radius / earthRadius) * (180 / Math.PI);
    const lngChange = (radius / earthRadius) * (180 / Math.PI) / Math.cos(this.toRadians(lat));
    return {
      south: lat - latChange,
      north: lat + latChange,
      west: lng - lngChange,
      east: lng + lngChange
    };
  }

  // Search for banks and ATMs within a radius
  async fetchBranchesAndATMs(userLat, userLng, radius = 25, userBankName = 'BankPro') {
    try {
      console.log(`🗺️ Fetching ${userBankName} branches/ATMs near ${userLat}, ${userLng} within ${radius}km...`);

      // Use a smaller radius query for better performance
      const searchRadius = Math.min(radius, 50); // Cap at 50km for performance

      const overpassQuery = `
        [out:json][timeout:30];
        (
          node["amenity"="bank"](around:${searchRadius * 1000},${userLat},${userLng});
          node["amenity"="atm"](around:${searchRadius * 1000},${userLat},${userLng});
        );
        out center;
      `;

      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(overpassQuery)}`
      });

      if (!response.ok) {
        console.error(`Overpass API error: ${response.status}`);
        return [];
      }

      const data = await response.json();
      console.log(`📍 Found ${data.elements?.length || 0} banking locations within ${searchRadius}km`);

      if (!data.elements || data.elements.length === 0) {
        console.log(`ℹ️ No banking locations found within ${searchRadius}km`);
        return [];
      }

      const filteredBranches = data.elements.filter(element => {
        const name = (element.tags?.name || '').toLowerCase();
        const operator = (element.tags?.operator || '').toLowerCase();
        const brand = (element.tags?.brand || '').toLowerCase();
        const searchText = `${name} ${operator} ${brand}`;
        const targetLower = userBankName.toLowerCase();

        // Map bank names to their common variations
        const bankVariations = {
          'hdfc bank': ['hdfc', 'hdfc bank'],
          'icici bank': ['icici', 'icici bank'],
          'state bank of india': ['sbi', 'state bank of india', 'state bank'],
          'axis bank': ['axis', 'axis bank'],
          'bank of baroda': ['bob', 'bank of baroda', 'baroda'],
          'punjab national bank': ['pnb', 'punjab national bank'],
          'canara bank': ['canara', 'canara bank'],
          'union bank of india': ['union bank', 'union bank of india'],
          'bank of india': ['boi', 'bank of india'],
          'central bank of india': ['central bank', 'central bank of india'],
          'bankpro': ['bankpro']
        };

        // Get the variations for the selected bank
        const selectedBankVariations = bankVariations[targetLower] || [targetLower];

        // Calculate distance to see if it's really within radius
        const distance = this.calculateDistance(userLat, userLng, element.lat, element.lon);

        // Check if any of the selected bank's variations match
        const bankMatches = selectedBankVariations.some(variation =>
          searchText.includes(variation) ||
          name.includes(variation) ||
          operator.includes(variation) ||
          brand.includes(variation)
        );

        if (bankMatches) {
          console.log(`🎯 Found ${userBankName} location: ${name || 'Unknown'} at ${distance.toFixed(1)}km`);
        }

        return bankMatches;
      });

      console.log(`🎯 Filtered to ${filteredBranches.length} relevant ${userBankName} locations`);

      if (filteredBranches.length > 0) {
        const processedBranches = await this.processRealBranchData(filteredBranches, userLat, userLng, userBankName);
        console.log(`✅ Successfully processed ${processedBranches.length} ${userBankName} branches`);

        // Log distances for debugging
        processedBranches.forEach(branch => {
          console.log(`📏 ${branch.name}: ${branch.distance}km away`);
        });

        return processedBranches;
      } else {
        console.log(`ℹ️ No ${userBankName} branches found in this area`);
        return []; // Return empty array instead of showing other banks
      }
    } catch (error) {
      console.error('Error fetching branches:', error);
      return await this.searchGeneralBanks(userLat, userLng, radius, userBankName);
    }
  }

  // Fallback search for general banks in the area
  async searchGeneralBanks(userLat, userLng, radius, targetBank) {
    try {
      console.log(`🔍 Fallback search for banks near ${userLat}, ${userLng}...`);

      const query = `
        [out:json][timeout:20];
        (
          node["amenity"="bank"](around:${radius * 1000},${userLat},${userLng});
          node["amenity"="atm"](around:${radius * 1000},${userLat},${userLng});
        );
        out center meta;
      `;

      const response = await fetch(OVERPASS_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: `data=${encodeURIComponent(query)}`
      });

      if (!response.ok) {
        throw new Error(`Fallback search failed: ${response.status}`);
      }

      const data = await response.json();
      console.log(`🏦 Found ${data.elements?.length || 0} general banking locations`);

      if (!data.elements || data.elements.length === 0) {
        return [];
      }

      const relevantBanks = data.elements.filter(element => {
        const name = (element.tags?.name || '').toLowerCase();
        const operator = (element.tags?.operator || '').toLowerCase();
        const brand = (element.tags?.brand || '').toLowerCase();
        const searchText = `${name} ${operator} ${brand}`;
        const targetLower = targetBank.toLowerCase();

        // Use the same strict filtering as the main method
        const bankVariations = {
          'hdfc bank': ['hdfc', 'hdfc bank'],
          'icici bank': ['icici', 'icici bank'],
          'state bank of india': ['sbi', 'state bank of india', 'state bank'],
          'axis bank': ['axis', 'axis bank'],
          'bank of baroda': ['bob', 'bank of baroda', 'baroda'],
          'punjab national bank': ['pnb', 'punjab national bank'],
          'canara bank': ['canara', 'canara bank'],
          'union bank of india': ['union bank', 'union bank of india'],
          'bank of india': ['boi', 'bank of india'],
          'central bank of india': ['central bank', 'central bank of india'],
          'bankpro': ['bankpro']
        };

        const selectedBankVariations = bankVariations[targetLower] || [targetLower];

        return selectedBankVariations.some(variation =>
          searchText.includes(variation) ||
          name.includes(variation) ||
          operator.includes(variation) ||
          brand.includes(variation)
        );
      });

      console.log(`✅ Found ${relevantBanks.length} potentially relevant banks`);
      return relevantBanks.length > 0
        ? this.processRealBranchData(relevantBanks, userLat, userLng, targetBank)
        : [];
    } catch (error) {
      console.error('Fallback search error:', error);
      return [];
    }
  }

  // Process real branch data from OpenStreetMap
  async processRealBranchData(elements, userLat, userLng, userBankName) {
    console.log(`🔄 Processing ${elements.length} branch locations...`);
    const branches = [];

    // Process branches in batches to avoid overwhelming the geocoding service
    const batchSize = 10;
    for (let i = 0; i < elements.length; i += batchSize) {
      const batch = elements.slice(i, i + batchSize);

      const batchPromises = batch.map(async (element, index) => {
        try {
          const lat = element.lat || element.center?.lat;
          const lng = element.lon || element.center?.lon;
          if (!lat || !lng) {
            console.warn(`Skipping element ${element.id} - missing coordinates`);
            return null;
          }

          const tags = element.tags || {};
          const isATM = tags.amenity === 'atm';
          const type = isATM ? 'atm' : 'branch';
          let name = tags.name || tags.operator || `${userBankName} ${isATM ? 'ATM' : 'Branch'}`;

          // Ensure the bank name is included
          if (!name.toLowerCase().includes(userBankName.toLowerCase())) {
            name = `${userBankName} ${name}`;
          }

          // Get address with timeout to prevent hanging
          let address;
          try {
            address = await Promise.race([
              this.getRealAddress(lat, lng),
              new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 8000))
            ]);
          } catch (error) {
            console.warn(`Address lookup failed for ${lat}, ${lng}: ${error.message}`);
            address = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
          }

          const distance = this.calculateDistance(userLat, userLng, lat, lng);
          const hours = isATM ? '24/7' : (tags.opening_hours || 'Mon-Fri: 9AM-6PM, Sat: 9AM-2PM, Sun: Closed');
          const phone = tags.phone || tags['contact:phone'] || null;
          const services = this.getServicesFromTags(tags, type, userBankName);

          return {
            id: element.id,
            name: name,
            type: type.toUpperCase(),
            address: address,
            coordinates: { lat, lng },
            distance: parseFloat(distance.toFixed(1)),
            hours: hours,
            phone: phone,
            services: services,
            realData: true,
            source: 'OpenStreetMap'
          };

        } catch (error) {
          console.error(`Error processing element ${element.id}:`, error);
          return null;
        }
      });

      // Wait for batch to complete
      const batchResults = await Promise.all(batchPromises);
      const validResults = batchResults.filter(result => result !== null);
      branches.push(...validResults);

      console.log(`📍 Processed batch ${Math.floor(i / batchSize) + 1}: ${validResults.length} valid locations`);
    }

    // Sort by distance
    branches.sort((a, b) => a.distance - b.distance);

    console.log(`✅ Successfully processed ${branches.length} real banking locations`);
    return branches;
  }

  // Get real address using Nominatim reverse geocoding
  async getRealAddress(lat, lng) {
    try {
      // Add a small delay to avoid overwhelming the API
      await new Promise(resolve => setTimeout(resolve, 200));

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000); // 3 second timeout

      const response = await fetch(
        `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&zoom=18&addressdetails=1`,
        {
          signal: controller.signal,
          headers: {
            'User-Agent': 'BankManagementSystem/1.0 (Banking App)',
            'Accept': 'application/json'
          }
        }
      );

      clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      const data = await response.json();

      if (data.display_name) {
        return data.display_name;
      } else {
        // Build address from components if display_name is missing
        const addr = data.address || {};
        const parts = [
          addr.house_number,
          addr.road,
          addr.neighbourhood || addr.suburb,
          addr.city || addr.town || addr.village,
          addr.state,
          addr.postcode
        ].filter(Boolean);

        return parts.length > 0 ? parts.join(', ') : `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
      }

    } catch (error) {
      if (error.name === 'AbortError') {
        console.warn(`Address lookup timeout for ${lat}, ${lng}`);
      } else {
        console.warn(`Reverse geocoding failed for ${lat}, ${lng}:`, error.message);
      }

      // Return coordinates as fallback
      return `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
    }
  }

  // Extract services from OpenStreetMap tags
  getServicesFromTags(tags, type, bankName) {
    const services = [];

    if (type === 'atm') {
      services.push('Cash Withdrawal', 'Balance Inquiry', 'Mini Statement');
      if (tags.cash_in === 'yes') services.push('Cash Deposit');
      if (tags.fee === 'no') services.push('Fee-free Transactions');
    } else {
      services.push('Full Banking Services', 'Account Opening', 'Loan Services', 'Personal Banking', 'Business Banking', 'Investment Services');
      if (tags.atm === 'yes') services.push('ATM Available');
      if (tags.wheelchair === 'yes') services.push('Wheelchair Accessible');
      if (tags.drive_through === 'yes') services.push('Drive-through Service');
    }

    return services;
  }
}

export default new LocationService();