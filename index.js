// Initialize Firebase variables - don't redeclare if already exist
var firebaseAuth;
var firebaseDb;
var currentUser = null;

// Initialize the Firebase app
document.addEventListener('DOMContentLoaded', () => {
    // Initialize Firebase auth and Firestore
    if (typeof firebase !== 'undefined') {
        firebaseAuth = firebase.auth();
        firebaseDb = firebase.firestore();
        
        // Check if user is logged in
        firebaseAuth.onAuthStateChanged(user => {
            if (user) {
                currentUser = user;
                setupUI(user);
            } else {
                // Redirect to login if not authenticated
                window.location.href = 'auth/login.html';
            }
        });
    } else {
        console.error('Firebase is not defined. Make sure firebase is loaded correctly.');
    }
    
    // Setup event listeners
    setupEventListeners();
});

// Setup UI based on authentication state
function setupUI(user) {
    const logoutLink = document.getElementById('logout-link');
    const mainNav = document.getElementById('main-nav');
    
    if (user) {
        // Show navigation for logged in users
        if (mainNav) {
            mainNav.style.display = 'flex';
        }
        
        // Add logout functionality
        if (logoutLink) {
            logoutLink.addEventListener('click', (e) => {
                e.preventDefault();
                firebaseAuth.signOut().then(() => {
                    window.location.href = 'auth/login.html';
                });
            });
        }
    } else {
        // Hide navigation for logged out users
        if (mainNav) {
            mainNav.style.display = 'none';
        }
    }
}

// Setup event listeners for the page
function setupEventListeners() {
    const searchInput = document.getElementById('search-input');
    const findRestaurantsBtn = document.getElementById('find-restaurants');
    const useLocationBtn = document.getElementById('use-current-location');
    
    if (!searchInput || !findRestaurantsBtn) {
        console.error('Search elements not found in the document');
        return;
    }
    
    // Search button click event
    findRestaurantsBtn.addEventListener('click', () => {
        const location = searchInput.value.trim();
        if (location) {
            fetchLocationCoordinates(location);
        } else {
            // Show validation message
            searchInput.style.borderColor = '#f44336';
            setTimeout(() => {
                searchInput.style.borderColor = '';
            }, 3000);
            alert('Please enter a location to search.');
        }
    });

    // Use current location button click event
    if (useLocationBtn) {
        useLocationBtn.addEventListener('click', () => {
            if (navigator.geolocation) {
                useLocationBtn.disabled = true;
                useLocationBtn.innerHTML = `
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M12 2a10 10 0 1 0 10 10H12V2z"></path>
                        <path d="M12 2a10 10 0 0 1 10 10H12V2z"></path>
                        <path d="M12 22V12H2a10 10 0 0 0 10 10z"></path>
                        <path d="M12 12v10a10 10 0 0 0 10-10H12z"></path>
                    </svg> 
                    Getting location...
                `;
                navigator.geolocation.getCurrentPosition(
                    (position) => {
                        showRestaurantsByPosition(position);
                        useLocationBtn.disabled = false;
                        useLocationBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Use my current location
                        `;
                    },
                    (error) => {
                        showError(error);
                        useLocationBtn.disabled = false;
                        useLocationBtn.innerHTML = `
                            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <circle cx="12" cy="12" r="10"></circle>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                            Use my current location
                        `;
                    }
                );
            } else {
                alert('Geolocation is not supported by this browser.');
            }
        });
    }
    
    // Enter key press in search input
    searchInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const location = searchInput.value.trim();
            if (location) {
                fetchLocationCoordinates(location);
            } else {
                // Show validation message
                searchInput.style.borderColor = '#f44336';
                setTimeout(() => {
                    searchInput.style.borderColor = '';
                }, 3000);
                alert('Please enter a location to search.');
            }
        }
    });
    
    // Check for URL parameters (for search history functionality)
    const urlParams = new URLSearchParams(window.location.search);
    const searchParam = urlParams.get('search');
    if (searchParam) {
        searchInput.value = searchParam;
        fetchLocationCoordinates(searchParam);
    }
}

// Fetch coordinates from location name using Nominatim API
function fetchLocationCoordinates(location) {
    console.log("Fetching location coordinates for:", location);
    
    // Show the results title
    const resultsTitle = document.getElementById('results-title');
    if (resultsTitle) {
        resultsTitle.style.display = 'block';
        resultsTitle.textContent = `Searching for restaurants near "${location}"...`;
    }
    
    // Display loading state
    const restaurantsContainer = document.getElementById('restaurants');
    if (restaurantsContainer) {
        restaurantsContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Finding location...</p>
            </div>
        `;
    }
    
    // Add a user-agent header to comply with Nominatim usage policy
    const headers = new Headers({
        'User-Agent': 'FlavourMap/1.0 (educational project)'
    });
    
    const nominatimEndpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(location)}`;
    
    fetch(nominatimEndpoint, { headers })
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            if (data && data.length > 0) {
                const { lat, lon } = data[0];
                console.log('Found coordinates:', lat, lon);
                
                // Update results title
                if (resultsTitle) {
                    resultsTitle.textContent = `Restaurants near "${location}"`;
                }
                
                // Save to search history if user is logged in
                if (currentUser) {
                    saveToSearchHistory(location);
                }
                
                fetchRestaurants(lat, lon);
            } else {
                if (resultsTitle) {
                    resultsTitle.style.display = 'none';
                }
                displayError(`Could not find location: ${location}. Please try a different search.`);
            }
        })
        .catch(error => {
            console.error('Error fetching location data from Nominatim:', error);
            if (resultsTitle) {
                resultsTitle.style.display = 'none';
            }
            displayError(`Error locating "${location}": ${error.message}`);
        });
}

// Show restaurants by current position
function showRestaurantsByPosition(position) {
    const { latitude, longitude } = position.coords;
    console.log('Using current position:', latitude, longitude);
    
    // Show the results title
    const resultsTitle = document.getElementById('results-title');
    if (resultsTitle) {
        resultsTitle.style.display = 'block';
        resultsTitle.textContent = 'Restaurants near your location';
    }
    
    // Display loading state
    const restaurantsContainer = document.getElementById('restaurants');
    if (restaurantsContainer) {
        restaurantsContainer.innerHTML = `
            <div class="loading">
                <div class="loading-spinner"></div>
                <p>Finding nearby restaurants...</p>
            </div>
        `;
    }
    
    // Save to search history
    if (currentUser) {
        saveToSearchHistory('Current Location');
    }
    
    fetchRestaurants(latitude, longitude);
}

// Fetch restaurants using Overpass API
function fetchRestaurants(latitude, longitude) {
    console.log('Fetching restaurants at:', latitude, longitude);
    
    const restaurantsContainer = document.getElementById('restaurants');
    if (!restaurantsContainer) {
        console.error('Restaurants container not found');
        return;
    }
    
    restaurantsContainer.innerHTML = `
        <div class="loading">
            <div class="loading-spinner"></div>
            <p>Searching for restaurants...</p>
        </div>
    `;
    
    // Overpass API query to find restaurants
    // Including both amenity=restaurant and cuisine tags to get more detailed results
    const overpassEndpoint = `https://overpass-api.de/api/interpreter?data=[out:json];(node[amenity=restaurant](around:5000,${latitude},${longitude});node[cuisine](around:5000,${latitude},${longitude}););out body;`;
    
    fetch(overpassEndpoint)
        .then(response => {
            if (!response.ok) {
                throw new Error(`HTTP error! Status: ${response.status}`);
            }
            return response.json();
        })
        .then(data => {
            const restaurants = data.elements;
            displayRestaurants(restaurants, latitude, longitude);
        })
        .catch(error => {
            console.error('Error fetching data from Overpass API:', error);
            displayError(`Error finding restaurants: ${error.message}. Please try again later.`);
        });
}

// Display restaurants in the UI
function displayRestaurants(restaurants, searchLat, searchLon) {
    const restaurantsContainer = document.getElementById('restaurants');
    const resultsTitle = document.getElementById('results-title');
    
    if (!restaurantsContainer) return;
    
    restaurantsContainer.innerHTML = '';
    
    if (!restaurants || restaurants.length === 0) {
        if (resultsTitle) {
            resultsTitle.style.display = 'none';
        }
        displayError('No restaurants found in this area. Try a different location.');
        return;
    }
    
    // Filter out restaurants with no name
    const validRestaurants = restaurants.filter(restaurant => 
        restaurant.tags && restaurant.tags.name
    );
    
    if (validRestaurants.length === 0) {
        if (resultsTitle) {
            resultsTitle.style.display = 'none';
        }
        displayError('No restaurants with complete information found in this area.');
        return;
    }
    
    // Sort restaurants by distance to search location (if available)
    if (searchLat && searchLon) {
        validRestaurants.sort((a, b) => {
            const distA = calculateDistance(searchLat, searchLon, a.lat, a.lon);
            const distB = calculateDistance(searchLat, searchLon, b.lat, b.lon);
            return distA - distB;
        });
    }
    
    // Update results count in title
    if (resultsTitle) {
        resultsTitle.textContent = `Found ${validRestaurants.length} restaurants`;
    }
    
    // Add cards directly to the restaurants container
    validRestaurants.forEach(restaurant => {
        const card = createRestaurantCard(restaurant, searchLat, searchLon);
        restaurantsContainer.appendChild(card);
    });
}

// Calculate distance between two points in km using the Haversine formula
function calculateDistance(lat1, lon1, lat2, lon2) {
    const R = 6371; // Radius of the Earth in km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
        Math.sin(dLat/2) * Math.sin(dLat/2) +
        Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
        Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance;
}

// Create a card for a restaurant
function createRestaurantCard(restaurant, searchLat, searchLon) {
    const card = document.createElement('div');
    card.className = 'restaurant-card';
    
    // Get restaurant details
    const name = restaurant.tags.name || 'Unnamed Restaurant';
    const cuisine = restaurant.tags.cuisine || 'Cuisine not specified';
    const address = formatAddress(restaurant.tags);
    
    // Calculate distance if search coordinates are available
    let distanceText = '';
    if (searchLat && searchLon) {
        const distance = calculateDistance(searchLat, searchLon, restaurant.lat, restaurant.lon);
        distanceText = `<p class="restaurant-distance">${distance.toFixed(1)} km away</p>`;
    }
    
    // Prepare restaurant data for favorite button
    const restaurantData = {
        id: restaurant.id.toString(),
        name: name,
        location: address,
        lat: restaurant.lat,
        lon: restaurant.lon,
        cuisine: cuisine
    };
    
    // Check if restaurant is in favorites
    const isFavorite = isRestaurantInFavorites(restaurantData);
    
    // Build the card HTML
    card.innerHTML = `
        <div class="restaurant-image"></div>
        <div class="restaurant-info">
            <h2>${name}</h2>
            <p class="cuisine">${cuisine}</p>
            <p class="address">${address}</p>
            ${distanceText}
        </div>
        <div class="restaurant-actions">
            <a href="https://www.openstreetmap.org/?mlat=${restaurant.lat}&mlon=${restaurant.lon}" target="_blank" rel="noopener noreferrer" class="view-map-btn">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                </svg>
                View on Map
            </a>
            <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-restaurant='${JSON.stringify(restaurantData).replace(/'/g, "&#39;")}'>
                <span class="heart-icon">${isFavorite ? '❤️' : '♡'}</span>
                <span>${isFavorite ? 'Saved' : 'Save'}</span>
            </button>
        </div>
    `;
    
    // Add event listener to favorite button
    const favoriteBtn = card.querySelector('.favorite-btn');
    favoriteBtn.addEventListener('click', (e) => {
        if (currentUser) {
            try {
                const dataAttribute = e.target.dataset.restaurant || e.target.parentElement.dataset.restaurant;
                const restaurantData = JSON.parse(dataAttribute);
                toggleFavorite(restaurantData, e.currentTarget);
            } catch (error) {
                console.error('Error parsing restaurant data:', error);
                alert('Could not save restaurant. Please try again.');
            }
        } else {
            alert('Please log in to save favorites.');
        }
    });
    
    return card;
}

// Format address from OSM tags
function formatAddress(tags) {
    let addressParts = [];
    
    if (tags.address) {
        return tags.address;
    }
    
    if (tags['addr:housenumber']) {
        addressParts.push(tags['addr:housenumber']);
    }
    
    if (tags['addr:street']) {
        addressParts.push(tags['addr:street']);
    }
    
    if (tags['addr:city']) {
        addressParts.push(tags['addr:city']);
    }
    
    if (addressParts.length > 0) {
        return addressParts.join(', ');
    }
    
    return 'Address not available';
}

// Check if restaurant is in favorites
function isRestaurantInFavorites(restaurant) {
    if (currentUser && firebaseDb) {
        // This function now just returns a boolean
        // In a real app, you would check against the favorites stored in userData
        return false; // Placeholder - implement with real favorites check
    }
    return false;
}

// Toggle favorite status for a restaurant
function toggleFavorite(restaurant, buttonElement) {
    if (!currentUser || !firebaseDb) return;
    
    const userRef = firebaseDb.collection('users').doc(currentUser.uid);
    
    userRef.get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const favorites = userData.favorites || [];
            
            // Check if restaurant is already a favorite
            const existingIndex = favorites.findIndex(fav => fav.id === restaurant.id);
            
            if (existingIndex >= 0) {
                // Remove from favorites
                favorites.splice(existingIndex, 1);
                userRef.update({ favorites });
                
                // Update button appearance
                if (buttonElement) {
                    buttonElement.classList.remove('active');
                    buttonElement.querySelector('.heart-icon').textContent = '♡';
                    buttonElement.querySelector('span:last-child').textContent = 'Save';
                }
                
                showToast(`Removed ${restaurant.name} from favorites!`);
            } else {
                // Add to favorites
                favorites.push(restaurant);
                userRef.update({ favorites });
                
                // Update button appearance
                if (buttonElement) {
                    buttonElement.classList.add('active');
                    buttonElement.querySelector('.heart-icon').textContent = '❤️';
                    buttonElement.querySelector('span:last-child').textContent = 'Saved';
                }
                
                showToast(`Added ${restaurant.name} to favorites!`);
            }
        } else {
            // Create user document with favorites
            userRef.set({
                name: currentUser.displayName || '',
                email: currentUser.email,
                createdAt: new Date(),
                favorites: [restaurant],
                searchHistory: []
            });
            
            // Update button appearance
            if (buttonElement) {
                buttonElement.classList.add('active');
                buttonElement.querySelector('.heart-icon').textContent = '❤️';
                buttonElement.querySelector('span:last-child').textContent = 'Saved';
            }
            
            showToast(`Added ${restaurant.name} to favorites!`);
        }
    }).catch(error => {
        console.error('Error updating favorites:', error);
        showToast('Could not update favorites. Please try again.', 'error');
    });
}

// Show a toast message instead of an alert
function showToast(message, type = 'success') {
    // Check if a toast container already exists
    let toastContainer = document.querySelector('.toast-container');
    
    // If not, create one
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.className = 'toast-container';
        document.body.appendChild(toastContainer);
    }
    
    // Create the toast
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    
    // Add the toast to the container
    toastContainer.appendChild(toast);
    
    // Show the toast
    setTimeout(() => {
        toast.classList.add('show');
    }, 100);
    
    // Remove the toast after 3 seconds
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => {
            toastContainer.removeChild(toast);
        }, 300);
    }, 3000);
}

// Save search to history
function saveToSearchHistory(query) {
    if (!currentUser || !firebaseDb) return;
    
    const userRef = firebaseDb.collection('users').doc(currentUser.uid);
    
    userRef.get().then(doc => {
        if (doc.exists) {
            const userData = doc.data();
            const searchHistory = userData.searchHistory || [];
            
            // Check if this query is already in history
            const existingIndex = searchHistory.findIndex(item => 
                item.query.toLowerCase() === query.toLowerCase()
            );
            
            if (existingIndex >= 0) {
                // Remove the existing entry
                searchHistory.splice(existingIndex, 1);
            }
            
            // Add new search to the beginning of the history
            const newSearch = {
                query: query,
                date: new Date()
            };
            
            // Add to beginning of array
            searchHistory.unshift(newSearch);
            
            // Only keep the 10 most recent searches
            if (searchHistory.length > 10) {
                searchHistory.pop();
            }
            
            userRef.update({ searchHistory });
        } else {
            // Create user document with search history
            userRef.set({
                name: currentUser.displayName || '',
                email: currentUser.email,
                createdAt: new Date(),
                favorites: [],
                searchHistory: [{
                    query: query,
                    date: new Date()
                }]
            });
        }
    }).catch(error => {
        console.error('Error updating search history:', error);
    });
}

// Error handler for geolocation
function showError(error) {
    switch (error.code) {
        case error.PERMISSION_DENIED:
            showToast("Location access denied. Please enter a location manually.", "error");
            break;
        case error.POSITION_UNAVAILABLE:
            showToast("Location information is unavailable. Please enter a location manually.", "error");
            break;
        case error.TIMEOUT:
            showToast("Location request timed out. Please enter a location manually.", "error");
            break;
        case error.UNKNOWN_ERROR:
            showToast("An unknown error occurred. Please enter a location manually.", "error");
            break;
    }
}

// Display error message
function displayError(message) {
    const restaurantsContainer = document.getElementById('restaurants');
    if (!restaurantsContainer) return;
    
    restaurantsContainer.innerHTML = `
        <div class="error-message">
            <h2>Oops! Something went wrong</h2>
            <p>${message}</p>
        </div>
    `;
}

// Add some CSS for the toast notifications
const toastStyles = document.createElement('style');
toastStyles.textContent = `
.toast-container {
    position: fixed;
    bottom: 20px;
    right: 20px;
    z-index: 1000;
}

.toast {
    padding: 12px 20px;
    margin-top: 10px;
    background-color: #4CAF50;
    color: white;
    border-radius: 5px;
    box-shadow: 0 2px 10px rgba(0,0,0,0.2);
    transform: translateX(120%);
    transition: transform 0.3s ease;
    max-width: 300px;
}

.toast.show {
    transform: translateX(0);
}

.toast.error {
    background-color: #f44336;
}
`;
document.head.appendChild(toastStyles);