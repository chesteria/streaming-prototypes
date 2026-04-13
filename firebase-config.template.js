// firebase-config.template.js — committed to repo
// This file is the source template. The GitHub Actions deploy workflow
// runs `envsubst` to substitute $VAR placeholders and writes the output
// to js/firebase-config.js (which is gitignored and never committed).
//
// For local development:
//   cp firebase-config.template.js js/firebase-config.js
//   then replace each $VAR with the real value from the Firebase console.

export const firebaseConfig = {
  apiKey:            "$FIREBASE_API_KEY",
  authDomain:        "$FIREBASE_AUTH_DOMAIN",
  projectId:         "$FIREBASE_PROJECT_ID",
  storageBucket:     "$FIREBASE_STORAGE_BUCKET",
  messagingSenderId: "$FIREBASE_MESSAGING_SENDER_ID",
  appId:             "$FIREBASE_APP_ID",
  measurementId:     "$FIREBASE_MEASUREMENT_ID",
};
