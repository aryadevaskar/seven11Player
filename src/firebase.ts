// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getDatabase } from "firebase/database";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyD0nfOYvQpj7tUYYYKs3YPzDYNEUhXXOTA",
  authDomain: "konbini-93b16.firebaseapp.com",
  databaseURL: "https://konbini-93b16-default-rtdb.firebaseio.com",
  projectId: "konbini-93b16",
  storageBucket: "konbini-93b16.firebasestorage.app",
  messagingSenderId: "801929902013",
  appId: "1:801929902013:web:5b9125b13bd3c8bd9684d4",
  measurementId: "G-3Q48ERWT87"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = getAnalytics(app);
export const database = getDatabase(app);