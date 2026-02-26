import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyD0Z37a_6jM4eXCn51TT1gNSvEss8-RE84",
  authDomain: "conway-5d4e5.firebaseapp.com",
  projectId: "conway-5d4e5",
  storageBucket: "conway-5d4e5.firebasestorage.app",
  messagingSenderId: "927638706826",
  appId: "1:927638706826:web:39844496e6a5bf3f55eb73",
  measurementId: "G-BSHS3ZDJBP",
};

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app);
