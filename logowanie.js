import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, signOut, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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

// POPRAWKA 1: Słownik tłumaczeń błędów z angielskiego na polski (Strona już nie "milczy")
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
        case 'niezweryfikowany':
            return '⚠️ Twój adres e-mail nie został jeszcze aktywowany! Sprawdź skrzynkę, weszliśmy tam z linkiem potwierdzającym.';
        default:
            return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
    }
}

// POPRAWKA 2: Pełna kontrola nad sesją (Mechanizm Zapamiętaj mnie)
async function handlePersistence() {
    const rememberMe = document.getElementById('remember-me').checked;
    // Jeśli zaznaczone -> local (pamięta po zamknięciu przeglądarki), jeśli nie -> session (zapomina po zamknięciu karty)
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
}

// --- LOGOWANIE Z BLOKADĄ KONT BEZ WERYFIKACJI ---
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    try {
        await handlePersistence();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;

        // POPRAWKA 3 (Część Logowania): Jeśli użytkownik nie przeszedł weryfikacji mailowej, wyrzucamy go
        if (!user.emailVerified) {
            showAlert(translateError('niezweryfikowany'));
            await signOut(auth); // Natychmiastowe usunięcie błędnej sesji
            return;
        }
        
        // Jeśli jest zweryfikowany, dbamy o poprawną strukturę w bazie danych
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

// --- REJESTRACJA Z WYSYŁANIEM LINKU NA MAILA ---
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        await handlePersistence();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        const user = userCredential.user;
        
        // POPRAWKA 3 (Część Rejestracji): Wymuszenie wysłania prawdziwego kodu aktywacyjnego od Firebase
        await sendEmailVerification(user);

        // Zapis podstawowych danych użytkownika w Firestore
        await setDoc(doc(db, "users", user.uid), {
            email: email,
            createdAt: new Date().toISOString(),
            startedBooks: []
        });

        // Wylogowujemy go od razu. Konto jest zamrożone dopóki nie kliknie w maila
        await signOut(auth);

        // Wyświetlamy ładny, zielony ekran sukcesu informujący o konieczności kliknięcia w link
        showAlert("🚀 Konto utworzone! Na Twój adres e-mail wysłaliśmy link potwierdzający. Kliknij go, aby aktywować profil i móc się zalogować.", "success");
        
        // Przełączenie użytkownika z powrotem na zakładkę Logowania po 5 sekundach
        setTimeout(() => {
            tabLogin.click();
        }, 5000);

    } catch (error) {
        showAlert(translateError(error.code));
    }
});
