const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');
const path = require('path');

const BASE_URL = 'https://pavesafe-backend.onrender.com';
let fakeToken = '';
let adminToken = '';
let hazardIds = [];
const FAKE_USER = 'bannedtester123';
const FAKE_PASS = 'password';

async function testBanFlow() {
  console.log("1. Registering fake user...");
  try {
    const regRes = await axios.post(`${BASE_URL}/api/auth/register`, {
      username: FAKE_USER,
      password: FAKE_PASS,
      role: 'commuter'
    });
    console.log("Registered:", regRes.data.message);
  } catch(e) {
    console.log("User might already exist.");
  }

  console.log("2. Logging in as fake user...");
  const loginRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: FAKE_USER,
    password: FAKE_PASS
  });
  fakeToken = loginRes.data.token;
  console.log("Fake User Logged in. Token received.");

  console.log("3. Submitting 5 Hazard Reports...");
  for (let i = 0; i < 5; i++) {
    const form = new FormData();
    form.append('latitude', '34.0522');
    form.append('longitude', '-118.2437');
    form.append('severity', '8');
    form.append('image', fs.createReadStream('../test_pothole.jpg'));

    const repRes = await axios.post(`${BASE_URL}/api/hazards/report`, form, {
      headers: {
        ...form.getHeaders(),
        Authorization: `Bearer ${fakeToken}`
      }
    });
    console.log(`Report ${i+1} created with ID: ${repRes.data.hazard.id}`);
    hazardIds.push(repRes.data.hazard.id);
  }

  console.log("4. Logging in as Admin...");
  const adminRes = await axios.post(`${BASE_URL}/api/auth/login`, {
    username: 'admin',
    password: 'admin'
  });
  adminToken = adminRes.data.token;
  console.log("Admin logged in.");

  console.log("5. Rejecting the 5 Reports...");
  for (const id of hazardIds) {
    try {
      await axios.put(`${BASE_URL}/api/hazards/${id}/status`, { status: 'Rejected' }, {
        headers: { Authorization: `Bearer ${adminToken}` }
      });
      console.log(`Hazard ${id} rejected.`);
    } catch(e) {
       console.error(`Failed to reject ${id}:`, e.response ? e.response.data : e.message);
    }
  }

  console.log("6. Verifying the Ban...");
  try {
    await axios.post(`${BASE_URL}/api/auth/login`, {
      username: FAKE_USER,
      password: FAKE_PASS
    });
    console.log("ERROR: User was able to log in. Ban logic failed!");
  } catch (error) {
    if (error.response && error.response.status === 403) {
      console.log("SUCCESS! Ban caught the user login:");
      console.log(error.response.data.error);
    } else {
      console.log("Unexpected error during login:", error.message);
    }
  }
}

testBanFlow();
