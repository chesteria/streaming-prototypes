// firebase-config.example.js — committed to repo as a reference shape
// Shows the structure of the generated firebase-config.js.
// DO NOT put real keys here. Copy this file to firebase-config.js
// and fill in real values for local development.
//
// Real values are stored as GitHub Actions secrets and injected at
// deploy time via envsubst (see firebase-config.template.js and
// .github/workflows/deploy.yml).

export const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "your-project.firebaseapp.com",
  projectId:         "your-project",
  storageBucket:     "your-project.firebasestorage.app",
  messagingSenderId: "000000000000",
  appId:             "1:000000000000:web:abc123",
  measurementId:     "G-XXXXXXXXXX",
};
