import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCNg0JnAgAH39y9D-8vhJKwQ10JYxx5Z0s",
  authDomain: "cyberbook-83464.firebaseapp.com",
  projectId: "cyberbook-83464",
  storageBucket: "cyberbook-83464.firebasestorage.app",
  messagingSenderId: "93288968489",
  appId: "1:93288968489:web:61a2651a867903dff769c8",
  measurementId: "G-PW5G4KFXX1"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

const authContainer = document.getElementById('auth-container');
const profileContainer = document.getElementById('profile-container');
const userEmailSpan = document.getElementById('user-email');
const savedProgressDiv = document.getElementById('saved-progress');
const errorDiv = document.getElementById('error-message');

let currentUser = null;

// Słownik tłumaczeń błędów z angielskiego na polski
function pokazBlad(kodBledu) {
  errorDiv.innerText = "";
  switch(kodBledu) {
    case 'auth/invalid-email':
      errorDiv.innerText = "❌ Niepoprawny format adresu e-mail.";
      break;
    case 'auth/weak-password':
      errorDiv.innerText = "❌ Hasło musi mieć co najmniej 6 znaków.";
      break;
    case 'auth/invalid-credential':
    case 'auth/wrong-password':
    case 'auth/user-not-found':
      errorDiv.innerText = "❌ Błędny e-mail lub hasło.";
      break;
    case 'auth/email-already-in-use':
      errorDiv.innerText = "❌ Ten adres e-mail jest już zarejestrowany.";
      break;
    case 'puste-pola':
      errorDiv.innerText = "⚠️ Wpisz e-mail oraz hasło.";
      break;
    default:
      errorDiv.innerText = "❌ Wystąpił nieznany błąd. Spróbuj ponownie.";
      console.error(kodBledu);
  }
}

// Funkcja ustawiająca typ pamięci (Zapamiętaj mnie)
async function ustawPamiec() {
  const zapamietaj = document.getElementById('remember-me').checked;
  // browserLocalPersistence = pamięta na zawsze | browserSessionPersistence = pamięta tylko do zamknięcia karty
  const typPamieci = zapamietaj ? browserLocalPersistence : browserSessionPersistence;
  await setPersistence(auth, typPamieci);
}

// --- REJESTRACJA ---
document.getElementById('btn-signup').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  errorDiv.innerText = "";

  if(!email || !password) { pokazBlad('puste-pola'); return; }
  if(password.length < 6) { pokazBlad('auth/weak-password'); return; }

  try {
    await ustawPamiec();
    await createUserWithEmailAndPassword(auth, email, password);
    alert("Konto założone! Automatycznie Cię zalogowano.");
  } catch (error) {
    pokazBlad(error.code);
  }
});

// --- LOGOWANIE ---
document.getElementById('btn-login').addEventListener('click', async () => {
  const email = document.getElementById('email').value;
  const password = document.getElementById('password').value;
  errorDiv.innerText = "";

  if(!email || !password) { pokazBlad('puste-pola'); return; }

  try {
    await ustawPamiec();
    await signInWithEmailAndPassword(auth, email, password);
  } catch (error) {
    pokazBlad(error.code);
  }
});

// --- WYLOGOWANIE ---
document.getElementById('btn-logout').addEventListener('click', () => {
  signOut(auth);
});

// --- NASŁUCHIWANIE STANU SESJI ---
onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    authContainer.style.display = 'none';
    profileContainer.style.display = 'block';
    userEmailSpan.innerText = user.email;
    wczytajPostep(user.uid);
  } else {
    currentUser = null;
    authContainer.style.display = 'block';
    profileContainer.style.display = 'none';
    savedProgressDiv.innerText = "";
  }
});

// --- ZAPISYWANIE DO BAZY ---
document.getElementById('btn-save').addEventListener('click', async () => {
  if (!currentUser) return;
  const title = document.getElementById('book-title').value;
  const page = document.getElementById('book-page').value;

  if(!title || !page) { alert("Wpisz tytuł książki i stronę!"); return; }

  try {
    await setDoc(doc(db, "users", currentUser.uid), {
      ostatniaKsiazka: title,
      strona: page
    });
    wczytajPostep(currentUser.uid);
    document.getElementById('book-title').value = "";
    document.getElementById('book-page').value = "";
  } catch (error) {
    alert("Błąd zapisu: " + error.message);
  }
});

// --- WCZYTYWANIE Z BAZY ---
async function wczytajPostep(uid) {
  const docRef = doc(db, "users", uid);
  const docSnap = await getDoc(docRef);

  if (docSnap.exists()) {
    const dane = docSnap.data();
    savedProgressDiv.innerHTML = `📖 Czytasz obecnie: <strong>${dane.ostatniaKsiazka}</strong><br>📍 Twój postęp: <strong>strona ${dane.strona}</strong>`;
  } else {
    savedProgressDiv.innerText = "Brak zapisanych postępów.";
  }
}
