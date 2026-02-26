// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyD0Z37a_6jM4eXCn51TT1gNSvEss8-RE84",
  authDomain: "conway-5d4e5.firebaseapp.com",
  projectId: "conway-5d4e5",
  storageBucket: "conway-5d4e5.firebasestorage.app",
  messagingSenderId: "927638706826",
  appId: "1:927638706826:web:39844496e6a5bf3f55eb73",
  measurementId: "G-BSHS3ZDJBP"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
