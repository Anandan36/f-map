// auth/auth.js - Handles login and registration functionality

document.addEventListener('DOMContentLoaded', () => {
    // Get elements from the DOM
    const errorMessage = document.getElementById('error-message');
    
    // Add toast styles if not already added
    if (typeof addToastStyles === 'function') {
        addToastStyles();
    }

    // Function to show error messages
    function showError(message) {
        if (errorMessage) {
            errorMessage.textContent = message;
            errorMessage.classList.add('visible');
            
            // Hide the error message after 5 seconds
            setTimeout(() => {
                errorMessage.classList.remove('visible');
            }, 5000);
        }
        
        // Also show as toast for better visibility
        if (window.showToast) {
            window.showToast(message, 'error');
        }
    }
    
    // Function to show success messages
    function showSuccess(message) {
        if (window.showToast) {
            window.showToast(message, 'success');
        }
    }

    // Handle login form submission
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const loginButton = document.getElementById('login-button');
        
        // Add validation as user types
        if (emailInput) {
            emailInput.addEventListener('input', validateEmail);
        }
        
        function validateEmail() {
            const email = emailInput.value.trim();
            
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput.classList.add('invalid');
                return false;
            } else {
                emailInput.classList.remove('invalid');
                return true;
            }
        }
        
        loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            
            // Simple validation
            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }
            
            if (!validateEmail()) {
                showError('Please enter a valid email address');
                return;
            }
            
            // Show loading state
            loginButton.disabled = true;
            loginButton.innerHTML = `
                <span class="button-text">Logging in</span>
                <div class="button-spinner"></div>
            `;
            loginButton.classList.add('loading');
            
            // Sign in with email and password
            auth.signInWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Show success message
                    showSuccess('Login successful!');
                    
                    // Redirect to home page or previous page
                    const redirectUrl = sessionStorage.getItem('redirectAfterLogin') || '../index.html';
                    sessionStorage.removeItem('redirectAfterLogin');
                    
                    // Add a small delay for better UX
                    setTimeout(() => {
                        window.location.href = redirectUrl;
                    }, 500);
                })
                .catch((error) => {
                    // Handle errors
                    let errorMsg = '';
                    
                    switch (error.code) {
                        case 'auth/user-not-found':
                        case 'auth/wrong-password':
                            errorMsg = 'Invalid email or password';
                            break;
                        case 'auth/too-many-requests':
                            errorMsg = 'Too many unsuccessful login attempts. Please try again later.';
                            break;
                        default:
                            errorMsg = error.message;
                    }
                    
                    showError(errorMsg);
                    
                    // Reset the login button
                    loginButton.disabled = false;
                    loginButton.textContent = 'Login';
                    loginButton.classList.remove('loading');
                });
        });
    }

    // Handle registration form submission
    const registerForm = document.getElementById('register-form');
    if (registerForm) {
        const nameInput = document.getElementById('name');
        const emailInput = document.getElementById('email');
        const passwordInput = document.getElementById('password');
        const confirmPasswordInput = document.getElementById('confirm-password');
        const registerButton = document.getElementById('register-button');
        
        // Add validation as user types
        if (emailInput) {
            emailInput.addEventListener('input', validateEmail);
        }
        
        if (passwordInput && confirmPasswordInput) {
            confirmPasswordInput.addEventListener('input', validatePasswordMatch);
        }
        
        function validateEmail() {
            const email = emailInput.value.trim();
            
            if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
                emailInput.classList.add('invalid');
                return false;
            } else {
                emailInput.classList.remove('invalid');
                return true;
            }
        }
        
        function validatePasswordMatch() {
            if (passwordInput.value !== confirmPasswordInput.value) {
                confirmPasswordInput.classList.add('invalid');
                return false;
            } else {
                confirmPasswordInput.classList.remove('invalid');
                return true;
            }
        }
        
        registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            
            // Get form values
            const name = nameInput.value.trim();
            const email = emailInput.value.trim();
            const password = passwordInput.value;
            const confirmPassword = confirmPasswordInput.value;
            
            // Validate form
            if (!name || !email || !password || !confirmPassword) {
                showError('Please fill out all fields');
                return;
            }
            
            if (!validateEmail()) {
                showError('Please enter a valid email address');
                return;
            }
            
            if (password !== confirmPassword) {
                showError('Passwords do not match');
                return;
            }
            
            if (password.length < 6) {
                showError('Password must be at least 6 characters');
                return;
            }
            
            // Show loading state
            registerButton.disabled = true;
            registerButton.innerHTML = `
                <span class="button-text">Creating Account</span>
                <div class="button-spinner"></div>
            `;
            registerButton.classList.add('loading');
            
            // Create user with email and password
            auth.createUserWithEmailAndPassword(email, password)
                .then((userCredential) => {
                    // Get the newly created user
                    const user = userCredential.user;
                    console.log("User created:", user.uid);
                    
                    // Update the user's display name and wait for it to complete
                    return user.updateProfile({
                        displayName: name
                    }).then(() => {
                        console.log("Profile updated with name:", name);
                        return user;
                    });
                })
                .then((user) => {
                    // Create user document in Firestore
                    if (db) {
                        console.log("Creating Firestore document for user:", user.uid);
                        return db.collection('users').doc(user.uid).set({
                            name: name,
                            email: email,
                            createdAt: new Date(),
                            favorites: [],
                            searchHistory: [],
                            preferences: {
                                cuisinePreferences: [],
                                dietaryRestrictions: []
                            }
                        }).then(() => {
                            console.log("Firestore document created successfully");
                            return user;
                        });
                    }
                    return user;
                })
                .then((user) => {
                    // Force a reload of the user to ensure updated profile
                    console.log("Reloading user to refresh profile data");
                    return user.reload().then(() => {
                        // Add a delay to make sure all updates are processed
                        return new Promise(resolve => setTimeout(() => resolve(user), 500));
                    });
                })
                .then((user) => {
                    // Show success message
                    showSuccess('Account created successfully!');
                    
                    // Add a small delay for better UX and to ensure profile updates take effect
                    setTimeout(() => {
                        // Redirect to home page
                        window.location.href = '../index.html';
                    }, 1000);
                })
                .catch((error) => {
                    // Handle errors
                    console.error("Registration error:", error);
                    let errorMsg = '';
                    
                    switch (error.code) {
                        case 'auth/email-already-in-use':
                            errorMsg = 'Email is already in use';
                            break;
                        case 'auth/invalid-email':
                            errorMsg = 'Invalid email format';
                            break;
                        case 'auth/weak-password':
                            errorMsg = 'Password is too weak';
                            break;
                        default:
                            errorMsg = error.message;
                    }
                    
                    showError(errorMsg);
                    
                    // Reset the register button
                    registerButton.disabled = false;
                    registerButton.textContent = 'Register';
                    registerButton.classList.remove('loading');
                });
        });
    }

    // Handle forgot password
    const forgotPasswordLink = document.getElementById('forgot-password');
    if (forgotPasswordLink) {
        forgotPasswordLink.addEventListener('click', (e) => {
            e.preventDefault();
            
            const emailInput = document.getElementById('email');
            const email = emailInput ? emailInput.value.trim() : '';
            
            if (!email) {
                showError('Please enter your email address');
                if (emailInput) emailInput.focus();
                return;
            }
            
            // Show reset password dialog
            const dialogHTML = `
                <div class="reset-password-dialog">
                    <div class="reset-password-content">
                        <h3>Reset Password</h3>
                        <p>Send a password reset link to: <strong>${email}</strong></p>
                        <div class="reset-actions">
                            <button class="secondary-button" id="cancel-reset">Cancel</button>
                            <button class="primary-button" id="confirm-reset">Send Reset Link</button>
                        </div>
                    </div>
                </div>
            `;
            
            // Add dialog to page
            const dialogContainer = document.createElement('div');
            dialogContainer.className = 'dialog-container';
            dialogContainer.innerHTML = dialogHTML;
            document.body.appendChild(dialogContainer);
            
            // Add event listeners
            const cancelButton = document.getElementById('cancel-reset');
            const confirmButton = document.getElementById('confirm-reset');
            
            if (cancelButton) {
                cancelButton.addEventListener('click', () => {
                    document.body.removeChild(dialogContainer);
                });
            }
            
            if (confirmButton) {
                confirmButton.addEventListener('click', () => {
                    // Show loading state
                    confirmButton.innerHTML = `
                        <span class="button-text">Sending</span>
                        <div class="button-spinner"></div>
                    `;
                    confirmButton.disabled = true;
                    
                    // Send password reset email
                    auth.sendPasswordResetEmail(email)
                        .then(() => {
                            // Remove dialog
                            document.body.removeChild(dialogContainer);
                            showSuccess('Password reset email sent. Please check your inbox.');
                        })
                        .catch((error) => {
                            confirmButton.textContent = 'Send Reset Link';
                            confirmButton.disabled = false;
                            showError(error.message);
                        });
                });
            }
            
            // Add dialog styles
            const dialogStyle = document.createElement('style');
            dialogStyle.textContent = `
                .dialog-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    background-color: rgba(0, 0, 0, 0.5);
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    z-index: 1000;
                }
                
                .reset-password-content {
                    background-color: white;
                    border-radius: 8px;
                    padding: 24px;
                    width: 90%;
                    max-width: 400px;
                    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
                }
                
                .reset-password-content h3 {
                    margin-top: 0;
                    color: var(--primary-color, #ff6347);
                }
                
                .reset-actions {
                    display: flex;
                    justify-content: flex-end;
                    margin-top: 24px;
                    gap: 12px;
                }
            `;
            document.head.appendChild(dialogStyle);
        });
    }
});