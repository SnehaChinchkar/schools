require('dotenv').config();
const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password:'',
    database: process.env.DB_NAME
});

db.connect(err => {
    if (err) {
        console.error('Database connection failed:', err);
    } else {
        console.log('Connected to MySQL database');
    }
});

app.post('/addSchool', (req, res) => {
    const { name, address, latitude, longitude } = req.body;
    if (!name || !address || !latitude || !longitude) {
        return res.status(400).json({ error: 'All fields are required' });
    }
    const query = 'INSERT INTO schools (name, address, latitude, longitude) VALUES (?, ?, ?, ?)';
    db.query(query, [name, address, latitude, longitude], (err, result) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err });
        res.status(201).json({ message: 'School added successfully', schoolId: result.insertId });
    });
});

app.get('/listSchools1', (req, res) => {
    const { latitude, longitude } = req.query;
    if (!latitude || !longitude) {
        return res.status(400).json({ error: 'Latitude and longitude are required' });
    }
    const userLat = parseFloat(latitude);
    const userLon = parseFloat(longitude);

    const query = 'SELECT id, name, address, latitude, longitude FROM schools';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err });
        
        results.forEach(school => {
            school.distance = calculateDistance(userLat, userLon, school.latitude, school.longitude);
        });
        results.sort((a, b) => a.distance - b.distance);
        res.json(results);
    });
});

app.get('/listSchools', (req, res) => {
    const userLat = req.headers['latitude'];
    const userLon = req.headers['longitude'];

    if (!userLat || !userLon) {
        return res.status(400).json({ error: 'Latitude and longitude are required in headers' });
    }

    const latitude = parseFloat(userLat);
    const longitude = parseFloat(userLon);

    const query = 'SELECT id, name, address, latitude, longitude FROM schools';
    db.query(query, (err, results) => {
        if (err) return res.status(500).json({ error: 'Database error', details: err });

        results.forEach(school => {
            school.distance = calculateDistance(latitude, longitude, school.latitude, school.longitude);
        });

        results.sort((a, b) => a.distance - b.distance);
        res.json(results);
    });
});

app.get('/checksqldatabase', (req, res) => {
    db.query('SELECT * FROM schools', (err, results) => {
        if (err) {
            return res.status(500).json({ success: false, message: 'Error Fetching Data', error: err.message });
        }
        res.json({ success: true, data: results });
    });
});

function calculateDistance(lat1, lon1, lat2, lon2) {
    const toRad = x => (x * Math.PI) / 180;
    const R = 6371;
    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);
    const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
              Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
              Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
