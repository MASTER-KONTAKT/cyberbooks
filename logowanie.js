import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, setPersistence, browserLocalPersistence, browserSessionPersistence } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
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
        case 'brak-email':
            return 'Wpisz adres e-mail, aby otrzymać link logowania.';
        default:
            return 'Wystąpił nieoczekiwany błąd. Spróbuj ponownie.';
    }
}

// Dynamiczne ustawianie sesji (Zapamiętaj mnie)
async function handlePersistence() {
    const rememberMe = document.getElementById('remember-me').checked;
    const persistenceType = rememberMe ? browserLocalPersistence : browserSessionPersistence;
    await setPersistence(auth, persistenceType);
}

// TRADYCYJNE LOGOWANIE HASŁEM
document.getElementById('login-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-password').value;

    if (!password) {
        showAlert('Wpisz hasło lub użyj logowania bezhasłowego poniżej.');
        return;
    }

    try {
        await handlePersistence();
        const userCredential = await signInWithEmailAndPassword(auth, email, password);
        
        // Zapewnienie, że dokument użytkownika istnieje w Firestore
        const userDocRef = doc(db, "users", userCredential.user.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
            await setDoc(userDocRef, { startedBooks: [] });
        }

        window.location.href = 'index.html';
    } catch (error) {
        showAlert(translateError(error.code));
    }
});

// LOGOWANIE LINKIEM NA E-MAIL (PASSWORDLESS)
document.getElementById('btn-send-link').addEventListener('click', async () => {
    clearAlert();
    const email = document.getElementById('login-email').value.trim();

    if (!email) {
        showAlert(translateError('brak-email'));
        return;
    }

    const actionCodeSettings = {
        // Powrót dokładnie na ten sam plik logowania
        url: window.location.origin + window.location.pathname,
        handleCodeInApp: true,
    };

    try {
        await handlePersistence();
        await sendSignInLinkToEmail(auth, email, actionCodeSettings);
        // Zapisujemy e-mail w przeglądarce, by uniknąć ponownego pytania po powrocie
        window.localStorage.setItem('emailForSignIn', email);
        showAlert("🚀 Link logowania został wysłany! Sprawdź swoją skrzynkę pocztową.", "success");
    } catch (error) {
        showAlert(translateError(error.code));
    }
});

// PRZECHWYTYWANIE POWROTU Z POCZTY ELEKTRONICZNEJ
async function checkEmailSignInLink() {
    if (isSignInWithEmailLink(auth, window.location.href)) {
        let email = window.localStorage.getItem('emailForSignIn');
        
        if (!email) {
            email = window.prompt('Wprowadź swój e-mail w celu weryfikacji urządzenia:');
        }

        if (!email) {
            showAlert('Weryfikacja została anulowana.');
            return;
        }

        try {
            const result = await signInWithEmailLink(auth, email, window.location.href);
            window.localStorage.removeItem('emailForSignIn');
            
            // Czyszczenie linku z brzydkich parametrów Firebase
            window.history.replaceState({}, document.title, window.location.pathname);
            
            // Konfiguracja bazy w Firestore dla nowego użytkownika logującego się linkiem
            const userDocRef = doc(db, "users", result.user.uid);
            const docSnap = await getDoc(userDocRef);
            if (!docSnap.exists()) {
                await setDoc(userDocRef, {
                    email: email,
                    createdAt: new Date().toISOString(),
                    startedBooks: []
                });
            }

            showAlert("🎉 Zalogowano pomyślnie! Przekierowywanie...", "success");
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        } catch (error) {
            showAlert("Obydwa kody weryfikacyjne wygasły lub link został już zużyty.");
            console.error(error);
        }
    }
}

// Automatyczny start sprawdzania linku e-mail po otwarciu strony
checkEmailSignInLink();

// REJESTRACJA
document.getElementById('register-form').addEventListener('submit', async (e) => {
    e.preventDefault();
    clearAlert();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-password').value;

    try {
        await handlePersistence();
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        
        // Tworzenie profilu i bazy Mojej Biblioteki w Firestore
        await setDoc(doc(db, "users", userCredential.user.uid), {
            email: email,
            createdAt: new Date().toISOString(),
            startedBooks: []
        });

        showAlert("Konto utworzone pomyślnie! Przekierowywanie...", "success");
        setTimeout(() => {
            window.location.href = 'index.html';
        }, 1500);

    } catch (error) {
        showAlert(translateError(error.code));
    }
});
