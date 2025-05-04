// Variables to store user data
let currentUser = null;
let userData = null;
let chatHistory = [];

// API endpoint configuration
const API_ENDPOINT = 'http://localhost:3001/api/chat'; // Update with your actual backend URL

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
    if (db) {
        db.collection('users').doc(currentUser.uid).get()
            .then(doc => {
                if (doc.exists) {
                    userData = doc.data();
                    console.log("Loaded user data:", userData); // Debug log
                } else {
                    userData = {
                        name: currentUser.displayName || '',
                        email: currentUser.email,
                        photoURL: currentUser.photoURL || '', // Add this line
                        preferences: {
                            cuisinePreferences: [],
                            dietaryRestrictions: []
                        },
                        chatHistory: []
                    };
                    
                    // Save the new user data
                    db.collection('users').doc(currentUser.uid).set(userData);
                }         
                // Load chat history if it exists
                if (userData.chatHistory && userData.chatHistory.length > 0) {
                    chatHistory = userData.chatHistory.slice(-10);
                    
                    // Display chat history in UI
                    chatHistory.forEach(chat => {
                        if (chat.sender === 'user') {
                            addMessage(chat.message, 'user');
                        } else {
                            addMessage(chat.message, 'bot');
                        }
                    });
                } else {
                    // Add a welcome message if no history exists
                    const welcomeMessage = "Hello! I'm your Flavour Map assistant. How can I help you find delicious food today?";
                    addMessage(welcomeMessage, 'bot');
                    saveChatMessage(welcomeMessage, 'bot');
                }
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
            });
    }
}

// Setup event listeners
function setupEventListeners() {
    // Chat form submission
    const chatForm = document.getElementById('chat-form');
    chatForm.addEventListener('submit', (e) => {
        e.preventDefault();
        
        const userInput = document.getElementById('user-input');
        const message = userInput.value.trim();
        
        if (message) {
            // Add user message to chat
            addMessage(message, 'user');
            
            // Save message to history
            saveChatMessage(message, 'user');
            
            // Clear input field
            userInput.value = '';
            
            // Show typing indicator
            showTypingIndicator();
            
            // Process the message and respond using Gemini
            processMessageWithGemini(message);
        }
    });
    
    // Suggestion buttons
    const suggestionItems = document.querySelectorAll('.suggestion-item');
    suggestionItems.forEach(item => {
        item.addEventListener('click', () => {
            const query = item.dataset.query;
            document.getElementById('user-input').value = query;
            
            // Trigger form submission
            const event = new Event('submit', {
                'bubbles': true,
                'cancelable': true
            });
            chatForm.dispatchEvent(event);
        });
    });
}

// Add a message to the chat
function addMessage(message, sender, additionalHTML = '') {
    const messagesContainer = document.getElementById('messages-container');
    
    // Create message element
    const messageElement = document.createElement('div');
    messageElement.className = `message ${sender}-message`;
    
    // Get avatar URL - check userData first, then fallback to currentUser
    let avatarUrl;
    if (sender === 'user') {
        // For user, try to get from userData first
        avatarUrl = (userData && userData.photoURL) || 
                   (currentUser && currentUser.photoURL) || 
                   '../assets/images/invisibletom.jpg';
        console.log("User avatar URL used:", avatarUrl); // Debug log
    } else {
        // For bot, always use the same image
        avatarUrl = '../assets/images/cute.jpg';
    }
    
    const time = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    
    messageElement.innerHTML = `
        <div class="message-avatar">
            <img src="${avatarUrl}" alt="${sender}">
        </div>
        <div class="message-content">
            <p>${message}</p>
            <div class="message-time">${time}</div>
            ${additionalHTML}
        </div>
    `;
    
    // Add message to container
    messagesContainer.appendChild(messageElement);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Save chat message to Firestore
function saveChatMessage(message, sender) {
    // Add to local chat history
    chatHistory.push({
        message: message,
        sender: sender,
        timestamp: new Date()
    });
    
    // Keep chat history limited to last 50 messages
    if (chatHistory.length > 50) {
        chatHistory = chatHistory.slice(-50);
    }
    
    if (db && userData) {
        // Update Firestore
        db.collection('users').doc(currentUser.uid).update({
            chatHistory: chatHistory
        })
        .catch(error => {
            console.error('Error saving chat message:', error);
        });
    }
}

// Show typing indicator
function showTypingIndicator() {
    const messagesContainer = document.getElementById('messages-container');
    
    // Create typing indicator
    const typingIndicator = document.createElement('div');
    typingIndicator.className = 'typing-indicator';
    typingIndicator.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
    `;
    
    // Add to container
    messagesContainer.appendChild(typingIndicator);
    
    // Scroll to bottom
    messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Remove typing indicator
function removeTypingIndicator() {
    const typingIndicator = document.querySelector('.typing-indicator');
    if (typingIndicator) {
        typingIndicator.remove();
    }
}

// Process user message with Gemini API
async function processMessageWithGemini(message) {
    try {
        // Remove typing indicator temporarily to avoid issues if there's an error
        removeTypingIndicator();
        
        // Show typing indicator
        showTypingIndicator();
        
        // Format the request for Gemini API
        const requestBody = {
            contents: [{
                parts: [{
                    text: message
                }]
            }]
        };
        
        // Make direct request to Gemini API
        const response = await fetch(
            'https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=AIzaSyDUz8jN6VK-2RDhBrzYeqLxmkrIhY8YQyY',
            {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(requestBody)
            }
        );
        
        // Parse response
        const data = await response.json();
        
        // Remove typing indicator
        removeTypingIndicator();
        
        if (data.candidates && data.candidates[0] && data.candidates[0].content) {
            // Extract the response text
            const geminiResponse = data.candidates[0].content.parts[0].text;
            
            // Add bot message to chat
            addMessage(geminiResponse, 'bot');
            
            // Save bot message to history
            saveChatMessage(geminiResponse, 'bot');
            
            // Check if the AI suggested restaurants
            if (geminiResponse.toLowerCase().includes('restaurant') && 
                (geminiResponse.toLowerCase().includes('recommend') || 
                 geminiResponse.toLowerCase().includes('try'))) {
                
                setTimeout(() => {
                    recommendRestaurants(message);
                }, 1000);
            }
        } else if (data.error) {
            // Handle API error
            console.error('Error from Gemini API:', data.error);
            addMessage("I'm sorry, I couldn't process that request. Please try again.", 'bot');
        } else {
            // Handle unexpected response format
            console.error('Unexpected response format:', data);
            addMessage("I received an unexpected response. Please try again.", 'bot');
        }
    } catch (error) {
        // Handle network/other errors
        console.error('Error communicating with Gemini API:', error);
        removeTypingIndicator();
        addMessage("I'm having trouble connecting to my brain right now. Please try again later.", 'bot');
    }
}

// Recommend restaurants based on user query (sample function, keeping for fallback)
function recommendRestaurants(query) {
    // This is a simplified version that could show restaurants from your database
    // In a real implementation, you would fetch restaurant data based on the query
    
    const restaurantsHTML = `
        <p>Would you like to search for restaurants nearby? You can use our restaurant finder on the home page.</p>
        <div class="chat-action-buttons">
            <a href="../index.html" class="chat-action-button">Search Restaurants</a>
        </div>
    `;
    
    addMessage("I can help you find restaurants!", 'bot', restaurantsHTML);
}

// Helper function to detect restaurant entities in text
function detectRestaurantEntities(text) {
    // This is a simple implementation - in a real app, you might use NER or other NLP techniques
    // For now, just checking for common words
    const restaurantWords = ['restaurant', 'place', 'eat', 'dining', 'food', 'cuisine'];
    return restaurantWords.some(word => text.toLowerCase().includes(word));
}

// View restaurant on map
function viewOnMap(lat, lon) {
    window.open(`https://www.openstreetmap.org/?mlat=${lat}&mlon=${lon}`, '_blank');
}

// Save restaurant to favorites
function saveToFavorites(restaurantId) {
    // This would integrate with your existing favorites functionality
    alert('Restaurant saved to favorites!');
}

// Add global functions for the onclick attributes
window.viewOnMap = viewOnMap;
window.saveToFavorites = saveToFavorites;