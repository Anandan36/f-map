// Variables to store user data
let currentUser = null;
let userData = null;

// Wait for Firebase authentication to initialize
document.addEventListener('DOMContentLoaded', () => {
    // Listen for auth state changes
    auth.onAuthStateChanged(user => {
        if (user) {
            currentUser = user;
            loadUserData();
            setupEventListeners();
        } else {
            // Redirect to login if not authenticated
            window.location.href = '../auth/login.html';
        }
    });
});

// Load user data from Firestore
function loadUserData() {
    // Load basic user info
    const userNameElement = document.getElementById('user-name');
    const userEmailElement = document.getElementById('user-email');
    
    // Set name and email from Firebase Auth
    userNameElement.textContent = currentUser.displayName || 'User';
    userEmailElement.textContent = currentUser.email;
    
    // Get user-specific avatar if it exists
    const profileImage = document.getElementById('profile-image');
    if (currentUser.photoURL) {
        profileImage.src = currentUser.photoURL;
    }
    
    // Fetch additional user data from Firestore
    if (db) {
        db.collection('users').doc(currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    userData = doc.data();
                    
                    // Fill in the form fields
                    fillPersonalInfoForm();
                    fillPreferencesForm();
                    loadFavoriteRestaurants();
                    loadSearchHistory();
                } else {
                    // Create a new user document if it doesn't exist
                    userData = {
                        name: currentUser.displayName || '',
                        email: currentUser.email,
                        phone: '',
                        location: '',
                        createdAt: new Date(),
                        favorites: [],
                        searchHistory: [],
                        preferences: {
                            cuisinePreferences: [],
                            dietaryRestrictions: []
                        }
                    };
                    
                    // Save the new user data
                    db.collection('users').doc(currentUser.uid).set(userData);
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
    }
}

// Fill personal info form with user data
function fillPersonalInfoForm() {
    if (userData) {
        document.getElementById('display-name').value = userData.name || currentUser.displayName || '';
        document.getElementById('phone').value = userData.phone || '';
        document.getElementById('location').value = userData.location || '';
    }
}

// Fill preferences form with user data
function fillPreferencesForm() {
    if (userData && userData.preferences) {
        // Set cuisine preferences
        const cuisines = userData.preferences.cuisinePreferences || [];
        cuisines.forEach(cuisine => {
            const checkbox = document.getElementById(`cuisine-${cuisine.toLowerCase()}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
        
        // Set dietary restrictions
        const dietaryRestrictions = userData.preferences.dietaryRestrictions || [];
        dietaryRestrictions.forEach(restriction => {
            const checkbox = document.getElementById(`diet-${restriction.toLowerCase().replace(/\s+/g, '-')}`);
            if (checkbox) {
                checkbox.checked = true;
            }
        });
    }
}

// Load favorite restaurants
function loadFavoriteRestaurants() {
    const favoritesContainer = document.getElementById('favorite-restaurants');
    
    // Clear the container
    favoritesContainer.innerHTML = '';
    
    if (userData && userData.favorites && userData.favorites.length > 0) {
        // Create a card for each favorite restaurant
        userData.favorites.forEach(favorite => {
            const card = createFavoriteCard(favorite);
            favoritesContainer.appendChild(card);
        });
    } else {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <p>You haven't saved any favorite restaurants yet.</p>
            <p>When you find a restaurant you like, click the heart icon to save it here!</p>
        `;
        favoritesContainer.appendChild(emptyState);
    }
}

// Create a favorite restaurant card
function createFavoriteCard(restaurant) {
    const card = document.createElement('div');
    card.className = 'favorite-card';
    
    card.innerHTML = `
        <div class="favorite-info">
            <h3>${restaurant.name || 'Unnamed Restaurant'}</h3>
            <p>${restaurant.cuisine || 'Cuisine not specified'}</p>
            <p>Location: ${restaurant.location || 'Unknown'}</p>
        </div>
        <div class="favorite-actions">
            <button class="view-btn" data-lat="${restaurant.lat}" data-lon="${restaurant.lon}">View on Map</button>
            <button class="remove-btn" data-id="${restaurant.id}">Remove</button>
        </div>
    `;
    
    // Add event listeners to buttons
    card.querySelector('.view-btn').addEventListener('click', (e) => {
        const lat = e.target.dataset.lat;
        const lon = e.target.dataset.lon;
        // Open in Google Maps instead of OpenStreetMap
        window.open(`https://www.google.com/maps/search/?api=1&query=${lat},${lon}`, '_blank');
    });
    
    card.querySelector('.remove-btn').addEventListener('click', (e) => {
        const restaurantId = e.target.dataset.id;
        removeFromFavorites(restaurantId);
    });
    
    return card;
}
// Remove a restaurant from favorites
function removeFromFavorites(restaurantId) {
    if (userData && userData.favorites) {
        // Filter out the restaurant to remove
        userData.favorites = userData.favorites.filter(fav => fav.id !== restaurantId);
        
        // Update Firestore
        db.collection('users').doc(currentUser.uid).update({
            favorites: userData.favorites
        })
        .then(() => {
            // Refresh the favorites display
            loadFavoriteRestaurants();
        })
        .catch(error => {
            console.error('Error removing favorite:', error);
        });
    }
}

// Load search history
function loadSearchHistory() {
    const historyContainer = document.getElementById('search-history');
    
    // Clear the container
    historyContainer.innerHTML = '';
    
    if (userData && userData.searchHistory && userData.searchHistory.length > 0) {
        // Create an item for each search history entry
        userData.searchHistory.forEach(search => {
            const historyItem = createHistoryItem(search);
            historyContainer.appendChild(historyItem);
        });
    } else {
        // Show empty state
        const emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <p>Your search history will appear here.</p>
        `;
        historyContainer.appendChild(emptyState);
    }
}

// Create a search history item
function createHistoryItem(search) {
    const historyItem = document.createElement('div');
    historyItem.className = 'history-item';
    
    // Format date
    const date = search.date ? new Date(search.date.toDate()) : new Date();
    const formattedDate = date.toLocaleDateString() + ' ' + date.toLocaleTimeString();
    
    historyItem.innerHTML = `
        <div class="history-details">
            <h3>${search.query || 'Unknown search'}</h3>
            <p>${formattedDate}</p>
        </div>
        <div class="history-actions">
            <button class="search-again-btn" data-query="${search.query}">Search Again</button>
        </div>
    `;
    
    // Add event listener to the search again button
    historyItem.querySelector('.search-again-btn').addEventListener('click', (e) => {
        const query = e.target.dataset.query;
        window.location.href = `../index.html?search=${encodeURIComponent(query)}`;
    });
    
    return historyItem;
}

// Clear search history
function clearSearchHistory() {
    if (userData) {
        // Clear the search history array
        userData.searchHistory = [];
        
        // Update Firestore
        db.collection('users').doc(currentUser.uid).update({
            searchHistory: []
        })
        .then(() => {
            // Refresh the history display
            loadSearchHistory();
        })
        .catch(error => {
            console.error('Error clearing history:', error);
        });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Profile navigation
    const profileNavLinks = document.querySelectorAll('.profile-nav a');
    profileNavLinks.forEach(link => {
        link.addEventListener('click', (e) => {
            e.preventDefault();
            
            // Remove active class from all links
            profileNavLinks.forEach(link => link.classList.remove('active'));
            
            // Add active class to clicked link
            e.target.classList.add('active');
            
            // Show the corresponding section
            const sectionId = e.target.dataset.section;
            document.querySelectorAll('.profile-section').forEach(section => {
                section.classList.add('hidden');
            });
            document.getElementById(sectionId).classList.remove('hidden');
        });
    });
    
    // Personal info form submission
    const personalInfoForm = document.getElementById('personal-info-form');
    personalInfoForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const name = document.getElementById('display-name').value;
        const phone = document.getElementById('phone').value;
        const location = document.getElementById('location').value;
        
        // Update user profile in Firebase Auth
        currentUser.updateProfile({
            displayName: name
        })
        .then(() => {
            // Update user data in Firestore
            return db.collection('users').doc(currentUser.uid).update({
                name: name,
                phone: phone,
                location: location
            });
        })
        .then(() => {
            // Update local user data
            userData.name = name;
            userData.phone = phone;
            userData.location = location;
            
            // Update display
            document.getElementById('user-name').textContent = name;
            
            alert('Personal information updated successfully!');
        })
        .catch(error => {
            console.error('Error updating profile:', error);
            alert('Error updating profile: ' + error.message);
        });
    });
    
    // Password change form submission
    const passwordForm = document.getElementById('password-form');
    passwordForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const currentPassword = document.getElementById('current-password').value;
        const newPassword = document.getElementById('new-password').value;
        const confirmNewPassword = document.getElementById('confirm-new-password').value;
        
        // Check if passwords match
        if (newPassword !== confirmNewPassword) {
            alert('New passwords do not match');
            return;
        }
        
        // Re-authenticate user
        const credential = firebase.auth.EmailAuthProvider.credential(
            currentUser.email,
            currentPassword
        );
        
        currentUser.reauthenticateWithCredential(credential)
            .then(() => {
                // Change password
                return currentUser.updatePassword(newPassword);
            })
            .then(() => {
                alert('Password updated successfully!');
                passwordForm.reset();
            })
            .catch(error => {
                console.error('Error updating password:', error);
                
                if (error.code === 'auth/wrong-password') {
                    alert('Current password is incorrect');
                } else {
                    alert('Error updating password: ' + error.message);
                }
            });
    });
    
    // Preferences form submission
    const preferencesForm = document.getElementById('preferences-form');
    preferencesForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        // Get all selected cuisine preferences
        const cuisineCheckboxes = document.querySelectorAll('#cuisine-preferences input[type="checkbox"]:checked');
        const cuisinePreferences = Array.from(cuisineCheckboxes).map(checkbox => checkbox.value);
        
        // Get all selected dietary restrictions
        const dietaryCheckboxes = document.querySelectorAll('#dietary-restrictions input[type="checkbox"]:checked');
        const dietaryRestrictions = Array.from(dietaryCheckboxes).map(checkbox => checkbox.value);
        
        // Update preferences in Firestore
        db.collection('users').doc(currentUser.uid).update({
            'preferences.cuisinePreferences': cuisinePreferences,
            'preferences.dietaryRestrictions': dietaryRestrictions
        })
        .then(() => {
            // Update local user data
            userData.preferences = {
                cuisinePreferences: cuisinePreferences,
                dietaryRestrictions: dietaryRestrictions
            };
            
            alert('Preferences updated successfully!');
        })
        .catch(error => {
            console.error('Error updating preferences:', error);
            alert('Error updating preferences: ' + error.message);
        });
    });
    
    // Clear history button
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Are you sure you want to clear your search history?')) {
            clearSearchHistory();
        }
    });
    // Change avatar
const changeAvatarBtn = document.getElementById('change-avatar-btn');
const avatarUpload = document.getElementById('avatar-upload');

changeAvatarBtn.addEventListener('click', () => {
    avatarUpload.click();
});

avatarUpload.addEventListener('change', (e) => {
    const file = e.target.files[0];
    
    if (file) {
        // Convert image to data URL
        const reader = new FileReader();
        
        reader.onload = function(event) {
            const imageDataUrl = event.target.result;
            
            // Check if the image size is not too large (Firestore has a 1MB document size limit)
            if (imageDataUrl.length > 900000) { // Slightly less than 1MB to allow for other data
                alert('Image is too large. Please choose a smaller image.');
                return;
            }
            
            // Update user profile in Auth
            currentUser.updateProfile({
                photoURL: imageDataUrl
            })
            .then(() => {
                // Update in Firestore
                return db.collection('users').doc(currentUser.uid).update({
                    photoURL: imageDataUrl
                });
            })
            .then(() => {
                // Update profile image
                document.getElementById('profile-image').src = imageDataUrl;
                alert('Profile photo updated successfully!');
            })
            .catch(error => {
                console.error('Error updating profile image:', error);
                alert('Error updating profile image: ' + error.message);
            });
        };
        
        reader.readAsDataURL(file);
    }
});
}