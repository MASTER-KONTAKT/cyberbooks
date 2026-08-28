import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";

import {
    getAuth,
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    setPersistence,
    browserLocalPersistence,
    sendEmailVerification,
    signOut,
    onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

import {
    getFirestore,
    doc,
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";


// =========================================================
// KONFIGURACJA FIREBASE
// =========================================================

const firebaseConfig = {
    apiKey: "AIzaSyCNg0JnAgAH39y9D-8vhJKwQ10JYxx5Z0s",
    authDomain: "cyberbook-83464.firebaseapp.com",
    projectId: "cyberbook-83464",
    storageBucket: "cyberbook-83464.firebasestorage.app",
    messagingSenderId: "932889686489",
    appId: "1:932889686489:web:61a2651a867903dff769c8",
    measurementId: "G-PW5G4KFXX1"
};


// =========================================================
// INICJALIZACJA FIREBASE
// =========================================================

const app = initializeApp(firebaseConfig);

const auth = getAuth(app);

const db = getFirestore(app);


// =========================================================
// ELEMENTY STRONY
// =========================================================

const tabLogin = document.getElementById("tab-login");
const tabRegister = document.getElementById("tab-register");

const panelLogin = document.getElementById("panel-login");
const panelRegister = document.getElementById("panel-register");

const alertBox = document.getElementById("auth-alert");

const loginForm = document.getElementById("login-form");
const registerForm = document.getElementById("register-form");


// =========================================================
// KOMUNIKATY
// =========================================================

function showAlert(message, type = "error") {

    alertBox.innerText = message;

    alertBox.style.display = "block";

    if (type === "success") {
        alertBox.className = "alert alert-success";
    } else {
        alertBox.className = "alert alert-error";
    }
}


function clearAlert() {

    alertBox.style.display = "none";

}


// =========================================================
// PRZEŁĄCZANIE ZAKŁADEK
// =========================================================

function showLogin() {

    tabLogin.classList.add("active");
    tabRegister.classList.remove("active");

    panelLogin.classList.add("active");
    panelRegister.classList.remove("active");

    clearAlert();
}


function showRegister() {

    tabRegister.classList.add("active");
    tabLogin.classList.remove("active");

    panelRegister.classList.add("active");
    panelLogin.classList.remove("active");

    clearAlert();
}


tabLogin.addEventListener("click", showLogin);

tabRegister.addEventListener("click", showRegister);


// =========================================================
// TŁUMACZENIE BŁĘDÓW FIREBASE
// =========================================================

function translateError(code) {

    switch (code) {

        case "auth/invalid-email":
            return "Podany adres e-mail jest nieprawidłowy.";

        case "auth/user-not-found":
            return "Konto o tym adresie e-mail nie istnieje.";

        case "auth/wrong-password":
            return "Hasło jest nieprawidłowe.";

        case "auth/invalid-credential":
            return "Błędne dane logowania. Sprawdź e-mail i hasło.";

        case "auth/email-already-in-use":
            return "Ten adres e-mail jest już przypisany do innego konta.";

        case "auth/weak-password":
            return "Hasło musi składać się z minimum 6 znaków.";

        case "auth/too-many-requests":
            return "Zbyt wiele prób. Spróbuj ponownie za chwilę.";

        case "auth/network-request-failed":
            return "Problem z połączeniem internetowym. Sprawdź połączenie.";

        case "auth/user-disabled":
            return "To konto zostało zablokowane.";

        case "auth/operation-not-allowed":
            return "Logowanie tym sposobem jest obecnie wyłączone.";

        default:
            console.error("Firebase error:", code);
            return "Wystąpił nieoczekiwany błąd. Spróbuj ponownie.";
    }
}


// =========================================================
// SPRAWDZANIE SIŁY HASŁA
// =========================================================

function validatePassword(password) {

    // Minimum 6 znaków
    const hasMinimumLength = password.length >= 6;

    // Minimum jedna wielka litera
    const hasUppercase = /[A-Z]/.test(password);

    // Liczymy cyfry
    const numberCount = (password.match(/[0-9]/g) || []).length;

    // Minimum dwie cyfry
    const hasTwoNumbers = numberCount >= 2;


    if (!hasMinimumLength) {

        return {
            valid: false,
            message: "Hasło musi mieć minimum 6 znaków."
        };

    }


    if (!hasUppercase) {

        return {
            valid: false,
            message: "Hasło musi zawierać co najmniej jedną wielką literę."
        };

    }


    if (!hasTwoNumbers) {

        return {
            valid: false,
            message: "Hasło musi zawierać co najmniej dwie cyfry."
        };

    }


    return {
        valid: true,
        message: ""
    };
}


// =========================================================
// USTAWIENIE PERSISTENCJI LOGOWANIA
// =========================================================
//
// browserLocalPersistence oznacza:
//
// - zamknięcie karty       → nadal zalogowany
// - zamknięcie przeglądarki → nadal zalogowany
// - ponowne uruchomienie komputera → nadal zalogowany
//
// Wylogowanie przez użytkownika → sesja zostaje usunięta
//
// Nie zapisujemy hasła w localStorage.
//

await setPersistence(
    auth,
    browserLocalPersistence
);


// =========================================================
// AUTOMATYCZNE SPRAWDZANIE SESJI
// =========================================================
//
// Firebase sprawdza, czy użytkownik ma aktywną sesję.
//
// Jeżeli tak:
// użytkownik nie musi ponownie wpisywać e-maila i hasła.
//

onAuthStateChanged(auth, async (user) => {

    if (!user) {
        // Brak zalogowanego użytkownika
        return;
    }


    // -----------------------------------------------------
    // JEŻELI E-MAIL NIE JEST ZWERYFIKOWANY
    // -----------------------------------------------------

    if (!user.emailVerified) {

        // Nie przekierowujemy dalej.
        // Użytkownik musi zweryfikować konto.

        return;
    }


    // -----------------------------------------------------
    // UŻYTKOWNIK JEST ZALOGOWANY
    // -----------------------------------------------------

    console.log("Użytkownik jest już zalogowany:", user.email);


    // -----------------------------------------------------
    // SPRAWDZAMY PROFIL W FIRESTORE
    // -----------------------------------------------------

    try {

        const userDocRef = doc(
            db,
            "users",
            user.uid
        );


        const docSnap = await getDoc(userDocRef);


        if (!docSnap.exists()) {

            await setDoc(
                userDocRef,
                {
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    startedBooks: []
                }
            );

        }


    } catch (error) {

        console.error(
            "Błąd sprawdzania profilu:",
            error
        );

    }


    // -----------------------------------------------------
    // PRZEJŚCIE DO STRONY GŁÓWNEJ
    // -----------------------------------------------------

    window.location.href = "index.html";

});


// =========================================================
// LOGOWANIE
// =========================================================

loginForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    clearAlert();


    const email =
        document
            .getElementById("login-email")
            .value
            .trim();


    const password =
        document
            .getElementById("login-password")
            .value;


    // -----------------------------------------------------
    // BLOKADA PRZYCISKU
    // -----------------------------------------------------

    const submitButton =
        loginForm.querySelector(".btn-submit");


    submitButton.disabled = true;

    submitButton.innerText = "Logowanie...";


    try {

        // -------------------------------------------------
        // LOGOWANIE
        // -------------------------------------------------

        const userCredential =
            await signInWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        // -------------------------------------------------
        // WERYFIKACJA E-MAILA
        // -------------------------------------------------

        if (!user.emailVerified) {

            showAlert(
                "Twoje konto nie zostało jeszcze aktywowane. Kliknij w link weryfikacyjny wysłany na Twój e-mail."
            );


            await signOut(auth);


            submitButton.disabled = false;

            submitButton.innerText = "Zaloguj się";

            return;
        }


        // -------------------------------------------------
        // PROFIL FIRESTORE
        // -------------------------------------------------

        const userDocRef =
            doc(
                db,
                "users",
                user.uid
            );


        const docSnap =
            await getDoc(userDocRef);


        // Jeżeli dokument nie istnieje,
        // tworzymy go automatycznie.

        if (!docSnap.exists()) {

            await setDoc(
                userDocRef,
                {
                    email: user.email,
                    createdAt: new Date().toISOString(),
                    startedBooks: []
                }
            );

        }


        // -------------------------------------------------
        // PRZEJŚCIE DO PLATFORMY
        // -------------------------------------------------

        window.location.href = "index.html";


    } catch (error) {

        console.error(
            "Błąd logowania:",
            error
        );


        showAlert(
            translateError(error.code)
        );


        submitButton.disabled = false;

        submitButton.innerText = "Zaloguj się";

    }

});


// =========================================================
// REJESTRACJA
// =========================================================

registerForm.addEventListener("submit", async (e) => {

    e.preventDefault();

    clearAlert();


    const email =
        document
            .getElementById("register-email")
            .value
            .trim();


    const password =
        document
            .getElementById("register-password")
            .value;


    // -----------------------------------------------------
    // SPRAWDZENIE HASŁA
    // -----------------------------------------------------

    const passwordValidation =
        validatePassword(password);


    if (!passwordValidation.valid) {

        showAlert(
            passwordValidation.message
        );

        return;
    }


    // -----------------------------------------------------
    // BLOKADA PRZYCISKU
    // -----------------------------------------------------

    const submitButton =
        registerForm.querySelector(".btn-submit");


    submitButton.disabled = true;

    submitButton.innerText = "Tworzenie konta...";


    try {

        // -------------------------------------------------
        // TWORZENIE KONTA
        // -------------------------------------------------

        const userCredential =
            await createUserWithEmailAndPassword(
                auth,
                email,
                password
            );


        const user =
            userCredential.user;


        // -------------------------------------------------
        // WYSŁANIE E-MAILA WERYFIKACYJNEGO
        // -------------------------------------------------

        await sendEmailVerification(user);


        // -------------------------------------------------
        // UTWORZENIE PROFILU W FIRESTORE
        // -------------------------------------------------

        await setDoc(
            doc(
                db,
                "users",
                user.uid
            ),
            {
                email: email,
                createdAt: new Date().toISOString(),
                startedBooks: []
            }
        );


        // -------------------------------------------------
        // WYLOGOWANIE PO REJESTRACJI
        // -------------------------------------------------

        await signOut(auth);


        // -------------------------------------------------
        // KOMUNIKAT
        // -------------------------------------------------

        showAlert(
            "Konto utworzone pomyślnie! Wysłaliśmy link weryfikacyjny. Sprawdź pocztę (oraz folder SPAM!).",
            "success"
        );


        // -------------------------------------------------
        // POWRÓT DO LOGOWANIA
        // -------------------------------------------------

        setTimeout(() => {

            tabRegister.classList.remove("active");

            tabLogin.classList.add("active");

            panelRegister.classList.remove("active");

            panelLogin.classList.add("active");

            clearAlert();

        }, 4000);


    } catch (error) {

        console.error(
            "Błąd rejestracji:",
            error
        );


        showAlert(
            translateError(error.code)
        );


        submitButton.disabled = false;

        submitButton.innerText = "Utwórz konto";

    }

});
