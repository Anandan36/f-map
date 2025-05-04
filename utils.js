/**
 * Utility functions for Flavour Map
 */

// Format distance to a readable string
function formatDistance(meters) {
    if (meters < 1000) {
        return `${Math.round(meters)} m`;
    } else {
        return `${(meters / 1000).toFixed(1)} km`;
    }
}

// Format date to a readable string
function formatDate(date) {
    const options = { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    };
    
    return new Date(date).toLocaleDateString(undefined, options);
}

// Check if user is logged in
function isLoggedIn() {
    return !!firebase.auth().currentUser;
}

// Get current user data
async function getCurrentUserData() {
    const user = firebase.auth().currentUser;
    
    if (!user) {
        return null;
    }
    
    try {
        const doc = await firebase.firestore().collection('users').doc(user.uid).get();
        return doc.exists ? doc.data() : null;
    } catch (error) {
        console.error('Error fetching user data:', error);
        return null;
    }
}

// Display a notification
function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    
    // Add to document
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => {
        notification.classList.add('show');
    }, 10);
    
    // Hide and remove after 3 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 3000);
}

// Handle errors
function handleError(error) {
    console.error('Error:', error);
    showNotification(error.message || 'An error occurred', 'error');
}

// Export functions
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        formatDistance,
        formatDate,
        isLoggedIn,
        getCurrentUserData,
        showNotification,
        handleError
    };
}