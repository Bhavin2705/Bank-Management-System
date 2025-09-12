const express = require('express');
const { protect } = require('../middleware/auth');
const User = require('../models/User');
const router = express.Router();

// Apply authentication to all routes
router.use(protect);

// Calculate distance between two points using Haversine formula
function calculateDistance(lat1, lng1, lat2, lng2) {
  const R = 6371; // Earth's radius in kilometers
  const dLat = toRadians(lat2 - lat1);
  const dLng = toRadians(lng2 - lng1);

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(toRadians(lat1)) * Math.cos(toRadians(lat2)) *
    Math.sin(dLng / 2) * Math.sin(dLng / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}

function toRadians(degrees) {
  return degrees * (Math.PI / 180);
}

// GET /api/branches - Find branches and ATMs near a location for user's bank
router.get('/', async (req, res) => {
  try {
    const { lat, lng, radius = 25, type = 'all' } = req.query;

    // Validate required parameters
    if (!lat || !lng) {
      return res.status(400).json({
        error: 'Latitude and longitude are required',
        message: 'Please provide lat and lng query parameters'
      });
    }

    const userLat = parseFloat(lat);
    const userLng = parseFloat(lng);
    const searchRadius = parseFloat(radius);

    // Validate coordinate values
    if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
      return res.status(400).json({
        error: 'Invalid coordinates',
        message: 'Latitude must be between -90 and 90, longitude between -180 and 180'
      });
    }

    // Get user's bank information
    const user = await User.findById(req.user.id).select('bankDetails');
    if (!user) {
      return res.status(404).json({
        error: 'User not found'
      });
    }

    const userBankName = user.bankDetails?.bankName || 'BankPro';

    // Generate branches for the user's specific bank
    const nearbyBranches = await generateUserBankBranches(userLat, userLng, searchRadius, type, userBankName);

    res.json({
      success: true,
      location: {
        lat: userLat,
        lng: userLng,
        radius: searchRadius
      },
      bank: userBankName,
      branches: nearbyBranches,
      count: nearbyBranches.length,
      message: nearbyBranches.length === 0
        ? `No ${userBankName} branches or ATMs found in the specified area`
        : `Found ${nearbyBranches.length} ${userBankName} location(s) within ${searchRadius}km`
    });

  } catch (error) {
    console.error('Error fetching branches:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: 'Unable to fetch branch data at this time'
    });
  }
});

// Generate branches for the user's specific bank
async function generateUserBankBranches(userLat, userLng, radius, type, bankName) {
  const branches = [];
  const numBranches = Math.floor(Math.random() * 8) + 5; // 5-12 branches for user's bank

  // Define branch types based on user's bank
  const branchTypes = [
    { suffix: 'Main Branch', type: 'branch' },
    { suffix: 'Downtown Branch', type: 'branch' },
    { suffix: 'City Center', type: 'branch' },
    { suffix: 'Mall Branch', type: 'branch' },
    { suffix: 'ATM', type: 'atm' },
    { suffix: 'Express ATM', type: 'atm' },
    { suffix: 'Drive-thru ATM', type: 'atm' }
  ];

  for (let i = 0; i < numBranches; i++) {
    const branchType = branchTypes[Math.floor(Math.random() * branchTypes.length)];
    const isBranch = branchType.type === 'branch';

    // Skip if type filter doesn't match
    if (type !== 'all' && branchType.type !== type) {
      continue;
    }

    // Generate random coordinates within radius
    const angle = Math.random() * 2 * Math.PI;
    const distance = Math.random() * radius;
    const deltaLat = distance / 111; // Approximate km to degrees
    const deltaLng = distance / (111 * Math.cos(userLat * Math.PI / 180));

    const branchLat = userLat + deltaLat * Math.cos(angle);
    const branchLng = userLng + deltaLng * Math.sin(angle);

    // Generate realistic addresses
    const areaNames = ['Downtown', 'City Center', 'Mall Road', 'Main Street', 'Park Avenue', 'Business District'];
    const streetNames = ['Main St', 'Broadway', 'Park Ave', 'Oak St', 'Pine St', 'Maple Ave', 'Cedar St', 'Elm St'];

    const streetNumber = Math.floor(Math.random() * 9999) + 1;
    const streetName = streetNames[Math.floor(Math.random() * streetNames.length)];
    const areaName = areaNames[Math.floor(Math.random() * areaNames.length)];
    const zipCode = Math.floor(Math.random() * 90000) + 10000;

    branches.push({
      id: `${bankName.toLowerCase().replace(/\s+/g, '_')}_${i + 1}_${Date.now()}`,
      name: `${bankName} ${branchType.suffix}`,
      type: branchType.type,
      coordinates: { lat: branchLat, lng: branchLng },
      address: `${streetNumber} ${streetName}, ${areaName}, Local City ${zipCode}`,
      phone: isBranch ? generatePhoneNumber() : null,
      hours: isBranch
        ? 'Mon-Fri: 9AM-6PM, Sat: 9AM-2PM, Sun: Closed'
        : '24/7',
      services: getServicesForUserBank(branchType.type, bankName),
      distance: calculateDistance(userLat, userLng, branchLat, branchLng)
    });
  }

  return branches
    .filter(branch => type === 'all' || branch.type === type)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 15); // Limit to 15 results
}

function getRandomStreetName() {
  const streetNames = [
    'Main St', 'Broadway', 'Park Ave', 'Oak St', 'Pine St', 'Maple Ave',
    'Cedar St', 'Elm St', 'Washington St', 'Lincoln Ave', 'Madison St'
  ];
  return streetNames[Math.floor(Math.random() * streetNames.length)];
}

function generatePhoneNumber() {
  const areaCode = Math.floor(Math.random() * 800) + 200;
  const exchange = Math.floor(Math.random() * 800) + 200;
  const number = Math.floor(Math.random() * 9000) + 1000;
  return `(${areaCode}) ${exchange}-${number}`;
}

function getServicesForUserBank(type, bankName) {
  if (type === 'branch') {
    // Enhanced services for user's own bank
    const allServices = [
      'Full Banking Services',
      'Personal Loans',
      'Home Loans',
      'Car Loans',
      'Investment Services',
      'Safe Deposit Boxes',
      'Business Banking',
      'Notary Services',
      'Wealth Management',
      'International Banking',
      'Currency Exchange',
      'Financial Planning',
      'Insurance Services',
      'Credit Cards',
      'Online Banking Support',
      'Mobile Banking'
    ];
    const numServices = Math.floor(Math.random() * 6) + 5; // 5-10 services for user's bank
    return allServices.sort(() => 0.5 - Math.random()).slice(0, numServices);
  } else {
    // ATM services
    const atmServices = [
      'Cash Withdrawal',
      'Cash Deposit',
      'Balance Inquiry',
      'Mini Statement',
      'Check Deposit',
      'Mobile Check Deposit',
      'PIN Change',
      'Account Transfer'
    ];
    return atmServices.slice(0, Math.floor(Math.random() * 3) + 4); // 4-6 services
  }
}

module.exports = router;