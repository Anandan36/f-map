// auth/firebase-config.js

// Firebase configuration - using your provided config
const firebaseConfig = {
    apiKey: "AIzaSyDfees5YGuZCI9lvb6-cKO84fXJQ027n9I",
    authDomain: "flavour-map.firebaseapp.com",
    projectId: "flavour-map",
    storageBucket: "flavour-map.firebasestorage.app",
    messagingSenderId: "833794966323",
    appId: "1:833794966323:web:e5b878c2161e7bacfa7446",
    measurementId: "G-TF8YPCX0M0"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

// Initialize services
const auth = firebase.auth();
const db = firebase.firestore && firebase.firestore();

// Check if user is logged 
auth.onAuthStateChanged(user => {
    // Get current page URL
    const currentPage = window.location.pathname;
    
    // Pages that don't require authentication
    const publicPages = ['/auth/login.html', '/auth/register.html'];
    
    // If user is not logged in and trying to access a protected page
    if (!user && !publicPages.some(page => currentPage.includes(page)) && 
        !currentPage.endsWith('index.html') && !currentPage.endsWith('/')) {
        // Redirect to login
        window.location.href = '/auth/login.html';
    }
    
    // If user is logged in and trying to access login/register page
    if (user && publicPages.some(page => currentPage.includes(page))) {
        // Redirect to home page
        window.location.href = '/index.html';
    }
    
    // Add login/logout items to any navigation that exists
    updateNavigation(user);
});

// Update navigation based on authentication status
function updateNavigation(user) {
    // Find the navigation ul element
    const navUl = document.querySelector('#main-nav');
    
    if (navUl) {
        // Clear existing navigation items
        navUl.innerHTML = '';
        
        // Always add Home link
        const homeLi = document.createElement('li');
        const homeLink = document.createElement('a');
        homeLink.href = '/index.html';
        homeLink.textContent = 'Home';
        if (window.location.pathname.endsWith('index.html') || window.location.pathname.endsWith('/')) {
            homeLink.classList.add('active');
        }
        homeLi.appendChild(homeLink);
        navUl.appendChild(homeLi);
        
        if (user) {
            // User is logged in
            const profileLi = document.createElement('li');
            const profileLink = document.createElement('a');
            profileLink.href = '/profile/profile.html';
            profileLink.textContent = 'Profile';
            profileLink.id = 'profile-link';
            if (window.location.pathname.includes('/profile/')) {
                profileLink.classList.add('active');
            }
            profileLi.appendChild(profileLink);
            navUl.appendChild(profileLi);
            
            const chatbotLi = document.createElement('li');
            const chatbotLink = document.createElement('a');
            chatbotLink.href = '/chatbot/chatbot.html';
            chatbotLink.textContent = 'Chat Assistant';
            chatbotLink.id = 'chatbot-link';
            if (window.location.pathname.includes('/chatbot/')) {
                chatbotLink.classList.add('active');
            }
            chatbotLi.appendChild(chatbotLink);
            navUl.appendChild(chatbotLi);
            
            const logoutLi = document.createElement('li');
            const logoutLink = document.createElement('a');
            logoutLink.href = '#';
            logoutLink.textContent = 'Logout';
            logoutLink.id = 'logout-link';
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                auth.signOut().then(() => {
                    window.location.href = '/index.html';
                });
            });
            logoutLi.appendChild(logoutLink);
            navUl.appendChild(logoutLi);
        } else {
            // User is logged out
            const loginLi = document.createElement('li');
            const loginLink = document.createElement('a');
            loginLink.href = '/auth/login.html';
            loginLink.textContent = 'Login';
            loginLink.id = 'login-link';
            if (window.location.pathname.includes('/auth/login.html')) {
                loginLink.classList.add('active');
            }
            loginLi.appendChild(loginLink);
            navUl.appendChild(loginLi);
            
            const registerLi = document.createElement('li');
            const registerLink = document.createElement('a');
            registerLink.href = '/auth/register.html';
            registerLink.textContent = 'Register';
            registerLink.id = 'register-link';
            if (window.location.pathname.includes('/auth/register.html')) {
                registerLink.classList.add('active');
            }
            registerLi.appendChild(registerLink);
            navUl.appendChild(registerLi);
        }
    }
}