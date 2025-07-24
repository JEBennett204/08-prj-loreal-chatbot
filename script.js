/* DOM elements */
const chatForm = document.getElementById("chatForm");
const userInput = document.getElementById("userInput");
const chatWindow = document.getElementById("chatWindow");

// Conversation history array
const messages = [];

/**
 * Helper function to convert simple markdown (**bold**, *italic*) to HTML.
 * Only handles **bold** and *italic* using <strong> and <em>.
 * Escapes HTML to prevent injection.
 * Emojis are preserved by default in JS and HTML, so no special handling is needed.
 */
function markdownToHtml(text) {
  // Escape HTML special characters, but preserve emoji characters
  let safe = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  // Convert **bold** (must be before *italic*)
  safe = safe.replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>");
  // Convert *italic*
  safe = safe.replace(/\*(.+?)\*/g, "<em>$1</em>");
  // Emojis are Unicode and will render as-is in HTML

  return safe;
}

// Function to create a chat bubble
function addMessageBubble(role, text) {
  // Create bubble container
  const bubbleContainer = document.createElement("div");
  bubbleContainer.classList.add("bubble-container", role);

  // If assistant, add avatar
  if (role === "assistant") {
    const avatar = document.createElement("img");
    avatar.className = "assistant-avatar";
    avatar.src = "img/josephine-avatar.png"; // <-- This is the profile photo placeholder for Joséphine
    avatar.alt = "Joséphine avatar";
    avatar.width = 40;
    avatar.height = 40;
    bubbleContainer.appendChild(avatar);
  }

  // Create bubble element
  const bubble = document.createElement("div");
  bubble.classList.add("chat-bubble", role);

  // Render markdown as HTML
  bubble.innerHTML = markdownToHtml(text);

  // Add simple fade-in animation
  bubble.style.opacity = 0;
  bubbleContainer.appendChild(bubble);
  chatWindow.appendChild(bubbleContainer);
  setTimeout(() => {
    bubble.style.opacity = 1;
  }, 50);

  // Scroll to bottom
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Function to render all messages
function renderMessages() {
  chatWindow.innerHTML = "";
  // Hide the very first user message ("what is your name?")
  messages.forEach((msg, idx) => {
    // If it's the first message and it's a user message, skip rendering it
    if (
      idx === 0 &&
      msg.role === "user" &&
      msg.content === "what is your name?"
    ) {
      return;
    }
    addMessageBubble(msg.role, msg.content);
  });
}

// Initial render
renderMessages();

/* Handle form submit */
chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  // Get user input
  const question = userInput.value.trim();
  if (!question) return;

  // Add user's message to history and UI
  messages.push({ role: "user", content: question });
  renderMessages();

  // Show typing indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("chat-bubble", "assistant", "typing");
  typingBubble.textContent = "Joséphine is thinking...";
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Prepare payload with both input and history
  const payload = { input: question, history: messages };

  let reply = "";
  try {
    // Check if the question is beauty-related before sending to the worker
    if (!isBeautyRelated(question)) {
      reply =
        "I'm here to help with beauty, skincare, haircare, and L’Oréal products or routines. Please ask me something related to those topics!";
    } else {
      // Send POST request to Cloudflare Worker with { input, history }
      const res = await fetch(
        "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      if (!res.ok) throw new Error("Joséphine endpoint failed");
      const data = await res.json();
      reply = data.reply || "";
      if (!reply) throw new Error("No response from Joséphine");
    }
  } catch (err) {
    reply =
      "Sorry, I’m having trouble connecting right now. Please try again later.";
  }

  // Remove typing indicator
  typingBubble.remove();

  // Add assistant's response to history and UI
  messages.push({ role: "assistant", content: reply });
  renderMessages();

  // Clear input field
  userInput.value = "";
});

// Optional: Send on Enter key in input field
userInput.addEventListener("keydown", (e) => {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    chatForm.dispatchEvent(new Event("submit"));
  }
});

// On page load, ask "what is your name?" (hidden from user) and display only Joséphine's response
window.addEventListener("DOMContentLoaded", async () => {
  // Add the hidden user message to the conversation history
  messages.push({ role: "user", content: "what is your name?" });

  // Show typing indicator
  const typingBubble = document.createElement("div");
  typingBubble.classList.add("chat-bubble", "assistant", "typing");
  typingBubble.textContent = "Joséphine is thinking...";
  chatWindow.appendChild(typingBubble);
  chatWindow.scrollTop = chatWindow.scrollHeight;

  // Only send the initial question to the worker, since it's always beauty-related
  const payload = { input: "What can you do?", history: messages };

  let reply = "";
  try {
    const res = await fetch(
      "https://loralchatbot-worker-gca.bennett-j1804.workers.dev/",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      }
    );
    if (!res.ok) throw new Error("Joséphine endpoint failed");
    const data = await res.json();
    reply = data.reply || "";
    if (!reply) throw new Error("No response from Joséphine");
    // Ensure Joséphine introduces herself by name in the first message
    if (!/joséphine/i.test(reply)) {
      reply = `Bonjour, I'm Joséphine. ${reply}`;
    }
  } catch (err) {
    reply =
      "Sorry, I’m having trouble connecting right now. Please try again later.";
  }

  // Remove typing indicator
  typingBubble.remove();

  // Add only Joséphine's response to the chat
  messages.push({ role: "assistant", content: reply });
  renderMessages();
});

// Helper function to check if a question is beauty-related
function isBeautyRelated(text) {
  // Expanded keyword check to allow purchase and buying intent
  const keywords = [
    "beauty",
    "skincare",
    "skin care",
    "hair",
    "makeup",
    "cosmetic",
    "routine",
    "product",
    "l'oréal",
    "loreal",
    "shampoo",
    "conditioner",
    "serum",
    "moisturizer",
    "cleanser",
    "foundation",
    "lipstick",
    "mascara",
    "fragrance",
    "perfume",
    "face",
    "body",
    "cream",
    "buy",
    "purchase",
    "where can i buy",
    "where to buy",
    "order",
    "shop",
    "store",
    "find",
    "availability",
    "in stock",
    "stockist",
    "retailer",
    "online",
    "price",
  ];
  const lower = text.toLowerCase();
  return keywords.some((word) => lower.includes(word));
}
