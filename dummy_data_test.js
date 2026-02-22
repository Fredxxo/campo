import { initializeApp } from "firebase/app";
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from "firebase/firestore";
import fs from 'fs';
const firebaseConfig = JSON.parse(fs.readFileSync('./src/firebase.js', 'utf8').match(/firebaseConfig = (\{[\s\S]*?\});/)[1].replace(/(\w+):/g, '"$1":').replace(/'/g, '"'));
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
async function run() {
   console.log("Adding mock coordinates to Firebase for main circles just to test if they group...");
}
run();
