// Theme Toggle Functionality
const themeToggle = document.getElementById('themeToggle');
const body = document.body;

// Check for saved theme preference or respect OS preference
const savedTheme = localStorage.getItem('theme') || (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light');
if (savedTheme) {
  body.classList.add(savedTheme + '-mode');
  updateThemeIcon();
}

// Toggle theme on button click
themeToggle.addEventListener('click', () => {
  if (body.classList.contains('light-mode')) {
    body.classList.replace('light-mode', 'dark-mode');
    localStorage.setItem('theme', 'dark');
  } else {
    body.classList.replace('dark-mode', 'light-mode');
    localStorage.setItem('theme', 'light');
  }
  updateThemeIcon();
});

// Update theme icon based on current theme
function updateThemeIcon() {
  const icon = themeToggle.querySelector('i');
  if (body.classList.contains('dark-mode')) {
    icon.classList.replace('fa-moon', 'fa-sun');
  } else {
    icon.classList.replace('fa-sun', 'fa-moon');
  }
}

// Chat functionality for demo
const chatInput = document.querySelector('.chat-input input');
const chatButton = document.querySelector('.chat-input button');
const chatMessages = document.querySelector('.chat-messages');

chatButton.addEventListener('click', sendMessage);
chatInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    sendMessage();
  }
});

function sendMessage() {
  const message = chatInput.value.trim();
  if (message) {
    // Add user message
    addMessage(message, 'user');
    chatInput.value = '';
    
    // Simulate AI response after a short delay
    setTimeout(() => {
      const responses = [
        "I understand your concern. Based on your symptoms, I recommend drinking plenty of fluids and resting.",
        "That's a common issue. Let me provide some information that might help.",
        "I'd be happy to help with that. Here's what I recommend based on medical guidelines.",
        "Thanks for sharing. For accurate medical advice, I suggest consulting with a healthcare professional for personalized guidance."
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      addMessage(randomResponse, 'ai');
    }, 1000);
  }
}

function addMessage(text, sender) {
  const messageDiv = document.createElement('div');
  messageDiv.classList.add('message', `${sender}-message`);
  
  const contentDiv = document.createElement('div');
  contentDiv.classList.add('message-content');
  
  const paragraph = document.createElement('p');
  paragraph.textContent = text;
  
  contentDiv.appendChild(paragraph);
  messageDiv.appendChild(contentDiv);
  chatMessages.appendChild(messageDiv);
  
  // Scroll to bottom of chat
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

// Chatbot icon functionality
document.getElementById('chatbotIcon').addEventListener('click', () => {
  alert('Opening chat interface...');
  // In a real implementation, this would open a chat modal or redirect to chat page
});

// Smooth scrolling for navigation links
document.querySelectorAll('a[href^="#"]').forEach(anchor => {
  anchor.addEventListener('click', function (e) {
    e.preventDefault();
    const targetId = this.getAttribute('href');
    if (targetId !== '#') {
      const targetElement = document.querySelector(targetId);
      if (targetElement) {
        targetElement.scrollIntoView({
          behavior: 'smooth'
        });
      }
    }
  });
});

// Animation on scroll
function animateOnScroll() {
  const elements = document.querySelectorAll('.feature-card, .premium-content, .chat-container');
  
  elements.forEach(element => {
    const position = element.getBoundingClientRect();
    
    // If element is in viewport
    if (position.top < window.innerHeight - 100) {
      element.style.opacity = 1;
      element.style.transform = 'translateY(0)';
    }
  });
}

// Initialize elements for animation
document.querySelectorAll('.feature-card, .premium-content, .chat-container').forEach(element => {
  element.style.opacity = 0;
  element.style.transform = 'translateY(20px)';
  element.style.transition = 'opacity 0.5s ease, transform 0.5s ease';
});

// Listen for scroll events
window.addEventListener('scroll', animateOnScroll);
// Initial check in case elements are already in view
window.addEventListener('load', animateOnScroll);