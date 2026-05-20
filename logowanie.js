import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { 
    getAuth, 
    createUserWithEmailAndPassword, 
    signInWithEmailAndPassword, 
    setPersistence, 
    browserLocalPersistence,
    sendEmailVerification, // <-- Dodany import do wysyłania maili
    signOut                 // <-- Dodany import do wylogowywania sesji
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// Przełączanie zakładek formularza
const tabLogin = document.getElementById('tab-login');
const tabRegister = document.getElementById('tab-register');
const panelLogin = document.getElementById('panel-login');
const panelRegister = document.getElementById('panel-register');
const alertBox = document.getElementById('auth-alert');

function showAlert(message, type = 'error') {
    alertBox.innerText = message;
    alertBox.style.display = 'block';
    if(type === 'success') {
        alertBox.className = 'alert alert-success';
    } else {
        alertBox.className = 'alert alert-error';
    }
}

function clearAlert() {
    alertBox.style.display = 'none';
}

tabLogin.addEventListener('click', () => {
    tabRegister.classList.remove('active');
    tabLogin.classList.add('active');
    panelRegister.classList.remove('active');
    panelLogin.classList.add('active');
    clearAlert();
});

tabRegister.addEventListener('click', () => {
    tabLogin.classList.remove('active');
    tabRegister.classList.add('active');
    panelLogin.classList.remove('active');
    panelRegister.classList.add('active');
    clearAlert();
});

// Tłumaczenie błędów Firebase na język polski
function translateError(code) {
    switch (code) {
        case 'auth/invalid-email':
            return 'Podany adres e-mail jest nieprawidłowy.';
        case 'auth/user-not-found':
            return 'Konto o tym adresie e-mail nie istnieje.';
        case 'auth/wrong-password':
            return 'Hasło jest nieprawidłowe.';
        case 'auth/invalid-credential':
            return 'Błędne dane logowania. Sprawdź e-mail i hasło.';
        case 'auth/email-already-in-use':
            return 'Ten adres e-mail jest już przypisany do innego konta.';
        case 'auth/weak-password':
            return 'Hasło musi składać się z minimum 6 znaków.';
        default:
            return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
    }
}

// LOGOWANIE
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        // Utrzymanie zalogowanego użytkownika (Local Persistence)
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // KROK WERYFIKACJI: Sprawdzamy czy e-mail został potwierdzony
        if (!user.emailVerified) {
            showAlert("Twoje konto nie zostało jeszcze aktywowane. Kliknij w link weryfikacyjny wysłany na Twój e-mail.");
            await signOut(auth); // Natychmiast wylogowujemy, aby nie utworzyć aktywnej sesji
            return;
        }
        
        // Zapewnienie, że dokument użytkownika istnieje w Firestore
        const userDocRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            await setDoc(userDocRef, { startedBooks: [] });
        }

        window.location.href = 'index.html';
    } catch (error) {
        showAlert(translateError(error.code));
    }
});

// REJESTRACJA
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        await setPersistence(auth, browserLocalPersistence);
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // 1. Wysyłanie wiadomości e-mail z linkem aktywacyjnym
        await sendEmailVerification(user);
        
        // 2. Tworzenie profilu i bazy Mojej Biblioteki w Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            createdAt: new Date().toISOString(),
            startedBooks: []
        });

        // 3. Wylogowanie użytkownika (żeby system nie wpuścił go automatycznie po rejestracji)
        await signOut(auth);

        showAlert("Konto utworzone pomyślnie! Wysłaliśmy link weryfikacyjny. Sprawdź pocztę (i folder spam).", "success");
        
        // Automatyczne przełączenie widoku na formularz logowania po 4 sekundach
        setTimeout(() => {
            tabRegister.classList.remove('active');
            tabLogin.classList.add('active');
            panelRegister.classList.remove('active');
            panelLogin.classList.add('active');
            clearAlert();
        }, 4000);

    } catch (error) {
        showAlert(translateError(error.code));
    }
});
