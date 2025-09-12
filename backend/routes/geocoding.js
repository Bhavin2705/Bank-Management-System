const express = require('express');
const axios = require('axios');
const router = express.Router();

// Geocoding endpoint - converts address to coordinates
router.get('/geocode', async (req, res) => {
    try {
        const { address } = req.query;

        if (!address) {
            return res.status(400).json({
                error: 'Address parameter is required'
            });
        }

        const encodedAddress = encodeURIComponent(address);
        const nominatimUrl = `https://nominatim.openstreetmap.org/search?format=json&q=${encodedAddress}&limit=1&addressdetails=1`;

        const response = await axios.get(nominatimUrl, {
            headers: {
                'User-Agent': 'BankManagementSystem/1.0 (banking-app)'
            }
        });

        const data = response.data;

        if (data.length === 0) {
            return res.status(404).json({
                error: 'Address not found'
            });
        }

        const result = {
            lat: parseFloat(data[0].lat),
            lng: parseFloat(data[0].lon),
            displayName: data[0].display_name,
            address: data[0].address
        };

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Geocoding error:', error);
        res.status(500).json({
            error: 'Geocoding service error',
            message: error.message
        });
    }
});

// Reverse geocoding endpoint - converts coordinates to address
router.get('/reverse-geocode', async (req, res) => {
    try {
        const { lat, lng } = req.query;

        if (!lat || !lng) {
            return res.status(400).json({
                error: 'Latitude and longitude parameters are required'
            });
        }

        const nominatimUrl = `https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}&addressdetails=1`;

        const response = await axios.get(nominatimUrl, {
            headers: {
                'User-Agent': 'BankManagementSystem/1.0 (banking-app)'
            }
        });

        const data = response.data;

        const result = {
            fullAddress: data.display_name || `${lat}, ${lng}`,
            area: data.address?.neighbourhood || data.address?.suburb || data.address?.city_district || 'Unknown Area',
            city: data.address?.city || data.address?.town,
            state: data.address?.state,
            country: data.address?.country
        };

        res.json({
            success: true,
            data: result
        });

    } catch (error) {
        console.error('Reverse geocoding error:', error);
        res.json({
            success: true,
            data: {
                fullAddress: `${req.query.lat}, ${req.query.lng}`,
                area: 'Unknown Area'
            }
        });
    }
});

module.exports = router;